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
  Clock,
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
    if (typeof score !== "number") return "text-gray-500 bg-gray-100"
    if (score >= 90) return "text-green-700 bg-green-100"
    if (score >= 80) return "text-blue-700 bg-blue-100"
    if (score >= 70) return "text-yellow-700 bg-yellow-100"
    if (score >= 60) return "text-orange-700 bg-orange-100"
    return "text-red-700 bg-red-100"
  }

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation?.toLowerCase()) {
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

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  const sections = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "analysis", label: "AI Analysis", icon: Brain },
    { id: "questions", label: "Questions", icon: MessageSquare },
    { id: "transcript", label: "Transcript", icon: FileText },
  ]

  const questions = call_details.gemini_analysis?.question_responses || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <PlayCircle className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Call Analysis</h2>
                <p className="text-sm text-gray-600 font-normal">
                  {candidate.name} • {job.title}
                </p>
              </div>
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Navigation */}
          <div className="w-48 border-r bg-gray-50 p-4">
            <nav className="space-y-2">
              {sections.map((section) => {
                const Icon = section.icon
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                      activeSection === section.id
                        ? "bg-purple-100 text-purple-700 font-medium"
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

          {/* Main Content */}
          <div className="flex-1 overflow-auto">
            <div className="p-6">
              {/* Overview Section */}
              {activeSection === "overview" && (
                <div className="space-y-6">
                  {/* Call Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Clock className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                        <div className="text-2xl font-bold text-gray-900">{performance_metrics.duration_minutes}m</div>
                        <p className="text-xs text-gray-500">Duration</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4 text-center">
                        <Target className="h-8 w-8 mx-auto mb-2 text-green-600" />
                        <div className={`text-2xl font-bold ${getScoreColor(analysis_summary?.overall_score)}`}>
                          {analysis_summary?.overall_score || 0}
                        </div>
                        <p className="text-xs text-gray-500">Overall Score</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4 text-center">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                        <div className="text-2xl font-bold text-gray-900">{performance_metrics.questions_asked}</div>
                        <p className="text-xs text-gray-500">Questions</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4 text-center">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
                        <div className="text-2xl font-bold text-gray-900">
                          {Math.round(performance_metrics.call_completion_rate)}%
                        </div>
                        <p className="text-xs text-gray-500">Completion</p>
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
                            {analysis_summary.recommendation.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-sm">
                            {analysis_summary.confidence_level} confidence
                          </Badge>
                        </div>
                        <p className="text-gray-700 leading-relaxed">{analysis_summary.executive_summary}</p>
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
                            <span className="font-medium">{analysis_summary.technical_score}/100</span>
                          </div>
                          <Progress value={analysis_summary.technical_score} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Communication</span>
                            <span className="font-medium">{analysis_summary.communication_score}/100</span>
                          </div>
                          <Progress value={analysis_summary.communication_score} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Cultural Fit</span>
                            <span className="font-medium">{analysis_summary.cultural_fit_score}/100</span>
                          </div>
                          <Progress value={analysis_summary.cultural_fit_score} className="h-2" />
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
                            <p className="text-xs text-gray-500">{new Date(timeline.scheduled).toLocaleString()}</p>
                          </div>
                        </div>
                        {timeline.completed && (
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <div>
                              <p className="text-sm font-medium">Completed</p>
                              <p className="text-xs text-gray-500">{new Date(timeline.completed).toLocaleString()}</p>
                            </div>
                          </div>
                        )}
                        {timeline.analyzed && (
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <div>
                              <p className="text-sm font-medium">Analyzed</p>
                              <p className="text-xs text-gray-500">{new Date(timeline.analyzed).toLocaleString()}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* AI Analysis Section */}
              {activeSection === "analysis" && call_details.gemini_analysis && (
                <div className="space-y-6">
                  {/* Strengths */}
                  {call_details.gemini_analysis.key_strengths.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="h-5 w-5" />
                          Key Strengths
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {call_details.gemini_analysis.key_strengths.map((strength, index) => (
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
                  {call_details.gemini_analysis.areas_of_concern.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-yellow-700">
                          <AlertTriangle className="h-5 w-5" />
                          Areas of Concern
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {call_details.gemini_analysis.areas_of_concern.map((concern, index) => (
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
                  {call_details.gemini_analysis.red_flags.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-700">
                          <X className="h-5 w-5" />
                          Red Flags
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {call_details.gemini_analysis.red_flags.map((flag, index) => (
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
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Technical Evaluation</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-3">
                          <Badge
                            className={getScoreColor(call_details.gemini_analysis.technical_evaluation.technical_score)}
                          >
                            {call_details.gemini_analysis.technical_evaluation.technical_score}/100
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700">
                          {call_details.gemini_analysis.technical_evaluation.technical_summary}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Communication Evaluation</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-3">
                          <Badge
                            className={getScoreColor(
                              call_details.gemini_analysis.communication_evaluation.communication_score,
                            )}
                          >
                            {call_details.gemini_analysis.communication_evaluation.communication_score}/100
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700">
                          {call_details.gemini_analysis.communication_evaluation.communication_summary}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Cultural Fit */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Cultural Fit Assessment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-3">
                        <Badge className={getScoreColor(call_details.gemini_analysis.cultural_fit.cultural_fit_score)}>
                          {call_details.gemini_analysis.cultural_fit.cultural_fit_score}/100
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700">
                        {call_details.gemini_analysis.cultural_fit.cultural_fit_summary}
                      </p>
                    </CardContent>
                  </Card>
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
                        <Badge className={getScoreColor(questions[currentQuestionIndex].score)}>
                          {questions[currentQuestionIndex].score}/100
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Question:</h4>
                        <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                          {questions[currentQuestionIndex].question}
                        </p>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Quality Assessment:</h4>
                        <Badge variant="outline" className="mb-2">
                          {questions[currentQuestionIndex].response_quality}
                        </Badge>
                        <p className="text-sm text-gray-700">{questions[currentQuestionIndex].notes}</p>
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
                              <Badge size="sm" className={getScoreColor(q.score)}>
                                {q.score}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-600 mt-1 truncate">{q.question}</p>
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Transcript Section */}
              {activeSection === "transcript" && call_details.call_transcript && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Full Transcript
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-96">
                        <div className="space-y-4">
                          {call_details.call_transcript.split("\n").map((line, index) => {
                            const isAI = line.startsWith("AI:")
                            const isUser = line.startsWith("User:")

                            if (!isAI && !isUser) return null

                            return (
                              <div
                                key={index}
                                className={`p-3 rounded-lg ${
                                  isAI
                                    ? "bg-blue-50 border-l-4 border-blue-400"
                                    : "bg-green-50 border-l-4 border-green-400"
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  {isAI ? (
                                    <Brain className="h-4 w-4 text-blue-600" />
                                  ) : (
                                    <User className="h-4 w-4 text-green-600" />
                                  )}
                                  <span className="text-sm font-medium">{isAI ? "AI Interviewer" : "Candidate"}</span>
                                </div>
                                <p className="text-sm text-gray-700">{line.replace(/^(AI:|User:)\s*/, "")}</p>
                              </div>
                            )
                          })}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
