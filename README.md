
![FinBuddy Demo](./assets/demo.png)

# 🤖 Project Vision: FinBuddy Elite
**FinBuddy** is a world-class Finance SaaS directed at bridging the gap between messy, real-world physical data and structured financial intelligence. Unlike traditional expense trackers, FinBuddy utilizes an **Advanced AI Intelligence Pipeline** to automate extraction, predict budget burnout, and provide proactive wealth strategies based on longitudinal spending patterns.

---

# 🚀 State-of-the-Art AI Architecture

### 1. High-Fidelity Vision Pipeline (GPT-4o)
We moved beyond legacy OCR to a native **GPT-4o Vision** architecture.
* **Granular Extraction**: Captures individual line items, quantities, and merchant-specific metadata.
* **Deterministic Parsing**: Enforced JSON schema outputs with `temperature: 0` for reliable, reproducible financial data.

### 2. Hybrid Semantic Search (Vector Intelligence)
Powered by **Supabase pgvector**, our search goes beyond keywords.
* **Embeddings**: Uses `text-embedding-3-small` to generate 1536-dimensional vector representations.
* **Intent-Based Discovery**: Find transactions by "vibes" or "categories" (e.g., searching for "morning routine" surfacing coffee shops and gym sessions).

### 3. Retrieval-Augmented Generation (Receipt RAG)
Every transaction is an interactive knowledge base.
* **Contextual Chat**: Grounded RAG allows users to ask specific questions like "Is this a business write-off?" or "Break down the tax on this lunch."
* **GPT-4o-mini Orchestration**: Optimized for 100ms-range response times while maintaining high analytical accuracy.

### 4. Proactive Predictors: Budget Shield & Smart Switch
* **Budget Shield**: A velocity-based predictor that projects month-end burn rates against user-defined limits.
* **Smart Switch**: An optimization engine analyzing recurring receipt items and manual bills to suggest bulk-buy or annual-plan savings.

### 5. Semantic Caching & Cost Engineering
To scale efficiently, we implemented a **Vector-Fingerprint Cache**:
* **Input Hashing**: Hashing transaction snapshots ensures we only call the LLM when data has meaningfully changed.
* **90% Cost Reduction**: Re-serving cached insights for static financial states optimizes token usage without sacrificing UX.

---

# �️ Enterprise-Grade Security & Stack

| Layer | Technologies |
|:---|:---|
| **Frontend** | **Next.js 15 (App Router)**, **React 19**, **Framer Motion** |
| **Intelligence** | **GPT-4o Vision**, **GPT-4o-mini**, `text-embedding-3-small` |
| **Data Layer** | **Supabase (PostgreSQL)** + **pgvector** |
| **Security** | **RLS (Row Level Security)** + **JWT Authentication** |
| **Architecture** | **Secure Dual-Client Logic** (Admin Role Verified by UID) |

---

# 📈 Engineering Challenges Overcome

### Problem: Handling High-Latency Vision Inference
**Solution**: Implemented a **Non-Blocking Background Worker**. The frontend receives a 201 Created immediately, and the `full-process` edge function updates the record via a secure Admin Client once GPT-4o Vision completes the analysis.

### Problem: Multi-Tenant LLM Privacy
**Solution**: Architected a **Context-Injection Guardrail**. The LLM is NEVER given raw database handles. It is provided with a sanitized, strictly-filtered JSON projection derived from a JWT-verified Supabase session, ensuring zero data leakage between users.

---

# 🧪 Evaluation Framework
We don't guess accuracy; we measure it.
```bash
node evals/scripts/run_eval.js
```
The specialized eval suite benchmarks our Vision extraction and Intelligence endpoints against ground-truth datasets to maintain a **95%+ accuracy floor**.

---
*FinBuddy: Turning physical receipts into proactive financial power.*

### Live Experience: [finbuddy-flame.vercel.app](https://finbuddy-flame.vercel.app)
