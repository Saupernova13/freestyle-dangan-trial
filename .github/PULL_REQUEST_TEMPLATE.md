# Summary

<!-- What does this PR change and why? -->

## Checklist

- [ ] `tools/check.sh` (or `tools/check.ps1`) passes locally
- [ ] Commit messages follow conventional commits (`type(scope): description`)
- [ ] If `trial.json`'s shape changed: `schema/trial.schema.json`, the editor
      validator (`web-ui-editor/js/core/trialSchema.js`), the engine validator
      (`TrialValidator.gd`), and the fixture trial were all updated together
      (see ARCHITECTURE.md, "The trial.json contract")
- [ ] New UI (engine) is scene-owned; no node construction or animation
      definitions in GDScript
- [ ] Docs updated where behavior changed (README / ARCHITECTURE / UI_GUIDE)
