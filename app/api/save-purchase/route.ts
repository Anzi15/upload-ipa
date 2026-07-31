import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

// Lazily initialize Firebase Admin — only runs when a request actually
// comes in, never during `next build`'s page-data collection step
// (which doesn't have access to runtime env vars in the same way).
function getDb() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "Missing Firebase Admin env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY must all be set in Vercel."
      );
    }

    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }
  return getFirestore();
}

export async function POST(req: NextRequest) {
  try {
    const { uid, books } = await req.json();

    if (!uid || !books || books.length === 0) {
      return NextResponse.json(
        { error: "Missing uid or books" },
        { status: 400 }
      );
    }

    const db = getDb();
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    const newItems = books.map((book: any) => ({
      bookTitle: book.title || book.bookTitle || "AudioBook",
      chapterId: book.chapterId || "single",
      videoUrl: book.youtubeUrl || book.videoUrl || "",
      purchasedAt: new Date().toISOString(),
      thumbnail: book.thumbnail || "/placeholder.svg",
      id: `${book.id || book.bookTitle || "book"}-${Date.now()}`,
    }));

    if (userDoc.exists) {
      await userRef.update({
        library: FieldValue.arrayUnion(...newItems),
      });
    } else {
      await userRef.set({
        library: newItems,
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("save-purchase error:", e);
    // Firestore's "5 NOT_FOUND" almost always means there's no Cloud
    // Firestore database created yet for this project (Firebase Console →
    // Firestore Database → Create database), or FIREBASE_PROJECT_ID points
    // at a different project than the one the database actually lives in.
    const isNotFound = e?.code === 5 || /NOT_FOUND/i.test(e?.message || "");
    const message = isNotFound
      ? "Firestore database not found. In Firebase Console, go to Firestore Database and make sure a database has been created for this project, and confirm FIREBASE_PROJECT_ID in Vercel matches that project exactly."
      : e.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
