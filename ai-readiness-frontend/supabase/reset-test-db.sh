#!/bin/bash

# Reset Test Database
# This script resets the test database to a clean state

set -e

echo "🔄 Resetting Supabase Test Database..."

# Check if test instance is running
if ! docker ps | grep -q "supabase-db-test"; then
    echo "❌ Supabase test instance is not running."
    echo "   Run './start-test-instance.sh' first."
    exit 1
fi

# Reset database using the reset function
echo "🗑️  Clearing test data..."
docker exec -i supabase-db-test psql -U postgres -d postgres << 'EOF'
-- Reset test data
SELECT reset_test_data();

-- Also clean up auth users (test accounts)
DELETE FROM auth.users WHERE email LIKE '%test%' OR email LIKE '%example%';

-- Verify cleanup
SELECT 'Profiles: ' || COUNT(*) FROM public.profiles;
SELECT 'Organizations: ' || COUNT(*) FROM public.organizations;
SELECT 'Surveys: ' || COUNT(*) FROM public.surveys;
SELECT 'Survey Responses: ' || COUNT(*) FROM public.survey_responses;
SELECT 'Auth Users: ' || COUNT(*) FROM auth.users;
EOF

# Re-seed with fresh test data
echo "🌱 Re-seeding test data..."
if [ -f "seeds/test_data.sql" ]; then
    docker exec -i supabase-db-test psql -U postgres -d postgres < seeds/test_data.sql
    echo "✅ Test data re-seeded successfully"
else
    echo "⚠️  Seed file not found"
fi

echo "✅ Test database reset complete!"
echo ""
echo "📊 Database is ready for fresh tests"