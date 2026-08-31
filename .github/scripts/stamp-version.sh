#!/usr/bin/env bash
# Stamps the build version into project.godot and export_presets.cfg from the
# ref being built, so a release APK is distinguishable from the one before it.
#
# Android orders updates by versionCode and both were left at their defaults
# (code 1, empty name), making consecutive releases identical to the OS and to
# any bug report. Run this before `godot --import`.
#
# On a tag (v1.4.2) the name is the tag without its leading v, and the code is
# derived from the semver so it increases monotonically without needing git
# history - actions/checkout fetches depth 1 by default.
#
# On any other ref (a workflow_dispatch dry run) the version is a placeholder,
# so dry runs keep working without a tag.
set -euo pipefail

ref_name="${1:-${GITHUB_REF_NAME:-}}"
project_dir="${2:-freestyle-dangan-trial}"

version_name=""
version_code=""

if [[ "$ref_name" =~ ^v([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
  version_name="${BASH_REMATCH[1]}.${BASH_REMATCH[2]}.${BASH_REMATCH[3]}"
  # Two digits each for minor and patch. Monotonic while both stay under 100.
  version_code=$(( BASH_REMATCH[1] * 10000 + BASH_REMATCH[2] * 100 + BASH_REMATCH[3] ))
else
  echo "stamp-version: '$ref_name' is not a vMAJOR.MINOR.PATCH tag; stamping a dry-run placeholder"
  version_name="0.0.0-${ref_name//[^A-Za-z0-9._-]/-}"
  version_code=1
fi

echo "stamp-version: name=${version_name} code=${version_code}"

project_file="${project_dir}/project.godot"
presets_file="${project_dir}/export_presets.cfg"

# config/version is the in-app fallback and the Windows exe's file version.
if grep -q '^config/version=' "$project_file"; then
  sed -i "s|^config/version=.*|config/version=\"${version_name}\"|" "$project_file"
else
  sed -i "0,/^\[application\]$/s||[application]\nconfig/version=\"${version_name}\"|" "$project_file"
fi

sed -i "s|^version/code=.*|version/code=${version_code}|" "$presets_file"
sed -i "s|^version/name=.*|version/name=\"${version_name}\"|" "$presets_file"

grep -n '^config/version=' "$project_file"
grep -n '^version/code=\|^version/name=' "$presets_file"
