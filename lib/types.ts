export interface Book {
  title: string
  youtubeUrl: string
  thumbnail: string
}

export interface Question {
  id: string
  text: string
  audioFile: Book[]
}

export interface Chapter {
  id: string
  title: string
  description: string
  questions: Question[]
}

export interface UserProgress {
  [chapterId: string]: number
}

export interface LibraryBook {
  bookTitle: string
  chapterId: string
  videoUrl: string
  purchasedAt: string
  thumbnail: string
}

export interface UserData {
  uid: string
  email: string
  authProvider: "email" | "google"
  library: LibraryBook[]
  progress: UserProgress
}

export interface AppSettings {
  soundEnabled: boolean
  primaryColor: string
}
