"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import LoaderSpinner from "@/components/ui/LoaderSpinner";
import { ArrowLeft, Download } from "lucide-react";

export default function ReceiptPage() {
  const { id } = useParams();
  const router = useRouter();
  const [expense, setExpense] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/sign-in"); return; }

      const { data, error } = await supabase
        .from("expenses")
        .select("id, category, amount, date, receipt_url, insights_json")
        .eq("id", id)
        .eq("user_id", session.user.id)
        .single();

      if (error || !data) { setError("Receipt not found."); setLoading(false); return; }
      if (!data.receipt_url) { setError("No receipt image for this expense."); setLoading(false); return; }

      setExpense(data);

      // Generate a fresh signed URL server-side
      const res = await fetch(`/api/receipt-url?id=${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.url) { setError("Could not load receipt image."); setLoading(false); return; }

      setImageUrl(json.url);
      setLoading(false);
    }
    load();
  }, [id, router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <LoaderSpinner />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-gray-950 text-gray-500">
      <p>{error}</p>
      <button onClick={() => router.back()} className="text-indigo-500 hover:underline flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Go back
      </button>
    </div>
  );

  const storeName = expense.insights_json?.store_name || expense.category;
  const date = new Date(expense.date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <a
            href={imageUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" /> Download
          </a>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-800">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
            <h1 className="text-xl font-extrabold tracking-tight">{storeName}</h1>
            <p className="text-sm text-gray-400 mt-0.5">{date} · ${Number(expense.amount).toFixed(2)}</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-950">
            <img
              src={imageUrl}
              alt={`Receipt from ${storeName}`}
              className="w-full rounded-2xl object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
