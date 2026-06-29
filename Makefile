# Makefile — solana-depin-builder-skill
# Provides a unified interface for all validation and example commands.
#
# Usage:
#   make help         — show all targets
#   make validate     — run all checks (structure, lint, tests)
#   make roi          — run the ROI calculator demo
#   make test         — run TypeScript unit tests
#   make anchor-build — build the Anchor skeleton

.PHONY: help validate roi test anchor-build lint structure-check safety-check

help:
	@echo ""
	@echo "  solana-depin-builder-skill"
	@echo ""
	@echo "  Targets:"
	@echo "    make validate       Run all checks: structure + lint + tests"
	@echo "    make roi            Run the DePIN ROI calculator demo"
	@echo "    make test           Run TypeScript unit tests"
	@echo "    make anchor-build   Build the Anchor skeleton program"
	@echo "    make lint           Markdown lint only"
	@echo "    make structure-check Verify required files exist"
	@echo "    make safety-check   Verify safety policy terms are referenced"
	@echo ""

validate: structure-check lint safety-check test
	@echo ""
	@echo "✅ All validation checks passed."
	@echo ""

roi:
	@echo "Running DePIN ROI calculator..."
	@cd examples/ts && npm install --silent && npx ts-node src/roi-calculator.ts

test:
	@echo "Running TypeScript unit tests..."
	@cd examples/ts && npm install --silent && npm test -- --forceExit

lint:
	@echo "Running markdownlint..."
	@which markdownlint > /dev/null 2>&1 || npm install -g markdownlint-cli@0.33.0
	@markdownlint "**/*.md" --ignore node_modules --config .markdownlint.json && echo "✅ Markdown lint passed"

structure-check:
	@echo "Checking required files..."
	@MISSING=0; \
	for f in AGENTS.md CLAUDE.md CONTRIBUTING.md SECURITY.md README.md SKILL.md \
	          ecosystem-signals.md install.sh rules/depin-safety.md \
	          examples/ts/README.md examples/ts/src/roi-calculator.ts \
	          examples/anchor/README.md \
	          examples/anchor/programs/depin-registry/src/lib.rs; do \
	  if [ -f "$$f" ]; then echo "  OK: $$f"; \
	  else echo "  MISSING: $$f"; MISSING=$$((MISSING+1)); fi; \
	done; \
	[ "$$MISSING" -eq 0 ] || exit 1
	@echo "✅ Structure check passed"

safety-check:
	@echo "Checking safety policy coverage..."
	@FAILURES=0; \
	for term in "anti-Sybil" "multisig" "emergency" "slash" "stake"; do \
	  if grep -rq "$$term" skill/ agents/ commands/ 2>/dev/null; then \
	    echo "  OK: '$$term' referenced"; \
	  else echo "  MISSING: '$$term'"; FAILURES=$$((FAILURES+1)); fi; \
	done; \
	[ "$$FAILURES" -eq 0 ] || exit 1
	@echo "✅ Safety policy check passed"

anchor-build:
	@echo "Building Anchor skeleton..."
	@cd examples/anchor && anchor build
	@echo "✅ Anchor build succeeded"
