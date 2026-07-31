"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Play,
  BookOpen,
  Library,
  Settings,
  LogIn,
  TableOfContents,
  TvMinimalPlay,
  Coins,
  ConeIcon,
} from "lucide-react";
import IntroVideo from "@/components/IntroVide";
import { loadProgress, loadSettings, saveProgress } from "@/lib/storage";
import { auth, db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { signOut } from "firebase/auth";
import AuthModal from "@/components/auth-modal";
import SettingsPanel from "@/components/settings-panel";
import VideoPlayer from "@/components/video-player";
import AnimatedBackground from "@/components/animated-background";
import type { AppSettings, Chapter } from "@/lib/types";
import Link from "next/link";
import Image from "next/image";
import { doc, getDoc, onSnapshot, getDocFromServer } from "firebase/firestore";
import { getRedirectResult } from "firebase/auth";
import { toast } from "@/hooks/use-toast";
import chaptersData from "@/data/chapters.json";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function HomePage() {
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [hasLibraryItems, setHasLibraryItems] = useState(false);
  const [showAllCompleteDialog, setShowAllCompleteDialog] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    soundEnabled: true,
    primaryColor: "blue",
  });

  useEffect(() => {
    // Completes Sign in with Apple / Google when using signInWithRedirect
    // (used inside the Median in-app WebView). This MUST live somewhere
    // that's always mounted — AuthModal is closed/unmounted by the time
    // the page reloads after the redirect comes back from Apple, so the
    // result would otherwise be silently dropped.
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          toast({ title: "Signed in successfully!" });
        }
      })
      .catch((error: any) => {
        if (error?.code && error.code !== "auth/no-auth-event") {
          toast({
            title: "Sign-in failed",
            description: error.message,
            variant: "destructive",
          });
        }
      });
  }, []);

  useEffect(() => {
    // Load settings and apply theme
    const savedSettings = loadSettings();
    setSettings(savedSettings);

    // Apply theme color
    const colors = {
      blue: "#3b82f6",
      green: "#10b981",
      purple: "#8b5cf6",
      orange: "#f97316",
    };
    document.documentElement.style.setProperty(
      "--primary-color",
      colors[savedSettings.primaryColor as keyof typeof colors]
    );
  }, []);

  // Re-check library state whenever the app comes back to the foreground.
  // After a Safari checkout, the WebView can be suspended long enough that
  // its Firestore realtime listener doesn't reliably resume — this forces
  // a fresh check every time the user returns, whether via the "Return to
  // App" deep link or by switching back manually.
  const [refreshTick, setRefreshTick] = useState(0);
  useEffect(() => {
    const handleForeground = () => {
      if (document.visibilityState === "visible") {
        setRefreshTick((t) => t + 1);
      }
    };
    document.addEventListener("visibilitychange", handleForeground);
    window.addEventListener("focus", handleForeground);
    window.addEventListener("pageshow", handleForeground);
    return () => {
      document.removeEventListener("visibilitychange", handleForeground);
      window.removeEventListener("focus", handleForeground);
      window.removeEventListener("pageshow", handleForeground);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setHasLibraryItems(false);
      return;
    }

    let cancelled = false;
    const userRef = doc(db, "users", user.uid);

    // Force a fresh read from the server first (bypasses any stale
    // cached snapshot from before the app was backgrounded).
    getDocFromServer(userRef)
      .then((freshSnap) => {
        if (!cancelled && freshSnap.exists()) {
          setHasLibraryItems((freshSnap.data().library || []).length > 0);
        }
      })
      .catch(() => {
        // Offline or blocked — the onSnapshot listener below will still catch up.
      });

    // Real-time listener for library updates. The unsubscribe function is
    // returned directly from this effect (not from an inner async
    // function) so React actually cleans it up between runs — previously
    // it was created inside an async helper and discarded, leaking a new
    // listener on every refresh.
    const unsubscribe = onSnapshot(
      userRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          const userLibrary = userData.library || [];
          setHasLibraryItems(userLibrary.length > 0);
        } else {
          setHasLibraryItems(false);
        }
      },
      (error) => {
        // This fires if Firestore security rules block the read —
        // previously this failed completely silently forever.
        console.error("Library listener error:", error);
        toast({
          title: "Couldn't load your library",
          description: error.code === "permission-denied"
            ? "Firestore security rules are blocking this read. Check Firestore Database → Rules in Firebase Console."
            : error.message,
          variant: "destructive",
        });
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user, refreshTick]);

  const playButtonSound = () => {
    if (settings.soundEnabled) {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 600;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.15
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    }
  };

  useEffect(() => {
  router.prefetch("/chapter/chapter1");
  router.prefetch("/chapter/chapter2");
  router.prefetch("/chapter/chapter3");
  router.prefetch("/chapter/chapter4");
  router.prefetch("/chapter/chapter5");
  router.prefetch("/chapter/chapter6");
  router.prefetch("/chapter/chapters");
}, [router]);


const navigateToChapter = (chapterId: string) => {
  const target = `/chapter/${chapterId}`;
  // Detect if running inside Median (or any WebView)
  const isInApp = /Median/i.test(navigator.userAgent);
  if (isInApp) {
    // Hard redirect = faster inside app
    window.location.href = target;
  } else {
    // Don’t await, fire and forget
    router.push(target);
  }
};

const handleStart = () => {
  playButtonSound();

  const progress = loadProgress();
  const chapters = chaptersData as Chapter[];

  const isChapterComplete = (chapter: Chapter) =>
    (progress[chapter.id] ?? 0) >= chapter.questions.length;

  const allComplete = chapters.length > 0 && chapters.every(isChapterComplete);

  if (allComplete) {
    // Every chapter is done — don't try to navigate to a chapter that
    // doesn't exist (that's what caused the infinite loading before).
    // Ask the user if they want to reset and go again instead.
    setShowAllCompleteDialog(true);
    return;
  }

  // Find the first chapter that isn't fully finished yet. This is safer
  // than assuming progress is always sequential and incrementing the last
  // chapter number by 1 (which broke once you ran out of chapters).
  const nextChapter = chapters.find((c) => !isChapterComplete(c));
  navigateToChapter(nextChapter?.id ?? chapters[0]?.id ?? "chapter1");
};

const handleResetAndRestart = () => {
  saveProgress({});
  setShowAllCompleteDialog(false);
  playButtonSound();
  const chapters = chaptersData as Chapter[];
  navigateToChapter(chapters[0]?.id ?? "chapter1");
};


  const handleChooseChapter = () => {
    playButtonSound();
    router.push("/chapters");
  };

  const handleLibrary = () => {
    playButtonSound();
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    router.push("/library");
  };

  const handleSignOut = async () => {
    playButtonSound();
    await signOut(auth);
  };

  const getUserInitials = (email: string) => {
    return email.split("@")[0].slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />

      {/* Header */}
      <header
        className="relative z-10 flex justify-between items-center p-4"
        style={{ paddingTop: "max(2.75rem, calc(env(safe-area-inset-top) + 1rem))" }}
      >
        <div className="flex items-center space-x-2">
          <BookOpen
            className="h-8 w-8"
            style={{ color: "var(--primary-color)" }}
          />
          <h1 className="text-2xl font-bold text-gray-800 font-heading">
            Breakup Guide
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(true)}
            className="animate-button-press"
          >
            <Settings className="h-5 w-5" />
          </Button>

          {user ? (
            <div className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.photoURL || undefined} />
                <AvatarFallback className="text-xs font-body">
                  {getUserInitials(user.email || "U")}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-gray-600 hidden sm:block font-body">
                {user.displayName || user.email?.split("@")[0]}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="animate-button-press text-xs font-body text-gray-500 hover:text-red-500"
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAuthModal(true)}
              className="animate-button-press"
            >
              <LogIn className="h-5 w-5" />
              <span className="hidden sm:inline ml-2 font-body">Login</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-8">
        <div className=" mx-auto space-y-8">
          {/* Intro Video */}
          <Card className="animate-scale-hover">
            <Image
              src={"/cover image.jpg"}
              width={720}
              height={840}
              alt="Talk to Mehran"
              className="w-full aspect-video object-cover rounded-lg"
            />
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-center font-heading">
                The Ultimate BreakUp Cure
              </h2>
              <div className="flex justify-center"></div>
              <p className="text-center text-gray-600 mt-4 font-body">
                Are you struggling to move on after a breakup? Feel lost,
                broken, or unsure of your next step? You're not alone — and help
                is here.
              </p>
            </CardContent>
            <h3 className="text-center font-bold">
              Watch The Introductory Video
            </h3>
            <div className="max-w-3xl mx-auto rounded-xl overflow-hidden shadow-xl aspect-video">
              <IntroVideo />
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="grid md:grid-cols-3 gap-4">
            <button
              onClick={handleStart}
              className="h-24 text-lg font-semibold animate-scale-hover animate-button-press font-heading text-white flex items-center justify-center rounded-md"
              style={{ backgroundColor: "var(--primary-color)" }}
            >
              <Play className="mr-2 h-6 w-6" />
              Start Learning
            </button>

            <button
              onClick={handleChooseChapter}
              className="h-24 text-lg font-semibold animate-scale-hover animate-button-press font-heading   bg-white rounded-md border border-gray-300 flex items-center justify-center text-gray-800 hover:shadow-lg transition-shadow duration-200"
            >
              <TableOfContents className="mr-2 h-6 w-6 text-primary" />
              Choose Chapter
            </button>

            <a
              href={"/books"}
              className="h-24 text-lg font-semibold animate-scale-hover animate-button-press font-heading"
            >
              <Button
                variant="outline"
                className="h-24 text-lg font-semibold animate-scale-hover animate-button-press font-heading w-full"
              >
                <BookOpen className="mr-2 h-6 w-6 text-primary" />
                Audio-Books Store
              </Button>
            </a>

            <a href="/freebies" className="block">
              <Button
                variant="outline"
                className="w-full h-auto px-6 py-6 text-left text-base sm:text-lg font-semibold font-heading space-y-1 animate-scale-hover animate-button-press transition-all duration-200"
              >
                <div className="">
                  <div className="flex items-center mb-2 mx-auto justify-center align-center">
                    <ConeIcon className="mr-3 h-6 w-6 text-primary" />
                    <span className="text-xl font-bold text-center">
                      Freebies
                    </span>
                  </div>
                  <span className="text-gray-900 text-center">
                    <span className="text-center">
                      Did you just break up?
                    </span>
                    <br />
                    Watch the free videos here
                  </span>
                </div>
              </Button>
            </a>

            {/* Show Library button only if user has library items */}
            {hasLibraryItems && (
              <Button
                onClick={handleLibrary}
                variant="outline"
                className="h-24 text-lg font-semibold animate-scale-hover animate-button-press font-heading"
              >
                <Library className="mr-2 h-6 w-6 text-primary" />
                My Library
              </Button>
            )}
          </div>

          <div>
            <Card>
              <CardContent className="p-0">
                <Link
                  href="https://mindthatseekstruth.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-24 text-lg font-semibold animate-scale-hover animate-button-press font-heading p-0"
                >
                  <Image
                    src={"/talk  to mehran.png"}
                    width={720}
                    height={480}
                    alt="Talk to Mehran"
                    className="w-full aspect-video object-cover rounded-lg"
                  />
                </Link>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardContent className="p-0">
                <Link
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-24 text-lg font-semibold animate-scale-hover animate-button-press font-heading p-0"
                >
                  <Image
                    src={"/author mehran books.jpg"}
                    width={720}
                    height={480}
                    alt="Talk to Mehran"
                    className="w-full aspect-video object-cover rounded-lg"
                  />

                  <Image
                    src={"/WhatsApp Image 2025-07-16 at 16.02.31_fd5dec49.jpg"}
                    width={720}
                    height={480}
                    alt="Talk to Mehran"
                    className="w-full aspect-video object-cover rounded-lg"
                  />
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
            <p className="text-center">On this app you will find:</p>
            <Card className="animate-scale-hover">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2 font-heading">
                  5 Learning Chapters
                </h3>
                <p className="text-gray-600 text-sm font-body">
                  Comprehensive topics covering about your breakup situation and
                  how to deal with it.
                </p>
              </CardContent>
            </Card>

            <Card className="animate-scale-hover">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Play className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2 font-heading">
                  Interactive Questions
                </h3>
                <p className="text-gray-600 text-sm font-body">
                  Personalized learning of your breakup based on your responses
                </p>
              </CardContent>
            </Card>

            <Card className="animate-scale-hover">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Library className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2 font-heading">
                  Curated Library
                </h3>
                <p className="text-gray-600 text-sm font-body">
                  Access your purchased content anytime, anywhere
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Modals */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {}}
      />

      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSettingsChange={setSettings}
      />

      <AlertDialog open={showAllCompleteDialog} onOpenChange={setShowAllCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>You've completed all chapters! 🎉</AlertDialogTitle>
            <AlertDialogDescription>
              You've finished every chapter in this course. Would you like to reset your
              progress and take the sessions again?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetAndRestart}>
              Reset & Restart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}