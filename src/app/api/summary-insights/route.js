import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export async function POST(req) {
  try {
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

    // ✅ 2. Fetch expenses (cap at 50 most recent to avoid token limits)
    const { data: expenses, error: expenseError } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(50);

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
    const { data: cachedSummary } = await supabase
      .from("ai_summary_cache")
      .select("summary_text")
      .eq("user_id", user.id)
      .eq("input_hash", inputHash)
      .single();

    if (cachedSummary) {
      return Response.json({ summary: cachedSummary.summary_text, cached: true });
    }

    // ✅ 5. Optional: Semantic Similarity Match (Visualizing similarity)
    // (In a full implementation, you'd call embeddings API here to find 'close enough' insights)

    const prompt = `
# DATASET
The following JSON contains the user's recent spending history, including individual line items where available. Identify patterns within the items themselves, not just the categories.

USER DATA:
${dataString}

# CORE ANALYSIS STRATEGY
1. **Executive Summary**: One sentence on their overall financial health. Use an emoji (🚀, 📈, ⚖️, ⚠️) to set the tone.
2. **Top Burn Categories**: Identify the top 3 high-spend categories. For the #1 category, drill into the items (e.g., "You spent $200 on Dining Out, but $120 was specifically on late-night fast food").
3. **Silent Leak**: Find a high-frequency, low-value recurring item (e.g., daily coffees). State the annualized cost as a "shock value" insight.
4. **Wealth Moves**: Two specific, actionable tips — not generic advice. Reference actual items or vendors from the data.
5. **Outlier**: Flag the single largest transaction and briefly assess whether it looks necessary.

# FORMATTING
- Use **bold** for figures and key terms.
- Use blockquotes (\`>\`) for callout tips.
- Bullet points for scannability.
- 250–300 words max.

# REQUIRED STRUCTURE
## 🏦 Executive Summary
One-sentence status report on financial health.

## 🔍 Forensic Analysis
- **[Top Category]**: $X (Y% of total). Note specific items or vendors.
- **Silent Leak**: Recurring item costing ~$X/month, ~$X/year.
- **Outlier Alert**: Largest transaction — $X at [Merchant] — necessity assessment.

## 💡 Wealth Strategy
> Tip 1: Specific behavioral change referencing actual spend data.

> Tip 2: Specific optimization referencing actual items or vendors.
`;

    // ✅ 6. Call OpenAI
    let openaiRes;
    try {
      openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are FinBuddy, an elite personal finance strategist. You speak with the authority of a hedge fund manager but the empathy of a close mentor. You give sharp, specific, data-driven financial insights — never generic advice." },
            { role: "user", content: prompt },
          ],
          temperature: 0.5,
        }),
      });
    } catch (fetchErr) {
      console.error("❌ OpenAI network error:", fetchErr);
      return Response.json({ error: "Failed to reach OpenAI. Check your network or API key." }, { status: 502 });
    }

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
  } catch (err) {
    console.error("❌ Unhandled summary-insights error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
