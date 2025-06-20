"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  X,
  PlayCircle,
  User,
  MessageSquare,
  BarChart3,
  Brain,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Calendar,
  Target,
} from "lucide-react"
import type { CallDetailsResponse } from "@/lib/api/calls"

interface CallAnalysisDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  callData: CallDetailsResponse | null
  loading?: boolean
}

export function CallAnalysisDialog({ open, onOpenChange, callData, loading }: CallAnalysisDialogProps) {
  const [activeSection, setActiveSection] = useState("overview")
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)

  if (!callData) return null

  const { call_details, candidate, job, analysis_summary, performance_metrics, data_completeness, timeline } = callData

  const getScoreColor = (score: number | null | undefined) => {
    if (typeof score !== "number" || isNaN(score)) return "text-gray-500 bg-gray-100"
    if (score >= 90) return "text-green-700 bg-green-100"
    if (score >= 80) return "text-blue-700 bg-blue-100"
    if (score >= 70) return "text-yellow-700 bg-yellow-100"
    if (score >= 60) return "text-orange-700 bg-orange-100"
    return "text-red-700 bg-red-100"
  }

  const getRecommendationColor = (recommendation: string | undefined) => {
    if (!recommendation) return "text-gray-700 bg-gray-100 border-gray-200"

    switch (recommendation.toLowerCase()) {
      case "hire":
      case "recommend":
        return "text-green-700 bg-green-100 border-green-200"
      case "maybe":
      case "consider":
        return "text-yellow-700 bg-yellow-100 border-yellow-200"
      case "reject":
      case "no":
        return "text-red-700 bg-red-100 border-red-200"
      default:
        return "text-gray-700 bg-gray-100 border-gray-200"
    }
  }

  const formatDuration = (minutes: number | undefined) => {
    if (!minutes || isNaN(minutes)) return "0m"
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return "Invalid date"
    }
  }

  const sections = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "analysis", label: "AI Analysis", icon: Brain },
    { id: "questions", label: "Questions", icon: MessageSquare },
    { id: "transcript", label: "Transcript", icon: FileText },
  ]

  const questions = call_details?.gemini_analysis?.question_responses || []
  const geminiAnalysis = call_details?.gemini_analysis
  const hasAnalysis = !!geminiAnalysis

  // Parse transcript into conversation format
  const parseTranscript = (transcript: string | undefined) => {
    if (!transcript) return []

    const lines = transcript.split("\n").filter((line) => line.trim())
    const conversations = []

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue

      // Try different formats
      if (
        trimmedLine.startsWith("AI:") ||
        trimmedLine.startsWith("Assistant:") ||
        trimmedLine.startsWith("Interviewer:")
      ) {
        conversations.push({
          speaker: "AI",
          text: trimmedLine.replace(/^(AI:|Assistant:|Interviewer:)\s*/, ""),
        })
      } else if (
        trimmedLine.startsWith("User:") ||
        trimmedLine.startsWith("Candidate:") ||
        trimmedLine.startsWith("Human:")
      ) {
        conversations.push({
          speaker: "User",
          text: trimmedLine.replace(/^(User:|Candidate:|Human:)\s*/, ""),
        })
      } else {
        // If no prefix, treat as continuation or general text
        conversations.push({
          speaker: "Unknown",
          text: trimmedLine,
        })
      }
    }

    return conversations
  }

  const transcriptConversations = parseTranscript(call_details?.call_transcript)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg mr-3">
              <PlayCircle className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">Call Analysis</DialogTitle>
              <p className="text-sm text-gray-600 font-normal">
                {candidate?.name || "Unknown Candidate"} • {job?.title || "Unknown Job"}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar Navigation */}
          <div className="w-48 border-r bg-gray-50 p-4 flex-shrink-0">
            <nav className="space-y-2">
              {sections.map((section) => {
                const Icon = section.icon
                const isDisabled =
                  (section.id === "analysis" && !hasAnalysis) ||
                  (section.id === "questions" && questions.length === 0) ||
                  (section.id === "transcript" && !call_details?.call_transcript)

                return (
                  <button
                    key={section.id}
                    onClick={() => !isDisabled && setActiveSection(section.id)}
                    disabled={isDisabled}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                      activeSection === section.id
                        ? "bg-purple-100 text-purple-700 font-medium"
                        : isDisabled
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {section.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Main Content with proper scrolling */}
          <ScrollArea className="flex-1">
            <div className="p-6">
              {/* Overview Section */}
              {activeSection === "overview" && (
                <div className="space-y-6">
                  {/* Call Summary Cards */}
                  <div className="grid grid-cols-1 gap-4 max-w-sm">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                        <div className="text-2xl font-bold text-gray-900">
                          {performance_metrics?.questions_asked || questions.length || 0}
                        </div>
                        <p className="text-xs text-gray-500">Questions Asked</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recommendation */}
                  {analysis_summary && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="h-5 w-5" />
                          Recommendation
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between mb-4">
                          <Badge
                            className={`px-4 py-2 text-base ${getRecommendationColor(analysis_summary.recommendation)}`}
                          >
                            {(analysis_summary.recommendation || "UNKNOWN").toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-sm">
                            {analysis_summary.confidence_level || "Unknown"} confidence
                          </Badge>
                        </div>
                        <p className="text-gray-700 leading-relaxed">
                          {analysis_summary?.executive_summary || 
                           call_details?.gemini_analysis?.executive_summary || 
                           "No executive summary available."}
                        </p>
                        {call_details?.gemini_analysis?.next_steps && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <h5 className="font-medium text-gray-900 mb-1">Next Steps:</h5>
                            <p className="text-sm text-gray-700">{call_details.gemini_analysis.next_steps}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Score Breakdown */}
                  {analysis_summary && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Score Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Technical Skills</span>
                            <span className="font-medium">
                              {call_details?.gemini_analysis?.technical_evaluation?.technical_score || 
                               analysis_summary?.technical_score || 0}/100
                            </span>
                          </div>
                          <Progress value={call_details?.gemini_analysis?.technical_evaluation?.technical_score || 
                                           analysis_summary?.technical_score || 0} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Communication</span>
                            <span className="font-medium">{analysis_summary.communication_score || 0}/100</span>
                          </div>
                          <Progress value={analysis_summary.communication_score || 0} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Cultural Fit</span>
                            <span className="font-medium">{analysis_summary.cultural_fit_score || 0}/100</span>
                          </div>
                          <Progress value={analysis_summary.cultural_fit_score || 0} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Timeline */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Timeline
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <div>
                            <p className="text-sm font-medium">Scheduled</p>
                            <p className="text-xs text-gray-500">
                              {formatDate(timeline?.scheduled || call_details?.scheduled_time)}
                            </p>
                          </div>
                        </div>
                        {timeline?.completed && (
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <div>
                              <p className="text-sm font-medium">Completed</p>
                              <p className="text-xs text-gray-500">{formatDate(timeline.completed)}</p>
                            </div>
                          </div>
                        )}
                        {timeline?.analyzed && (
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <div>
                              <p className="text-sm font-medium">Analyzed</p>
                              <p className="text-xs text-gray-500">{formatDate(timeline.analyzed)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                      {call_details?.gemini_analysis?.interview_duration_assessment && (
                        <div className="mt-3 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                          <h5 className="font-medium text-yellow-800 mb-1">Duration Assessment:</h5>
                          <p className="text-sm text-yellow-700">{call_details.gemini_analysis.interview_duration_assessment}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* AI Analysis Section */}
              {activeSection === "analysis" && geminiAnalysis && (
                <div className="space-y-6">
                  {/* Strengths */}
                  {geminiAnalysis.key_strengths && geminiAnalysis.key_strengths.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="h-5 w-5" />
                          Key Strengths
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {geminiAnalysis.key_strengths.map((strength, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Areas of Concern */}
                  {geminiAnalysis.areas_of_concern && geminiAnalysis.areas_of_concern.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-yellow-700">
                          <AlertTriangle className="h-5 w-5" />
                          Areas of Concern
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {geminiAnalysis.areas_of_concern.map((concern, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{concern}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Red Flags */}
                  {geminiAnalysis.red_flags && geminiAnalysis.red_flags.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-700">
                          <X className="h-5 w-5" />
                          Red Flags
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {geminiAnalysis.red_flags.map((flag, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{flag}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Detailed Evaluations */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {geminiAnalysis.technical_evaluation && (true && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Technical Evaluation</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="mb-3">
                            <Badge className={getScoreColor(geminiAnalysis.technical_evaluation.technical_score)}>
                              {geminiAnalysis.technical_evaluation.technical_score || 0}/100
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700">
                            {geminiAnalysis.technical_evaluation.technical_summary || "No technical summary available."}
                          </p>
                        </CardContent>
                      </Card>
                    ))}

                    {geminiAnalysis.communication_evaluation && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Communication Evaluation</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="mb-3">
                            <Badge
                              className={getScoreColor(geminiAnalysis.communication_evaluation.communication_score)}
                            >
                              {geminiAnalysis.communication_evaluation.communication_score || 0}/100
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700">
                            {geminiAnalysis.communication_evaluation.communication_summary ||
                              "No communication summary available."}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Cultural Fit */}
                  {geminiAnalysis.cultural_fit && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Cultural Fit Assessment</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-3">
                          <Badge className={getScoreColor(geminiAnalysis.cultural_fit.cultural_fit_score)}>
                            {geminiAnalysis.cultural_fit.cultural_fit_score || 0}/100
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700">
                          {geminiAnalysis.cultural_fit.cultural_fit_summary || "No cultural fit summary available."}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Questions Section */}
              {activeSection === "questions" && questions.length > 0 && (
                <div className="space-y-6">
                  {/* Question Navigation */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                        disabled={currentQuestionIndex === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))
                        }
                        disabled={currentQuestionIndex === questions.length - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Current Question */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Question Analysis</CardTitle>
                        <Badge className={getScoreColor(questions[currentQuestionIndex]?.score)}>
                          {questions[currentQuestionIndex]?.score || 0}/100
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Question:</h4>
                        <div className="text-gray-700 bg-gray-50 p-3 rounded-lg max-w-full">
                          <p className="break-words whitespace-pre-wrap">
                            {questions[currentQuestionIndex]?.question || "No question available"}
                          </p>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Quality Assessment:</h4>
                        <Badge variant="outline" className="mb-2">
                          {questions[currentQuestionIndex]?.response_quality || "Unknown"}
                        </Badge>
                        <div className="text-sm text-gray-700 max-w-full">
                          <p className="break-words whitespace-pre-wrap">
                            {questions[currentQuestionIndex]?.notes || "No notes available"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Question Overview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">All Questions Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2">
                        {questions.map((q, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentQuestionIndex(index)}
                            className={`p-3 text-left rounded-lg border transition-colors ${
                              index === currentQuestionIndex
                                ? "border-purple-200 bg-purple-50"
                                : "border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Question {index + 1}</span>
                              <Badge size="sm" className={getScoreColor(q?.score)}>
                                {q?.score || 0}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-600 mt-1 break-words line-clamp-2">
                              {q?.question || "No question available"}
                            </p>
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Transcript Section */}
              {activeSection === "transcript" && call_details?.call_transcript && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Full Transcript
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-96 overflow-y-auto border rounded-lg">
                        <div className="space-y-4 p-4">
                          {transcriptConversations.length > 0 ? (
                            transcriptConversations.map((conv, index) => {
                              const isAI = conv.speaker === "AI"
                              const isUser = conv.speaker === "User"

                              return (
                                <div
                                  key={index}
                                  className={`p-3 rounded-lg ${
                                    isAI
                                      ? "bg-blue-50 border-l-4 border-blue-400"
                                      : isUser
                                        ? "bg-green-50 border-l-4 border-green-400"
                                        : "bg-gray-50 border-l-4 border-gray-400"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    {isAI ? (
                                      <Brain className="h-4 w-4 text-blue-600" />
                                    ) : isUser ? (
                                      <User className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <MessageSquare className="h-4 w-4 text-gray-600" />
                                    )}
                                    <span className="text-sm font-medium">
                                      {isAI ? "AI Interviewer" : isUser ? "Candidate" : "Unknown"}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700">{conv.text}</p>
                                </div>
                              )
                            })
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                              <p>No transcript available or transcript format not recognized.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* No Data States */}
              {activeSection === "analysis" && !hasAnalysis && (
                <div className="text-center py-12">
                  <Brain className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Analysis Available</h3>
                  <p className="text-gray-500">AI analysis has not been completed for this call yet.</p>
                </div>
              )}

              {activeSection === "questions" && questions.length === 0 && (
                <div className="text-center py-12">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Questions Available</h3>
                  <p className="text-gray-500">No question analysis data is available for this call.</p>
                </div>
              )}

              {activeSection === "transcript" && !call_details?.call_transcript && (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Transcript Available</h3>
                  <p className="text-gray-500">The transcript for this call is not available.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
