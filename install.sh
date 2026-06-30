#!/usr/bin/env bash
# Solana DePIN Builder Skill — Installer
# Usage: curl -sSL https://raw.githubusercontent.com/Stan-lee13/solana-depin-builder-skill/main/install.sh | bash
# Or:    ./install.sh [--project | --global | --path <dir>]

set -euo pipefail

# ── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; MAGENTA='\033[0;35m'; CYAN='\033[0;36m'
WHITE='\033[1;37m'; DIM='\033[2m'; NC='\033[0m'

SKILL_NAME="solana-depin-builder-skill"
SKILL_REPO="https://github.com/Stan-lee13/solana-depin-builder-skill.git"
SKILL_VERSION="1.0.0"

# ── Banner ───────────────────────────────────────────────────────────────────
print_banner() {
  echo ""
  echo -e "${CYAN}┌─────────────────────────────────────────────────────────────────┐${NC}"
  echo -e "${CYAN}│${NC}                                                                 ${CYAN}│${NC}"
  echo -e "${CYAN}│${NC}  ${BLUE}██████╗ ${MAGENTA}███████╗${YELLOW}██████╗ ${GREEN}██╗███╗   ██╗${NC}                    ${CYAN}│${NC}"
  echo -e "${CYAN}│${NC}  ${BLUE}██╔══██╗${MAGENTA}██╔════╝${YELLOW}██╔══██╗${GREEN}██║████╗  ██║${NC}                    ${CYAN}│${NC}"
  echo -e "${CYAN}│${NC}  ${BLUE}██║  ██║${MAGENTA}█████╗  ${YELLOW}██████╔╝${GREEN}██║██╔██╗ ██║${NC}  ${WHITE}Builder Skill${NC}     ${CYAN}│${NC}"
  echo -e "${CYAN}│${NC}  ${BLUE}██║  ██║${MAGENTA}██╔══╝  ${YELLOW}██╔═══╝ ${GREEN}██║██║╚██╗██║${NC}  ${DIM}v${SKILL_VERSION}${NC}            ${CYAN}│${NC}"
  echo -e "${CYAN}│${NC}  ${BLUE}██████╔╝${MAGENTA}███████╗${YELLOW}██║     ${GREEN}██║██║ ╚████║${NC}                    ${CYAN}│${NC}"
  echo -e "${CYAN}│${NC}  ${BLUE}╚═════╝ ${MAGENTA}╚══════╝${YELLOW}╚═╝     ${GREEN}╚═╝╚═╝  ╚═══╝${NC}                    ${CYAN}│${NC}"
  echo -e "${CYAN}│${NC}                                                                 ${CYAN}│${NC}"
  echo -e "${CYAN}│${NC}  ${DIM}Build decentralized physical infrastructure on Solana${NC}       ${CYAN}│${NC}"
  echo -e "${CYAN}│${NC}  ${DIM}Node registry · Proof mechanisms · Reward systems · ZK${NC}      ${CYAN}│${NC}"
  echo -e "${CYAN}│${NC}                                                                 ${CYAN}│${NC}"
  echo -e "${CYAN}└─────────────────────────────────────────────────────────────────┘${NC}"
  echo ""
}

# ── Helpers ──────────────────────────────────────────────────────────────────
ok()   { echo -e "  ${GREEN}✅${NC} $*"; }
info() { echo -e "  ${CYAN}ℹ${NC}  $*"; }
warn() { echo -e "  ${YELLOW}⚠${NC}  $*"; }
fail() { echo -e "  ${RED}✗${NC}  $*" >&2; exit 1; }
step() { echo -e "\n${WHITE}▶ $*${NC}"; }

# ── Prerequisite check ───────────────────────────────────────────────────────
check_prerequisites() {
  step "Checking prerequisites"
  command -v git >/dev/null 2>&1 || fail "git is required. Install from https://git-scm.com"
  ok "git $(git --version | awk '{print $3}')"

  # Detect Claude Code
  if [ -d ".claude" ] || [ -f "CLAUDE.md" ] || [ -f ".claude/CLAUDE.md" ]; then
    ok "Claude Code project detected"
    CLAUDE_PROJECT=true
  else
    warn "No Claude Code project detected in current directory"
    CLAUDE_PROJECT=false
  fi
}

# ── Install target selection ─────────────────────────────────────────────────
select_install_target() {
  # Parse flags
  if [[ "${1:-}" == "--project" ]]; then
    INSTALL_DIR=".claude/skills"
    info "Installing to project: .claude/skills/$SKILL_NAME"
    return
  fi
  if [[ "${1:-}" == "--global" ]]; then
    INSTALL_DIR="$HOME/.claude/skills"
    info "Installing globally: $HOME/.claude/skills/$SKILL_NAME"
    return
  fi
  if [[ "${1:-}" == "--path" && -n "${2:-}" ]]; then
    INSTALL_DIR="$2"
    info "Installing to custom path: $INSTALL_DIR/$SKILL_NAME"
    return
  fi

  # Interactive selection
  echo ""
  echo -e "${WHITE}Where should the skill be installed?${NC}"
  echo ""
  echo -e "  ${CYAN}[1]${NC} Project  ${DIM}→ .claude/skills/$SKILL_NAME${NC}"
  echo -e "      ${DIM}Recommended for team projects (commit to git)${NC}"
  echo ""
  echo -e "  ${CYAN}[2]${NC} Global   ${DIM}→ ~/.claude/skills/$SKILL_NAME${NC}"
  echo -e "      ${DIM}Recommended for personal use across all projects${NC}"
  echo ""
  echo -e "  ${CYAN}[3]${NC} Custom path"
  echo ""
  printf "  ${WHITE}Choice [1]:${NC} "
  read -r choice </dev/tty
  choice="${choice:-1}"

  case "$choice" in
    1) INSTALL_DIR=".claude/skills" ;;
    2) INSTALL_DIR="$HOME/.claude/skills" ;;
    3)
      printf "  ${WHITE}Enter path:${NC} "
      read -r INSTALL_DIR </dev/tty
      ;;
    *) INSTALL_DIR=".claude/skills" ;;
  esac
}

# ── Clone or update ───────────────────────────────────────────────────────────
install_skill() {
  step "Installing skill"
  local target="$INSTALL_DIR/$SKILL_NAME"
  mkdir -p "$INSTALL_DIR"

  if [ -d "$target/.git" ]; then
    info "Skill already installed — updating to latest..."
    (cd "$target" && git fetch origin && git reset --hard origin/main --quiet)
    ok "Updated to latest main"
  else
    info "Cloning $SKILL_REPO..."
    git clone --depth=1 --quiet "$SKILL_REPO" "$target"
    ok "Cloned → $target"
  fi

  # Show what was installed
  FILE_COUNT=$(find "$target" -name "*.md" | wc -l | tr -d ' ')
  SKILL_COUNT=$(find "$target/skill" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
  AGENT_COUNT=$(find "$target/agents" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
  CMD_COUNT=$(find "$target/commands" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')

  echo ""
  echo -e "  ${DIM}Installed:  ${NC}${GREEN}${SKILL_COUNT} skill files${NC}  ${CYAN}${AGENT_COUNT} agents${NC}  ${YELLOW}${CMD_COUNT} commands${NC}  ${DIM}(${FILE_COUNT} total .md files)${NC}"
}

# ── CLAUDE.md registration ────────────────────────────────────────────────────
register_in_claude_md() {
  step "Registering in CLAUDE.md"
  local target="$INSTALL_DIR/$SKILL_NAME"

  # Find CLAUDE.md
  local claude_md=""
  if   [ -f "CLAUDE.md" ];        then claude_md="CLAUDE.md"
  elif [ -f ".claude/CLAUDE.md" ]; then claude_md=".claude/CLAUDE.md"
  fi

  local skill_ref="
## DePIN Builder Skill

- [$SKILL_NAME]($target/SKILL.md) — Node registry, proof mechanisms, reward systems, ZK compression, oracle integration, hardware supply chain, and network growth on Solana."

  if [ -n "$claude_md" ]; then
    if grep -q "$SKILL_NAME" "$claude_md" 2>/dev/null; then
      ok "Already registered in $claude_md"
    else
      echo "" >> "$claude_md"
      printf '%s\n' "$skill_ref" >> "$claude_md"
      ok "Registered in $claude_md"
    fi
  else
    # Create a minimal CLAUDE.md
    cat > "CLAUDE.md" << EOF
# Claude Project Configuration
$skill_ref
EOF
    ok "Created CLAUDE.md with skill registration"
  fi
}

# ── Dependency check ─────────────────────────────────────────────────────────
check_optional_deps() {
  step "Checking optional dependencies"

  # Anchor CLI
  if command -v anchor >/dev/null 2>&1; then
    ok "Anchor CLI $(anchor --version 2>/dev/null | head -1)"
  else
    warn "Anchor CLI not found — install with: cargo install --git https://github.com/coral-xyz/anchor avm --force && avm install latest"
  fi

  # Node.js
  if command -v node >/dev/null 2>&1; then
    ok "Node.js $(node --version)"
  else
    warn "Node.js not found — install from https://nodejs.org (required for SDK examples)"
  fi

  # Rust / Cargo
  if command -v cargo >/dev/null 2>&1; then
    ok "Rust $(rustc --version | awk '{print $2}')"
  else
    warn "Rust not found — install from https://rustup.rs (required for Anchor programs)"
  fi

  # Solana CLI
  if command -v solana >/dev/null 2>&1; then
    ok "Solana CLI $(solana --version | awk '{print $2}')"
  else
    warn "Solana CLI not found — install from https://docs.solana.com/cli/install-solana-cli-tools"
  fi
}

# ── Post-install summary ─────────────────────────────────────────────────────
print_success() {
  local target="$INSTALL_DIR/$SKILL_NAME"
  echo ""
  echo -e "${GREEN}┌─────────────────────────────────────────────────────────────────┐${NC}"
  echo -e "${GREEN}│${NC}  ${WHITE}DePIN Builder Skill installed successfully!${NC}                     ${GREEN}│${NC}"
  echo -e "${GREEN}└─────────────────────────────────────────────────────────────────┘${NC}"
  echo ""
  echo -e "${WHITE}Try these prompts in Claude Code:${NC}"
  echo ""
  echo -e "  ${CYAN}\"Load agents/depin-architect.md — design a sensor DePIN for air quality\"${NC}"
  echo -e "  ${CYAN}\"Load skill/zk-compression.md — help me compress device accounts for 100K nodes\"${NC}"
  echo -e "  ${CYAN}\"Load skill/proof-mechanisms.md — I need Proof of Coverage for a LoRa network\"${NC}"
  echo -e "  ${CYAN}\"Run /depin-audit on my DePIN protocol\"${NC}"
  echo -e "  ${CYAN}\"Run /node-economics to model operator ROI at different token prices\"${NC}"
  echo ""
  echo -e "${DIM}Skill location: $target${NC}"
  echo -e "${DIM}Documentation:  https://github.com/Stan-lee13/solana-depin-builder-skill${NC}"
  echo ""
}

# ── Main ─────────────────────────────────────────────────────────────────────
main() {
  print_banner
  check_prerequisites
  select_install_target "${@}"
  install_skill
  register_in_claude_md
  check_optional_deps
  print_success
}

main "${@}"
