# AI Readiness Assessment Tool

A comprehensive AI readiness assessment platform that helps organizations understand their AI adoption barriers and opportunities through employee surveys, advanced analytics, and role-based management capabilities.

## 🚀 Features

### Core Functionality
- **JTBD Framework Integration**: Unique Jobs-to-be-Done Forces of Progress analysis
- **Multi-Modal Input**: Voice and text response capabilities for survey questions
- **Role-Based Administration**: Three-tier access control system (user, org_admin, admin)
- **Modern Design**: Professional dark theme with teal/purple gradients
- **LLM-Powered Analysis**: AI-driven response classification and insights

### Key Components
1. **Authentication System**
   - Email/password authentication via Supabase Auth
   - Email verification and password reset
   - Role-based access control
   - Session management

2. **Survey Interface**
   - 16 JTBD-based questions
   - Voice recording with transcription
   - Text input with auto-save
   - Progress tracking and navigation
   - Mobile-responsive design

3. **Admin Console**
   - Survey management and analytics
   - User and organization management
   - JTBD force visualizations
   - Export functionality

4. **LLM Analysis**
   - OpenAI and Anthropic API support
   - JTBD force classification
   - Sentiment analysis
   - Theme extraction
   - Business impact assessment

5. **Data Export**
   - PDF, CSV, and JSON formats
   - GDPR-compliant anonymization
   - Role-based permissions
   - Audit logging

## 📋 Prerequisites

- Node.js 18+ and npm 9+
- Supabase account
- OpenAI or Anthropic API key
- SMTP server for emails

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/ai-readiness-assessment
cd ai-readiness-assessment
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your `.env.local` file:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# LLM Configuration
OPENAI_API_KEY=your_openai_api_key
# OR
ANTHROPIC_API_KEY=your_anthropic_api_key

# Other configurations...
```

5. Set up the database:
```bash
npm run db:setup
npm run db:migrate
npm run db:seed
```

6. Start the development server:
```bash
npm run dev
```

## 🏗️ Project Structure

```
ai-readiness-frontend/
├── app/                    # Next.js App Router pages
│   ├── auth/              # Authentication pages
│   ├── admin/             # Admin console
│   ├── survey/            # Survey interface
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/                # ShadCN UI components
│   ├── admin/             # Admin-specific components
│   ├── analytics/         # Data visualization
│   └── survey/            # Survey components
├── lib/                   # Utilities and services
│   ├── auth/              # Authentication helpers
│   ├── services/          # Business logic
│   ├── supabase/          # Database client
│   └── types/             # TypeScript definitions
├── supabase/              # Database migrations
└── public/                # Static assets
```

## 🎨 Design System

The application uses a modern dark theme with:
- **Primary**: Teal (#14b8a6)
- **Secondary**: Purple (#8b5cf6)
- **Accent**: Pink (#ec4899)
- **Background**: Deep black (#000000)
- **Glassmorphism**: Backdrop blur effects

## 🔐 Security

- Row Level Security (RLS) on all database tables
- Role-based access control
- Input sanitization and validation
- API rate limiting
- Secure session management
- GDPR-compliant data handling

## 📊 JTBD Forces Analysis

The platform analyzes responses according to four forces:

1. **Pain of the Old** - Current frustrations pushing change
2. **Pull of the New** - AI benefits attracting adoption
3. **Anchors to the Old** - Resistance to change
4. **Anxiety of the New** - Concerns about AI adoption

## 🧪 Testing

```bash
npm run test           # Run unit tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate coverage report
```

## 📦 Deployment

The application is optimized for deployment on Vercel:

```bash
npm run build  # Build for production
npm start      # Start production server
```

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🚀 Roadmap

- [ ] Mobile app development
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] API for third-party integrations
- [ ] Enterprise SSO support

## 📞 Support

For support, email support@aireadiness.com or open an issue in this repository.

---

Built with ❤️ using Next.js, TypeScript, Tailwind CSS, ShadCN, and Supabase# Test
