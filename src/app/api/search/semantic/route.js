import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) return Response.json({ error: "Missing token" }, { status: 401 });

    const { query } = await req.json();
    if (!query) return Response.json({ error: "Missing query" }, { status: 400 });

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
            global: { headers: { Authorization: `Bearer ${token}` } },
        }
    );

    try {
        // 1. Generate text-embedding for the search query
        const embeddingRes = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: query,
        });
        const queryEmbedding = embeddingRes.data[0].embedding;

        // 2. Call the RPC match_expenses function
        const { data: expenses, error } = await supabase.rpc("match_expenses", {
            query_embedding: queryEmbedding,
            match_threshold: 0.35, // Adjust based on precision needs
            match_count: 10,
        });

        if (error) {
            console.error("❌ RPC Error:", error);
            return Response.json({ error: error.message }, { status: 500 });
        }

        return Response.json({ results: expenses });
    } catch (err) {
        console.error("🔥 Search API Error:", err);
        return Response.json({ error: "Search failed" }, { status: 500 });
    }
}
