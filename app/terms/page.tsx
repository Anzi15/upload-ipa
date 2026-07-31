"use client";

import { Link } from "lucide-react";
import React from "react";

export default function Terms() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Terms & Conditions</h1>

      <p className="mb-4 text-gray-700">
        By using Breakup Guide, you agree to the following terms and conditions. Please read them carefully.
        </p>
      <h2 className="text-xl font-semibold mt-8 mb-2">1. Use of Service</h2>
      <p className="text-gray-700 mb-4">
        You may use this platform for personal, non-commercial purposes only. Any misuse may result in suspension or termination of your account.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">2. Purchases and Refunds</h2>
      <p className="text-gray-700 mb-4">
        All purchases made on this platform are final. No refunds will be issued unless required by law.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">3. Intellectual Property</h2>
      <p className="text-gray-700 mb-4">
        All materials provided on Breakup Guide — including but not limited to audio books, videos, and learning modules — are copyrighted.
        You are not permitted to share, reproduce, or distribute any content without written permission.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">4. Account Responsibility</h2>
      <p className="text-gray-700 mb-4">
        You are responsible for maintaining the confidentiality of your account and for all activities under your account.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">5. Changes to Terms</h2>
      <p className="text-gray-700 mb-4">
        We reserve the right to update these terms at any time. Continued use of the service means you accept the revised terms.
      </p>

<div className="mt-8 text-center">
  <Link
    href="/"
    className="inline-block text-blue-600 underline hover:text-blue-800 transition font-medium"
  >
    ← Back to Home
  </Link>
</div>
      <p className="text-gray-500 mt-12">
        Last updated: July 1, 2025
      </p>

      <div className="mt-8 text-center">
</div>

    </main>
  );
}
