#!/bin/bash
set -e

# Configuration
REPO="gamekit-agent/gamekit-cli"
INSTALL_DIR="$HOME/.gamekit/bin"
BINARY_NAME="gamekit"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Installing gamekit...${NC}"

# Detect OS
OS="$(uname -s)"
case "$OS" in
    Linux*)     PLATFORM="linux";;
    Darwin*)    PLATFORM="darwin";;
    CYGWIN*|MINGW*|MSYS*)
        echo -e "${RED}Please use install.ps1 for Windows${NC}"
        exit 1
        ;;
    *)
        echo -e "${RED}Unsupported operating system: $OS${NC}"
        exit 1
        ;;
esac

# Detect architecture
ARCH="$(uname -m)"
case "$ARCH" in
    x86_64|amd64)   ARCH="x64";;
    arm64|aarch64)  ARCH="arm64";;
    *)
        echo -e "${RED}Unsupported architecture: $ARCH${NC}"
        exit 1
        ;;
esac

# Linux only supports x64 for now
if [ "$PLATFORM" = "linux" ] && [ "$ARCH" = "arm64" ]; then
    echo -e "${YELLOW}Warning: Linux ARM64 not yet supported, trying x64...${NC}"
    ARCH="x64"
fi

BINARY="gamekit-${PLATFORM}-${ARCH}"
echo "Detected: $PLATFORM-$ARCH"

# Get latest release URL
echo "Fetching latest release..."
RELEASE_URL="https://api.github.com/repos/${REPO}/releases/latest"
DOWNLOAD_URL=$(curl -sL "$RELEASE_URL" | grep "browser_download_url.*${BINARY}\"" | cut -d '"' -f 4)

if [ -z "$DOWNLOAD_URL" ]; then
    echo -e "${RED}Failed to find download URL for ${BINARY}${NC}"
    echo "Please check https://github.com/${REPO}/releases for available binaries"
    exit 1
fi

# Create install directory
mkdir -p "$INSTALL_DIR"

# Download binary
echo "Downloading from $DOWNLOAD_URL..."
curl -sL "$DOWNLOAD_URL" -o "$INSTALL_DIR/$BINARY_NAME"

# Make executable
chmod +x "$INSTALL_DIR/$BINARY_NAME"

# Remove macOS quarantine attribute (prevents "damaged" error for unsigned binaries)
xattr -d com.apple.quarantine "$INSTALL_DIR/$BINARY_NAME" 2>/dev/null || true

echo -e "${GREEN}Installed gamekit to $INSTALL_DIR/$BINARY_NAME${NC}"

# Add to PATH instructions
SHELL_NAME=$(basename "$SHELL")
case "$SHELL_NAME" in
    zsh)  PROFILE="$HOME/.zshrc";;
    bash) PROFILE="$HOME/.bashrc";;
    *)    PROFILE="$HOME/.profile";;
esac

# Check if already in PATH
if [[ ":$PATH:" == *":$INSTALL_DIR:"* ]]; then
    echo -e "${GREEN}$INSTALL_DIR is already in your PATH${NC}"
else
    echo ""
    echo -e "${YELLOW}Add gamekit to your PATH by running:${NC}"
    echo ""
    echo "  echo 'export PATH=\"\$PATH:$INSTALL_DIR\"' >> $PROFILE"
    echo "  source $PROFILE"
    echo ""

    # Offer to add automatically (default: yes)
    # Read from /dev/tty to work with curl | bash
    read -p "Add to PATH automatically? [Y/n] " -n 1 -r < /dev/tty
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        echo "export PATH=\"\$PATH:$INSTALL_DIR\"" >> "$PROFILE"
        echo -e "${GREEN}Added to $PROFILE${NC}"
        echo "Run 'source $PROFILE' or restart your terminal to use gamekit"
    fi
fi

echo ""
echo -e "${GREEN}Installation complete!${NC}"
echo ""
echo "Get started:"
echo "  gamekit --help"
echo "  gamekit init"
