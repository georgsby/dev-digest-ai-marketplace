#!/usr/bin/env bash
# Onion-architecture checks for a TypeScript backend — grep-level, no dependencies.
#
# They catch the leaks that show up as text: an ORM row type crossing a ring, an
# ORM import or a query outside the persistence ring, a secret read straight off
# the process, the HTTP framework imported outside the transport ring, an adapter
# constructed outside the composition root, I/O inside the domain core.
#
# Usage:
#   check-onion.sh [options] <src-root> [<src-root> ...]
#
# Modes (default: report against the baseline, exit 0):
#   --baseline FILE   compare counts with FILE (a project file; absent → all zero)
#   --strict          exit 1 if any count is ABOVE the baseline
#   --record          write the current counts to the --baseline FILE
#   -v, --verbose     also print offending lines for checks at or below baseline
#
# Ring mapping — extended regular expressions matched against file paths
# (as printed relative to the current directory). Defaults in brackets:
#   --persistence RE       files allowed to use the ORM and run queries
#                          [(repositor(y|ies)|\.repo|mappers?)(\.ts$|/)]
#   --schema RE            ORM schema / db client / migrations
#                          [/(db|database|schema|migrations|drizzle)/|schema\.ts$]
#   --transport RE         files allowed to import the HTTP framework
#                          [(routes?|controllers?|handlers?|plugins?)(\.ts$|/)|/(app|server|main)\.ts$]
#   --config RE            files allowed to read process.env
#                          [(^|/)(config|env)(\.ts$|/)]
#   --composition-root RE  files allowed to construct adapters
#                          [(container|composition-root|bootstrap)\.ts$]
#   --adapters RE          infrastructure / adapter implementations
#                          [/(adapters|infrastructure|infra)/]
#   --adapter-class RE     class names that count as adapters
#                          [[A-Z][A-Za-z0-9]*(Client|Provider|Adapter|Gateway)]
#   --domain RE            domain core (I/O-free); check skipped when unset
#   --contracts RE         ports + contracts (zod only); check skipped when unset
#   --exclude RE           ignored paths (tests, generated, vendored)
#                          [/(vendor|generated|__generated__|test|tests|__tests__|__mocks__|mocks)/|\.(test|spec)\.tsx?$|(^|/)mocks?\.ts$]
#   --orm-module RE        ORM import specifier   [drizzle-orm]
#   --http-module RE       HTTP framework import  [fastify|@fastify/]
#
# Run from the project root. Rule: your change must not raise a number.
set -uo pipefail

usage() { sed -n '2,40p' "$0" | sed 's/^# \{0,1\}//'; exit 2; }

PERSISTENCE='(repositor(y|ies)|\.repo|mappers?)(\.ts$|/)'
SCHEMA='/(db|database|schema|migrations|drizzle)/|schema\.ts$'
TRANSPORT='(routes?|controllers?|handlers?|plugins?)(\.ts$|/)|/(app|server|main)\.ts$'
CONFIG='(^|/)(config|env)(\.ts$|/)'
ROOT_RE='(container|composition-root|bootstrap)\.ts$'
ADAPTERS='/(adapters|infrastructure|infra)/'
ADAPTER_CLASS='[A-Z][A-Za-z0-9]*(Client|Provider|Adapter|Gateway)'
DOMAIN=''
CONTRACTS=''
EXCLUDE='/(vendor|generated|__generated__|test|tests|__tests__|__mocks__|mocks)/|\.(test|spec)\.tsx?$|(^|/)mocks?\.ts$'
ORM='drizzle-orm'
HTTP='fastify|@fastify/'

MODE="report"
VERBOSE=0
BASELINE=""
ROOTS=()

need() { [ $# -ge 2 ] && [ -n "$2" ] || { echo "missing value for $1" >&2; exit 2; }; }
while [ $# -gt 0 ]; do
  case "$1" in
    --strict) MODE="strict" ;;
    --record) MODE="record" ;;
    -v|--verbose) VERBOSE=1 ;;
    --baseline) need "$@"; BASELINE="$2"; shift ;;
    --persistence) need "$@"; PERSISTENCE="$2"; shift ;;
    --schema) need "$@"; SCHEMA="$2"; shift ;;
    --transport) need "$@"; TRANSPORT="$2"; shift ;;
    --config) need "$@"; CONFIG="$2"; shift ;;
    --composition-root) need "$@"; ROOT_RE="$2"; shift ;;
    --adapters) need "$@"; ADAPTERS="$2"; shift ;;
    --adapter-class) need "$@"; ADAPTER_CLASS="$2"; shift ;;
    --domain) need "$@"; DOMAIN="$2"; shift ;;
    --contracts) need "$@"; CONTRACTS="$2"; shift ;;
    --exclude) need "$@"; EXCLUDE="$2"; shift ;;
    --orm-module) need "$@"; ORM="$2"; shift ;;
    --http-module) need "$@"; HTTP="$2"; shift ;;
    -h|--help) usage ;;
    --) shift; ROOTS+=("$@"); break ;;
    -*) echo "unknown option: $1" >&2; exit 2 ;;
    *) ROOTS+=("$1") ;;
  esac
  shift
done

[ ${#ROOTS[@]} -gt 0 ] || { echo "usage: $0 [options] <src-root> [<src-root> ...]  (--help for options)" >&2; exit 2; }
for r in "${ROOTS[@]}"; do
  [ -d "$r" ] || { echo "not a directory: $r (run from the project root)" >&2; exit 2; }
done
[ "$MODE" = "record" ] && [ -z "$BASELINE" ] && { echo "--record needs --baseline FILE" >&2; exit 2; }

# grep over every root, TypeScript sources only, minus excluded paths.
src_grep() {
  grep -rnE --include='*.ts' --include='*.tsx' --include='*.mts' --include='*.cts' \
    --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build \
    "$1" "${ROOTS[@]}" 2>/dev/null \
    | RE="$EXCLUDE" awk -F: '$1 !~ ENVIRON["RE"]'
}
# keep lines whose FILE PATH does not match the regex / does match it
# (ENVIRON, not -v: awk -v would eat the backslashes in the regex)
outside() { RE="$1" awk -F: '$1 !~ ENVIRON["RE"]'; }
inside()  { RE="$1" awk -F: '$1 ~ ENVIRON["RE"]'; }

# 1 — ORM row types leaking out of the persistence ring.
check_row_types() {
  src_grep '\$infer(Select|Insert)' | outside "$PERSISTENCE" | outside "$SCHEMA"
}

# 2 — the ORM imported outside persistence / schema.
check_orm_imports() {
  src_grep "from ['\"]($ORM)(['\"/])" | outside "$PERSISTENCE" | outside "$SCHEMA"
}

# 3 — queries run outside the persistence ring (a `db`/`tx` handle used directly).
check_queries() {
  src_grep '(^|[^A-Za-z0-9_$])(db|tx)\.(select|insert|update|delete|execute|transaction|query)[^A-Za-z0-9_]' \
    | outside "$PERSISTENCE" | outside "$SCHEMA"
}

# 4 — secrets / config read off the process outside the config module.
check_process_env() {
  src_grep 'process\.env' | outside "$CONFIG"
}

# 5 — the HTTP framework imported outside the transport ring.
check_http_imports() {
  src_grep "from ['\"]($HTTP)" | outside "$TRANSPORT" | outside "$ROOT_RE"
}

# 6 — a concrete adapter constructed outside the composition root.
check_composition_root() {
  src_grep "new ($ADAPTER_CLASS)\(" | outside "$ROOT_RE" | outside "$ADAPTERS"
}

# 7 — I/O or framework imports inside the domain core (only with --domain).
check_domain_io() {
  [ -n "$DOMAIN" ] || return 0
  src_grep "from ['\"]((node:)?(fs|fs/promises|child_process|http|https|net|dgram)['\"]|($ORM)['\"/]|($HTTP))|process\.env" \
    | inside "$DOMAIN"
}

# 8 — ports/contracts importing a package other than zod (only with --contracts).
check_contracts() {
  [ -n "$CONTRACTS" ] || return 0
  src_grep "from ['\"][^./'\"]" | inside "$CONTRACTS" | grep -vE "from ['\"]zod(/[^'\"]*)?['\"]"
}

KEYS="row_types_leak orm_import_leak query_outside_persistence env_outside_config http_import_leak adapter_outside_root domain_io contracts_import_leak"

label_for() {
  case "$1" in
    row_types_leak)            echo "row types stay in the persistence ring" ;;
    orm_import_leak)           echo "ORM imported only by persistence/schema" ;;
    query_outside_persistence) echo "queries stay in the persistence ring" ;;
    env_outside_config)        echo "process.env read only in config" ;;
    http_import_leak)          echo "HTTP framework only in transport" ;;
    adapter_outside_root)      echo "adapters built in the composition root" ;;
    domain_io)                 echo "domain core stays I/O-free" ;;
    contracts_import_leak)     echo "contracts import only zod" ;;
  esac
}

skipped() {
  case "$1" in
    domain_io)             [ -z "$DOMAIN" ] ;;
    contracts_import_leak) [ -z "$CONTRACTS" ] ;;
    *) return 1 ;;
  esac
}

run_for() {
  case "$1" in
    row_types_leak)            check_row_types ;;
    orm_import_leak)           check_orm_imports ;;
    query_outside_persistence) check_queries ;;
    env_outside_config)        check_process_env ;;
    http_import_leak)          check_http_imports ;;
    adapter_outside_root)      check_composition_root ;;
    domain_io)                 check_domain_io ;;
    contracts_import_leak)     check_contracts ;;
  esac
}

baseline_for() {
  [ -n "$BASELINE" ] && [ -f "$BASELINE" ] || { echo 0; return; }
  local v
  v="$(grep "^$1=" "$BASELINE" 2>/dev/null | head -1 | cut -d= -f2)"
  echo "${v:-0}"
}

if [ "$MODE" = "record" ]; then
  mkdir -p "$(dirname "$BASELINE")"
  {
    echo "# onion-architecture baseline — counts, not a licence."
    echo "# Regenerate ONLY after fixing something: the numbers may fall, never rise."
    echo "# roots: ${ROOTS[*]}"
    echo "# recorded: $(date +%Y-%m-%d)"
    for k in $KEYS; do
      echo "$k=$(run_for "$k" | grep -c . )"
    done
  } > "$BASELINE"
  echo "recorded → $BASELINE"
  cat "$BASELINE"
  exit 0
fi

echo "onion-architecture — usage and import checks on ${ROOTS[*]}"
[ -n "$BASELINE" ] && [ ! -f "$BASELINE" ] && echo "(baseline $BASELINE not found — comparing against zero)"
echo
WORSE=0
for k in $KEYS; do
  label="$(label_for "$k")"
  if skipped "$k"; then
    printf '· %-42s skipped (no --%s)\n' "$label" "$( [ "$k" = domain_io ] && echo domain || echo contracts )"
    continue
  fi
  out="$(run_for "$k")"
  now="$(printf '%s' "$out" | grep -c . )"
  base="$(baseline_for "$k")"
  if [ "$now" -gt "$base" ]; then
    WORSE=$((WORSE + 1))
    printf '\033[31m✗ %-42s %s (baseline %s)\033[0m\n' "$label" "$now" "$base"
    printf '%s\n' "$out" | sed 's/^/    /'
  elif [ "$now" -lt "$base" ]; then
    printf '\033[32m✓ %-42s %s (baseline %s — improved)\033[0m\n' "$label" "$now" "$base"
  else
    printf '\033[32m✓ %-42s %s\033[0m\n' "$label" "$now"
    [ "$VERBOSE" -eq 1 ] && [ -n "$out" ] && printf '%s\n' "$out" | sed 's/^/    /'
  fi
done

echo
if [ "$WORSE" -gt 0 ]; then
  echo "$WORSE check(s) above the baseline. Fix the code, or explain why the baseline moves."
  [ "$MODE" = "strict" ] && exit 1
else
  echo "nothing above the baseline. Improved a number? Re-record with --record."
fi
exit 0
