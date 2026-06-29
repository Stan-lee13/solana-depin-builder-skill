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
- New agent personas for specialized DePIN roles
- Additional command implementations

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
examples/      → TypeScript and Anchor code examples
```

## Development Setup

### Prerequisites
- Node.js 20+
- Rust stable toolchain
- Solana CLI 1.18.4+
- Anchor framework

### TypeScript Examples
```bash
cd examples/ts
npm install
npm test
npm run roi
npm run benchmark
```

### Anchor Program
```bash
cd examples/anchor
anchor build
anchor test
```

## Testing

All contributions must pass:
- TypeScript unit tests (`npm test`)
- Anchor integration tests (`anchor test`)
- Markdown linting (`markdownlint '**/*.md'`)
- Security audits (`npm audit`, `cargo audit`)

## Submitting a PR

1. Fork the repo
2. Branch: `feat/<skill-name>` or `fix/<issue>`
3. Keep PRs focused — one skill file per PR for new additions
4. Include a one-paragraph description of what problem the file solves
5. Test your code examples before submitting
6. Ensure CI passes before requesting review

## Code Review Process

- All PRs require at least one approval from maintainers
- Changes to core architecture require consensus from multiple maintainers
- Security-related changes require additional review
- Documentation changes are reviewed for clarity and accuracy

## Documentation Standards

- Use clear, concise language
- Include code examples for all APIs
- Document edge cases and error conditions
- Provide context for architectural decisions
- Keep examples up-to-date with library versions

## Performance Considerations

- Benchmark performance-critical code before submitting
- Document any performance trade-offs
- Consider gas costs for on-chain operations
- Optimize for both developer experience and runtime efficiency

## Security Guidelines

- Never commit private keys or secrets
- Use environment variables for sensitive configuration
- Follow security best practices for Solana programs
- Document security assumptions and threat models
- Report security vulnerabilities privately

## Do Not Add

- Marketing content or hype without technical substance
- Protocol-specific promotional content without generalizable patterns
- Code that requires paid APIs without documented alternatives
- Files that duplicate existing skill content
- Hardcoded credentials or sensitive data

## Getting Help

- Open an issue for bugs or feature requests
- Use discussions for questions and ideas
- Join the community Discord for real-time help
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
