import { createClient } from "@supabase/supabase-js";

// Extracts the storage path from either a raw path or an expired signed URL
function extractPath(receiptUrl) {
  if (!receiptUrl) return null;
  // Already a raw path (upload-only format)
  if (!receiptUrl.startsWith("http")) return receiptUrl;
  // Signed URL format: .../object/sign/receipts/{path}?token=...
  const match = receiptUrl.match(/\/object\/(?:sign|public)\/receipts\/([^?]+)/);
  return match ? match[1] : null;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const expenseId = searchParams.get("id");
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token || !expenseId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: expense, error } = await supabase
    .from("expenses")
    .select("receipt_url")
    .eq("id", expenseId)
    .eq("user_id", user.id)
    .single();

  if (error || !expense?.receipt_url) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const storagePath = extractPath(expense.receipt_url);
  if (!storagePath) return Response.json({ error: "Invalid receipt path" }, { status: 400 });

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error: signError } = await adminSupabase.storage
    .from("receipts")
    .createSignedUrl(storagePath, 60 * 60); // 1 hour

  if (signError || !data?.signedUrl) {
    return Response.json({ error: "Failed to generate URL" }, { status: 500 });
  }

  return Response.json({ url: data.signedUrl });
}
