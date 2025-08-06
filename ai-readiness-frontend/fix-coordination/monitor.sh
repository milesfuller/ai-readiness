#!/bin/bash

# TypeScript Fix Monitoring Script
# Run by Fix Coordinator every 5 minutes

TIMESTAMP=$(date '+%Y-%m-%d-%H:%M:%S')
LOG_FILE="fix-coordination/monitoring-log.txt"
ERROR_COUNT_FILE="fix-coordination/error-count-history.txt"

echo "[$TIMESTAMP] Running TypeScript check..." >> $LOG_FILE

# Run type check and capture both stdout and stderr
TYPE_CHECK_OUTPUT=$(npm run type-check 2>&1)
TYPE_CHECK_EXIT_CODE=$?

# Count errors
ERROR_COUNT=$(echo "$TYPE_CHECK_OUTPUT" | grep -c "error TS")

# Log the results
echo "[$TIMESTAMP] Error count: $ERROR_COUNT" >> $LOG_FILE
echo "$TIMESTAMP,$ERROR_COUNT" >> $ERROR_COUNT_FILE

# If no errors, celebrate!
if [ $ERROR_COUNT -eq 0 ]; then
    echo "[$TIMESTAMP] 🎉 ALL TYPESCRIPT ERRORS FIXED!" >> $LOG_FILE
    echo "SUCCESS: All 192 TypeScript errors have been resolved!"
    exit 0
fi

# Check for improvement
if [ -f $ERROR_COUNT_FILE ]; then
    PREVIOUS_COUNT=$(tail -n 2 $ERROR_COUNT_FILE | head -n 1 | cut -d',' -f2)
    if [ "$PREVIOUS_COUNT" != "" ] && [ $ERROR_COUNT -lt $PREVIOUS_COUNT ]; then
        IMPROVEMENT=$((PREVIOUS_COUNT - ERROR_COUNT))
        echo "[$TIMESTAMP] ✅ Progress: $IMPROVEMENT errors fixed! ($ERROR_COUNT remaining)" >> $LOG_FILE
    fi
fi

# Extract specific error types for tracking
echo "$TYPE_CHECK_OUTPUT" | grep "error TS" > fix-coordination/current-errors.txt

echo "[$TIMESTAMP] Monitoring check complete. $ERROR_COUNT errors remaining." >> $LOG_FILE