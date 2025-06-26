"use client"

import React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { User, ArrowRight, BarChart3, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { listCandidates, type Candidate } from "@/lib/api/candidates"
import { type Job, getJobs } from "@/lib/api/jobs"
import { ResumeAnalysisButton } from "@/components/candidates/resume-analysis-button"
import { CandidateScoresDialog } from "@/components/candidates/candidate-scores-dialog"
import { CandidateListSkeleton } from "@/components/skeletons/candidate-card-skeleton"

type SortOption = "name_asc" | "name_desc" | "score_desc" | "score_asc" | "recent" | "experience_desc"
type ScoreRange = "all" | "excellent" | "good" | "average" | "below_average" | "not_evaluated"

export default function CandidatesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>("")
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("")
  const [sortBy, setSortBy] = useState<SortOption>("recent")
  const [scoreRange, setScoreRange] = useState<ScoreRange>("all")
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [jobsLoading, setJobsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [jobsError, setJobsError] = useState<string | null>(null)
  const [scoresDialogOpen, setScoresDialogOpen] = useState(false)
  const [selectedCandidateForScores, setSelectedCandidateForScores] = useState<{
    id: string
    name: string
  } | null>(null)
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    per_page: 5,
    has_next: false,
  })

  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const jobId = searchParams.get("jobId")

  // Calculate total pages
  const totalPages = Math.ceil(pagination.total / pagination.per_page)

  // Application status options
  const statusOptions = [
    { value: "applied", label: "Applied" },
    { value: "screening", label: "Screening" },
    { value: "interview", label: "Interview" },
    { value: "rejected", label: "Rejected" },
    { value: "hired", label: "Hired" },
  ]

  // Sort options
  const sortOptions = [
    { value: "recent", label: "Most Recent" },
    { value: "score_desc", label: "Highest Score" },
    { value: "score_asc", label: "Lowest Score" },
    { value: "name_asc", label: "Name A-Z" },
    { value: "name_desc", label: "Name Z-A" },
    { value: "experience_desc", label: "Most Experience" },
  ]

  // Score range options
  const scoreRangeOptions = [
    { value: "all", label: "All Scores" },
    { value: "excellent", label: "Excellent (80-100)" },
    { value: "good", label: "Good (60-79)" },
    { value: "average", label: "Average (40-59)" },
    { value: "below_average", label: "Below Average (0-39)" },
    { value: "not_evaluated", label: "Not Evaluated" },
  ]

  // Page size options
  const pageSizeOptions = [
    {value: 5, label: "5 per page"},
    { value: 10, label: "10 per page" },
    { value: 20, label: "20 per page" },
    { value: 50, label: "50 per page" },
    { value: 100, label: "100 per page" },
  ]

  useEffect(() => {
    if (jobId) {
      setSelectedJobFilter(jobId)
    }
  }, [jobId])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }))
  }, [searchQuery, selectedJobFilter, selectedStatusFilter, scoreRange, sortBy])

  // Fetch jobs from API
  const fetchJobs = async () => {
    try {
      setJobsLoading(true)
      setJobsError(null)

      const response = await getJobs()
      console.log("Fetched jobs:", response)
      setJobs(response || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch jobs"
      setJobsError(errorMessage)
      toast({
        title: "Warning",
        description: "Failed to load jobs for filtering. You can still view candidates.",
        variant: "destructive",
      })
    } finally {
      setJobsLoading(false)
    }
  }

  const fetchCandidates = async () => {
    try {
      setLoading(true)
      setError(null)
      const activeJobFilter = selectedJobFilter || jobId || undefined
      const response = await listCandidates({
        skip: (pagination.page - 1) * pagination.per_page,
        limit: pagination.per_page,
        job_id_filter: activeJobFilter === "all_jobs" ? undefined : activeJobFilter,
      })

      setCandidates(response.candidates)
      setPagination((prev) => ({
        ...prev,
        total: response.total,
        page: response.page,
        per_page: response.per_page,
        has_next: response.has_next,
      }))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch candidates"
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

  // Fetch jobs on component mount
  useEffect(() => {
    fetchJobs()
  }, [])

  useEffect(() => {
    fetchCandidates()
  }, [selectedJobFilter, selectedStatusFilter, pagination.page, pagination.per_page])

  // Sort and filter candidates (client-side filtering for unsupported filters)
  const processedCandidates = React.useMemo(() => {
    const filtered = candidates.filter((candidate) => {
      const matchesSearch =
        candidate.personal_info.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        candidate.personal_info.email.toLowerCase().includes(searchQuery.toLowerCase())

      // Status filtering
      const matchesStatus =
        !selectedStatusFilter ||
        selectedStatusFilter === "all_statuses" ||
        candidate.applications.some((app) => app.status === selectedStatusFilter)

      // Score range filtering
      const matchesScoreRange = (() => {
        const score = candidate.overall_score
        switch (scoreRange) {
          case "excellent":
            return score !== null && score !== undefined && score >= 80
          case "good":
            return score !== null && score !== undefined && score >= 60 && score < 80
          case "average":
            return score !== null && score !== undefined && score >= 40 && score < 60
          case "below_average":
            return score !== null && score !== undefined && score < 40
          case "not_evaluated":
            return score === null || score === undefined
          default:
            return true
        }
      })()

      return matchesSearch && matchesStatus && matchesScoreRange
    })

    // Sort candidates
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "score_desc":
          return (b.overall_score || 0) - (a.overall_score || 0)
        case "score_asc":
          return (a.overall_score || 0) - (b.overall_score || 0)
        case "name_asc":
          return a.personal_info.name.localeCompare(b.personal_info.name)
        case "name_desc":
          return b.personal_info.name.localeCompare(a.personal_info.name)
        case "experience_desc":
          return b.resume_analysis.experience_years - a.resume_analysis.experience_years
        case "recent":
        default:
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      }
    })

    return filtered
  }, [candidates, searchQuery, selectedStatusFilter, scoreRange, sortBy])

  const handleViewProfile = (candidateId: string) => {
    router.push(`/dashboard/candidates/${candidateId}`)
  }

  const handleViewScores = (candidateId: string, candidateName: string, event: React.MouseEvent) => {
    event.stopPropagation()
    setSelectedCandidateForScores({ id: candidateId, name: candidateName })
    setScoresDialogOpen(true)
  }

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }))
  }

  const handlePageSizeChange = (newPageSize: string) => {
    setPagination((prev) => ({
      ...prev,
      per_page: Number.parseInt(newPageSize),
      page: 1,
    }))
  }

  // Helper function to get job title by ID
  const getJobTitle = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId)
    return job ? job.title : `Job ${jobId}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "applied":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "screening":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "interview":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "hired":
        return "bg-emerald-100 text-emerald-800 border-emerald-200"
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getCandidateStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "hired":
        return "bg-blue-100 text-blue-800"
      case "inactive":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getScoreColor = (score: number | null | undefined) => {
    if (score === null || score === undefined) return "text-gray-500 bg-gray-50"
    if (score >= 80) return "text-emerald-700 bg-emerald-50"
    if (score >= 60) return "text-blue-700 bg-blue-50"
    if (score >= 40) return "text-amber-700 bg-amber-50"
    return "text-red-700 bg-red-50"
  }

  const formatScore = (score: number | null | undefined) => {
    if (score === null || score === undefined) return "N/A"
    return Math.round(score).toString()
  }

  const handleUploadComplete = () => {
    // Refresh candidates list
    fetchCandidates()
  }

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      const start = Math.max(1, pagination.page - 2)
      const end = Math.min(totalPages, start + maxVisiblePages - 1)

      if (start > 1) {
        pages.push(1)
        if (start > 2) pages.push("...")
      }

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (end < totalPages) {
        if (end < totalPages - 1) pages.push("...")
        pages.push(totalPages)
      }
    }

    return pages
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Candidates</h1>
            <p className="text-muted-foreground">View and manage all candidates in your recruitment pipeline</p>
          </div>
        </div> */}

        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex flex-wrap gap-4">
              <div className="relative w-full sm:w-72">
                <div className="w-full pl-8 rounded-md border border-input bg-transparent px-3 py-2 h-10" />
              </div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-[180px] h-10 rounded-md border bg-transparent" />
              ))}
            </div>
          </div>

          <CandidateListSkeleton />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Candidates</h1>
            <p className="text-muted-foreground">View and manage all candidates in your recruitment pipeline</p>
          </div>
        </div>

        <Card className="border shadow-sm">
          <CardContent className="text-center py-12">
            <div className="text-red-500 mb-4">
              <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Candidates</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <Button onClick={fetchCandidates}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Candidates</h1>
          <p className="text-muted-foreground">
            View and manage all candidates in your recruitment pipeline
            {pagination.total > 0 && (
              <span className="ml-2 text-sm font-medium text-slate-600">
                ({pagination.total.toLocaleString()} total)
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex flex-wrap gap-4">
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Search candidates..."
                className="w-full pl-8 rounded-md border border-input bg-transparent px-3 py-2"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <svg
                className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            </div>

            <Select value={selectedJobFilter} onValueChange={setSelectedJobFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={jobsLoading ? "Loading jobs..." : "Filter by job"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_jobs">All Jobs</SelectItem>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title}
                  </SelectItem>
                ))}
                {jobsError && (
                  <SelectItem value="error_loading_jobs" disabled>
                    Failed to load jobs
                  </SelectItem>
                )}
              </SelectContent>
            </Select>

            <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_statuses">All Statuses</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={scoreRange} onValueChange={(value: ScoreRange) => setScoreRange(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Score range" />
              </SelectTrigger>
              <SelectContent>
                {scoreRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="h-3 w-3" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Select value={pagination.per_page.toString()} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4">
          {processedCandidates.map((candidate) => (
            <Card
              key={candidate.id}
              className="group relative border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden bg-white"
              onClick={() => handleViewProfile(candidate.id)}
            >
              {/* Hover Arrow */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                <ArrowRight className="h-5 w-5 text-slate-400" />
              </div>

              <CardContent className="p-6">
                <div className="relative grid grid-cols-12 gap-6 items-center">
                  {/* Left Section - Avatar and Basic Info (4 columns) */}
                  <div className="col-span-4 flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                      <Avatar className="w-16 h-16 border-2 border-slate-100 shadow-sm">
                        <AvatarFallback className="text-base font-semibold bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700">
                          {candidate.personal_info.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      {/* Status Indicator Dot */}
                      <div
                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                          candidate.status === "active"
                            ? "bg-emerald-500"
                            : candidate.status === "pending"
                              ? "bg-amber-500"
                              : candidate.status === "inactive"
                                ? "bg-slate-400"
                                : "bg-slate-300"
                        }`}
                      />
                    </div>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <h3 className="text-xl font-semibold text-slate-900 leading-tight truncate">
                        {candidate.personal_info.name}
                      </h3>
                      <p className="text-sm text-slate-600 font-medium truncate">{candidate.personal_info.email}</p>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="secondary"
                          className={`text-xs font-medium px-2.5 py-1 ${getCandidateStatusColor(candidate.status)}`}
                        >
                          {candidate.status}
                        </Badge>
                        <span className="text-xs text-slate-400 font-mono">#{candidate.id.slice(-8)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Center Section - Overall Score (4 columns, absolutely centered) */}
                  <div className="col-span-4 flex justify-center">
                    <button
                      className={`group/score relative px-4 py-3 rounded-lg transition-all duration-200 hover:shadow-sm border ${getScoreColor(
                        candidate.overall_score,
                      )} hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2`}
                      onClick={(e) => handleViewScores(candidate.id, candidate.personal_info.name, e)}
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        <BarChart3 className="h-4 w-4 opacity-60 group-hover/score:opacity-80 transition-opacity" />
                        <div className="text-2xl font-bold leading-none">
                          {formatScore(candidate.overall_score)}
                          {candidate.overall_score !== null && candidate.overall_score !== undefined && (
                            <span className="text-sm font-normal opacity-70">%</span>
                          )}
                        </div>
                        <p className="text-xs font-medium uppercase tracking-wider opacity-70">Overall Score</p>
                      </div>
                    </button>
                  </div>

                  {/* Right Section - Application Status (4 columns) */}
                  <div className="col-span-4 flex flex-col justify-center items-end gap-4 relative">
                    {/* Application Status Badges */}
                    <div className="flex flex-wrap gap-1.5 justify-end max-w-full">
                      {candidate.applications.map((app, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className={`text-xs font-medium px-2 py-1 ${getStatusColor(app.status)}`}
                        >
                          {app.status}
                        </Badge>
                      ))}
                    </div>

                    {/* Resume Analysis Button - Positioned at bottom right */}
                    {candidate.resume_analysis.analysis_summary === "Resume uploaded by HR - awaiting VLM analysis" && (
                      <div className="absolute bottom-0 right-0">
                        <ResumeAnalysisButton
                          candidateId={candidate.id}
                          jobId={candidate.applications.length > 0 ? candidate.applications[0].job_id : undefined}
                          onAnalysisComplete={handleUploadComplete}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Empty State */}
          {processedCandidates.length === 0 && !loading && (
            <Card className="border border-slate-200 shadow-sm">
              <CardContent className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                  <User className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No Candidates Found</h3>
                <p className="text-slate-600 max-w-sm mx-auto">
                  We couldn't find any candidates matching your current filters. Try adjusting your search criteria.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Enhanced Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
            <div className="text-sm text-slate-600">
              Showing {Math.min((pagination.page - 1) * pagination.per_page + 1, pagination.total)} to{" "}
              {Math.min(pagination.page * pagination.per_page, pagination.total)} of {pagination.total.toLocaleString()}{" "}
              candidates
            </div>

            <div className="flex items-center gap-2">
              {/* Previous Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {getPageNumbers().map((page, index) => (
                  <React.Fragment key={index}>
                    {page === "..." ? (
                      <span className="px-2 py-1 text-slate-400">...</span>
                    ) : (
                      <Button
                        variant={pagination.page === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page as number)}
                        className={`min-w-[40px] ${
                          pagination.page === page ? "bg-slate-900 text-white hover:bg-slate-800" : "hover:bg-slate-50"
                        }`}
                      >
                        {page}
                      </Button>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Next Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.has_next || pagination.page >= totalPages}
                className="flex items-center gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Candidate Scores Dialog */}
      <CandidateScoresDialog
        open={scoresDialogOpen}
        onOpenChange={setScoresDialogOpen}
        candidateId={selectedCandidateForScores?.id || ""}
        candidateName={selectedCandidateForScores?.name || ""}
      />
    </div>
  )
}
