#!/usr/bin/env bash
# solana-depin-builder-skill installer
# Installs the DePIN Builder skill into your Claude Code / Codex project

set -euo pipefail

SKILL_NAME="solana-depin-builder-skill"
SKILL_REPO="https://github.com/Stan-lee13/solana-depin-builder-skill.git"
SKILLS_DIR=".claude/skills"
TARGET_DIR="$SKILLS_DIR/$SKILL_NAME"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Solana DePIN Builder Skill — Installer          ║${NC}"
echo -e "${CYAN}║   Build decentralized physical infrastructure      ║${NC}"
echo -e "${CYAN}║   networks on Solana                               ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

# Check for git
if ! command -v git &> /dev/null; then
  echo -e "${RED}Error: git is required.${NC}"
  exit 1
fi

# Create skills directory
mkdir -p "$SKILLS_DIR"

# Install or update
if [ -d "$TARGET_DIR" ]; then
  echo -e "${YELLOW}Skill already installed. Updating...${NC}"
  cd "$TARGET_DIR" && git pull origin main && cd - > /dev/null
  echo -e "${GREEN}✅ Updated $SKILL_NAME${NC}"
else
  echo -e "Installing ${CYAN}$SKILL_NAME${NC}..."
  git clone --depth=1 "$SKILL_REPO" "$TARGET_DIR"
  echo -e "${GREEN}✅ Installed → $TARGET_DIR${NC}"
fi

# Register in CLAUDE.md
CLAUDE_MD="CLAUDE.md"
[ ! -f "$CLAUDE_MD" ] && [ -f ".claude/CLAUDE.md" ] && CLAUDE_MD=".claude/CLAUDE.md"

SKILL_REF="
## Skills

- [$SKILL_NAME]($TARGET_DIR/SKILL.md) — DePIN network design, node registry, oracle integration, proof-of-coverage, reward systems, data marketplace, and network growth on Solana"

if [ -f "$CLAUDE_MD" ]; then
  if ! grep -q "$SKILL_NAME" "$CLAUDE_MD"; then
    echo "" >> "$CLAUDE_MD"
    echo "$SKILL_REF" >> "$CLAUDE_MD"
    echo -e "${GREEN}✅ Registered in $CLAUDE_MD${NC}"
  else
    echo -e "${YELLOW}Already registered in $CLAUDE_MD${NC}"
  fi
else
  cat > CLAUDE.md << EOF
# Claude Project Configuration
$SKILL_REF
EOF
  echo -e "${GREEN}✅ Created CLAUDE.md${NC}"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   DePIN Builder Skill installed successfully!     ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Try these prompts in Claude Code:"
echo ""
echo -e "  ${CYAN}\"Load agents/depin-architect.md — I want to build a decentralized sensor network\"${NC}"
echo -e "  ${CYAN}\"Load skill/reward-system.md and help me design node rewards\"${NC}"
echo -e "  ${CYAN}\"Run /depin-audit on my DePIN protocol\"${NC}"
echo -e "  ${CYAN}\"Run /node-economics to model operator ROI\"${NC}"
echo ""
echo -e "Skill location: ${CYAN}$TARGET_DIR${NC}"
echo ""
