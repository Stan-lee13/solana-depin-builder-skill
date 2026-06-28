# Security Policy

## Scope

This repository is a documentation and code-example skill — it does not run as a service.

Security concerns that apply here:
- **Code examples** — any example that could be used directly and contains a vulnerability
- **Architecture patterns** — recommendations that could lead to insecure designs if followed
- **Anti-Sybil mechanisms** — weaknesses in described proof mechanisms
- **Key management patterns** — dangerous key handling advice

Out of scope: vulnerabilities in the live DePIN protocols referenced as examples (Helium, Hivemapper, etc.) — report those to the respective protocol's security team.

## Reporting

If you find a code example in this skill that contains a security vulnerability:

1. **Do NOT open a public GitHub issue** for vulnerabilities in code examples
2. Email: security reports should be sent to the repository maintainer via GitHub private vulnerability reporting
3. Include: the file path, line number, the vulnerability, and a suggested fix

We will acknowledge within 72 hours and aim to fix within 7 days.

## Code Example Disclaimer

Code examples in this skill are for educational purposes. Before deploying any code from this skill to mainnet:

1. Have the code reviewed by a qualified Solana security auditor
2. Run a full program audit (OtterSec, Neodyme, Sec3, or equivalent)
3. Test thoroughly on devnet before mainnet deployment
4. Follow the security checklist in `rules/depin-safety.md`

Recommended auditors for DePIN programs: OtterSec, Neodyme, Sec3, Trail of Bits.
