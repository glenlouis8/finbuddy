import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
            global: { headers: { Authorization: `Bearer ${token}` } },
        }
    );

    try {
        const { data: { user } } = await supabase.auth.getUser();

        // 1. Fetch ALL recent transactions
        const { data: expenses } = await supabase
            .from("expenses")
            .select("category, description, amount, ocr_parsed")
            .eq("user_id", user.id)
            .order("date", { ascending: false })
            .limit(50);

        const dataForAI = (expenses || []).map(e => ({
            category: e.category,
            description: e.description,
            amount: e.amount,
            items: e.ocr_parsed?.items || []
        }));

        if (dataForAI.length < 3) {
            return Response.json({ suggestion: "Add more transactions to unlock AI-powered Smart Switch insights!" });
        }

        // 2. Ask GPT to find recurring patterns
        const systemPrompt = `
You are a Financial Optimization Expert. Analyze the provided list of expenses.
Identify ONE high-impact savings opportunity (recurring items, subscriptions, or bills).

Return a JSON object with:
- "title": A short action (e.g., "Bulk Buy Coffee", "Switch to Annual Disney+").
- "rationale": One concise sentence explaining WHY.
- "savings": A string like "$15/year" or "$5/month".

USER DATA:
${JSON.stringify(dataForAI)}
`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: systemPrompt }],
            response_format: { type: "json_object" },
            max_tokens: 200,
        });

        const result = JSON.parse(response.choices[0].message.content);
        return Response.json(result);
    } catch (err) {
        console.error(err);
        return Response.json({ error: "Failed to generate suggestions" }, { status: 500 });
    }
}
