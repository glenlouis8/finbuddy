# FinBuddy

Receipt-to-insight expense tracker. Upload a photo → GPT-4o Vision extracts line items → semantic search + spending summaries powered by pgvector and GPT-4o-mini.

**[Live demo →](https://finbuddy-flame.vercel.app)**

![FinBuddy Dashboard](./assets/demo.png)

---

## How it works

1. **Upload receipt** — stored in Supabase Storage, processed by GPT-4o Vision (`temperature: 0`, `response_format: json_object`) to extract amount, category, date, and line items
2. **Embedding** — each expense gets a `text-embedding-3-small` vector (1536-dim) stored in pgvector for semantic search
3. **Insights** — GPT-4o-mini generates per-receipt contextual insights, stored in `expenses.insights_json`
4. **Summary** — SHA-256 hash of current expense snapshot gates LLM calls; cached results served from `ai_summary_cache` (~90% of requests hit cache)
5. **Budget Shield** — velocity-based burnout projection (no LLM) against `profiles.monthly_budget`
6. **Smart Switch** — GPT-4o-mini analyzes 50 recent transactions for recurring cost optimizations

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 App Router, React 19, Framer Motion, Chart.js |
| AI | GPT-4o Vision, GPT-4o-mini, text-embedding-3-small |
| Database | Supabase (Postgres + pgvector with ivfflat index) |
| Auth | Clerk (UI) + Supabase JWT (API route verification + RLS) |

## Setup

```bash
cp .env.example .env.local
# fill in values
npm install
npm run dev
```

### Required environment variables

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

OPENAI_API_KEY=
```

Supabase migrations are in `supabase/migrations/`. Run them in order — `20260210_vector_search.sql` creates the `match_expenses()` pgvector RPC.

## Eval

OCR extraction accuracy is measured against ground truth:

```bash
# requires dev server running
node evals/scripts/run_eval.js
```

Compares extracted `amount`, `category`, and `items` against `evals/data/ground_truth.json`. Set `EVAL_BASE_URL` to point at a non-local server.
