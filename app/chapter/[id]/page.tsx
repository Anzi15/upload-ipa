"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import type { Chapter, Book } from "@/lib/types";
import {
  loadProgress,
  saveProgress,
  saveBundle,
  loadSettings,
} from "@/lib/storage";
import chaptersData from "@/data/chapters.json";
import sayings from "@/data/sayings.json";
import Image from "next/image";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDocFromServer } from "firebase/firestore";
import AuthModal from "@/components/auth-modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ChapterPage() {
  const router = useRouter();
  const params = useParams();
  const chapterId = params.id as string;

  const BASE_URL = typeof window !== "undefined" ? window.location.origin : "";

  const [settings] = useState(loadSettings());
  const [redirecting, setRedirecting] = useState(false);
  const [selectedAudioFile, setSelectedAudioFile] = useState<Book[]>([]);
  const [user] = useAuthState(auth);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPurchaseSuccess, setShowPurchaseSuccess] = useState(false);

  // Load chapter synchronously — no useEffect delay, no spinner wait
  const foundChapter = chaptersData.find((c) => c.id === chapterId) as Chapter | undefined;
  const savedProgress = typeof window !== "undefined" ? loadProgress() : {};
  const chapterProgress = foundChapter ? (savedProgress[chapterId] || 0) : 0;

  const [chapter] = useState<Chapter | null>(foundChapter || null);
  const [progress, setProgress] = useState<{ [key: string]: number }>(savedProgress);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(chapterProgress);
  const [showSummary, setShowSummary] = useState(
    foundChapter ? chapterProgress >= foundChapter.questions.length : false
  );

  // Note: navigation to /checkout is handled directly inside handleBuy
  // itself (either opening external Safari on wrapped iOS, or router.push
  // for the plain web fallback). A separate effect used to fire
  // router.push("/checkout") any time `redirecting` became true, which ran
  // in addition to opening external Safari — leaving a second, unintended
  // checkout session sitting in the app's own WebView. Removed.

  // Reset the "Redirecting..." button state when the user comes back to
  // this screen (e.g. returning from Safari checkout), and — if we were
  // mid-purchase — check whether it actually went through, so we can show
  // a clear "Purchase successful" confirmation instead of leaving the user
  // guessing on the same summary screen.
  const redirectingRef = useRef(false);
  useEffect(() => {
    redirectingRef.current = redirecting;
  }, [redirecting]);

  useEffect(() => {
    const handleForeground = async () => {
      if (document.visibilityState !== "visible") return;
      const wasRedirecting = redirectingRef.current;
      setRedirecting(false);
      if (wasRedirecting && auth.currentUser) {
        try {
          const userRef = doc(db, "users", auth.currentUser.uid);
          const snap = await getDocFromServer(userRef);
          if (snap.exists()) {
            const lib = snap.data().library || [];
            if (lib.some((b: any) => b.chapterId === chapterId)) {
              setShowPurchaseSuccess(true);
            }
          }
        } catch (e) {
          console.error("Error checking purchase status:", e);
        }
      }
    };
    document.addEventListener("visibilitychange", handleForeground);
    window.addEventListener("focus", handleForeground);
    return () => {
      document.removeEventListener("visibilitychange", handleForeground);
      window.removeEventListener("focus", handleForeground);
    };
  }, [chapterId]);

  const playButtonSound = () => {
    if (settings.soundEnabled) {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.1
      );
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    }
  };

  const handleBack = () => {
    playButtonSound();
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleAnswer = (answer: boolean) => {
    playButtonSound();

    if (chapter) {
      const currentQuestion = chapter.questions[currentQuestionIndex];
      if (currentQuestion?.audioFile) {
        setSelectedAudioFile((prev) => {
          if (answer) {
            const newAudioFile = currentQuestion.audioFile.filter(
              (book) => !prev.includes(book)
            );
            return [...prev, ...newAudioFile];
          } else {
            return prev.filter(
              (book) => !currentQuestion.audioFile.includes(book)
            );
          }
        });
      }
    }

    const nextIndex = currentQuestionIndex + 1;
    const newProgress = { ...progress, [chapterId]: nextIndex };
    setProgress(newProgress);
    saveProgress(newProgress);

    if (chapter && nextIndex >= chapter.questions.length) {
      setShowSummary(true);
    } else {
      setCurrentQuestionIndex(nextIndex);
    }
  };

  useEffect(() => {
  // Prefetch checkout page when component mounts
  router.prefetch("/checkout");
}, [router]);

const handleBuy = () => {
  if (selectedAudioFile.length === 0 || redirecting) return;

  // Check login before ever redirecting to Safari — previously an
  // unauthenticated purchase would redirect to Safari with an empty UID,
  // landing on a "Session expired" screen with no way to actually log in
  // from there. Now we catch it here and let them sign in/up in-app first.
  if (!auth.currentUser) {
    setShowAuthModal(true);
    return;
  }

  proceedToCheckout();
};

const proceedToCheckout = async () => {
    playButtonSound();
    setRedirecting(true); // Show loading state immediately
    
    // Small delay to ensure UI updates
    await new Promise(resolve => setTimeout(resolve, 100));
    
    saveBundle([...selectedAudioFile]);

    // On iOS inside the Median app, payment must happen in real Safari.
    // We pass the user UID and book IDs so the web checkout can save
    // the purchase to Firestore without needing a separate login.
    const isIOS = /iPhone|iPad|iPod/i.test(window.navigator.userAgent);
    const isWrapped = typeof (window as any).gonative !== "undefined" || (window.navigator as any).standalone;
    if (isIOS && isWrapped) {
      const currentUser = auth.currentUser;
      const uid = currentUser?.uid || "";
      // Chapter Book objects only have { title, youtubeUrl, thumbnail } — no
      // id/bookTitle field, and they don't exist in books.json, so an ID-based
      // lookup on the checkout side can never resolve them. Pass the full
      // book data through instead, base64-encoded so it survives the URL.
      const booksPayload = selectedAudioFile.map((b: any) => ({
        bookTitle: b.title || b.bookTitle || "AudioBook",
        videoUrl: b.youtubeUrl || b.videoUrl || "",
        thumbnail: b.thumbnail || "/placeholder.svg",
        chapterId,
        price: 25,
      }));
      const booksParam =
        typeof window !== "undefined"
          ? window.btoa(unescape(encodeURIComponent(JSON.stringify(booksPayload))))
          : "";
      const params = new URLSearchParams({ uid, books: booksParam, from: "app" });
      const checkoutUrl = `https://breakup-app-kappa.vercel.app/checkout?${params.toString()}`;
      const bridge = (window as any).median || (window as any).gonative;
      if (bridge?.window?.open) {
        bridge.window.open(checkoutUrl, "external");
      } else {
        window.location.href = checkoutUrl;
      }
      return;
    }

    router.push("/checkout");
};

  if (!chapter) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-body">Loading chapter...</p>
        </div>
      </div>
    );
  }

  if (showSummary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto py-4">
            <Card className="animate-scale-hover py-4">
              <CardHeader>
                <CardTitle className="text-2xl text-center font-heading">
                  Chapter Complete: {chapter.title}
                </CardTitle>
                <p className="text-center text-gray-600 font-body">
                  Here are the audioFile selected for your learning journey
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {selectedAudioFile.length > 0 ? (
                  <>
                    <div className="text-center space-y-4">
                      {(() => {
                        const CHAPTER_FLAT_PRICE = 125;
                        const rawTotal = 25 * selectedAudioFile.length;
                        const savings = Math.max(rawTotal - CHAPTER_FLAT_PRICE, 0);
                        return (
                          <>
                            {savings > 0 && (
                              <div className="flex justify-center items-center gap-3">
                                <span className="text-gray-400 font-body line-through">
                                  ${rawTotal}
                                </span>
                                <span className="text-red-500 font-body font-medium text-sm">
                                  You save ${savings}
                                </span>
                              </div>
                            )}
                            <div className="text-2xl font-bold text-green-600 font-heading">
                              Total: ${savings > 0 ? CHAPTER_FLAT_PRICE : rawTotal}
                            </div>
                          </>
                        );
                      })()}
                      <p className="text-gray-500 font-body text-sm">
                        {selectedAudioFile.length} audiobook{selectedAudioFile.length !== 1 ? "s" : ""} — chapter bundle price
                      </p>
                      <div className="space-x-4 flex justify-center items-center align">
<button
  className="bg-green-600 hover:bg-green-700 animate-button-press font-heading flex text-white px-2 py-2"
  onClick={handleBuy}
  disabled={redirecting}
>
  <ShoppingCart className="mr-2 h-5 w-5" />
  {redirecting ? "Redirecting..." : "Buy This Bundle"}
</button>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      {selectedAudioFile.map((book, index) => (
                        <Card
                          key={index}
                          className="border-2 animate-scale-hover"
                        >
                          <CardContent className="p-4">
                            <div className="flex space-x-4">
                              <Image
                                src={book.thumbnail || "/placeholder.svg"}
                                alt={book.title}
                                width={80}
                                height={120}
                                className="rounded object-cover"
                              />
                              <div>
                                <h4 className="font-semibold text-sm font-heading ">
                                  {book.title}
                                </h4>
                                $25
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-4">
                    <p className="text-lg text-gray-600 font-body">
                      No audioFile were selected in this chapter.
                    </p>
                    <Link href="/chapters" className="inline-block">
                      <Button className="animate-button-press font-heading">
                        Continue to Next Chapter
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            proceedToCheckout();
          }}
        />

        <AlertDialog open={showPurchaseSuccess} onOpenChange={setShowPurchaseSuccess}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Purchase Successful! 🎉</AlertDialogTitle>
              <AlertDialogDescription>
                Your purchase was successful! Your new audiobooks are ready.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => router.push("/library")}>
                Go to Library to enjoy your guides
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  if (currentQuestionIndex >= chapter.questions.length) {
    setShowSummary(true);
    return null;
  }

  const currentQuestion = chapter.questions[currentQuestionIndex];
  const progressPercentage =
    ((currentQuestionIndex + 1) / chapter.questions.length) * 100;

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 font-body">
            Question not found. Redirecting...
          </p>
        </div>
      </div>
    );
  }

  // ✅ UPDATED QUOTE LOGIC
  const showQuote = (currentQuestionIndex + 1) % 6 === 0;
  const questionsPerChapter = chapter.questions.length;
  const chapterOffset =
    chaptersData.findIndex((c) => c.id === chapterId) *
    Math.ceil(questionsPerChapter / 6);
  const quoteIndex =
    chapterOffset + Math.floor((currentQuestionIndex + 1) / 6) - 1;
  const quote = sayings[quoteIndex % sayings.length];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              onClick={() => router.push("/chapters")}
              className="animate-button-press"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="font-body">Back</span>
            </Button>
            <div className="text-sm text-gray-600 font-body">
              Question {currentQuestionIndex + 1} of {chapter.questions.length}
            </div>
          </div>
          <div className="mb-8">
            <Progress value={progressPercentage} className="h-2" />
            <p className="text-center text-sm text-gray-600 mt-2 font-body">
              {chapter.title}
            </p>
          </div>

          <Card className="mb-6 animate-scale-hover">
            <CardHeader>
              <CardTitle className="text-xl text-center font-heading">
                {currentQuestion.text}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <Button
                  onClick={() => handleAnswer(true)}
                  size="lg"
                  className="h-20 text-xl font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      ✓
                    </div>
                    <span>Yes</span>
                  </div>
                </Button>
                <Button
                  onClick={() => handleAnswer(false)}
                  variant="outline"
                  size="lg"
                  className="h-16 text-lg animate-button-press font-heading"
                >
                  No
                </Button>
              </div>

              {showQuote && (
                <div className="space-y-4 mt-4">
                  <Image
                    src={quote.imgSrc}
                    alt={`Quote ${quote.id}`}
                    width={1020}
                    height={720}
                    className="rounded-lg object-contain shadow-md w-full"
                  />
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button
                      onClick={() =>
                        window.open(
                          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                            `${window.location.origin}${quote.imgSrc}`
                          )}&quote=${encodeURIComponent(
                            "Shared via mindthatseekstruth"
                          )}`,
                          "_blank"
                        )
                      }
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
                    >
                      Share on Facebook
                    </button>
                    <button
                      onClick={() =>
                        window.open(
                          `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                            "Shared via @mindthatseekstruth"
                          )}&url=${encodeURIComponent(
                            `${window.location.origin}${quote.imgSrc}`
                          )}`,
                          "_blank"
                        )
                      }
                      className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded text-sm"
                    >
                      Share on Twitter
                    </button>
                    <button
                      onClick={() =>
                        window.open(
                          `https://api.whatsapp.com/send?text=${encodeURIComponent(
                            "Check this out!\n" +
                              `${window.location.origin}${quote.imgSrc}`
                          )}`,
                          "_blank"
                        )
                      }
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm"
                    >
                      Share on WhatsApp
                    </button>
                    <a
                      href={`${window.location.origin}${quote.imgSrc}`}
                      download
                      className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded text-sm"
                    >
                      Download
                    </a>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}${quote.imgSrc}`
                        );
                        alert("Quote image link copied to clipboard!");
                      }}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded text-sm"
                    >
                      Copy Link
                    </button>
                    <button
                      onClick={() => {
                        if (navigator.share) {
                          navigator
                            .share({
                              title: "Quote from mindthatseekstruth",
                              text: "Check this inspiring quote!",
                              url: `${window.location.origin}${quote.imgSrc}`,
                            })
                            .catch((error) =>
                              console.error("Share failed:", error)
                            );
                        } else {
                          alert("Sharing not supported on this device.");
                        }
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm"
                    >
                      Share
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedAudioFile.length > 0 && (
            <div className="text-center text-sm text-gray-600 font-body">
              {selectedAudioFile.length} book
              {selectedAudioFile.length !== 1 ? "s" : ""} selected for your
              bundle
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        {currentQuestionIndex > 0 && (
          <Button
            variant="outline"
            onClick={handleBack}
            className="animate-button-press"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="font-body">Previous Question</span>
          </Button>
        )}
      </div>
    </div>
  );
}
