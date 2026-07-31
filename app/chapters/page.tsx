"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, CheckCircle, Play } from "lucide-react"
import type { Chapter } from "@/lib/types"
import { loadProgress } from "@/lib/storage"
import chaptersData from "@/data/chapters.json"

export default function ChaptersPage() {
  const router = useRouter()
  const [chapters] = useState<Chapter[]>(chaptersData)
  const [progress, setProgress] = useState<{ [key: string]: number }>({})

  useEffect(() => {
    setProgress(loadProgress())
  }, [])

  const isChapterCompleted = (chapter: Chapter) => {
    return progress[chapter.id] === chapter.questions.length
  }

  const getChapterProgress = (chapterId: string) => {
    return progress[chapterId] || 0
  }

  const handleChapterSelect = (chapterId: string) => {
    router.push(`/chapter/${chapterId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center mb-8">
            <Button variant="ghost" onClick={() => router.push("/")} className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            <h1 className="text-3xl font-bold text-gray-800">Choose Your Chapter</h1>
          </div>

          {/* Chapters Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {chapters.map((chapter, index) => {
              const chapterProgress = getChapterProgress(chapter.id)
              const isCompleted = isChapterCompleted(chapter)
              const progressPercentage = (chapterProgress / chapter.questions.length) * 100

              return (
                <Card
                  key={chapter.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    isCompleted ? "border-green-500 bg-green-50" : ""
                  }`}
                  onClick={() => handleChapterSelect(chapter.id)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">
                        Chapter {index + 1}: {chapter.title}
                      </CardTitle>
                      {isCompleted && <CheckCircle className="h-6 w-6 text-green-600" />}
                    </div>
                    <p className="text-gray-600">{chapter.description}</p>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-4">
                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{chapterProgress}/{chapter.questions.length} questions</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center justify-between">
                        <Badge variant={isCompleted ? "default" : chapterProgress > 0 ? "secondary" : "outline"}>
                          {isCompleted ? "Completed" : chapterProgress > 0 ? "In Progress" : "Not Started"}
                        </Badge>

                        <Button size="sm">
                          <Play className="h-4 w-4 mr-2" />
                          {chapterProgress > 0 ? "Continue" : "Start"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Overall Progress */}
          <Card className="mt-8">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Overall Progress</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {chapters.map((chapter, index) => (
                  <div key={chapter.id} className="text-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                        isChapterCompleted(chapter)
                          ? "bg-green-500 text-white"
                          : getChapterProgress(chapter.id) > 0
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <p className="text-xs text-gray-600">{getChapterProgress(chapter.id)}/{chapter.questions.length}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
