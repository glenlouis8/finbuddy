"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { getExpenses } from "@/lib/fetchers";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash,
  Pencil,
  Search,
  ChevronDown,
  ChevronUp,
  Utensils,
  Car,
  ShoppingBag,
  Receipt,
  HeartPulse,
  Plane,
  MoreHorizontal,
  TrendingDown,
  Wallet,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LoaderSpinner from "@/components/ui/LoaderSpinner";

const categoryIcons = {
  Food: { icon: Utensils, color: "bg-orange-500/20 text-orange-500" },
  Transport: { icon: Car, color: "bg-blue-500/20 text-blue-500" },
  Shopping: { icon: ShoppingBag, color: "bg-pink-500/20 text-pink-500" },
  Bills: { icon: Receipt, color: "bg-green-500/20 text-green-500" },
  Health: { icon: HeartPulse, color: "bg-red-500/20 text-red-500" },
  Travel: { icon: Plane, color: "bg-purple-500/20 text-purple-500" },
  Other: { icon: MoreHorizontal, color: "bg-gray-500/20 text-gray-500" },
};

export default function TransactionsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const [isSemantic, setIsSemantic] = useState(false);
  const [semanticResults, setSemanticResults] = useState([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Fetch Session
  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data.session?.user) return router.push("/sign-in");
      setUser(data.session.user);
      setLoadingUser(false);
    });
  }, [router]);

  // Semantic Search Effect (Debounced)
  useEffect(() => {
    if (!search || search.length < 3) {
      setSemanticResults([]);
      setIsSemantic(false);
      return;
    }

    const timer = setTimeout(async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) return;

      setIsSemantic(true);
      const res = await fetch("/api/search/semantic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ query: search }),
      });
      const data = await res.json();
      if (data.results) setSemanticResults(data.results);
    }, 600); // 600ms debounce

    return () => clearTimeout(timer);
  }, [search]);

  const shouldFetch = !!user?.id;
  const {
    data: transactionsData,
    isLoading: loadingTransactions,
    mutate,
  } = useSWR(shouldFetch ? ["expenses", user.id] : null, () =>
    getExpenses(user.id)
  );

  const handleDelete = async (id) => {
    await supabase.from("expenses").delete().eq("id", id);
    setConfirmDeleteId(null);
    mutate();
  };

  const exportCSV = () => {
    const rows = [
      ["Date", "Category", "Amount", "Description", "Items"],
      ...filtered.map((tx) => [
        tx.date,
        tx.category,
        tx.amount,
        tx.description || "",
        (tx.ocr_parsed?.items || []).map((i) => `${i.name} $${i.price}`).join("; "),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finbuddy-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const baseList = isSemantic ? semanticResults : (transactionsData || []);
  const filtered = baseList
    .filter((tx) => {
      return categoryFilter ? tx.category === categoryFilter : true;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalSpent = filtered.reduce((acc, tx) => acc + Number(tx.amount || 0), 0);

  if (loadingUser || loadingTransactions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <LoaderSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 lg:px-12 py-12 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-5xl font-extrabold tracking-tighter mb-2">Transactions</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Manage and monitor your financial flow</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex gap-4 items-start"
          >
            <Button
              onClick={exportCSV}
              variant="secondary"
              className="flex items-center gap-2 rounded-2xl px-4 py-4 h-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Total Filtered</p>
                <p className="text-2xl font-black">${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg shadow-indigo-500/20 flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <TrendingDown className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-white/70 uppercase font-bold tracking-widest">Transactions</p>
                <p className="text-2xl font-black">{filtered.length}</p>
              </div>
            </div>
          </motion.div>

        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="relative col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by vendor or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl border-none bg-white dark:bg-gray-900 shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-4 rounded-2xl border-none bg-white dark:bg-gray-900 shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-gray-500"
          >
            <option value="">Status: All Categories</option>
            {Object.keys(categoryIcons).map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 bg-white/50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800"
              >
                <p className="text-gray-400 font-medium italic">Empty space. Time to save some money?</p>
              </motion.div>
            ) : (
              filtered.map((tx, idx) => {
                const config = categoryIcons[tx.category] || categoryIcons.Other;
                const Icon = config.icon;
                const isExpanded = expandedId === tx.id;

                return (
                  <motion.div
                    key={tx.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.03 }}
                    className={`group bg-white dark:bg-gray-900 rounded-3xl p-1 shadow-sm hover:shadow-xl transition-all border border-transparent hover:border-indigo-500/20 ${isExpanded ? 'ring-2 ring-indigo-500/10' : ''}`}
                  >
                    <div className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : tx.id)}>
                      <div className="flex items-center gap-5">
                        <div className={`p-4 rounded-2xl ${config.color} transition-transform group-hover:scale-110`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-lg font-bold tracking-tight">{tx.category}</p>
                          <p className="text-sm text-gray-400 font-medium">{new Date(tx.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 self-end sm:self-center">
                        <div className="text-right">
                          <p className="text-2xl font-black text-indigo-500 tracking-tighter">
                            ${Number(tx.amount || 0).toFixed(2)}
                          </p>
                          {tx.ocr_parsed?.items && (
                            <div className="flex items-center justify-end gap-1 text-xs text-gray-400 font-bold uppercase transition-colors group-hover:text-indigo-400">
                              {tx.ocr_parsed.items.length} Items {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {confirmDeleteId === tx.id ? (
                            <>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleDelete(tx.id); }}
                                className="rounded-xl px-3 h-10 bg-red-500 text-white hover:bg-red-600 transition-colors text-xs font-bold"
                              >
                                Confirm
                              </Button>
                              <Button
                                variant="secondary"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                                className="rounded-xl w-10 h-10 transition-colors"
                              >
                                ✕
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="secondary"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); router.push(`/edit-expense/${tx.id}`); }}
                                className="rounded-xl w-10 h-10 hover:bg-indigo-500 hover:text-white transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="secondary"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(tx.id); }}
                                className="rounded-xl w-10 h-10 hover:bg-red-500 hover:text-white transition-colors"
                              >
                                <Trash className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t dark:border-gray-800 mx-6"
                        >
                          <div className="py-6 space-y-4">
                            {tx.description && (
                              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <p className="text-xs text-gray-400 uppercase font-black mb-1">Analyst Note</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300 italic">{tx.description}</p>
                              </div>
                            )}

                            {tx.ocr_parsed?.items?.length > 0 && (
                              <div className="space-y-3">
                                <p className="text-xs text-gray-400 uppercase font-black px-1">Detailed Breakdown</p>
                                <div className="grid grid-cols-1 gap-2">
                                  {tx.ocr_parsed.items.map((item, i) => (
                                    <div key={i} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                                      <span className="text-sm font-semibold">{item.name}</span>
                                      <span className="text-xs font-black text-gray-400">${Number(item.price).toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
