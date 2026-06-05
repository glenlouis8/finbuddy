import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return Response.json({ error: "Missing access token" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: receipts, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .is("insights_json", null)
      .not("ocr_text", "is", null)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !receipts || receipts.length === 0) {
      return Response.json(
        { message: "No receipts to process." },
        { status: 200 }
      );
    }

    const receipt = receipts[0];

    const prompt = `Extract financial insights from this receipt OCR text.

Return a JSON object with this exact shape:
{
  "total_spent": number,
  "store_name": string,
  "items": string[],
  "detected_date": string,
  "insights": {
    "unusual_spending": boolean,
    "category_guesses": {
      "<item_name>": "<category>"
    }
  }
}

Receipt text:
${receipt.ocr_text}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a personal finance assistant. Always respond with valid JSON." },
        { role: "user", content: prompt },
      ],
    });

    const insights_json = JSON.parse(completion.choices[0].message.content);

    const { error: updateError } = await supabase
      .from("expenses")
      .update({ insights_json })
      .eq("id", receipt.id);

    if (updateError) {
      console.error("Failed to update Supabase:", updateError);
      return Response.json(
        { error: "Failed to store insights in DB" },
        { status: 500 }
      );
    }

    return Response.json({ status: "success", insights: insights_json });
  } catch (err) {
    console.error("Insights route error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
