"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Download,
  Star,
  Briefcase,
  User,
  AlertCircle,
  Target,
  TrendingUp,
  Activity,
  MessageSquare,
  PlayCircle,
  Brain,
  BarChart3,
  Zap,
  Shield,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"
import { getCandidate, downloadResume, type Candidate, type CallQA, type JobApplication } from "@/lib/api/candidates"
import { JobAssociationDialog } from "@/components/candidates/job-association-dialog"
import { ScheduleCallDialog } from "@/components/candidates/schedule-call-dialog"

// Interview Wizard Component with failsafes
function InterviewWizard({
  isOpen,
  onClose,
  interview,
}: {
  isOpen: boolean
  onClose: () => void
  interview: CallQA | null
}) {
  const [currentStep, setCurrentStep] = useState(0)

  // Failsafe: Don't render if interview is null/undefined or missing required data
  if (
    !interview ||
    !interview.questions_answers ||
    !Array.isArray(interview.questions_answers) ||
    interview.questions_answers.length === 0
  ) {
    return null
  }

  const questions = interview.questions_answers
  const totalSteps = questions.length

  const getScoreColor = (score: number | null | undefined) => {
    if (typeof score !== "number") return "text-gray-700 bg-gray-100"
    if (score >= 90) return "text-green-700 bg-green-100"
    if (score >= 80) return "text-blue-700 bg-blue-100"
    if (score >= 70) return "text-yellow-700 bg-yellow-100"
    if (score >= 60) return "text-orange-700 bg-orange-100"
    return "text-red-700 bg-red-100"
  }

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const currentQuestion = questions[currentStep]

  // Failsafe: Don't render if current question is invalid
  if (!currentQuestion) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-purple-600" />
              Interview Playback - {interview.call_id || "Unknown"}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Interview Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{interview.call_duration_minutes || "N/A"}</div>
              <p className="text-sm text-gray-600">Minutes</p>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getScoreColor(interview.overall_score)}`}>
                {interview.overall_score ? `${interview.overall_score}%` : "N/A"}
              </div>
              <p className="text-sm text-gray-600">Overall Score</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{totalSteps}</div>
              <p className="text-sm text-gray-600">Questions</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>
                Question {currentStep + 1} of {totalSteps}
              </span>
              <span>{Math.round(((currentStep + 1) / totalSteps) * 100)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Navigation */}
          <div className="flex justify-center gap-2 flex-wrap">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  index === currentStep
                    ? "bg-purple-600 text-white"
                    : index < currentStep
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {/* Current Question */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <Card className="border-2 border-purple-200">
                <CardHeader className="bg-purple-50">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>Question {currentStep + 1}</span>
                    <Badge className={`${getScoreColor(currentQuestion.score)}`}>
                      {currentQuestion.score ? `${currentQuestion.score}%` : "N/A"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {currentQuestion.question && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Question:</h4>
                      <p className="text-gray-700 bg-gray-50 p-4 rounded-lg border">{currentQuestion.question}</p>
                    </div>
                  )}

                  {currentQuestion.answer && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Candidate's Answer:</h4>
                      <p className="text-gray-700 bg-white p-4 rounded-lg border-2 border-blue-200">
                        {currentQuestion.answer}
                      </p>
                    </div>
                  )}

                  {currentQuestion.ideal_answer && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Ideal Answer:</h4>
                      <p className="text-gray-600 bg-yellow-50 p-4 rounded-lg border border-yellow-200 italic">
                        {currentQuestion.ideal_answer}
                      </p>
                    </div>
                  )}

                  {currentQuestion.analysis && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-2">AI Analysis:</h4>
                      <p className="text-blue-800">{currentQuestion.analysis}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <Button
              onClick={nextStep}
              disabled={currentStep === totalSteps - 1}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Interview Summary */}
          {currentStep === totalSteps - 1 && interview.interview_summary && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200"
            >
              <h4 className="font-semibold text-green-900 mb-2">Interview Summary:</h4>
              <p className="text-green-800">{interview.interview_summary}</p>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function CandidateProfilePage() {
  const params = useParams()
  const candidateId = params.id as string
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedInterview, setSelectedInterview] = useState<CallQA | null>(null)
  const [isInterviewWizardOpen, setIsInterviewWizardOpen] = useState(false)
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const [jobAssociationDialogOpen, setJobAssociationDialogOpen] = useState(false)
  const [scheduleCallDialogOpen, setScheduleCallDialogOpen] = useState(false)
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null)

  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        setLoading(true)
        setError(null)
        const candidateData = await getCandidate(candidateId)
        setCandidate(candidateData)
        console.log(can)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch candidate"
        setError(errorMessage)
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    if (candidateId) {
      fetchCandidate()
    }
  }, [candidateId, toast])

  const handleDownloadResume = async () => {
    try {
      const blob = await downloadResume(candidateId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = url
      a.download = `${candidate?.personal_info.name || "candidate"}_resume.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Success",
        description: "Resume downloaded successfully",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to download resume"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const openInterviewWizard = (interview: CallQA) => {
    if (interview && interview.questions_answers) {
      setSelectedInterview(interview)
      setIsInterviewWizardOpen(true)
    }
  }

  const closeInterviewWizard = () => {
    setIsInterviewWizardOpen(false)
    setSelectedInterview(null)
  }

  const getStatusColor = (status: string | null | undefined) => {
    if (!status) return "text-gray-700 bg-gray-100 border-gray-200"
    switch (status) {
      case "applied":
        return "text-blue-700 bg-blue-100 border-blue-200"
      case "screening":
        return "text-yellow-700 bg-yellow-100 border-yellow-200"
      case "interview":
        return "text-purple-700 bg-purple-100 border-purple-200"
      case "hired":
        return "text-emerald-700 bg-emerald-100 border-emerald-200"
      case "rejected":
        return "text-red-700 bg-red-100 border-red-200"
      default:
        return "text-gray-700 bg-gray-100 border-gray-200"
    }
  }

  const getCandidateStatusColor = (status: string | null | undefined) => {
    if (!status) return "text-gray-700 bg-gray-100 border-gray-200"
    switch (status) {
      case "active":
        return "text-green-700 bg-green-100 border-green-200"
      case "hired":
        return "text-blue-700 bg-blue-100 border-blue-200"
      case "inactive":
        return "text-gray-700 bg-gray-100 border-gray-200"
      default:
        return "text-gray-700 bg-gray-100 border-gray-200"
    }
  }

  const getScoreColor = (score: number | null | undefined) => {
    if (typeof score !== "number") return "text-gray-700 bg-gray-100"
    if (score >= 90) return "text-green-700 bg-green-100"
    if (score >= 80) return "text-blue-700 bg-blue-100"
    if (score >= 70) return "text-yellow-700 bg-yellow-100"
    if (score >= 60) return "text-orange-700 bg-orange-100"
    return "text-red-700 bg-red-100"
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "analysis", label: "Resume Analysis" },
    { id: "applications", label: "Applications & Interviews" },
    { id: "files", label: "Files & Documents" },
  ]

  const handleAssociationComplete = () => {
    // Refresh candidate data
    const fetchCandidate = async () => {
      try {
        setLoading(true)
        setError(null)
        const candidateData = await getCandidate(candidateId)
        setCandidate(candidateData)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch candidate"
        setError(errorMessage)
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    fetchCandidate()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Loading candidate profile...</p>
        </div>
      </div>
    )
  }

  if (error || !candidate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <Card className="border shadow-sm rounded-lg p-8">
          <CardContent className="text-center">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {error ? "Error Loading Candidate" : "Candidate Not Found"}
            </h3>
            <p className="text-gray-500 mb-4">{error || "The candidate profile could not be loaded."}</p>
            <Link href="/dashboard/candidates">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Candidates
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-7xl mx-auto p-6 space-y-8"
      >
        {/* Header with Back Button */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard/candidates" className="flex items-center text-gray-600 hover:text-gray-900">
            <Button variant="outline" className="border-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Candidates
            </Button>
          </Link>
          <div className="flex-1" />
          <div className="flex gap-2">
            {/* <Button
              variant="outline"
              onClick={() => setJobAssociationDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Briefcase className="h-4 w-4 mr-2" />
              Associate with Job
            </Button> */}
            <Button variant="outline" onClick={handleDownloadResume}>
              <Download className="h-4 w-4 mr-2" />
              Download Resume
            </Button>
          </div>
        </div>

        {/* Candidate Header */}
        <Card className="border shadow-sm rounded-lg">
          <CardContent className="p-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
              {/* Avatar Section */}
              <div className="relative">
                <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                  <AvatarFallback className="text-2xl font-bold bg-black text-white">
                    {candidate.personal_info.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Profile Info */}
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">{candidate.personal_info.name}</h1>
                    <Badge className={`px-3 py-1 border ${getCandidateStatusColor(candidate.status)}`}>
                      <Activity className="w-3 h-3 mr-1" />
                      {candidate.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="text-lg">ID: {candidate.id}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 px-3 py-1 border border-blue-200">
                      <Briefcase className="w-3 h-3 mr-1" />
                      {candidate.resume_analysis.experience_years} years experience
                    </Badge>
                    <Badge className={`px-3 py-1 border ${getScoreColor(candidate.resume_analysis.matching_score)}`}>
                      <Star className="w-3 h-3 mr-1" />
                      Score: {candidate.resume_analysis.matching_score}%
                    </Badge>
                  </div>
                </div>

                {/* Quick Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">{candidate.personal_info.email}</span>
                  </div>
                  {candidate.personal_info.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{candidate.personal_info.phone}</span>
                    </div>
                  )}
                  {candidate.personal_info.location && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="h-4 w-4 text-red-600" />
                      <span className="text-sm">{candidate.personal_info.location}</span>
                    </div>
                  )}
                  {candidate.created_at && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="h-4 w-4 text-purple-600" />
                      <span className="text-sm">Added: {new Date(candidate.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border shadow-sm rounded-lg">
            <CardContent className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-4">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{candidate.total_applications}</div>
              <p className="text-sm text-gray-600">Total Applications</p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm rounded-lg">
            <CardContent className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{candidate.resume_analysis.matching_score}%</div>
              <p className="text-sm text-gray-600">Match Score</p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm rounded-lg">
            <CardContent className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 mb-4">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{candidate.resume_analysis.experience_years}</div>
              <p className="text-sm text-gray-600">Years Experience</p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm rounded-lg">
            <CardContent className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 mb-4">
                <Brain className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{candidate.resume_analysis.skills.length}</div>
              <p className="text-sm text-gray-600">Skills</p>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-gray-800 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === "overview" && (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-6">
                {/* Personal Information */}
                <Card className="border shadow-sm rounded-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-600" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50">
                          <Mail className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="text-sm text-gray-500">Email</p>
                            <p className="font-medium">{candidate.personal_info.email}</p>
                          </div>
                        </div>
                        {candidate.personal_info.phone && (
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50">
                            <Phone className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="text-sm text-gray-500">Phone</p>
                              <p className="font-medium">{candidate.personal_info.phone}</p>
                            </div>
                          </div>
                        )}
                        {candidate.personal_info.location && (
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50">
                            <MapPin className="h-5 w-5 text-red-600" />
                            <div>
                              <p className="text-sm text-gray-500">Location</p>
                              <p className="font-medium">{candidate.personal_info.location}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Skills Overview */}
                {candidate.resume_analysis.skills.length > 0 && (
                  <Card className="border shadow-sm rounded-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-yellow-600" />
                        Skills
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {candidate.resume_analysis.skills.map((skill, index) => (
                          <Badge
                            key={index}
                            className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 px-3 py-1 border border-yellow-200"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Metadata */}
                <Card className="border shadow-sm rounded-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-gray-600" />
                      Metadata
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {candidate.created_at && (
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Created At</p>
                          <p className="font-light">{new Date(candidate.created_at).toLocaleString()}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Experience</p>
                        <p className="font-light">{candidate.resume_analysis.experience_years} years</p>
                      </div>
                      {candidate.resume_analysis.education && (
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Education</p>
                          <p className="font-light">{candidate.resume_analysis.education}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "analysis" && (
            <div className="space-y-6">
              {/* Analysis Summary */}
              {candidate.resume_analysis.analysis_summary && (
                <Card className="border shadow-sm rounded-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-600" />
                      Analysis Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 leading-relaxed">{candidate.resume_analysis.analysis_summary}</p>
                  </CardContent>
                </Card>
              )}

              {/* Previous Roles */}
              {candidate.resume_analysis.previous_roles.length > 0 && (
                <Card className="border shadow-sm rounded-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-green-600" />
                      Previous Roles
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {candidate.resume_analysis.previous_roles.map((role, index) => (
                      <div key={index} className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                        <p className="font-semibold text-gray-900">{role}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === "applications" && (
            <div className="space-y-6">
              {candidate.applications.length > 0 ? (
                candidate.applications.map((application, index) => (
                  <Card key={index} className="border shadow-sm rounded-lg">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="flex items-center gap-2">
                          <Target className="h-5 w-5 text-blue-600" />
                          Job Application - {application.job_id}
                        </CardTitle>
                        <Badge className={`border ${getStatusColor(application.status)}`}>{application.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Application Details */}
                      <div className="grid lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Application Date</p>
                            <p className="font-medium">{new Date(application.application_date).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Matching Score</p>
                            <Badge className={`${getScoreColor(application.matching_score)}`}>
                              {application.matching_score}%
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-4">
                          {application.notes && (
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Notes</p>
                              <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-lg">{application.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Interview Section */}
                      {application.call_qa ? (
                        <Card className="bg-purple-50 border-purple-200">
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <CardTitle className="flex items-center gap-2 text-purple-800">
                                <MessageSquare className="h-5 w-5 text-purple-600" />
                                Interview Completed
                              </CardTitle>
                              {application.call_qa.overall_score && (
                                <Badge className={`${getScoreColor(application.call_qa.overall_score)}`}>
                                  Score: {application.call_qa.overall_score}%
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {application.call_qa.call_date && (
                                <div>
                                  <p className="text-sm text-purple-600 mb-1">Interview Date</p>
                                  <p className="font-medium text-purple-800">
                                    {new Date(application.call_qa.call_date).toLocaleDateString()}
                                  </p>
                                </div>
                              )}
                              {application.call_qa.call_duration_minutes && (
                                <div>
                                  <p className="text-sm text-purple-600 mb-1">Duration</p>
                                  <p className="font-medium text-purple-800">
                                    {application.call_qa.call_duration_minutes} min
                                  </p>
                                </div>
                              )}
                              <div>
                                <p className="text-sm text-purple-600 mb-1">Questions</p>
                                <p className="font-medium text-purple-800">
                                  {application.call_qa.questions_answers.length}
                                </p>
                              </div>
                            </div>

                            {application.call_qa.interview_summary && (
                              <div className="bg-white p-4 rounded-lg border border-purple-200">
                                <h4 className="font-semibold text-purple-900 mb-2">Summary:</h4>
                                <p className="text-purple-800 text-sm">{application.call_qa.interview_summary}</p>
                              </div>
                            )}

                            <div className="flex gap-3">
                              <Button
                                onClick={() => openInterviewWizard(application.call_qa!)}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                              >
                                <PlayCircle className="h-4 w-4 mr-2" />
                                Play Interview
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <Card className="bg-gray-50 border-gray-200">
                          <CardContent className="text-center py-8">
                            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Interview Conducted</h3>
                            <p className="text-gray-500 mb-4">This application hasn't been interviewed yet.</p>
                            <Button
                              onClick={() => {
                                setSelectedApplication(application)
                                setScheduleCallDialogOpen(true)
                              }}
                              className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              <Phone className="h-4 w-4 mr-2" />
                              Schedule Call
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="border shadow-sm rounded-lg">
                  <CardContent className="text-center py-12">
                    <Target className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Applications Found</h3>
                    <p className="text-gray-500">This candidate hasn't applied to any jobs yet.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === "files" && (
            <div className="space-y-6">
              {/* Resume File */}
              <Card className="border shadow-sm rounded-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Resume File
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Resume File</h4>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {candidate.resume_analysis.resume_file_path && (
                            <span>Path: {candidate.resume_analysis.resume_file_path}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleDownloadResume}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Job Association Dialog not available for now*/}
        <JobAssociationDialog
          open={jobAssociationDialogOpen}
          onOpenChange={setJobAssociationDialogOpen}
          candidateId={candidateId}
          candidateName={candidate.personal_info.name}
          onAssociationComplete={handleAssociationComplete}
        />

        {/* Interview Wizard Modal */}
        <InterviewWizard isOpen={isInterviewWizardOpen} onClose={closeInterviewWizard} interview={selectedInterview} />

        {/* Schedule Call Dialog */}
        {selectedApplication && (
          <ScheduleCallDialog
            open={scheduleCallDialogOpen}
            onOpenChange={setScheduleCallDialogOpen}
            candidateId={candidateId}
            candidateName={candidate.personal_info.name}
            jobId={selectedApplication.job_id}
            jobTitle={`Job ${selectedApplication.job_id}`} // You might want to fetch actual job title
            onScheduleComplete={() => {
              // Optionally refresh candidate data or show success message
              toast({
                title: "Success",
                description: "Call has been scheduled successfully",
              })
            }}
          />
        )}
      </motion.div>
    </div>
  )
}
