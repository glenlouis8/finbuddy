# FinBuddy

AI-powered expense tracker. Snap a receipt → GPT-4o extracts every line item → semantic search, spending summaries, budget projections, and savings suggestions — all automated.

**[Live demo →](https://finbuddy-flame.vercel.app)**

![FinBuddy Dashboard](./assets/demo.png)

---

## Features

- **Receipt OCR** — upload a photo, GPT-4o Vision extracts amount, category, date, and itemized breakdown
- **Semantic search** — search transactions by intent ("coffee last week", "anything from Whole Foods") powered by pgvector
- **AI summaries** — GPT-4o-mini generates spending summaries with SHA-256 caching (~90% of requests skip the LLM entirely)
- **Per-receipt insights** — store name detection, unusual spending flags, category guesses stored in `insights_json`
- **Budget Shield** — velocity-based burnout projection, no LLM, compares daily spend rate vs `monthly_budget`
- **Smart Switch** — analyzes 50 recent transactions for recurring cost optimizations
- **Receipt viewer** — original receipt image accessible from any transaction, served via fresh server-side signed URLs
- **CSV export** — download any filtered transaction view
- **Date + category filters** — filter by this month, last 30/90 days, or this year

---

## How it works

1. **Upload** — receipt stored in Supabase Storage; `POST /api/ocr/full-process` sends a 60s signed URL to GPT-4o Vision (`temp=0`) and writes structured JSON + 1536-dim embedding back to `expenses`
2. **Embedding** — `text-embedding-3-small` vector stored on each expense row for semantic search via `match_expenses()` pgvector RPC
3. **Insights** — `POST /api/insights/process` runs GPT-4o-mini on raw OCR text, writes `{ store_name, detected_date, unusual_spending, category_guesses }` to `expenses.insights_json`
4. **Summary** — `POST /api/summary-insights` hashes the current expense snapshot (SHA-256), checks `ai_summary_cache`, returns cached result or calls GPT-4o-mini and caches the response
5. **Budget Shield** — `POST /api/budget-shield` computes `totalSpent / currentDay × daysInMonth` vs `profiles.monthly_budget`
6. **Smart Switch** — `POST /api/smart-switch` sends last 50 transactions to GPT-4o-mini, returns one high-impact savings suggestion

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 App Router, React 19 |
| AI | GPT-4o Vision, GPT-4o-mini, text-embedding-3-small |
| Database | Supabase Postgres + pgvector (ivfflat index) |
| Auth | Supabase Auth — Google OAuth + email/password |
| Storage | Supabase Storage (`receipts` bucket) |
| UI | Tailwind CSS, Framer Motion, Chart.js, Radix UI, Shadcn |
| Data fetching | SWR |
| Hosting | Vercel |

---

## Setup

```bash
npm install
cp .env.example .env.local   # fill in values below
npm run dev                  # http://localhost:3000
```

### Environment variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server-side only

# OpenAI
OPENAI_API_KEY=
```

### Database

Run migrations in order:

```bash
# 1. Vector search + match_expenses() RPC
supabase/migrations/20260210_vector_search.sql

# 2. AI summary cache table
supabase/migrations/20260210_semantic_cache.sql

# 3. Monthly budget column on profiles
supabase/migrations/20260211_add_budget.sql

# 4. RLS policies, function search_path, performance fixes
supabase/migrations/20260605_fix_security_and_performance.sql
```

Enable the `vector` extension in Supabase before running migrations.

---

## API routes

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/ocr/full-process` | GPT-4o Vision extraction + embedding write |
| `POST` | `/api/ocr/eval` | Same extraction, read-only (used by eval script) |
| `POST` | `/api/insights/process` | Per-receipt GPT-4o-mini insights |
| `POST` | `/api/summary-insights` | Cached spending summary |
| `POST` | `/api/search/semantic` | pgvector semantic search |
| `POST` | `/api/budget-shield` | Velocity-based budget projection |
| `POST` | `/api/smart-switch` | Savings suggestion from 50 recent transactions |
| `GET`  | `/api/receipt-url` | Generate fresh signed URL for receipt image |
| `DELETE` | `/api/delete-user` | Hard-delete all user data (service role) |

---

## Eval

Measures OCR extraction accuracy against ground truth:

```bash
# requires dev server running on localhost:3000
node evals/scripts/run_eval.js

# point at a different server
EVAL_BASE_URL=https://your-url.vercel.app node evals/scripts/run_eval.js
```

Compares extracted `amount`, `category`, and `items` against `evals/data/ground_truth.json`. Skips entries where the image file doesn't exist locally.
