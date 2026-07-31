import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Montserrat, Roboto } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import Link from "next/link"
import { BookOpen, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"

const inter = Inter({ subsets: ["latin"] })
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
})
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
})

export const metadata: Metadata = {
  title: "Break up guide - Helping you heal and grow",
  description:
    "Discover your personalized breakup guide. Get tailored advice, resources, and support to help you heal and grow after a breakup.",
    generator: 'v0.dev'
}

// viewportFit: "cover" allows the app to render edge-to-edge in the Median
// WebView while still exposing env(safe-area-inset-top/bottom) so headers
// and buttons don't get hidden behind the iPhone notch / status bar.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${montserrat.variable} ${roboto.variable}`}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
