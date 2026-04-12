import OpenAI from "openai";
import { NextResponse } from "next/server";

// Eval-only endpoint: runs GPT-4o Vision on a base64 image and returns parsed JSON.
// Does NOT write to the database. Intended for use by evals/scripts/run_eval.js only.

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const { image, mimeType } = await req.json();

    if (!image || !mimeType) {
      return NextResponse.json({ error: "Missing image or mimeType" }, { status: 400 });
    }

    const dataUrl = `data:${mimeType};base64,${image}`;

    const chatRes = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract expense details from this receipt image. Return a JSON object with:
- amount (number, total)
- category (one of: "Food", "Transport", "Shopping", "Bills", "Health", "Travel", "Other")
- date (YYYY-MM-DD)
- description (summary of merchant or items)
- items (array of { name, price })

Return raw JSON only. No markdown.`,
            },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    });

    const content = chatRes.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[OCR EVAL ERROR]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
