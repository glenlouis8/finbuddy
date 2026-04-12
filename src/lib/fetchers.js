import { supabase } from "@/lib/supabaseClient";

export const getExpenses = async (uid) => {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", uid)
    .order("date", { ascending: false });

  if (error) {
    console.error("❌ Supabase error in getExpenses:", error);
    throw error;
  }

  return data;
};

export const getSmartSummary = async (uid) => {
  try {
    const { data, error } = await supabase
      .from("ai_summary")
      .select("summary_text,updated_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("❌ Supabase error in getSmartSummary:", error);
      throw error;
    }

    if (!data) return null;
    return {
      summary: data.summary_text ?? null,
      updated_at: data.updated_at ?? null,
    };
  } catch (err) {
    console.error("getSmartSummary unexpected error:", err);
    return null;
  }
};
