-- Sample Test Users
-- This script creates test users for automated testing

-- Insert test users into auth.users (if auth schema exists)
DO $$
BEGIN
    -- Check if auth schema exists (created by GoTrue)
    IF EXISTS (SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'auth') THEN
        -- Create test users
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            recovery_sent_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES 
        (
            '00000000-0000-0000-0000-000000000000',
            'test-user-id-1',
            'authenticated',
            'authenticated',
            'test@example.com',
            crypt('testpassword123', gen_salt('bf')),
            NOW(),
            NULL,
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"name": "Test User", "role": "user"}',
            NOW(),
            NOW(),
            '',
            '',
            '',
            ''
        ),
        (
            '00000000-0000-0000-0000-000000000000',
            'test-admin-id-1',
            'authenticated',
            'authenticated',
            'admin@example.com',
            crypt('adminpassword123', gen_salt('bf')),
            NOW(),
            NULL,
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"name": "Test Admin", "role": "system_admin"}',
            NOW(),
            NOW(),
            '',
            '',
            '',
            ''
        )
        ON CONFLICT (email) DO NOTHING;

        -- Create test identities
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES
        (
            'test-identity-1',
            'test-user-id-1',
            '{"sub": "test-user-id-1", "email": "test@example.com"}',
            'email',
            NOW(),
            NOW(),
            NOW()
        ),
        (
            'test-identity-2',
            'test-admin-id-1',
            '{"sub": "test-admin-id-1", "email": "admin@example.com"}',
            'email',
            NOW(),
            NOW(),
            NOW()
        )
        ON CONFLICT (provider, id) DO NOTHING;

        RAISE NOTICE 'Test users created successfully';
    ELSE
        RAISE NOTICE 'Auth schema not found, skipping user creation';
    END IF;
END
$$;