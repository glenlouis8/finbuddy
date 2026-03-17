"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import LoaderSpinner from "@/components/ui/LoaderSpinner";

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetchUser();
  }, []);

  async function fetchUser() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    const providerName = user.user_metadata?.full_name || user.user_metadata?.name || "";
    setUser(user);
    setDisplayName(data?.display_name || providerName || "");
    setLoading(false);
  }

  async function saveDisplayName() {
    if (!user) return;
    await supabase
      .from("profiles")
      .upsert({ id: user.id, display_name: displayName });
    setEditing(false);
  }

  async function deleteAccount() {
    if (!confirm("This will permanently delete your account. Continue?"))
      return;
    const { data: { session } } = await supabase.auth.getSession();
    await fetch("/api/delete-user", {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-500 dark:text-gray-400">
        <LoaderSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-black transition-colors">
        <p className="mb-4 text-gray-500 dark:text-gray-400">
          You are not signed in.
        </p>
        <a
          href="/sign-in"
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 transition"
        >
          Sign In
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black py-12 transition-colors">
      <div className="max-w-md mx-auto bg-white dark:bg-black rounded-2xl shadow-lg p-8 space-y-8 border border-gray-100 dark:border-gray-800">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Account Settings
        </h1>

        {/* Email */}
        <div>
          <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
            Email
          </label>
          <input
            type="text"
            value={user.email}
            disabled
            className="w-full px-3 py-2 bg-gray-100 dark:bg-neutral-900 text-gray-700 dark:text-gray-200 rounded-lg border border-gray-200 dark:border-gray-700 cursor-not-allowed"
          />
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
            Display Name
          </label>
          {editing ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100"
              />
              <button
                onClick={saveDisplayName}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 transition"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 dark:bg-neutral-800 dark:text-gray-200 dark:hover:bg-neutral-700 transition"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-200">
                {displayName || "No name set"}
              </span>
              <button
                onClick={() => setEditing(true)}
                className="text-sm font-medium text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        {/* Delete Account */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={deleteAccount}
            className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
