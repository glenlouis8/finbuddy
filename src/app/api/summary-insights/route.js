import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export async function POST(req) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return Response.json({ error: "Missing access token" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY, // Only for server-side secure ops
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );

  // ✅ 1. Get user from token
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ✅ 2. Fetch expenses
  const { data: expenses, error: expenseError } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", user.id);

  if (expenseError) {
    console.error("❌ Expense fetch error:", expenseError);
    return Response.json({ error: "Failed to fetch expenses." }, { status: 500 });
  }

  if (!expenses || expenses.length < 5) {
    return Response.json(
      { error: "Not enough data to generate insights. Add at least 5 expense records." },
      { status: 400 }
    );
  }

  // ✅ 3. Format data & Generate Hash
  const formatted = expenses.map((e) => ({
    category: e.category,
    amount: parseFloat(e.amount),
    date: e.date,
    items: e.ocr_parsed?.items || [],
  }));

  const dataString = JSON.stringify(formatted);
  const inputHash = crypto.createHash("sha256").update(dataString).digest("hex");

  // ✅ 4. Check Semantic Cache (Exact Match First)
  const { data: cachedSummary, error: cacheError } = await supabase
    .from("ai_summary_cache")
    .select("summary_text")
    .eq("user_id", user.id)
    .eq("input_hash", inputHash)
    .single();

  if (cachedSummary) {
    console.log("🚀 [Cache] Exact match found! Skipping OpenAI call.");
    return Response.json({ summary: cachedSummary.summary_text, cached: true });
  }

  // ✅ 5. Optional: Semantic Similarity Match (Visualizing similarity)
  // (In a full implementation, you'd call embeddings API here to find 'close enough' insights)

  const prompt = `
# ROLE
You are the **FinBuddy Elite Wealth Strategist**. Your mission is to transform raw spending data into a sophisticated, high-performance financial roadmap. You speak with the authority of a Hedge Fund Manager but the empathy of a close mentor.

# DATASET
The following JSON contains the user's recent spending history, including individual line items where available. **Identify patterns within the items themselves, not just the categories.**

USER DATA:
${dataString}

# CORE ANALYSIS STRATEGY
1.  **The "Market Sentiment" (Executive Summary)**: Start with a powerful, one-sentence "Status Report" on their financial health. Use a vibrant emoji (🚀, 📈, ⚖️, ⚠️) to set the tone.
2.  **Granular Profit & Loss (P&L)**:
    - Identify the **Top 3 High-Burn Categories**.
    - For the #1 category, drill down into the **Items**. (e.g., "You spent $200 on 'Dining Out', but $120 of that was specifically on 'Late-Night Snacks/Fast Food'").
3.  **Behavioral Coaching (The "Silent Leak")**: Look for high-frequency, low-value items (e.g., recurring $5 coffees, convenience store trips). Calculate the "Annualized Cost" of this habit to create a "Shock Value" insight.
4.  **Strategic Directives (Power Moves)**: Provide two highly specific, actionable "Wealth Moves." 
    - *Bad*: "Spend less on food."
    - *Good*: "Your 'Grocery' spend is heavy on 'Pre-packaged Meals'. Swapping 3 pre-packaged dinners for batch-cooked meals would save you ~$95 this month."
5.  **Critical Outlier**: Flag the single largest transaction and provide a brief "Necessity Assessment."

# FORMATTING (ReactMarkdown-ready)
- Use **BOLD** for emphasis and financial figures.
- Use `> [!TIP]` alert blocks (if supported) or stylized blockquotes.
- Use bulleted lists for scannability.
- Strictly under **160 words**.

# REQUIRED STRUCTURE
## 🏦 Executive Summary
[Market Sentiment]

## 🔍 Forensic Analysis
- **[Focus Category]**: $[Amount] ([%] of total). Point out specific items or vendors driving this.
- **Outlier Alert**: The $[Amount] purchase at [Merchant] represents [X]% of your total period spend.

## 💡 Wealth Strategy
[Tip 1 - Behavioral]
[Tip 2 - Optimization]
`;

  // ✅ 6. Call OpenAI
  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a financial analyst." },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
    }),
  });

  const gptData = await openaiRes.json();

  if (!openaiRes.ok) {
    console.error("❌ OpenAI API error:", JSON.stringify(gptData));
    return Response.json(
      { error: `OpenAI error: ${gptData?.error?.message || openaiRes.statusText}` },
      { status: 502 }
    );
  }

  const summary = gptData?.choices?.[0]?.message?.content;

  if (!summary) {
    console.error("❌ Unexpected OpenAI response shape:", JSON.stringify(gptData));
    return Response.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }

  // ✅ 7. Store in Cache & ai_summary
  await Promise.all([
    supabase.from("ai_summary_cache").upsert({
      user_id: user.id,
      input_hash: inputHash,
      summary_text: summary,
    }),
    supabase.from("ai_summary").upsert([
      {
        user_id: user.id,
        summary_text: summary,
      },
    ], { onConflict: "user_id" })
  ]);

  return Response.json({ summary, cached: false });
}
