"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Search, Play, Calendar, BookOpen } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import type { LibraryBook } from "@/lib/types";
import VideoPlayer from "@/components/video-player";
import Image from "next/image";
import { doc, getDoc, onSnapshot, getDocFromServer } from "firebase/firestore";
import Swal from "sweetalert2";

// Extracts a YouTube video ID from any common URL shape
// (watch?v=, youtu.be/, embed/, or a bare ID), returning null instead of
// throwing if the URL is missing, empty, or doesn't match — the previous
// code assumed every videoUrl always had a "v=" param and crashed the
// whole page with a client-side exception whenever it didn't.
function extractYouTubeId(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    if (url.includes("v=")) {
      const id = url.split("v=")[1];
      const ampIndex = id.indexOf("&");
      return ampIndex !== -1 ? id.substring(0, ampIndex) : id;
    }
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (shortMatch) return shortMatch[1];
    const embedMatch = url.match(/embed\/([a-zA-Z0-9_-]+)/);
    if (embedMatch) return embedMatch[1];
    // Bare 11-character YouTube ID with no surrounding URL at all
    if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
    return null;
  } catch {
    return null;
  }
}

export default function LibraryPage() {
  const router = useRouter();
  const [user, authLoading] = useAuthState(auth);
  const [library, setLibrary] = useState<LibraryBook[]>([]);
  const [filteredLibrary, setFilteredLibrary] = useState<LibraryBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<LibraryBook | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait until Firebase Auth has actually finished checking — right
    // after returning from Safari checkout, `user` is briefly undefined
    // while auth rehydrates from storage, and redirecting on that instant
    // (instead of waiting for authLoading to clear) was what caused the
    // library page to bounce back to home / spin forever.
    if (authLoading) return;

    if (!user) {
      router.push("/");
      return;
    }

    // Load library from Firebase
    const loadLibraryFromFirebase = async () => {
      try {
        setLoading(true);
        const userRef = doc(db, "users", user.uid);

        // Force a fresh server read first, in case the WebView was
        // suspended in the background (e.g. during Safari checkout) and
        // the cached snapshot is stale.
        try {
          const freshSnap = await getDocFromServer(userRef);
          if (freshSnap.exists()) {
            const freshLibrary = freshSnap.data().library || [];
            setLibrary(freshLibrary);
            setFilteredLibrary(freshLibrary);
          }
        } catch (e) {
          // Offline or blocked — the onSnapshot listener below will catch up.
        }

        // Set up real-time listener
        const unsubscribe = onSnapshot(
          userRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const userData = docSnap.data();
              const userLibrary = userData.library || [];
              setLibrary(userLibrary);
              setFilteredLibrary(userLibrary);
            } else {
              setLibrary([]);
              setFilteredLibrary([]);
            }
            setLoading(false);
          },
          (error) => {
            // Previously this failed silently forever if Firestore
            // security rules blocked the read (permission-denied) — the
            // spinner would just spin with no error and no data.
            console.error("Library listener error:", error);
            toast({
              title: "Couldn't load your library",
              description: error.code === "permission-denied"
                ? "Firestore security rules are blocking this read. Check Firestore Database → Rules in Firebase Console."
                : error.message,
              variant: "destructive",
            });
            setLoading(false);
          }
        );

        // Cleanup listener on unmount
        return () => unsubscribe();
      } catch (error) {
        console.error("Error loading library:", error);
        toast({
          title: "Error",
          description: "Could not load your library.",
          variant: "destructive",
        });
        setLoading(false);
      }
    };

    loadLibraryFromFirebase();
  }, [user, authLoading, router]);

  useEffect(() => {
    let filtered = library;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((book) =>
        book.bookTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (filterBy !== "all") {
      if (filterBy === "recent") {
        filtered = filtered.sort(
          (a, b) =>
            new Date(b.purchasedAt).getTime() -
            new Date(a.purchasedAt).getTime()
        );
      } else {
        filtered = filtered.filter((book) => book.chapterId === filterBy);
      }
    }

    setFilteredLibrary(filtered);
  }, [library, searchTerm, filterBy]);

  const handleBookSelect = (book: LibraryBook) => {
    setSelectedBook(book);
  };

  const handleBackToLibrary = () => {
    setSelectedBook(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading your library...</p>
        </div>
      </div>
    );
  }

  if (selectedBook) {
    const cleanVideoId = extractYouTubeId(selectedBook.videoUrl);
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center mb-6">
              <Button
                variant="ghost"
                onClick={handleBackToLibrary}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Library
              </Button>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 py-4">
              {selectedBook.bookTitle}
            </h1>
            {cleanVideoId ? (
              <VideoPlayer
                videoId={cleanVideoId}
                title={selectedBook.bookTitle}
                thumbnail={selectedBook.thumbnail}
              />
            ) : (
              <div className="bg-white rounded-xl p-8 text-center space-y-2 border">
                <p className="text-gray-600 font-body">
                  This book doesn't have a playable audio link yet.
                </p>
                <p className="text-sm text-gray-400 font-body">
                  It's still in your library — please check back later or contact support.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center mb-8">
            <Button
              variant="ghost"
              onClick={() => router.push("/")}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            <h1 className="text-3xl font-bold text-gray-800">My Library</h1>
            <span className="ml-4 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
              {library.length} audioFile
            </span>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search your audioFile..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterBy} onValueChange={setFilterBy}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filter by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All AudioFile</SelectItem>
                    <SelectItem value="recent">Recently Added</SelectItem>
                    <SelectItem value="chapter1">Chapter 1</SelectItem>
                    <SelectItem value="chapter2">Chapter 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Library Grid */}
          {filteredLibrary.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLibrary.map((book, index) => (
                <Card
                  key={book.bookTitle || index}
                  className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
                  onClick={() => handleBookSelect(book)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      <div className="relative">
                        <Image
                          src={book.thumbnail || "/placeholder.svg"}
                          alt={book.bookTitle}
                          width={200}
                          height={120}
                          className="w-full h-32 object-cover rounded"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                          <Play className="h-8 w-8 text-white" />
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold text-sm line-clamp-2">
                          {book.bookTitle}
                        </h3>
                        <div className="flex items-center text-xs text-gray-500 mt-2">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(book.purchasedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  {searchTerm || filterBy !== "all"
                    ? "No audioFile found"
                    : "Your library is empty"}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm || filterBy !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : "Complete chapters and purchase bundles to build your learning library."}
                </p>
                <Button onClick={() => router.push("/chapters")}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Explore Chapters
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function toast({ title, description, variant }: { title: string; description: string; variant: "default" | "destructive" }) {
  Swal.fire({
    title,
    text: description,
    icon: variant === "destructive" ? "error" : "success",
    confirmButtonText: "OK",
    customClass: {
      confirmButton: "bg-blue-600 text-white px-4 py-2 rounded",
    },
    buttonsStyling: false,
    timer: 3000,
    timerProgressBar: true,

    position: "top-end",
    toast: true,
    showConfirmButton: false,
    showCloseButton: true,
  });
}
