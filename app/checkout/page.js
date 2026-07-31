"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { loadBundle, clearBundle } from "@/lib/storage";
import { toast } from "@/hooks/use-toast";
import AuthModal from "@/components/auth-modal";
import Image from "next/image";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import booksData from "@/data/books.json";

// ─── Save books to a user's library via the server ────────────────────────────
// Uses the /api/save-purchase route (Firebase Admin, server-side) instead of
// the client Firestore SDK directly. The client SDK can throw "client is
// offline" in a fresh Safari tab (ITP/storage restrictions, no prior
// connection warm-up), even when the device has a normal internet connection.
// Going through our own API route sidesteps that entirely.
async function saveItemsToLibrary(uid, books) {
  const res = await fetch("/api/save-purchase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid, books }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Save failed (${res.status})`);
  }
  return data;
}

function CheckoutInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user] = useAuthState(auth);

  // fromApp mode — when Safari was opened from the iOS app
  const fromApp = searchParams.get("from") === "app";
  const appUID = searchParams.get("uid") || "";

  // Chapter-flow purchases pass full book data as base64-encoded JSON
  // (the old bookIds approach couldn't resolve chapter books because they
  // have no id/bookTitle field and don't exist in books.json).
  // Kept the legacy bookIds param as a fallback in case an old app build
  // is still sending it.
  const booksParam = searchParams.get("books") || "";
  const legacyBookIds = (searchParams.get("bookIds") || "").split(",").filter(Boolean);

  let decodedBooks = [];
  if (booksParam) {
    try {
      decodedBooks = JSON.parse(decodeURIComponent(escape(atob(booksParam))));
    } catch (e) {
      console.error("Failed to decode books param:", e);
    }
  }

  // Regular web mode — books saved in localStorage bundle
  const [bundle, setBundle] = useState([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  useEffect(() => {
    if (!fromApp) {
      const saved = loadBundle();
      setBundle(saved);
      if (saved.length === 0) router.push("/books");
    }
  }, [fromApp, router]);

  // Which books are being purchased?
  // Prefer the base64-decoded full book data (chapter flow). Fall back to
  // the legacy bookIds lookup against books.json for older app builds.
  const resolvedFromIds = legacyBookIds
    .map((id) => booksData.find((b) => b.id === id))
    .filter(Boolean);

  const books = fromApp
    ? decodedBooks.length > 0
      ? decodedBooks
      : resolvedFromIds.length > 0
      ? resolvedFromIds
      : legacyBookIds.map((id) => ({ bookTitle: id, videoUrl: "", thumbnail: "/placeholder.svg", price: 25 }))
    : bundle;

  // Chapter purchases (the books a user unlocks by finishing a chapter,
  // selected in bulk) are a flat $125 bundle no matter how many books are
  // in it — chapterId is only ever set by the chapter-completion flow, so
  // it reliably distinguishes this from a normal single/multi-book
  // purchase made from the /books page, which keeps its normal per-book
  // pricing untouched.
  const isChapterPurchase = books.length > 0 && books.some((b) => !!b?.chapterId);
  const CHAPTER_FLAT_PRICE = 125;
  const rawTotal = books.reduce((sum, b) => sum + (b?.price || 25), 0);
  const totalAmount = isChapterPurchase ? CHAPTER_FLAT_PRICE : rawTotal;
  const chapterSavings = isChapterPurchase ? Math.max(rawTotal - CHAPTER_FLAT_PRICE, 0) : 0;

  // Which UID to save to?
  const effectiveUID = fromApp ? appUID : user?.uid;

  const handlePaymentSuccess = async () => {
    if (!effectiveUID) {
      toast({ title: "Please sign in first to save your purchase.", variant: "destructive" });
      return;
    }
    if (!books || books.length === 0) {
      toast({ title: "No books found in cart. Please go back and try again.", variant: "destructive" });
      return;
    }
    setProcessing(true);
    try {
      await saveItemsToLibrary(effectiveUID, books);
      if (!fromApp) clearBundle();
      setPurchaseSuccess(true);
    } catch (e) {
      console.error("saveItemsToLibrary error:", e);
      // Show the actual error message so we can debug
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: "Error saving purchase: " + msg, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────────
  if (purchaseSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-sm">
          <div className="h-20 w-20 bg-green-500 rounded-full flex items-center justify-center mx-auto">
            <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 font-heading">Purchase Complete!</h1>
          <p className="text-gray-600 font-body">
            Your audiobook{books.length > 1 ? "s have" : " has"} been added to your library.
          </p>
          {fromApp ? (
            <div className="space-y-2 bg-white rounded-xl p-5 border border-green-200">
              <p className="text-gray-700 font-body font-medium">
                Your purchase was successful.
              </p>
              <p className="text-sm text-gray-500 font-body">
                Go back to the app — your library will update automatically.
              </p>
            </div>
          ) : (
            <button
              onClick={() => router.push("/library")}
              className="w-full bg-blue-600 text-white rounded-xl py-4 font-semibold text-lg"
            >
              Go to My Library
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Loading guard for web mode ────────────────────────────────────────────────
  if (!fromApp && bundle.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Session error guard for fromApp mode ──────────────────────────────────────
  if (fromApp && !appUID) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-red-600 font-body font-medium">Session expired.</p>
          <p className="text-gray-500 font-body text-sm">
            Please go back to the app, sign in, and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-xl mx-auto space-y-6">

          {!fromApp && (
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="font-body">Back</span>
            </Button>
          )}

          <h1 className="text-2xl font-bold text-gray-800 font-heading text-center">
            {fromApp ? "Complete Your Purchase" : "Checkout"}
          </h1>

          {/* Payment section — moved to the top so people can pay without scrolling */}
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Payment</CardTitle>
              <div className="pt-2 space-y-1">
                {isChapterPurchase && chapterSavings > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-body text-gray-400 line-through">${rawTotal}</span>
                    <span className="font-body text-red-500 font-medium">
                      You save ${chapterSavings}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="font-body text-gray-600">
                    Total ({books.length} {books.length === 1 ? "book" : "books"})
                  </span>
                  <span className="text-2xl font-bold text-green-600 font-heading">${totalAmount}</span>
                </div>
                {isChapterPurchase && (
                  <p className="text-xs text-gray-400 font-body text-right">
                    Chapter bundle price — unlocks all books in this chapter
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Web mode: require login */}
              {!fromApp && !user && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                  <p className="text-yellow-800 font-body text-sm">
                    Sign in first so your purchase is saved to your account.
                  </p>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium font-body"
                  >
                    Sign In / Create Account
                  </button>
                </div>
              )}

              {/* ── DUMMY TEST BUTTON — remove before final App Store submission ── */}
              <div className="bg-yellow-50 border-2 border-dashed border-yellow-400 rounded-xl p-4 space-y-2">
                <p className="text-yellow-700 font-body text-xs font-semibold text-center">
                  🧪 TEST ONLY — Dummy Purchase Button
                </p>
                <button
                  disabled={processing || (!fromApp && !user)}
                  onClick={handlePaymentSuccess}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold font-body transition"
                >
                  {processing ? "Processing..." : "Simulate Successful Purchase (TEST)"}
                </button>
              </div>

              {/* Real PayPal */}
              {(fromApp ? !!appUID : !!user) && (
                <div className="space-y-2">
                  <p className="text-center text-gray-400 font-body text-xs">— or pay with PayPal —</p>
                  <PayPalScriptProvider
                    options={{
                      clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
                      currency: "USD",
                    }}
                  >
                    <PayPalButtons
                      style={{ layout: "vertical" }}
                      createOrder={(data, actions) =>
                        actions.order.create({
                          purchase_units: [{
                            description: isChapterPurchase
                              ? `Chapter Bundle (${books.length} books)`
                              : `${books.length} AudioBook${books.length > 1 ? "s" : ""}`,
                            amount: { value: totalAmount.toFixed(2) },
                          }],
                        })
                      }
                      onApprove={async (data, actions) => {
                        try {
                          await actions.order.capture();
                          await handlePaymentSuccess();
                        } catch {
                          toast({ title: "PayPal payment failed.", variant: "destructive" });
                        }
                      }}
                      onError={() => toast({ title: "PayPal error. Please try again.", variant: "destructive" })}
                    />
                  </PayPalScriptProvider>
                </div>
              )}

              <p className="text-xs text-gray-400 text-center font-body">
                Books are added to your library immediately after successful payment.
              </p>
            </CardContent>
          </Card>

          {/* Books being purchased — moved to the bottom */}
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">
                {isChapterPurchase
                  ? `Chapter Bundle (${books.length} book${books.length > 1 ? "s" : ""})`
                  : books.length === 1
                  ? "Your AudioBook"
                  : `Your AudioBooks (${books.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {books.map((book, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Image
                    src={book?.thumbnail || "/placeholder.svg"}
                    alt={book?.title || ""}
                    width={56}
                    height={56}
                    className="rounded object-cover w-14 h-14 flex-shrink-0"
                  />
                  <div className="flex-1">
                    <p className="font-body text-sm text-gray-800 line-clamp-2">{book?.title || book?.bookTitle}</p>
                  </div>
                  <span className="text-green-600 font-semibold font-body">${book?.price || 25}</span>
                </div>
              ))}
              <div className="border-t pt-3 space-y-1">
                {isChapterPurchase && chapterSavings > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-body text-gray-400 line-through">${rawTotal}</span>
                    <span className="font-body text-red-500 font-medium">
                      You save ${chapterSavings}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="font-body text-gray-600">Total</span>
                  <span className="text-2xl font-bold text-green-600 font-heading">${totalAmount}</span>
                </div>
                {isChapterPurchase && (
                  <p className="text-xs text-gray-400 font-body text-right">
                    Chapter bundle price — unlocks all books in this chapter
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CheckoutInner />
    </Suspense>
  );
}
