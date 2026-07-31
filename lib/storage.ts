import type { UserProgress, AppSettings } from "./types"

const PROGRESS_KEY = "educational_app_progress"
const SETTINGS_KEY = "educational_app_settings"
const BUNDLE_KEY = "educational_app_bundle"

export const saveProgress = (progress: UserProgress) => {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
}

export const loadProgress = (): UserProgress => {
  const saved = localStorage.getItem(PROGRESS_KEY)
  return saved ? JSON.parse(saved) : {}
}

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export const loadSettings = (): AppSettings => {
  const saved = localStorage.getItem(SETTINGS_KEY)
  return saved ? JSON.parse(saved) : { soundEnabled: true, primaryColor: "blue" }
}

export const saveBundle = (audioFile: any[]) => {
  localStorage.setItem(BUNDLE_KEY, JSON.stringify(audioFile))
}

export const loadBundle = () => {
  const saved = localStorage.getItem(BUNDLE_KEY)
  return saved ? JSON.parse(saved) : []
}

export const clearBundle = () => {
  localStorage.removeItem(BUNDLE_KEY)
}
