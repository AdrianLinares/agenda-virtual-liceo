# Skill Registry

Automatically generated registry of available agent skills (project-level).

Scanned locations:
- .agents/skills/

Discovered project-level skills:
- vitest (/.agents/skills/vitest)
- nodejs-backend-patterns (/.agents/skills/nodejs-backend-patterns)
- typescript-advanced-types (/.agents/skills/typescript-advanced-types)
- frontend-design (/.agents/skills/frontend-design) — referenced from .agents

Notes:
- Project-level skills take precedence over global/user skills.
- This file is intentionally concise; full SKILL.md files live under `.agents/skills/`.

Triggers (frontmatter-like):
- vitest: when writing tests, mocking, configuring coverage
- nodejs-backend-patterns: when creating Node.js servers or APIs
- typescript-advanced-types: when implementing complex TS types

If you add or remove skills, re-run `sdd-init` to refresh this registry.
