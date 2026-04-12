"use client";

import { motion } from "framer-motion";
import { FaBrain, FaTools, FaUserTie, FaGlobeAmericas } from "react-icons/fa";
import Image from "next/image";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 text-gray-900 dark:text-white">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <motion.h1
          className="text-5xl sm:text-6xl font-extrabold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          About FinBuddy
        </motion.h1>
        <motion.p
          className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          Your AI-powered finance companion — helping you track, analyze, and
          grow your wealth effortlessly.
        </motion.p>
      </section>

      {/* Intro Section */}
      <section className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center py-16">
        {/* Text */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-lg leading-relaxed mb-6">
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              FinBuddy
            </span>{" "}
            gives you AI-powered insights to master your money. From receipt
            scanning to predictive budgeting, we turn financial chaos into
            clarity.
          </p>
          <ul className="space-y-4">
            <BulletItem emoji="💸" text="Pinpoint overspending patterns" />
            <BulletItem
              emoji="🍕"
              text="Understand category-wise habits (food, travel, bills)"
            />
            <BulletItem
              emoji="📊"
              text="Budget smarter with predictive insights"
            />
          </ul>
        </motion.div>

        {/* Illustration */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="flex justify-center"
        >
          <Image
            src="/illustration.svg"
            alt="AI Finance Illustration"
            width={400}
            height={400}
            className="drop-shadow-xl"
          />
        </motion.div>
      </section>

      {/* Info Grid */}
      <section className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-10 py-16">
        <InfoCard
          icon={<FaBrain className="w-6 h-6 text-indigo-400" />}
          title="Our Mission"
          text="Simplify personal finance using AI. No jargon, just insights you can act on."
        />
        <InfoCard
          icon={<FaUserTie className="w-6 h-6 text-emerald-400" />}
          title="The Creator"
          text="Built by Glen Louis — a hybrid engineer passionate about merging AI and real-world impact."
        />
        <InfoCard
          icon={<FaTools className="w-6 h-6 text-yellow-400" />}
          title="Tech Stack"
          text="Next.js App Router, Tailwind CSS, Supabase, GPT-4.1 Nano, and Tesseract.js for OCR."
        />
        <InfoCard
          icon={<FaGlobeAmericas className="w-6 h-6 text-pink-400" />}
          title="Vision"
          text="Shift from reactive expense tracking to proactive financial intelligence."
        />
      </section>

      {/* Call to Action */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <motion.div
          className="relative overflow-hidden rounded-2xl shadow-lg p-10 text-center text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold mb-4">
            FinBuddy isn’t just an app — it’s your AI-powered financial ally.
          </h2>
          <p className="mb-6 text-lg">
            Build smarter money habits, starting today.
          </p>
          <button className="px-6 py-3 bg-white text-indigo-600 font-semibold rounded-full shadow hover:shadow-lg transform hover:scale-105 transition">
            Start Your Smart Finance Journey →
          </button>
        </motion.div>
      </section>
    </main>
  );
}

function BulletItem({ emoji, text }) {
  return (
    <li className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm">
      <span className="text-xl">{emoji}</span>
      <span className="text-gray-800 dark:text-gray-200">{text}</span>
    </li>
  );
}

function InfoCard({ icon, title, text }) {
  return (
    <motion.div
      className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border border-gray-200/30 dark:border-gray-700/30 p-6 rounded-2xl shadow-md hover:shadow-xl transition transform hover:-translate-y-1"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
    >
      <div className="flex items-center gap-3 mb-4">
        {icon}
        <h3 className="text-xl font-semibold">{title}</h3>
      </div>
      <p className="text-gray-600 dark:text-gray-300">{text}</p>
    </motion.div>
  );
}
