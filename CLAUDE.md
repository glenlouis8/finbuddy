# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server on http://localhost:3000
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint + Next.js lint
node evals/scripts/run_eval.js  # Run AI accuracy benchmarks (amount, category, item recall)
```

No automated test suite — the eval framework in `evals/` is the primary quality gate, targeting 95%+ accuracy on receipt extraction. Ground truth data is in `evals/data/ground_truth.json`.

## Architecture

FinBuddy is a **Next.js 15 App Router** app with a 7-tier AI intelligence stack:

### AI Pipeline (most important to understand)

| Tier | Endpoint | Model | Purpose |
|------|----------|-------|---------|
| Vision | `POST /api/ocr/full-process` | GPT-4o (temp=0) | Extract amount/category/date/items[] from receipt images |
| Embedding | same route | text-embedding-3-small (1536-dim) | Store vector on expense for semantic search |
| Search | `POST /api/search/semantic` | pgvector RPC | `match_expenses()` — find transactions by intent |
| RAG | `POST /api/insights/process` | GPT-4o-mini (temp=0.2) | Per-receipt contextual insights stored in `expenses.insights_json` |
| Summary | `POST /api/summary-insights` | GPT-4o-mini (temp=0.5) | Spending summaries with SHA-256 exact-match cache |
| Optimizer | `POST /api/smart-switch` | GPT-4o-mini | Analyze 50 recent transactions → savings suggestions |
| Predictor | `POST /api/budget-shield` | (no LLM) | Velocity-based burnout projection vs `profiles.monthly_budget` |

### Data Flow

1. User uploads receipt → Supabase Storage (signed URL) → GPT-4o Vision → structured JSON + embedding → `expenses` table
2. Dashboard fetches expenses via SWR → calls `/api/summary-insights` (checks `ai_summary_cache` by SHA-256 hash first)
3. Semantic search: user query → embed → pgvector RPC → ranked expense rows

### Database (Supabase + pgvector)

Key tables:
- **`expenses`** — core rows with `embedding vector(1536)`, `ocr_parsed jsonb`, `insights_json jsonb`, `receipt_url`
- **`profiles`** — per-user `monthly_budget` (default 2000)
- **`ai_summary_cache`** — SHA-256 hash + embedding cache; `UNIQUE(user_id, input_hash)` prevents redundant LLM calls (90% cost reduction)

Migrations are in `supabase/migrations/`. The pgvector RPC `match_expenses` is defined in `20260210_vector_search.sql`.

### Auth

Dual-layer: **Clerk** (primary user auth — sign-in/sign-up UI) + **Supabase Auth Helpers** (JWT passed as `Authorization: Bearer <token>` to API routes). `src/lib/SupabaseWrapper.jsx` provides the session context enabling `useUser()` and `useSupabaseClient()` hooks. Row-level security (RLS) enforces multi-tenant isolation on all tables.

### Frontend

- Path alias: `@/` → `src/`
- Dark mode via Tailwind CSS class + localStorage
- Animations: Framer Motion throughout
- Data fetching: SWR with caching; fetchers in `src/lib/fetchers.js`
- Charts: Chart.js via react-chartjs-2
- Toast notifications: Sonner
- UI primitives: Radix UI + Shadcn/ui (`src/components/ui/`)
- Admin Supabase client in `src/lib/supabaseAdmin.js` (service role key — server-side only)

### Caching Strategy

`/api/summary-insights`:
1. Hash current expense snapshot (SHA-256)
2. Lookup `ai_summary_cache` by `(user_id, input_hash)`
3. Cache hit → return instantly; cache miss → call GPT-4o-mini → store result

## Required Environment Variables

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # server-side only, never expose to client

# OpenAI
OPENAI_API_KEY=
```
