"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { AppSettings } from "@/lib/types"
import { saveSettings, loadSettings } from "@/lib/storage"
import { toast } from "@/hooks/use-toast"

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  onSettingsChange: (settings: AppSettings) => void
}

export default function SettingsPanel({ isOpen, onClose, onSettingsChange }: SettingsPanelProps) {
  const [settings, setSettings] = useState<AppSettings>({ soundEnabled: true, primaryColor: "blue" })

  useEffect(() => {
    setSettings(loadSettings())
  }, [])

  const playButtonSound = () => {
    if (settings.soundEnabled) {
      // Create a simple beep sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 800
      oscillator.type = "sine"

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
    }
  }

  const handleSoundToggle = (enabled: boolean) => {
    const newSettings = { ...settings, soundEnabled: enabled }
    setSettings(newSettings)
    saveSettings(newSettings)
    onSettingsChange(newSettings)

    if (enabled) {
      playButtonSound()
    }

    toast({ title: `Sound ${enabled ? "enabled" : "disabled"}` })
  }

  const handleColorChange = (color: string) => {
    const newSettings = { ...settings, primaryColor: color }
    setSettings(newSettings)
    saveSettings(newSettings)
    onSettingsChange(newSettings)

    // Apply theme color to document root
    document.documentElement.style.setProperty("--primary-color", getColorValue(color))

    playButtonSound()
    toast({ title: `Theme color changed to ${color}` })
  }

  const getColorValue = (color: string) => {
    const colors = {
      blue: "#3b82f6",
      green: "#10b981",
      purple: "#8b5cf6",
      orange: "#f97316",
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  const resetProgress = () => {
    localStorage.removeItem("educational_app_progress")
    playButtonSound()
    toast({ title: "Progress reset successfully" })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="sound-toggle">Button Sounds</Label>
            <Switch id="sound-toggle" checked={settings.soundEnabled} onCheckedChange={handleSoundToggle} />
          </div>

          <div className="space-y-3">
            <Label>Primary Color Theme</Label>
            <RadioGroup value={settings.primaryColor} onValueChange={handleColorChange}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="blue" id="blue" />
                <Label htmlFor="blue" className="flex items-center space-x-2 cursor-pointer">
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                  <span>Blue</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="green" id="green" />
                <Label htmlFor="green" className="flex items-center space-x-2 cursor-pointer">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span>Green</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="purple" id="purple" />
                <Label htmlFor="purple" className="flex items-center space-x-2 cursor-pointer">
                  <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                  <span>Purple</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="orange" id="orange" />
                <Label htmlFor="orange" className="flex items-center space-x-2 cursor-pointer">
                  <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                  <span>Orange</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="pt-4 border-t">
            <Button variant="destructive" onClick={resetProgress} className="w-full">
              Reset Progress
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
