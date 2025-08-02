const crypto = require('crypto');

console.log('🔐 Generating secure secrets for your application:\n');

// Generate CSRF Secret
const csrfSecret = crypto.randomBytes(32).toString('hex');
console.log('CSRF_SECRET=' + csrfSecret);

// Generate NextAuth Secret
const nextAuthSecret = crypto.randomBytes(32).toString('hex');
console.log('NEXTAUTH_SECRET=' + nextAuthSecret);

console.log('\n✅ Copy these values to your Vercel environment variables!');
console.log('⚠️  Keep these secret and never commit them to git!');