#!/bin/bash

# Validate TypeScript and ESLint Hook
# This hook validates TypeScript compilation and ESLint rules after file modifications

# Read the JSON input from stdin
INPUT=$(cat)

# Extract the file path from the tool input
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty')

# If no file path, exit successfully
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only check TypeScript and JSX files
if [[ ! "$FILE_PATH" =~ \.(ts|tsx|js|jsx)$ ]]; then
  exit 0
fi

echo "🔍 Checking TypeScript and ESLint for: $FILE_PATH"

# Get the directory of the file
DIR=$(dirname "$FILE_PATH")
FILENAME=$(basename "$FILE_PATH")

# Check if it's in the ai-readiness-frontend directory
if [[ "$FILE_PATH" == *"ai-readiness-frontend"* ]]; then
  FRONTEND_DIR="/workspaces/ai-readiness/ai-readiness-frontend"
  
  # Run TypeScript check
  echo "📘 TypeScript check:"
  cd "$FRONTEND_DIR" && npx tsc --noEmit --skipLibCheck 2>&1 | grep -E "($FILENAME|error TS)" | head -10
  TS_EXIT=$?
  
  # Run ESLint check
  echo "📝 ESLint check:"
  cd "$FRONTEND_DIR" && npx eslint "$FILE_PATH" 2>&1 | head -20
  LINT_EXIT=$?
  
  if [ $TS_EXIT -ne 0 ] || [ $LINT_EXIT -ne 0 ]; then
    echo ""
    echo "⚠️  Fix required: The file has TypeScript or ESLint errors"
    echo "💡 Tips:"
    echo "  - Remove unused imports and variables"
    echo "  - Remove console.log statements or use proper logging"
    echo "  - Escape apostrophes in JSX with {\"'\"} or &apos;"
    echo "  - Fix React Hook dependencies"
    echo "  - Add missing return statements in useEffect"
  else
    echo "✅ No TypeScript or ESLint errors found"
  fi
fi

exit 0