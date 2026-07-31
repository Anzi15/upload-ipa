"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import audioAudioBooks from "@/data/books.json";
import Image from "next/image";

export default function AllAudioBooksPage() {
  const router = useRouter();
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleBuy = (bookId: string) => {
    setSelectedBookId(bookId);
    setIsRedirecting(true);
    setTimeout(() => {
      router.push(`/purchase-book?bookId=${bookId}`);
    }, 1000);
  };

  const handleBackToLibrary = () => {
    router.push("/"); // Update this path if your homepage is different
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={handleBackToLibrary}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to home
          </Button>
        </div>
        <h1 className="text-3xl font-heading text-center mb-8">
          Browse & Buy AudioBooks
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {audioAudioBooks.map((book) => (
            <Card key={book.id} className="border-2 animate-scale-hover">
              <CardHeader>
                <Image
                  src={book.thumbnail || "/placeholder.svg"}
                  alt={book.title}
                  width={300}
                  height={424}
                  className="rounded object-cover w-full h-[424px]"
                />
              </CardHeader>
              <CardContent className="space-y-4">
                <CardTitle className="text-xl font-heading text-center">
                  {book.title}
                </CardTitle>
                <p className="text-center font-body text-gray-700">
                  ${book.price}
                </p>
                <Button
                  size="lg"
                  className="w-full bg-green-600 hover:bg-green-700 animate-button-press font-heading"
                  onClick={() => handleBuy(book.id)}
                  disabled={isRedirecting && selectedBookId === book.id}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  {isRedirecting && selectedBookId === book.id
                    ? "Redirecting..."
                    : "Buy Now"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
