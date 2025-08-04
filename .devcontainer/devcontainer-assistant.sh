#!/bin/bash

# DevContainer Assistant - Interactive helper for safe devcontainer management
# This script guides through safe devcontainer modifications

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🤖 DevContainer Assistant${NC}"
echo "=========================="
echo ""

# Function to show menu
show_menu() {
    echo "What would you like to do?"
    echo "1) Check current setup safety"
    echo "2) Validate devcontainer.json"
    echo "3) Test a configuration"
    echo "4) Backup current config"
    echo "5) Rollback to previous config"
    echo "6) Show available configs"
    echo "7) Progressive enhancement wizard"
    echo "8) Emergency recovery info"
    echo "9) Exit"
    echo ""
    read -p "Enter choice [1-9]: " choice
}

# Check if using volume mount
check_mount_type() {
    echo -e "\n${YELLOW}Checking mount type...${NC}"
    if mount | grep -q "workspaces.*ext4"; then
        echo -e "${RED}⚠️  WARNING: Using container volume mount!${NC}"
        echo "Your code is in a Docker volume. Backup before changes!"
        return 1
    else
        echo -e "${GREEN}✅ Using bind mount (safer)${NC}"
        return 0
    fi
}

# Check git status
check_git_status() {
    echo -e "\n${YELLOW}Checking Git status...${NC}"
    if [ -d .git ]; then
        UNCOMMITTED=$(git status --porcelain | wc -l)
        if [ $UNCOMMITTED -gt 0 ]; then
            echo -e "${YELLOW}⚠️  You have $UNCOMMITTED uncommitted changes${NC}"
            echo "Consider committing before devcontainer changes:"
            echo "  git add ."
            echo "  git commit -m 'Backup before devcontainer changes'"
            echo "  git push"
        else
            echo -e "${GREEN}✅ All changes committed${NC}"
        fi
    fi
}

# Validate config
validate_config() {
    echo -e "\n${YELLOW}Validating devcontainer.json...${NC}"
    if [ -f "validate-devcontainer.js" ]; then
        node validate-devcontainer.js
    else
        echo -e "${RED}Validator not found!${NC}"
    fi
}

# Test configuration
test_config() {
    echo -e "\n${YELLOW}Available configurations:${NC}"
    ls -1 *.json | grep -E "(devcontainer|\.json)" | nl
    read -p "Enter number to test: " num
    CONFIG=$(ls -1 *.json | grep -E "(devcontainer|\.json)" | sed -n "${num}p")
    
    if [ -f "$CONFIG" ]; then
        echo -e "\n${YELLOW}Testing $CONFIG...${NC}"
        cp devcontainer.json devcontainer.json.current
        cp "$CONFIG" devcontainer.json
        node validate-devcontainer.js
        cp devcontainer.json.current devcontainer.json
        rm devcontainer.json.current
    fi
}

# Backup current config
backup_config() {
    BACKUP_NAME="devcontainer-backup-$(date +%Y%m%d-%H%M%S).json"
    cp devcontainer.json "$BACKUP_NAME"
    echo -e "${GREEN}✅ Backed up to $BACKUP_NAME${NC}"
}

# Show available configs
show_configs() {
    echo -e "\n${BLUE}Available configurations:${NC}"
    echo "========================"
    for config in *.json; do
        if [[ $config == devcontainer*.json ]]; then
            echo -e "\n${YELLOW}$config:${NC}"
            if [ -f "$config" ]; then
                head -n 3 "$config" | grep -E "(name|image)" || echo "  (No description)"
            fi
        fi
    done
}

# Progressive enhancement wizard
enhancement_wizard() {
    echo -e "\n${BLUE}Progressive Enhancement Wizard${NC}"
    echo "=============================="
    echo "This will help you safely add features one by one."
    echo ""
    
    # Start with minimal
    echo -e "${YELLOW}Step 1: Starting with minimal config${NC}"
    cp devcontainer-minimal.json devcontainer-test.json
    
    # Add Docker
    read -p "Add Docker-in-Docker? (y/n): " add_docker
    if [ "$add_docker" = "y" ]; then
        echo "Adding Docker feature..."
        # Would need jq for proper JSON manipulation
        echo "Note: Manual edit needed - add Docker feature to devcontainer-test.json"
    fi
    
    # Add other features
    read -p "Add Git and GitHub CLI? (y/n): " add_git
    if [ "$add_git" = "y" ]; then
        echo "Adding Git features..."
        echo "Note: Manual edit needed - add Git features to devcontainer-test.json"
    fi
    
    echo -e "\n${GREEN}Enhancement plan created in devcontainer-test.json${NC}"
    echo "Review and test before using!"
}

# Emergency info
show_emergency_info() {
    echo -e "\n${RED}Emergency Recovery Information${NC}"
    echo "============================="
    echo ""
    echo "If container won't start:"
    echo "1. From outside VS Code, find your volume:"
    echo "   docker volume ls | grep vscode"
    echo ""
    echo "2. Mount volume to recover:"
    echo "   docker run -it --rm -v <volume>:/workspace ubuntu bash"
    echo ""
    echo "3. Copy files out:"
    echo "   docker cp <container>:/workspaces ~/recovery"
    echo ""
    echo "See DEVCONTAINER_RECOVERY_GUIDE.md for full details"
}

# Main loop
cd /workspaces/ai-readiness/.devcontainer

while true; do
    echo ""
    show_menu
    
    case $choice in
        1)
            check_mount_type
            check_git_status
            ;;
        2)
            validate_config
            ;;
        3)
            test_config
            ;;
        4)
            backup_config
            ;;
        5)
            if [ -f "rollback-devcontainer.sh" ]; then
                ./rollback-devcontainer.sh
            else
                echo -e "${RED}Rollback script not found!${NC}"
            fi
            ;;
        6)
            show_configs
            ;;
        7)
            enhancement_wizard
            ;;
        8)
            show_emergency_info
            ;;
        9)
            echo -e "${GREEN}Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice!${NC}"
            ;;
    esac
done