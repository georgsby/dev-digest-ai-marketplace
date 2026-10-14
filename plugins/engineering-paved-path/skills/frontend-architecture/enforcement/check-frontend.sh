#!/usr/bin/env bash
# Structural checks for a React / Next.js (App Router) frontend — grep-level,
# no dependencies. Typecheck and tests say nothing about structure; this does.
#
# Usage:
#   check-frontend.sh [options] <src-root> [<src-root> ...]
#
# Modes (default: report against the baseline, exit 0):
#   --baseline FILE   compare counts with FILE (a project file; absent → all zero)
#   --strict          exit 1 if any count is ABOVE the baseline
#   --record          write the current counts to the --baseline FILE
#   -v, --verbose     also print offending lines for checks at or below baseline
#
# Layer mapping. RE = extended regex matched against file paths (as printed
# relative to the current directory); DIR = directory relative to each root.
# Defaults in brackets:
#   --routes DIR            App Router directory                  [app]
#   --api-client RE         the only files allowed to call fetch()
#                           [/lib/api(\.tsx?$|/)]
#   --hooks RE              the only files allowed to call useQuery/useMutation
#                           [/lib/hooks/|/src/hooks/]
#   --exclude RE            ignored paths (vendored, generated)
#                           [/(vendor|generated|__generated__)/]
#   --shell NAME            app-shell component that belongs in a layout,
#                           e.g. AppShell; check skipped when unset
#   --max-page-lines N      page.tsx size limit                   [40]
#   --max-component-lines N component file size limit             [150]
#
# Run from the project root. Rule: your change must not raise a number.
set -uo pipefail

usage() { sed -n '2,29p' "$0" | sed 's/^# \{0,1\}//'; exit 2; }

ROUTES="app"
API_RE='/lib/api(\.tsx?$|/)'
HOOKS_RE='/lib/hooks/|/src/hooks/'
EXCLUDE='/(vendor|generated|__generated__)/'
SHELL_NAME=""
MAX_PAGE=40
MAX_COMPONENT=150

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
    --routes) need "$@"; ROUTES="$2"; shift ;;
    --api-client) need "$@"; API_RE="$2"; shift ;;
    --hooks) need "$@"; HOOKS_RE="$2"; shift ;;
    --exclude) need "$@"; EXCLUDE="$2"; shift ;;
    --shell) need "$@"; SHELL_NAME="$2"; shift ;;
    --max-page-lines) need "$@"; MAX_PAGE="$2"; shift ;;
    --max-component-lines) need "$@"; MAX_COMPONENT="$2"; shift ;;
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

# ENVIRON, not -v: awk -v would eat the backslashes in the regex.
outside() { RE="$1" awk -F: '$1 !~ ENVIRON["RE"]'; }
notexcluded() { outside "$EXCLUDE"; }
notest() { grep -vE '\.(test|spec)\.tsx?:'; }

# grep over the given dirs, TS/TSX only, minus excluded paths.
ts_grep() {
  local pattern="$1"; shift
  [ $# -gt 0 ] || return 0
  grep -rnE --include='*.ts' --include='*.tsx' --exclude-dir=node_modules \
    "$pattern" "$@" 2>/dev/null | notexcluded
}
route_dirs() { for r in "${ROOTS[@]}"; do [ -d "$r/$ROUTES" ] && echo "$r/$ROUTES"; done; }
ROUTE_DIRS=()
while IFS= read -r d; do ROUTE_DIRS+=("$d"); done < <(route_dirs)

# 1 — every network call goes through the API client.
check_fetch() {
  ts_grep '(^|[^A-Za-z0-9_.])fetch\(' "${ROOTS[@]}" | notest | outside "$API_RE"
}

# 2 — every TanStack Query call lives in the data-hook layer.
check_query() {
  ts_grep 'use(Query|Mutation|InfiniteQuery|Queries|SuspenseQuery)\(' "${ROOTS[@]}" | notest | outside "$HOOKS_RE"
}

# 3 — the path alias exists; three or more levels up is a guess, not a path.
check_deep_imports() {
  ts_grep "from ['\"]\.\./\.\./\.\./" "${ROOTS[@]}"
}

# 4 — a barrel is a public API, not a star.
check_star_barrels() {
  for r in "${ROOTS[@]}"; do
    grep -rn '^export \*' --include='index.ts' --include='index.tsx' --exclude-dir=node_modules "$r" 2>/dev/null
  done | notexcluded
}

# 5 — "use client" marks a boundary (a page, a view, a provider), not a module.
check_directive_placement() {
  for r in "${ROOTS[@]}"; do
    grep -rlE "^['\"]use client['\"]" --include='*.ts' --exclude-dir=node_modules "$r" 2>/dev/null
  done | notexcluded
}

# 6 — a page renders one view and nothing else.
check_fat_pages() {
  [ ${#ROUTE_DIRS[@]} -gt 0 ] || return 0
  find "${ROUTE_DIRS[@]}" -name 'page.tsx' -not -path '*/node_modules/*' 2>/dev/null \
    | notexcluded | while IFS= read -r f; do
        n=$(wc -l < "$f" | tr -d ' ')
        [ "$n" -gt "$MAX_PAGE" ] && echo "$f: $n lines"
      done
}

# 7 — the split check, components only.
check_big_components() {
  find "${ROOTS[@]}" -name '*.tsx' -not -path '*/node_modules/*' \
    -not -name '*.test.tsx' -not -name '*.spec.tsx' 2>/dev/null \
    | notexcluded | while IFS= read -r f; do
        n=$(wc -l < "$f" | tr -d ' ')
        [ "$n" -gt "$MAX_COMPONENT" ] && echo "$f: $n lines"
      done
}

# 8 — a route segment that can fail on its own needs an error.tsx.
check_missing_error_boundary() {
  [ ${#ROUTE_DIRS[@]} -gt 0 ] || return 0
  find "${ROUTE_DIRS[@]}" -name 'page.tsx' -not -path '*/node_modules/*' 2>/dev/null \
    | notexcluded | while IFS= read -r page; do
        [ -f "$(dirname "$page")/error.tsx" ] || echo "$(dirname "$page"): no error.tsx"
      done
}

# 9 — shared chrome belongs in a layout, not in every page (only with --shell).
check_shell_in_pages() {
  [ -n "$SHELL_NAME" ] && [ ${#ROUTE_DIRS[@]} -gt 0 ] || return 0
  ts_grep "<$SHELL_NAME([^A-Za-z0-9_]|$)" "${ROUTE_DIRS[@]}" | notest | grep -v '/layout\.tsx:'
}

KEYS="fetch_outside_api query_outside_hooks deep_relative_imports star_barrels directive_on_modules fat_pages big_components missing_error_boundary shell_in_pages"

label_for() {
  case "$1" in
    fetch_outside_api)      echo "fetch() outside the API client" ;;
    query_outside_hooks)    echo "useQuery/useMutation outside data hooks" ;;
    deep_relative_imports)  echo "imports going up 3+ levels (use alias)" ;;
    star_barrels)           echo "export * in an index.ts" ;;
    directive_on_modules)   echo '"use client" on a non-component module' ;;
    fat_pages)              echo "page.tsx over $MAX_PAGE lines" ;;
    big_components)         echo "component over $MAX_COMPONENT lines" ;;
    missing_error_boundary) echo "route segment without error.tsx" ;;
    shell_in_pages)         echo "<${SHELL_NAME:-shell}> rendered outside a layout" ;;
  esac
}

run_for() {
  case "$1" in
    fetch_outside_api)      check_fetch ;;
    query_outside_hooks)    check_query ;;
    deep_relative_imports)  check_deep_imports ;;
    star_barrels)           check_star_barrels ;;
    directive_on_modules)   check_directive_placement ;;
    fat_pages)              check_fat_pages ;;
    big_components)         check_big_components ;;
    missing_error_boundary) check_missing_error_boundary ;;
    shell_in_pages)         check_shell_in_pages ;;
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
    echo "# frontend-architecture baseline — counts, not a licence."
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

echo "frontend-architecture — structural checks on ${ROOTS[*]}"
[ ${#ROUTE_DIRS[@]} -eq 0 ] && echo "(no '$ROUTES/' directory under the roots — route checks find nothing; see --routes)"
[ -n "$BASELINE" ] && [ ! -f "$BASELINE" ] && echo "(baseline $BASELINE not found — comparing against zero)"
echo
WORSE=0
for k in $KEYS; do
  label="$(label_for "$k")"
  if [ "$k" = shell_in_pages ] && [ -z "$SHELL_NAME" ]; then
    printf '· %-42s skipped (no --shell)\n' "$label"
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
