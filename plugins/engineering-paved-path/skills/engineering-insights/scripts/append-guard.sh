#!/usr/bin/env bash
# Append-only guard for INSIGHTS.md.
#
#   append-guard.sh snapshot <file>            -> copies <file>, prints the copy's path
#   append-guard.sh check <snapshot> <file>    -> exit 0 if every original line survived
#
# `diff` marks a line that exists only in the snapshot with "<". Any such line means
# something was deleted or rewritten, which INSIGHTS.md never allows. Added lines
# (">") are fine, wherever they were inserted.
set -euo pipefail

usage() {
  echo "usage: $0 snapshot <file> | check <snapshot> <file>" >&2
  exit 2
}

cmd="${1:-}"

case "$cmd" in
  snapshot)
    [[ $# -eq 2 ]] || usage
    [[ -f "$2" ]] || { echo "not a file: $2" >&2; exit 2; }
    tmp="${TMPDIR:-/tmp}"
    copy="$(mktemp "${tmp%/}/insights-snapshot.XXXXXX")"
    cp "$2" "$copy"
    echo "$copy"
    ;;
  check)
    [[ $# -eq 3 ]] || usage
    [[ -f "$2" && -f "$3" ]] || { echo "missing snapshot or file" >&2; exit 2; }
    # diff exits 1 when files differ; that is expected, not an error.
    removed="$(diff "$2" "$3" | grep '^<' || true)"
    if [[ -n "$removed" ]]; then
      echo "FAIL: REMOVED/CHANGED lines (restore with: cp $2 $3):"
      echo "$removed"
      exit 1
    fi
    added=$(( $(wc -l < "$3") - $(wc -l < "$2") ))
    echo "OK: append-only (+${added} lines)"
    ;;
  *)
    usage
    ;;
esac
