"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";
import AuthModal from "@/components/auth-modal";
import Image from "next/image";
import audioBooks from "@/data/books.json";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";

const isIOSApp = () => {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isWrapped =
    typeof (window as any).gonative !== "undefined" ||
    (window.navigator as any).standalone;
  return isIOS && isWrapped;
};

function PurchaseBookPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [user] = useAuthState(auth);
  const bookId = params.get("bookId");
  const [book, setBook] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [iosApp, setIosApp] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    setIosApp(isIOSApp());
    if (!bookId) return;
    const selected = (audioBooks as any[]).find((b) => b.id === bookId);
    if (!selected) {
      toast({ title: "Book not found", variant: "destructive" });
      router.push("/books");
    } else {
      setBook(selected);
    }
  }, [bookId, router]);

  const saveToLibrary = async (bookData: any, uid: string) => {
    try {
      const userRef = doc(db, "users", uid);
      const userDoc = await getDoc(userRef);
      const newItem = {
        bookTitle: bookData.title,
        chapterId: "single",
        videoUrl: bookData.youtubeUrl,
        purchasedAt: new Date().toISOString(),
        thumbnail: bookData.thumbnail,
        id: `${bookData.id}-${Date.now()}`,
      };
      if (userDoc.exists()) {
        await updateDoc(userRef, { library: arrayUnion(newItem) });
      } else {
        await setDoc(userRef, {
          library: [newItem],
          createdAt: new Date().toISOString(),
          email: user?.email || "",
        });
      }
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const handlePayPalSuccess = async () => {
    if (!user) return;
    setProcessing(true);
    const saved = await saveToLibrary(book, user.uid);
    setProcessing(false);
    if (saved) {
      toast({ title: "Purchase successful! Book added to your library." });
      router.push("/library");
    } else {
      toast({ title: "Error saving purchase. Contact support.", variant: "destructive" });
    }
  };

  const handleIOSCheckout = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setProcessing(true);
    try {
      const { purchaseRevenueCatProduct, purchaseRevenueCatPackage, getRevenueCatOfferings } = await import("@/lib/revenuecat");
      
      let customerInfo = null;
      const offerings = await getRevenueCatOfferings();
      const currentPkg = offerings?.current?.availablePackages.find(
        (p: any) => p.product.identifier === book.id || p.identifier === book.id
      );

      if (currentPkg) {
        customerInfo = await purchaseRevenueCatPackage(currentPkg);
      } else {
        const prodId = book.productId || book.id || "com.breakupguide.app.individualbook";
        customerInfo = await purchaseRevenueCatProduct(prodId);
      }

      if (customerInfo) {
        const saved = await saveToLibrary(book, user.uid);
        if (saved) {
          toast({ title: "Purchase successful! Book added to your library." });
          router.push("/library");
        } else {
          toast({ title: "Error saving purchase to library. Contact support.", variant: "destructive" });
        }
      }
    } catch (e: any) {
      toast({ title: e.message || "Purchase failed", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  if (!book) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center mb-8">
            <Button variant="ghost" onClick={() => router.back()} className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="font-body">Back</span>
            </Button>
            <h1 className="text-2xl font-bold text-gray-800 font-heading">Buy AudioBook</h1>
          </div>

          {/* Book info */}
          <Card className="mb-6">
            <CardContent className="flex items-center space-x-4 p-6">
              <Image
                src={book.thumbnail || "/placeholder.svg"}
                alt={book.title}
                width={100}
                height={140}
                className="rounded object-cover flex-shrink-0"
              />
              <div>
                <h2 className="text-lg font-heading text-gray-800 mb-1">{book.title}</h2>
                <p className="text-green-600 font-semibold text-2xl font-heading">${book.price}</p>
              </div>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Complete Purchase</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Must be logged in */}
              {!user && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                  <p className="text-yellow-800 font-body text-sm">
                    You must be signed in so your purchase is saved to your account.
                  </p>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium font-body transition"
                  >
                    Sign In / Create Account
                  </button>
                </div>
              )}

              {iosApp ? (
                /* iOS: Native RevenueCat In-App Purchase */
                <div className="space-y-3">
                  <p className="text-gray-500 font-body text-sm text-center">
                    Complete your purchase securely via App Store In-App Purchase.
                  </p>
                  <button
                    onClick={handleIOSCheckout}
                    disabled={!user || processing}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-4 rounded-xl font-semibold font-body text-lg transition active:scale-95"
                  >
                    {processing ? "Processing..." : `Buy for $${book.price}`}
                  </button>
                  {!user && (
                    <p className="text-center text-xs text-gray-400 font-body">
                      Sign in above first to continue
                    </p>
                  )}
                </div>
              ) : (
                /* Web: PayPal */
                user ? (

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
                            description: book.title,
                            amount: { currency_code: "USD", value: book.price.toString() },
                          }],
                          intent: "CAPTURE",
                        })
                      }
                      onApprove={async (data, actions) => {
                        try {
                          if (actions.order) await actions.order.capture();
                          await handlePayPalSuccess();
                        } catch {
                          toast({ title: "Payment failed", variant: "destructive" });
                        }
                      }}
                      onError={() => toast({ title: "PayPal error", variant: "destructive" })}
                    />
                  </PayPalScriptProvider>
                ) : (
                  <p className="text-center text-sm text-gray-400 font-body">
                    Sign in above to see payment options.
                  </p>
                )
              )}

              <p className="text-xs text-gray-400 text-center font-body">
                Book is added to your library immediately after successful payment.
              </p>
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

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PurchaseBookPage />
    </Suspense>
  );
}
