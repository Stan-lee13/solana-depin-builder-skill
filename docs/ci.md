# CI/CD Configuration

## GitHub Actions Workflow

Copy this to `.github/workflows/ci.yml` after forking the repository:

```yaml
name: Skill Quality CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  markdown-lint:
    name: Markdown Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install markdownlint
        run: npm install -g markdownlint-cli
      - name: Lint markdown files
        run: markdownlint "**/*.md" --ignore node_modules --config .markdownlint.json

  skill-structure:
    name: Required File Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Verify required files exist
        run: |
          REQUIRED=(
            "AGENTS.md" "CLAUDE.md" "CONTRIBUTING.md" "SECURITY.md"
            "README.md" "SKILL.md" "ecosystem-signals.md" "install.sh"
            "rules/depin-safety.md"
          )
          MISSING=0
          for file in "${REQUIRED[@]}"; do
            if [ ! -f "$file" ]; then
              echo "MISSING: $file"
              MISSING=$((MISSING + 1))
            else
              echo "OK: $file"
            fi
          done
          if [ $MISSING -gt 0 ]; then exit 1; fi
```

## Running Locally

```bash
# Lint markdown
npm install -g markdownlint-cli
markdownlint "**/*.md" --ignore node_modules

# Check links
npm install -g markdown-link-check
find . -name "*.md" | xargs markdown-link-check

# Validate structure
bash -c '
  for f in AGENTS.md CLAUDE.md CONTRIBUTING.md SECURITY.md ecosystem-signals.md; do
    [ -f "$f" ] && echo "OK: $f" || echo "MISSING: $f"
  done
'
```
