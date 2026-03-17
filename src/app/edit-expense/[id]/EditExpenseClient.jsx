"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function EditExpenseClient({ id }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const fetchExpense = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/sign-in");
        return;
      }

      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("id", id)
        .eq("user_id", session.user.id)
        .single();

      if (error || !data) {
        router.push("/dashboard");
        return;
      }

      setAmount(data.amount);
      setCategory(data.category);
      setDescription(data.description || "");
      setDate(data.date);
      setLoading(false);
    };

    fetchExpense();
  }, [id, router]);

  const handleUpdate = async (e) => {
    e.preventDefault();

    const { error } = await supabase
      .from("expenses")
      .update({
        amount,
        category,
        description,
        date,
      })
      .eq("id", id);

    if (!error) {
      router.push("/dashboard");
    } else {
      alert("Failed to update expense.");
    }
  };

  if (loading) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-6 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <h1 className="text-2xl font-bold mb-6">Edit Expense</h1>

      <form onSubmit={handleUpdate} className="space-y-4 max-w-md">
        <div>
          <label className="block mb-1 font-medium">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:text-white"
          >
            {[
              "Food",
              "Transport",
              "Shopping",
              "Bills",
              "Health",
              "Travel",
              "Other",
            ].map((cat) => (
              <option key={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1 font-medium">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:text-white"
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}
