#!/bin/bash

# Productify Pro Build Script
# Builds the desktop application for all platforms

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║           🚀 Productify Pro Build Script                   ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_ROOT"

# Parse arguments
BUILD_TYPE=${1:-release}
PLATFORM=${2:-all}

echo -e "${YELLOW}Build type: ${BUILD_TYPE}${NC}"
echo -e "${YELLOW}Platform: ${PLATFORM}${NC}"
echo ""

# Step 1: Install dependencies
echo -e "${YELLOW}📦 Step 1: Installing dependencies...${NC}"
cd apps/desktop
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 2: Build Frontend
echo -e "${YELLOW}🔨 Step 2: Building frontend...${NC}"
if [ "$BUILD_TYPE" = "release" ]; then
    npm run build
else
    npm run build -- --mode development
fi
echo -e "${GREEN}✓ Frontend built${NC}"
echo ""

# Step 3: Build Tauri App
echo -e "${YELLOW}📱 Step 3: Building Tauri desktop app...${NC}"

if [ "$BUILD_TYPE" = "release" ]; then
    if [ "$PLATFORM" = "all" ]; then
        npm run tauri build
    else
        npm run tauri build -- --target "$PLATFORM"
    fi
else
    npm run tauri build -- --debug
fi

echo -e "${GREEN}✓ Tauri app built${NC}"
echo ""

# Step 4: Display output locations
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                    Build Complete! 🎉                      ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${GREEN}Installers created at:${NC}"
echo ""

BUNDLE_DIR="apps/desktop/src-tauri/target/release/bundle"

if [ -d "$PROJECT_ROOT/$BUNDLE_DIR/msi" ]; then
    echo -e "  ${BLUE}Windows (MSI):${NC}"
    ls -la "$PROJECT_ROOT/$BUNDLE_DIR/msi/"*.msi 2>/dev/null || echo "    No MSI files found"
fi

if [ -d "$PROJECT_ROOT/$BUNDLE_DIR/dmg" ]; then
    echo -e "  ${BLUE}macOS (DMG):${NC}"
    ls -la "$PROJECT_ROOT/$BUNDLE_DIR/dmg/"*.dmg 2>/dev/null || echo "    No DMG files found"
fi

if [ -d "$PROJECT_ROOT/$BUNDLE_DIR/deb" ]; then
    echo -e "  ${BLUE}Linux (DEB):${NC}"
    ls -la "$PROJECT_ROOT/$BUNDLE_DIR/deb/"*.deb 2>/dev/null || echo "    No DEB files found"
fi

if [ -d "$PROJECT_ROOT/$BUNDLE_DIR/appimage" ]; then
    echo -e "  ${BLUE}Linux (AppImage):${NC}"
    ls -la "$PROJECT_ROOT/$BUNDLE_DIR/appimage/"*.AppImage 2>/dev/null || echo "    No AppImage files found"
fi

echo ""
echo -e "${YELLOW}To sign and notarize for distribution, see docs/SIGNING.md${NC}"
