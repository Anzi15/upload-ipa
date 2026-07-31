"use client";

import React from "react";
import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

      <p className="mb-4 text-gray-700">
        Your privacy is important to us. This privacy policy explains what information we collect, how we use it, and your rights in relation to it.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">1. Information We Collect</h2>
      <p className="text-gray-700 mb-4">
        We collect personal information you provide, such as your name, email address, and purchase details, to provide our services and improve your experience.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">2. How We Use Your Data</h2>
      <p className="text-gray-700 mb-4">
        Your data is used to deliver personalized content, manage purchases, respond to support requests, and improve our platform.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">3. Third-Party Services</h2>
      <p className="text-gray-700 mb-4">
        We may use trusted third-party services such as Firebase Authentication and analytics tools. These services have their own privacy policies.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">4. Data Protection</h2>
      <p className="text-gray-700 mb-4">
        We take reasonable steps to protect your personal data, including encryption and access controls.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">5. Your Rights</h2>
      <p className="text-gray-700 mb-4">
        You have the right to access, update, or delete your data. Contact us at <Link href="mailto:support@example.com" className="underline text-blue-600">support@example.com</Link> for any requests.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">6. Copyright Notice</h2>
      <p className="text-gray-700 mb-4">
        All content, including books and videos, is protected by copyright. Purchased content is for personal use only and must not be shared or redistributed in any form.
      </p>

      <p className="text-gray-500 mt-12">
        Last updated: July 1, 2025
      </p>

      <div className="mt-8 text-center">
  <Link
    href="/"
    className="inline-block text-blue-600 underline hover:text-blue-800 transition font-medium"
  >
    ← Back to Home
  </Link>
</div>

    </main>
  );
}
