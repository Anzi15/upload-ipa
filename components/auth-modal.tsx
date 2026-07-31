"use client"

import React, { useState } from "react"
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { Eye, EyeOff } from "lucide-react"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  // Use a ref to toggle password visibility WITHOUT causing a re-render.
  // State-driven type changes cause Dialog to remount the input and lose focus.
  const signinPassRef = React.useRef<HTMLInputElement>(null)
  const signupPassRef = React.useRef<HTMLInputElement>(null)
  const [showPassword, setShowPassword] = useState(false)

  const togglePasswordVisibility = React.useCallback(() => {
    setShowPassword(v => {
      const next = !v
      // Directly mutate the DOM type — no re-render needed
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
