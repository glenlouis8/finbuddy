"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { UploadCloud, X } from "lucide-react";

export default function ReceiptUpload({ onFileSelect }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState("");

  const handleFile = (file) => {
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "application/pdf"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      return setError("Only PNG, JPG, or PDF files allowed.");
    }
    if (file.size > maxSize) {
      return setError("Max file size is 5MB.");
    }

    setError("");
    setFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = file.type !== "application/pdf" ? URL.createObjectURL(file) : null;
    setPreviewUrl(url);
    onFileSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const handleChange = (e) => {
    handleFile(e.target.files[0]);
  };

  const clearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(null);
    onFileSelect(null);
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Receipt (Optional)
      </label>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="relative w-full h-40 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-800 cursor-pointer"
      >
        {!file ? (
          <label className="flex flex-col items-center space-y-2 cursor-pointer">
            <UploadCloud className="w-8 h-8 text-gray-500" />
            <span className="text-gray-500 text-sm">
              Drag & drop or click to upload
            </span>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center relative"
          >
            {file.type === "application/pdf" ? (
              <p className="text-gray-300">{file.name}</p>
            ) : (
              <img
                src={previewUrl}
                alt="Receipt Preview"
                className="max-h-32 mx-auto rounded shadow"
              />
            )}
            <button
              onClick={clearFile}
              className="absolute top-2 right-2 text-white bg-black bg-opacity-50 rounded-full p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </div>

      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
