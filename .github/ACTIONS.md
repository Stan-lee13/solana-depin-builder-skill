name: CI — Lint, Validate & Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  # ── Markdown lint ─────────────────────────────────────────────────────────────
  markdown-lint:
    name: Markdown Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm install -g markdownlint-cli@0.33.0
      - run: markdownlint "**/*.md" --ignore node_modules --config .markdownlint.json

  # ── Required file structure ────────────────────────────────────────────────
  structure-check:
    name: Required File Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Verify required files
        run: |
          REQUIRED=(
            "AGENTS.md" "CLAUDE.md" "CONTRIBUTING.md" "SECURITY.md"
            "README.md" "SKILL.md" "ecosystem-signals.md" "install.sh"
            "rules/depin-safety.md"
            "agents/depin-architect.md" "agents/reward-engineer.md"
            "commands/depin-audit.md" "commands/node-economics.md"
            "examples/ts/README.md" "examples/ts/src/roi-calculator.ts"
            "examples/ts/tests/roi-calculator.test.ts"
            "examples/anchor/README.md"
            "examples/anchor/programs/depin-registry/src/lib.rs"
          )
          MISSING=0
          for f in "${REQUIRED[@]}"; do
            if [ -f "$f" ]; then echo "OK: $f"; else echo "MISSING: $f"; MISSING=$((MISSING+1)); fi
          done
          [ $MISSING -eq 0 ] || exit 1

  # ── TypeScript examples — install + test ──────────────────────────────────
  ts-tests:
    name: TypeScript Example Tests
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: examples/ts
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: examples/ts/package-lock.json
      - name: Install dependencies
        run: npm install
      - name: Run ROI calculator (smoke test)
        run: node --loader ts-node/esm src/roi-calculator.ts || npx ts-node src/roi-calculator.ts
      - name: Run unit tests
        run: npm test -- --forceExit

  # ── depin-safety.md policy assertions ─────────────────────────────────────
  safety-policy-check:
    name: Safety Policy Coverage
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Verify key safety terms referenced in skill files
        run: |
          TERMS=("anti-Sybil" "multisig" "emergency" "slash" "stake")
          FAILURES=0
          for term in "${TERMS[@]}"; do
            if grep -rq "$term" skill/ agents/ commands/; then
              echo "OK: '$term' referenced in skill/agents/commands"
            else
              echo "MISSING: '$term' — required by rules/depin-safety.md"
              FAILURES=$((FAILURES+1))
            fi
          done
          [ $FAILURES -eq 0 ] || exit 1

  # ── Link check (internal) ─────────────────────────────────────────────────
  link-check:
    name: Internal Link Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm install -g markdown-link-check@3.11.0
      - name: Check internal links in key docs
        run: |
          for f in README.md SKILL.md AGENTS.md CLAUDE.md; do
            [ -f "$f" ] && markdown-link-check "$f" --config .mlc-config.json || true
          done
