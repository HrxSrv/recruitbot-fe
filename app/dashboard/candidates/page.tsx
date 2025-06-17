"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { User, Loader2, ArrowRight } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { listCandidates, type Candidate } from "@/lib/api/candidates"
import { type Job, getJobs } from "@/lib/api/jobs"
import { ResumeAnalysisButton } from "@/components/candidates/resume-analysis-button"

export default function CandidatesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>("")
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("")
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [jobs, setJobs] = useState<Job[]>([]) // Add jobs state
  const [loading, setLoading] = useState(true)
  const [jobsLoading, setJobsLoading] = useState(true) // Add jobs loading state
  const [error, setError] = useState<string | null>(null)
  const [jobsError, setJobsError] = useState<string | null>(null) // Add jobs error state
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    per_page: 20,
    has_next: false,
  })

  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const jobId = searchParams.get("jobId")

  // Application status options
  const statusOptions = [
    { value: "applied", label: "Applied" },
    { value: "screening", label: "Screening" },
    { value: "interview", label: "Interview" },
    { value: "rejected", label: "Rejected" },
    { value: "hired", label: "Hired" },
  ]

  useEffect(() => {
    if (jobId) {
      setSelectedJobFilter(jobId)
    }
  }, [jobId])

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
        // status_filter: selectedStatusFilter === "all_statuses" ? undefined : selectedStatusFilter || undefined,
        job_id_filter: activeJobFilter === "all_jobs" ? undefined : activeJobFilter,
      })

      setCandidates(response.candidates)
      setPagination({
        total: response.total,
        page: response.page,
        per_page: response.per_page,
        has_next: response.has_next,
      })
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
  }, [selectedJobFilter, selectedStatusFilter, pagination.page])

  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSearch =
      candidate.personal_info.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.personal_info.email.toLowerCase().includes(searchQuery.toLowerCase())

    // Status filtering: check if candidate has at least one application with the selected status
    const matchesStatus =
      !selectedStatusFilter ||
      selectedStatusFilter === "all_statuses" ||
      candidate.applications.some((app) => app.status === selectedStatusFilter)

    return matchesSearch && matchesStatus
  })

  const handleViewProfile = (candidateId: string) => {
    router.push(`/dashboard/candidates/${candidateId}`)
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

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-700"
    if (score >= 80) return "text-blue-700"
    if (score >= 70) return "text-yellow-700"
    if (score >= 60) return "text-orange-700"
    return "text-red-700"
  }

  const handleUploadComplete = () => {
    // Refresh candidates list
    fetchCandidates()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Candidates</h1>
            <p className="text-muted-foreground">View and manage all candidates in your recruitment pipeline</p>
          </div>
        </div>

        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading candidates...</span>
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
          <p className="text-muted-foreground">View and manage all candidates in your recruitment pipeline</p>
        </div>

        {/* <UploadResumeButton onUploadComplete={handleUploadComplete} /> */}
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
          </div>
        </div>

        <div className="grid gap-4">
          {filteredCandidates.map((candidate) => (
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
                <div className="flex items-start gap-6">
                  {/* Left Section - Avatar and Basic Info */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="relative">
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

                    <div className="space-y-1.5">
                      <h3 className="text-xl font-semibold text-slate-900 leading-tight">
                        {candidate.personal_info.name}
                      </h3>
                      <p className="text-sm text-slate-600 font-medium">{candidate.personal_info.email}</p>
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

                  {/* Center Section - Match Score */}
                  <div className="flex-1 flex justify-center items-center px-6 border-x border-slate-100">
                    <div className="text-center">
                      <p className={`text-3xl font-bold ${getScoreColor(candidate.resume_analysis.matching_score)}`}>
                        {candidate.resume_analysis.matching_score}%
                      </p>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Match Score</p>
                    </div>
                  </div>

                  {/* Right Section - Application Status */}
                  <div className="flex flex-col justify-center items-end gap-4 flex-shrink-0 min-w-[200px] relative">
                    {/* Application Status Badges */}
                    <div className="flex flex-wrap gap-1.5 justify-end max-w-[180px]">
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

                {/* Footer - Enhanced with better spacing
        <div className="mt-6 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span className="font-medium">
                  Added {candidate.created_at ? new Date(candidate.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  }) : "Unknown"}
                </span>
              </div>
              
              {candidate.applications.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span className="font-medium">
                    Applied to: {candidate.applications.map((app) => getJobTitle(app.job_id)).join(", ")}
                  </span>
                </div>
              )}
            </div>
            
            <div className="text-xs text-slate-400 font-medium">
              {pagination.total} total candidates
            </div>
          </div>
        </div> */}
              </CardContent>
            </Card>
          ))}

          {/* Empty State */}
          {filteredCandidates.length === 0 && !loading && (
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

        {/* Pagination */}
        {pagination.total > pagination.per_page && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Showing {(pagination.page - 1) * pagination.per_page + 1} to{" "}
              {Math.min(pagination.page * pagination.per_page, pagination.total)} of {pagination.total} candidates
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={!pagination.has_next}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
