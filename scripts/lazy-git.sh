#!/bin/bash

# --- Colors for better UX ---
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Show current status
echo -e "${BLUE}--- Current Git Status ---${NC}"
git status -s
echo ""

# Check if there are changes to commit
if [[ -z $(git status -s) ]]; then
    echo -e "${RED}No changes to commit! Exiting.${NC}"
    exit 1
fi

# 2. Ask for the Commit Type (Keyword)
echo -e "${YELLOW}Select the type of change:${NC}"
options=("feat" "fix" "bug" "chore" "refactor" "style" "docs" "perf" "CUSTOM")

PS3="Select a number: "
select type in "${options[@]}"; do
    if [[ "$type" == "CUSTOM" ]]; then
        read -p "Enter your custom keyword: " type
        break
    elif [[ -n "$type" ]]; then
        break
    else
        echo "Invalid selection. Please try again."
    fi
done

# 3. Ask for the Commit Message
echo ""
read -p "Enter your commit message: " message

if [[ -z "$message" ]]; then
    echo -e "${RED}Commit message cannot be empty! Exiting.${NC}"
    exit 1
fi

# 4. Construct the full message
FULL_MSG="$type: $message"

# 5. Execute Git Commands
echo -e "\n${BLUE}Running: git add .${NC}"
git add .

echo -e "${BLUE}Running: git commit -m \"$FULL_MSG\"${NC}"
git commit -m "$FULL_MSG"

echo -e "${BLUE}Running: git push${NC}"
git push

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}Success! Code pushed.${NC}"
else
    echo -e "\n${RED}Push failed. Check your connection or upstream settings.${NC}"
fi