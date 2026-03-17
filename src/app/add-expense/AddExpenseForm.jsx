"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import ReceiptUpload from "@/components/ReceiptUpload";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "@supabase/auth-helpers-react";

const categories = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Health",
  "Travel",
  "Other",
];

export default function AddExpenseForm() {
  const session = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  const userId = session?.user?.id;

  // Auth check
  useEffect(() => {
    if (session === null) return;
    if (!session?.user) router.push("/sign-in");
    else setLoading(false);
  }, [session, router]);

  if (loading) return null;

  const handleFileChange = (file) => {
    if (file) {
      setReceipt(file);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      let receiptUrl = null;

      if (receipt) {
        const fileExt = receipt.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("receipts")
          .upload(filePath, receipt, {
            upsert: false,
            contentType: receipt.type,
            metadata: { owner: userId },
          });

        if (uploadError) {
          setError("Receipt upload failed.");
          return;
        }

        const { data: signedUrlData, error: signedUrlError } =
          await supabase.storage
            .from("receipts")
            .createSignedUrl(filePath, 60 * 60);

        if (signedUrlError) {
          setError("Could not generate access URL.");
          return;
        }

        receiptUrl = signedUrlData?.signedUrl;
      }

      if (!amount || !category || !date) {
        setError("Please fill in all required fields.");
        return;
      }

      const { error: dbError } = await supabase.from("expenses").insert([
        {
          user_id: userId,
          amount: parseFloat(amount),
          category,
          date,
          description,
          receipt_url: receiptUrl,
        },
      ]);

      if (dbError) {
        setError("Saving to database failed.");
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      setError("Something went wrong.");
    }
  };

  return (
    <motion.div
      className="max-w-2xl mx-auto px-6 py-12"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h1 className="text-4xl font-bold mb-8 text-center text-gray-900 dark:text-white">
        Add New Expense
      </h1>

      {error && (
        <motion.div
          className="mb-6 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {error}
        </motion.div>
      )}

      <div className="flex justify-center mb-6">
        <button
          type="button"
          onClick={() => router.push("/upload-only")}
          className="text-sm text-indigo-600 hover:text-indigo-800 underline"
        >
          Just want to upload a receipt?
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800"
      >
        {/* Amount */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Amount ($)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            required
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            required
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
            placeholder="Add details about this expense..."
          />
        </div>

        <ReceiptUpload onFileSelect={handleFileChange} />

        {receipt && (
          <motion.div
            className="mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Receipt Preview
            </p>
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full max-h-[500px] object-contain rounded-lg shadow-md border dark:border-gray-700 cursor-pointer hover:scale-[1.02] transition-transform"
              onClick={() => setShowModal(true)}
            />
          </motion.div>
        )}

        {/* Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.img
                src={previewUrl}
                alt="Full Receipt"
                className="max-w-full max-h-full rounded-lg shadow-lg"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
              />
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-6 right-8 text-white text-3xl font-bold hover:text-red-400"
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 text-lg font-semibold rounded-lg transition-colors"
        >
          Save Expense
        </Button>
      </form>
    </motion.div>
  );
}
