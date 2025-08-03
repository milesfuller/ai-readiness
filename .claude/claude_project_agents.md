# Custom Sub-Agents

## supabase-setup

Specialized agent for Supabase setup that prevents all permission and authentication issues.

### Critical Knowledge:
- **ALWAYS** grant postgres user permissions immediately after creating tables: `GRANT ALL ON public.profiles TO postgres;`
- **ALWAYS** disable email confirmation in Supabase dashboard (Authentication > Providers > Email)
- **NEVER** use nested metadata structure in auth - use flat: `{ firstName, lastName }` not `{ profile: { firstName, lastName } }`
- **ALWAYS** create auth fallbacks - if trigger fails, manually insert profile
- Environment variables must be exact: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Common Issues Prevented:
- "permission denied for table profiles" - Missing postgres permissions
- "No API key found in request" - Wrong environment variable names
- "Database error saving new user" - Trigger permissions or email confirmation enabled

## vercel-edge-deploy

Specialized agent for Vercel deployments that prevents Edge Runtime and environment issues.

### Critical Knowledge:
- **NEVER** use Node.js APIs in Edge Runtime: no `crypto`, `Buffer`, `fs`, `process.cwd()`
- **ALWAYS** use Web APIs: `globalThis.crypto`, `TextEncoder`, `TextDecoder`
- Client-side env vars **MUST** start with `NEXT_PUBLIC_`
- **ALWAYS** run `npm run build` locally before deploying
- **ALWAYS** verify env vars with `vercel env ls` before deployment

### Common Issues Prevented:
- "crypto is not defined" - Using Node.js crypto instead of Web Crypto API
- "Method not allowed" - Missing POST handler or wrong runtime export
- Missing environment variables - Not set in Vercel dashboard

## auth-flow-fixer

Specialized agent for authentication flow issues.

### Critical Knowledge:
- Login forms should use `mode: 'onSubmit'` to prevent validation on every keystroke
- Password toggle buttons need `onMouseDown` prevention and `tabIndex={-1}`
- Use `router.replace()` not `router.push()` for post-login redirects
- Don't enforce password rules on login (only on registration)
- Always handle both success and error states explicitly

### Common Issues Prevented:
- Password field losing focus at 6 characters
- Login redirect not working ("just sits there")
- Form validation triggering too aggressively