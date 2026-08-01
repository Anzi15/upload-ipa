"use client"

import React, { useState } from "react"
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithCredential,
} from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { Eye, EyeOff } from "lucide-react"
import { Capacitor } from "@capacitor/core"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const signinPassRef = React.useRef<HTMLInputElement>(null)
  const signupPassRef = React.useRef<HTMLInputElement>(null)
  const [showPassword, setShowPassword] = useState(false)

  const togglePasswordVisibility = React.useCallback(() => {
    setShowPassword(v => {
      const next = !v
      if (signinPassRef.current) signinPassRef.current.type = next ? "text" : "password"
      if (signupPassRef.current) signupPassRef.current.type = next ? "text" : "password"
      return next
    })
  }, [])

  const handleEmailAuth = async (isSignUp: boolean) => {
    setLoading(true)
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password)
        toast({ title: "Account created successfully!" })
      } else {
        await signInWithEmailAndPassword(auth, email, password)
        toast({ title: "Signed in successfully!" })
      }
      onSuccess()
      onClose()
    } catch (error: any) {
      toast({
        title: "Authentication failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    try {
      if (Capacitor.isNativePlatform()) {
        const { Browser } = await import("@capacitor/browser")
        const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "break-up-app-ios.vercel.app"
        const authUrl = `https://${authDomain}/__/auth/handler`
        await Browser.open({ url: authUrl })
      } else {
        const provider = new GoogleAuthProvider()
        await signInWithPopup(auth, provider)
        toast({ title: "Signed in with Google successfully!" })
        onSuccess()
        onClose()
      }
    } catch (error: any) {
      toast({
        title: "Google Sign-In failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAppleSignIn = async () => {
    setLoading(true)
    try {
      if (Capacitor.getPlatform() === "ios") {
        const { SignInWithApple } = await import("@capacitor-community/apple-sign-in")
        const result = await SignInWithApple.authorize({
          clientId: "co.median.ios.zryayz",
          redirectURI: "https://break-up-app-ios.vercel.app",
          scopes: "email name",
        })

        if (result.response?.identityToken) {
          const credential = new OAuthProvider("apple.com").credential({
            idToken: result.response.identityToken,
            rawNonce: result.response.nonce,
          })
          await signInWithCredential(auth, credential)
          toast({ title: "Signed in with Apple successfully!" })
          onSuccess()
          onClose()
        }
      } else {
        const provider = new OAuthProvider("apple.com")
        await signInWithPopup(auth, provider)
        toast({ title: "Signed in with Apple successfully!" })
        onSuccess()
        onClose()
      }
    } catch (error: any) {
      console.error("Apple Sign-In error:", error)
      toast({
        title: "Apple Sign-In failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="
          w-[calc(100vw-2rem)] max-w-md
          max-h-[85dvh] overflow-y-auto
          p-6 pb-8
          rounded-2xl
        "
      >
        <DialogHeader className="mb-2">
          <DialogTitle className="text-xl font-heading">Sign In to Continue</DialogTitle>
        </DialogHeader>

        {/* Social Authentication Buttons — Equal Prominence (App Store Guideline 4.8) */}
        <div className="space-y-2 mb-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleAppleSignIn}
            disabled={loading}
            className="w-full h-11 font-body flex items-center justify-center space-x-2 bg-black text-white hover:bg-gray-900 hover:text-white"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.66-.8 1.11-1.92.99-3.04-.96.04-2.12.64-2.8 1.44-.61.71-1.15 1.86-1 2.98 1.07.08 2.15-.57 2.81-1.38z" />
            </svg>
            <span>Continue with Apple</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-11 font-body flex items-center justify-center space-x-2 border-gray-300 hover:bg-gray-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </Button>
        </div>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500 font-body">Or email</span>
          </div>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-3">
            <TabsTrigger value="signin" className="font-body">Sign In</TabsTrigger>
            <TabsTrigger value="signup" className="font-body">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="signin-email" className="font-body">Email</Label>
              <Input
                id="signin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="font-body h-11"
                autoComplete="email"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="signin-password" className="font-body">Password</Label>
              <div className="relative">
                <Input
                  id="signin-password"
                  ref={signinPassRef}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="font-body h-11 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              onClick={() => handleEmailAuth(false)}
              className="w-full font-body h-11 mt-1"
              disabled={loading}
            >
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </TabsContent>

          <TabsContent value="signup" className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="signup-email" className="font-body">Email</Label>
              <Input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="font-body h-11"
                autoComplete="email"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="signup-password" className="font-body">Password</Label>
              <div className="relative">
                <Input
                  id="signup-password"
                  ref={signupPassRef}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className="font-body h-11 pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              onClick={() => handleEmailAuth(true)}
              className="w-full font-body h-11 mt-1"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Sign Up"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

