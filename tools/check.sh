#!/bin/sh
# Run every check CI runs, locally. POSIX sh, any directory.
#
# Engine steps need a Godot 4.7 binary (GODOT_BIN or `godot` on PATH) and
# gdlint (pip install "gdtoolkit==4.5.*"). Missing tools skip, never fail, so
# web-only contributors can still use this script.

set -u

repo_root=$(cd "$(dirname "$0")/.." && pwd)
engine_dir="$repo_root/freestyle-dangan-trial"
editor_dir="$repo_root/web-ui-editor"
failed=0

step() { printf '\n== %s\n' "$1"; }
ok() { printf '[OK] %s\n' "$1"; }
fail() { printf '[FAIL] %s\n' "$1"; failed=1; }
skip() { printf '[SKIP] %s\n' "$1"; }

step "editor: npm run check (lint + vitest + build)"
if command -v npm >/dev/null 2>&1; then
    if [ ! -d "$editor_dir/node_modules" ]; then
        (cd "$editor_dir" && npm ci --no-audit --no-fund) || fail "npm ci"
    fi
    if (cd "$editor_dir" && npm run check); then
        ok "editor check"
    else
        fail "editor check"
    fi
else
    skip "npm not found; skipping editor checks"
fi

step "engine: gdlint"
if command -v gdlint >/dev/null 2>&1; then
    if (cd "$engine_dir" && gdlint scripts tests); then
        ok "gdlint"
    else
        fail "gdlint"
    fi
elif command -v pipx >/dev/null 2>&1; then
    if (cd "$engine_dir" && pipx run --spec "gdtoolkit==4.5.*" gdlint scripts tests); then
        ok "gdlint (via pipx)"
    else
        fail "gdlint (via pipx)"
    fi
else
    skip "gdlint not found (pip install \"gdtoolkit==4.5.*\")"
fi

# --- Engine: locate Godot ---------------------------------------------------
godot_bin="${GODOT_BIN:-}"
if [ -z "$godot_bin" ] && command -v godot >/dev/null 2>&1; then
    godot_bin=godot
fi

if [ -z "$godot_bin" ]; then
    step "engine: import + tests"
    skip "no Godot binary; set GODOT_BIN to a Godot 4.7 executable"
else
    # A cold .godot/ can fail the first import; the retry is a no-op otherwise.
    step "engine: headless import"
    if "$godot_bin" --headless --path "$engine_dir" --import \
        || "$godot_bin" --headless --path "$engine_dir" --import; then
        ok "import"
    else
        fail "import"
    fi

    step "engine: gdUnit4 tests"
    if (cd "$engine_dir" && GODOT_BIN="$godot_bin" sh addons/gdUnit4/runtest.sh -a res://tests/unit); then
        ok "gdUnit4"
    else
        fail "gdUnit4"
    fi
fi

printf '\n'
if [ "$failed" -ne 0 ]; then
    printf '[FAIL] one or more checks failed\n'
    exit 1
fi
printf '[OK] all checks passed (skipped steps noted above)\n'
