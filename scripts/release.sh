#!/bin/bash

# Productify Pro Release Script
# Creates a new release with version bump and changelog

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║          📦 Productify Pro Release Script                  ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_ROOT"

# Get new version
NEW_VERSION=${1:-}

if [ -z "$NEW_VERSION" ]; then
    # Get current version from tauri.conf.json
    CURRENT_VERSION=$(grep -o '"version": "[^"]*"' apps/desktop/src-tauri/tauri.conf.json | head -1 | cut -d'"' -f4)
    echo -e "${YELLOW}Current version: ${CURRENT_VERSION}${NC}"
    echo ""
    read -p "Enter new version (e.g., 1.0.1): " NEW_VERSION

    if [ -z "$NEW_VERSION" ]; then
        echo -e "${RED}Error: Version cannot be empty${NC}"
        exit 1
    fi
fi

echo -e "${YELLOW}Creating release v${NEW_VERSION}...${NC}"
echo ""

# Step 1: Update version in tauri.conf.json
echo -e "${BLUE}Updating tauri.conf.json...${NC}"
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"${NEW_VERSION}\"/" apps/desktop/src-tauri/tauri.conf.json
echo -e "${GREEN}✓ tauri.conf.json updated${NC}"

# Step 2: Update version in Cargo.toml
echo -e "${BLUE}Updating Cargo.toml...${NC}"
sed -i '' "s/^version = \"[^\"]*\"/version = \"${NEW_VERSION}\"/" apps/desktop/src-tauri/Cargo.toml
echo -e "${GREEN}✓ Cargo.toml updated${NC}"

# Step 3: Update version in package.json
echo -e "${BLUE}Updating package.json...${NC}"
cd apps/desktop
npm version ${NEW_VERSION} --no-git-tag-version
cd "$PROJECT_ROOT"
echo -e "${GREEN}✓ package.json updated${NC}"

# Step 4: Update version in backend updates.py
echo -e "${BLUE}Updating backend version...${NC}"
sed -i '' "s/CURRENT_VERSION = \"[^\"]*\"/CURRENT_VERSION = \"${NEW_VERSION}\"/" apps/backend/app/api/routes/updates.py
echo -e "${GREEN}✓ Backend version updated${NC}"

echo ""

# Step 5: Build the release
echo -e "${YELLOW}Building release...${NC}"
./scripts/build.sh release

# Step 6: Create git tag
echo ""
read -p "Create git tag and push? (y/n): " CREATE_TAG

if [ "$CREATE_TAG" = "y" ]; then
    echo -e "${BLUE}Creating git tag...${NC}"
    git add -A
    git commit -m "Release v${NEW_VERSION}"
    git tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION}"
    git push origin main
    git push origin "v${NEW_VERSION}"
    echo -e "${GREEN}✓ Tag v${NEW_VERSION} created and pushed${NC}"
fi

echo ""
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║              Release v${NEW_VERSION} Complete! 🎉              ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo "Next steps:"
echo "  1. Upload installers to releases.productifypro.com"
echo "  2. Update release notes in GitHub Releases"
echo "  3. Announce the release"
echo ""
echo "Installers location:"
echo "  apps/desktop/src-tauri/target/release/bundle/"
