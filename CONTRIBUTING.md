# Contributing to solana-depin-builder-skill

## What This Skill Is

A production AI skill for the Solana AI Kit. All contributions must maintain the standard:
**practitioner-grade depth that a DePIN founder shipping to mainnet would trust.**

## What to Contribute

**High-value additions:**
- New DePIN architecture patterns (new hardware categories, new proof mechanisms)
- Runbooks for failure modes not yet covered
- Real protocol post-mortems with anonymized data
- Improvements to oracle trust level recommendations based on new tooling
- Token economics models validated against live network data

**Lower-priority:**
- Grammar fixes
- Minor reformatting
- Adding links without explanatory context

## Quality Bar

Every new skill file must include:
1. A clear "when to use this" opening
2. At least one complete TypeScript or Rust code example (not pseudocode)
3. Anti-patterns section — what NOT to do and why
4. Cross-skill integration notes

Every code example must:
- Compile without modification
- Use real library names and current APIs (check package.json for versions)
- Handle errors explicitly — no empty catch blocks
- Include security notes where relevant

## File Organization

```
skill/         → Sub-skill files loaded progressively
agents/        → Agent personas (loaded by CLAUDE.md routing)
commands/      → /command implementations
rules/         → Always-on rules (auto-loaded)
runbooks/      → Incident response procedures
```

## Submitting a PR

1. Fork the repo
2. Branch: `feat/<skill-name>` or `fix/<issue>`
3. Keep PRs focused — one skill file per PR for new additions
4. Include a one-paragraph description of what problem the file solves
5. Test your code examples before submitting

## Do Not Add

- Marketing content or hype without technical substance
- Protocol-specific promotional content without generalizable patterns
- Code that requires paid APIs without documented alternatives
- Files that duplicate existing skill content
