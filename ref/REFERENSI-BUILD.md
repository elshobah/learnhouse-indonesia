# LearnHouse Development Guide for Claude

## Project Overview

**LearnHouse** is an open-source, next-generation platform for creating and managing world-class educational content. It's a full-featured learning management system (LMS) with support for courses, assignments, discussions, real-time collaboration, analytics, AI features, and more.

- **Repository**: learnhouse/learnhouse  
- **License**: AGPL-3.0 (Enterprise features available under separate Enterprise License)  
- **Current Version**: 1.1.2  
- **Author/Maintainer**: Sweave (Badr B.) - [@swve](https://github.com/swve)  

## Core Features

### Content & Learning
- 📖 **Courses** — Create and manage courses with ease
- ✏️ **Block-based Editor** — Powerful Notion-like content editor (Tiptap-based)
- 📦 **Collections** — Organize courses into curated bundles
- 📝 **Assignments** — Create tasks and track student submissions
- 💬 **Discussions** — Community forums for learners
- 🎙️ **Podcasts** — Audio content support
- 🎓 **Certificates** — Auto-generate on course completion

### Advanced Features
- 📊 **Analytics** — Track engagement and course performance
- 🧊 **Playgrounds** — AI-generated interactive elements, simulations & diagrams
- 💻 **Code Execution** — Real code execution with auto-grading (30+ languages)
- 📋 **Boards** — Real-time collaborative whiteboards (Yjs-based)
- 🧠 **AI Features** — Context-aware AI for learning & teaching

### Configuration & Administration
- 🔍 **SEO** — Built-in SEO with metadata, sitemaps, open graph
- 🎨 **Customization** — Custom branding, landing pages, theming
- 👥 **User Groups** — Organize learners and control access
- 💳 **Payments (Enterprise)** — Stripe integration, no lock-in
- 🔐 **SSO (Enterprise)** — OAuth providers, WorkOS integration
- 🏢 **Multi-Org (Enterprise)** — Run multiple organizations from single instance

## Tech Stack

### Frontend (Next.js / React)
- **Framework**: Next.js 16.2.3 (with Turbopack in dev)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **UI Components**: Radix UI
- **Rich Text Editor**: Tiptap (block-based, Notion-like)
- **Code Editor**: CodeMirror (syntax highlighting, 30+ languages)
- **Real-time Collab**: Yjs + Hocuspocus provider
- **Drag & Drop**: @hello-pangea/dnd
- **Icons**: Phosphor Icons, Simple Icons, Radix Icons
- **Other**: emoji-mart, react-markdown, recharts (analytics), SWR (data fetching)

### Backend (FastAPI / Python)
- **Framework**: FastAPI (async, modern)
- **Language**: Python 3.8+
- **ORM**: SQLModel (SQLAlchemy + Pydantic)
- **Database Migrations**: Alembic
- **Server**: Uvicorn (ASGI)
- **Real-time**: WebSocket support

### Database & Storage
- **Primary**: PostgreSQL (relational data, courses, users, enrollments)
- **Caching/Sessions**: Redis (in-memory store)
- **File Storage**: AWS S3 / Cloudflare R2 (S3-compatible)
- **Analytics**: Tinybird (events & metrics)

### Collaboration & Real-time
- **Collab Server**: Node.js + Hocuspocus (WebSocket-based)
- **Data Sync**: Yjs (CRDT for operational transformation)
- **Live Editing**: Board & course editor collaboration

### AI & LLMs
- **Primary LLM**: Google Gemini API
- **RAG/Indexing**: LlamaIndex (context-aware AI)

### Payments (Enterprise)
- **Payment Gateway**: Stripe
- **Features**: Subscriptions, one-time payments, coupons, tax handling

### Authentication (Enterprise)
- **SSO Providers**: WorkOS, OIDC
- **Additional Features**: SCORM support, audit logs

### DevOps & Deployment
- **Containerization**: Docker (multi-stage builds)
- **Orchestration**: Docker Compose (local dev) or Kubernetes (production)
- **CLI**: Custom Node.js CLI for setup, dev, and management

## Project Structure

```
learnhouse/
├── apps/
│   ├── web/                 # Frontend (Next.js + React)
│   │   ├── src/
│   │   │   ├── app/         # App router (pages, layouts)
│   │   │   ├── components/  # React components
│   │   │   ├── lib/         # Utilities, hooks, API clients
│   │   │   └── styles/      # Global styles, Tailwind config
│   │   ├── next.config.js   # Next.js configuration
│   │   ├── tsconfig.json    # TypeScript config
│   │   └── package.json     # Dependencies
│   │
│   ├── api/                 # Backend (FastAPI + Python)
│   │   ├── app.py           # FastAPI app entry point
│   │   ├── config/          # Configuration (config.yaml)
│   │   ├── routers/         # API route handlers
│   │   ├── db/              # Database models, schemas
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Custom middleware
│   │   ├── migrations/      # Alembic migrations
│   │   ├── ee/              # Enterprise features
│   │   │   ├── db/          # EE models (payments, sso, scorm)
│   │   │   ├── services/    # EE services (stripe, oidc)
│   │   │   ├── routers/     # EE endpoints
│   │   │   └── middleware/  # EE middleware (audit logs)
│   │   ├── alembic.ini      # Alembic configuration
│   │   ├── Dockerfile       # Production image
│   │   ├── docker-entrypoint.sh
│   │   ├── cli.py           # Python CLI utilities
│   │   └── package.json     # Node.js dependencies (Alembic via Node)
│   │
│   ├── collab/              # Real-time Collaboration Server
│   │   ├── index.ts         # WebSocket server (Hocuspocus)
│   │   ├── src/             # TypeScript source
│   │   ├── package.json     # Dependencies
│   │   └── Dockerfile       # Production image
│   │
│   └── cli/                 # Command Line Interface
│       ├── src/
│       │   ├── commands/    # CLI commands (setup, dev, start, etc.)
│       │   ├── utils/       # Helpers (Docker, config, validation)
│       │   └── index.ts     # CLI entry point
│       ├── package.json     # Dependencies
│       ├── README.md        # Full CLI documentation
│       └── tsconfig.json
│
├── .github/
│   ├── workflows/           # CI/CD pipelines
│   │   ├── api-tests.yaml   # Python tests
│   │   ├── api-lint.yaml    # Python linting
│   │   ├── web-lint.yaml    # TypeScript linting
│   │   ├── cli-tests.yaml   # CLI tests
│   │   └── release.yaml     # Release automation
│   └── ISSUE_TEMPLATE/      # Issue templates (bug, feature, team)
│
├── README.md                # Project overview
├── CONTRIBUTING.md          # Contribution guidelines
├── LICENSE                  # AGPL-3.0 license
├── Dockerfile               # Root Docker image
├── .dockerignore
├── docker-compose.dev.yml   # Local development stack
└── package.json             # Root package.json (monorepo)
```

## Development Workflow

### Getting Started

1. **Clone and setup**:
   ```bash
   git clone https://github.com/learnhouse/learnhouse.git
   cd learnhouse
   npx learnhouse dev
   ```
   This command:
   - Spins up PostgreSQL and Redis containers
   - Installs dependencies across all apps
   - Starts API, Web, and Collab servers with hot reload

2. **Manual setup** (if not using CLI):
   ```bash
   # Start services
   docker-compose -f docker-compose.dev.yml up -d
   
   # Install dependencies
   npm install                    # Root monorepo
   npm install --workspace=apps/web
   npm install --workspace=apps/api
   npm install --workspace=apps/collab
   npm install --workspace=apps/cli
   
   # Run migrations (API)
   cd apps/api && alembic upgrade head
   
   # Start dev servers
   npm run dev --workspace=apps/web      # http://localhost:3000
   npm run dev --workspace=apps/api      # http://localhost:8000
   npm run dev --workspace=apps/collab   # http://localhost:3001
   ```

### Service URLs (Development)
- **Web Frontend**: http://localhost:3000
- **API**: http://localhost:8000 (docs at /docs)
- **Collab Server**: http://localhost:3001
- **PostgreSQL**: localhost:5432 (local dev)
- **Redis**: localhost:6379 (local dev)

### CLI Commands
```bash
npx learnhouse dev              # Start all services with hot reload
npx learnhouse start            # Start services (production mode)
npx learnhouse stop             # Stop services
npx learnhouse update           # Update to latest version
npx learnhouse logs [service]   # Stream logs
npx learnhouse backup           # Backup database
npx learnhouse doctor           # Diagnose issues
```

## Database Schema

The project uses PostgreSQL with **Alembic** for schema migrations.

### Key Tables
- **users** — User accounts (teachers, students, admins)
- **courses** — Course definitions
- **chapters** — Course sections
- **lessons** — Individual lessons/modules
- **blocks** — Tiptap-based content blocks (text, code, images, etc.)
- **enrollments** — Student enrollment in courses
- **assignments** — Course assignments/tasks
- **submissions** — Student assignment submissions
- **discussions** — Course discussion threads
- **org_configs** — Organization configuration (branding, settings)
- **payments_* (EE)** — Stripe integration tables
- **sso_* (EE)** — SSO configuration
- **scorm_* (EE)** — SCORM standard support
- **audit_logs (EE)** — Compliance & audit trail

### Running Migrations
```bash
# In apps/api directory
alembic upgrade head            # Apply all pending migrations
alembic revision --autogenerate # Create new migration from model changes
alembic downgrade -1            # Rollback last migration
```

## Key Files & Modules

### Frontend (apps/web)
| File | Purpose |
|------|---------|
| `src/app/` | Next.js App Router (pages, layouts) |
| `src/components/` | Reusable React components |
| `src/lib/api.ts` | API client (fetch wrapper) |
| `src/lib/hooks/` | Custom React hooks |
| `src/types/` | TypeScript interfaces & types |
| `src/styles/globals.css` | Global Tailwind styles |
| `next.config.js` | Next.js config (image optimization, API proxying) |

### Backend (apps/api)
| File | Purpose |
|------|---------|
| `app.py` | FastAPI app initialization & middleware |
| `routers/` | API endpoints by feature (courses, users, auth, etc.) |
| `db/` | SQLModel models & database layer |
| `services/` | Business logic (course creation, enrollment, payments) |
| `ee/routers/` | Enterprise-only endpoints |
| `ee/services/` | Enterprise services (Stripe, OIDC, SCORM, audit) |
| `migrations/` | Alembic database migrations |
| `config/config.yaml` | Runtime configuration |

### Collaboration (apps/collab)
| File | Purpose |
|------|---------|
| `index.ts` | Hocuspocus WebSocket server setup |
| `src/` | Custom awareness & document handlers |

### CLI (apps/cli)
| File | Purpose |
|------|---------|
| `src/commands/` | Individual commands (setup, dev, start, etc.) |
| `src/utils/` | Shared utilities (Docker, config, validation) |
| `README.md` | Complete CLI documentation |

## Important Conventions

### Code Style
- **Frontend**: ESLint + TypeScript strict mode
- **Backend**: Python linting via flake8 (optional)
- **Formatting**: Prettier (frontend), Black (backend)

### API Endpoints
- All endpoints are RESTful
- Authentication: JWT tokens in Authorization header
- Response format: JSON with consistent error handling
- Docs available at `GET /docs` (Swagger/OpenAPI)

### Database Models
- Use SQLModel for database models (combines SQLAlchemy + Pydantic)
- Always include timestamps: `created_at`, `updated_at`
- Foreign keys with proper constraints and cascading

### Frontend Components
- Use Radix UI for unstyled, accessible components
- Tailwind for styling
- Tiptap extensions for rich text features
- Server Components where possible (Next.js best practice)

## Common Tasks & Patterns

### Adding a New API Endpoint
1. Create a router in `apps/api/routers/`
2. Define SQLModel for data
3. Add service logic in `apps/api/services/`
4. Include it in `apps/api/app.py`
5. Add Alembic migration if schema changed

### Adding a New Frontend Page
1. Create file in `apps/web/src/app/` (App Router)
2. Use `src/components/` for reusable parts
3. Fetch data via API client in `src/lib/api.ts`
4. Style with Tailwind + Radix UI components

### Real-time Features (Collab)
- Yjs handles distributed editing
- Hocuspocus syncs between Web client and Collab server
- WebSocket connection managed by @hocuspocus/provider

### Adding a Database Migration
```bash
cd apps/api
alembic revision --autogenerate -m "description of change"
# Edit migration file in migrations/
alembic upgrade head
```

## Enterprise Features (EE)

The `/ee` directory contains enterprise-only modules:
- **Payments**: Stripe integration (subscriptions, invoicing)
- **SSO**: WorkOS & OIDC providers
- **SCORM**: Standards-compliant course packaging
- **Audit Logs**: Compliance tracking

These are conditionally loaded via environment flags and license checks.

## Configuration

### API Configuration
- **File**: `apps/api/config/config.yaml`
- **Env Variables**: 
  - `DATABASE_URL` — PostgreSQL connection string
  - `REDIS_URL` — Redis connection
  - `S3_BUCKET` — AWS S3 bucket for media
  - `GEMINI_API_KEY` — Google Gemini API
  - `STRIPE_API_KEY` (EE) — Stripe secret key
  - `AUTH_SECRET` — JWT signing key

### Frontend Configuration
- **File**: `apps/web/next.config.js`
- **Env Variables** (`.env.local`):
  - `NEXT_PUBLIC_API_URL` — Backend API URL
  - `NEXT_PUBLIC_COLLAB_URL` — Collaboration server URL

## Contributing Guidelines

See [CONTRIBUTING.md](CONTRIBUTING.md) for full details:

1. **Bug Reports**: 
   - Open an issue with detailed reproduction steps
   - Include screenshots/videos if relevant
   - Wait for team approval before starting work

2. **Feature Requests**: 
   - Start a GitHub Discussion to propose the idea
   - Wait for team feedback and approval
   - Create an issue linked to the discussion
   - Create a feature branch and submit PR

3. **Pull Requests**:
   - One feature/fix per PR
   - Clear commit messages
   - Include tests where applicable
   - Reference related issues

## Useful Resources

- **Documentation**: https://docs.learnhouse.app
- **Discord Community**: https://discord.gg/CMyZjjYZ6x
- **Security Reports**: security@learnhouse.app
- **GitHub Issues**: https://github.com/learnhouse/learnhouse/issues
- **API Docs (dev)**: http://localhost:8000/docs

## Planning with Claude Chat

When using Claude Chat for comprehensive planning:

### Structure Your Requests
1. **Feature Overview**: What you want to build
2. **Acceptance Criteria**: What "done" looks like
3. **Dependencies**: Other features/PRs needed first
4. **Scope**: Estimated impact (frontend, backend, database, etc.)
5. **Constraints**: Performance, security, UX considerations

### Useful Context to Provide
- Affected components (if modifying existing features)
- Related code locations
- Database schema changes needed
- Integration points (third-party services)
- User roles/permissions involved

### Example Planning Prompt
```
I want to add a feature for bulk course enrollment.

Acceptance Criteria:
- Teachers can upload a CSV with student emails
- System creates enrollments automatically
- Sends notification emails to enrolled students
- Shows progress and errors in a modal

Scope: Backend (API endpoint, email service), Frontend (upload modal), Database (possibly)

Related: Current enrollment system in apps/api/routers/enrollments.py

Dependencies: Email service integration (already exists)
```

## Notes for Development

- **Monorepo**: Uses npm workspaces; changes in one app may affect others
- **Hot Reload**: All services support hot reload in development
- **Docker Required**: PostgreSQL and Redis run in containers
- **Database Migrations**: Always check Alembic migrations before deploying
- **Real-time Sync**: Yjs/Hocuspocus require both Web and Collab servers running
- **AI Features**: Require valid Gemini API key
- **Enterprise Features**: Require appropriate license/flags