# Run every check CI runs, locally. Windows PowerShell 5.1 compatible.
#
# Engine steps need a Godot 4.5 binary: set GODOT_BIN or have godot on PATH.
# gdlint comes from gdtoolkit (pip install "gdtoolkit==4.5.*"). Steps whose
# tools are missing are skipped with a warning, not failed.

$ErrorActionPreference = "Continue"
$repoRoot = Split-Path -Parent $PSScriptRoot
$engineDir = Join-Path $repoRoot "freestyle-dangan-trial"
$editorDir = Join-Path $repoRoot "web-ui-editor"
$script:failed = $false

function Step($name) { Write-Host ""; Write-Host "== $name" }
function Ok($name) { Write-Host "[OK] $name" }
function Fail($name) { Write-Host "[FAIL] $name"; $script:failed = $true }
function Skip($name) { Write-Host "[SKIP] $name" }

function Have($cmd) {
    return $null -ne (Get-Command $cmd -ErrorAction SilentlyContinue)
}

# --- Editor: lint + tests + build -------------------------------------------
Step "editor: npm run check (lint + vitest + build)"
if (Have "npm") {
    if (-not (Test-Path (Join-Path $editorDir "node_modules"))) {
        Push-Location $editorDir
        npm ci --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { Fail "npm ci" }
        Pop-Location
    }
    Push-Location $editorDir
    npm run check
    if ($LASTEXITCODE -eq 0) { Ok "editor check" } else { Fail "editor check" }
    Pop-Location
} else {
    Skip "npm not found; skipping editor checks"
}

# --- Engine: gdlint -----------------------------------------------------------
Step "engine: gdlint"
if (Have "gdlint") {
    Push-Location $engineDir
    gdlint scripts tests
    if ($LASTEXITCODE -eq 0) { Ok "gdlint" } else { Fail "gdlint" }
    Pop-Location
} elseif (Have "pipx") {
    Push-Location $engineDir
    pipx run --spec "gdtoolkit==4.5.*" gdlint scripts tests
    if ($LASTEXITCODE -eq 0) { Ok "gdlint (via pipx)" } else { Fail "gdlint (via pipx)" }
    Pop-Location
} else {
    Skip "gdlint not found (pip install ""gdtoolkit==4.5.*"")"
}

# --- Engine: locate Godot ------------------------------------------------------
$godotBin = $env:GODOT_BIN
if (-not $godotBin) {
    if (Have "godot") { $godotBin = "godot" }
}

if (-not $godotBin) {
    Step "engine: import + tests"
    Skip "no Godot binary; set GODOT_BIN to a Godot 4.5 executable"
} else {
    # --- Engine: headless import (twice-tolerant on a cold .godot/) -----------
    Step "engine: headless import"
    & $godotBin --headless --path $engineDir --import
    if ($LASTEXITCODE -ne 0) {
        & $godotBin --headless --path $engineDir --import
    }
    if ($LASTEXITCODE -eq 0) { Ok "import" } else { Fail "import" }

    # --- Engine: gdUnit4 tests --------------------------------------------------
    Step "engine: gdUnit4 tests"
    Push-Location $engineDir
    $env:GODOT_BIN = $godotBin
    & (Join-Path $engineDir "addons\gdUnit4\runtest.cmd") -a res://tests/unit
    if ($LASTEXITCODE -eq 0) { Ok "gdUnit4" } else { Fail "gdUnit4" }
    Pop-Location
}

Write-Host ""
if ($script:failed) {
    Write-Host "[FAIL] one or more checks failed"
    exit 1
}
Write-Host "[OK] all checks passed (skipped steps noted above)"
exit 0
