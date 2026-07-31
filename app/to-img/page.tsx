"use client";
import { useState, useEffect, ChangeEvent } from "react";

interface PdfImage {
  page: number;
  url: string;
}

export default function PdfToImage() {
  const [pdfjsLib, setPdfjsLib] = useState<any>(null);
  const [images, setImages] = useState<PdfImage[]>([]);
  const [status, setStatus] = useState<string>("");
  const [scale, setScale] = useState<number>(2);

  useEffect(() => {
    (async () => {
      // ✅ Use legacy build
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const pdfWorker = await import("pdfjs-dist/build/pdf.worker.mjs");

      // ✅ Attach worker
      pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

      setPdfjsLib(pdfjs);
    })();
  }, []);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!pdfjsLib) {
      alert("PDF.js not ready yet");
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file.");
      return;
    }

    setStatus("Processing...");
    setImages([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
      }).promise;

      const results: PdfImage[] = [];

      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;

        const blob: Blob | null = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/png")
        );
        if (!blob) continue;

        const url = URL.createObjectURL(blob);
        results.push({ page: p, url });
      }

      setImages(results);
      setStatus(`Converted ${results.length} page(s)`);
    } catch (err) {
      console.error(err);
      setStatus("Error while converting PDF.");
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>PDF → Image (Next.js)</h1>
      <input type="file" accept="application/pdf" onChange={handleFile} />
      <div style={{ marginTop: "12px" }}>
        <label>Scale: </label>
        <input
          type="number"
          value={scale}
          step="0.5"
          min="0.5"
          onChange={(e) => setScale(Number(e.target.value))}
          style={{ width: "70px" }}
        />
      </div>
      <p>{status}</p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: "12px",
          marginTop: "16px",
        }}
      >
        {images.map((img) => (
          <div
            key={img.page}
            style={{
              border: "1px solid #ddd",
              padding: "8px",
              borderRadius: "8px",
              background: "#fff",
            }}
          >
            <img
              src={img.url}
              alt={`Page ${img.page}`}
              style={{ width: "100%", borderRadius: "6px" }}
            />
            <p style={{ fontSize: "12px", wordBreak: "break-all" }}>
              Page {img.page}: {img.url}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
