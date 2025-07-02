"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Bell, Clock, FileText, CheckCircle, AlertCircle, Loader2, FolderOpen, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useToast } from "@/components/ui/use-toast"
import { getUserDriveJobs, type UserDriveJobsResponse } from "@/lib/api/bulk-upload"
import { useAuth } from "@/lib/context/auth-context"
import { JobAnalysisDialog } from "@/components/candidates/job-analysis-dialog"

export function JobsMonitorDropdown() {
  const [jobs, setJobs] = useState<UserDriveJobsResponse["jobs"]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false)
  const [analysisJobId, setAnalysisJobId] = useState<string | null>(null)

  console.log(user?.id);

  const fetchJobs = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      const response = await getUserDriveJobs(user.id)
      console.log(response)
      
      // Only update if jobs actually changed to prevent unnecessary re-renders
      setJobs(prevJobs => {
        const jobsChanged = JSON.stringify(prevJobs) !== JSON.stringify(response.jobs)
        return jobsChanged ? response.jobs : prevJobs
      })
    } catch (error) {
      console.error("Failed to fetch drive jobs:", error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchJobs()
    }
  }, [isOpen, user?.id, fetchJobs])

  // Poll for updates every 2 seconds for active jobs
  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (!isOpen) return

    const activeJobs = jobs.filter((job) => job.status === "processing" || job.status === "pending")
    if (activeJobs.length === 0) return

    intervalRef.current = setInterval(fetchJobs, 2000)
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [jobs, isOpen, fetchJobs])

  // Check for active jobs for blinking indicator
  const hasActiveJobs = jobs.some((job) => job.status === "processing" || job.status === "pending")
  const recentJobs = jobs.slice(0, 5) // Show only recent 5 jobs

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-3 w-3 text-green-600" />
      case "completed_with_errors":
        return <AlertCircle className="h-3 w-3 text-yellow-600" />
      case "failed":
        return <AlertCircle className="h-3 w-3 text-red-600" />
      case "processing":
        return <Loader2 className="h-3 w-3 text-blue-600 animate-spin" />
      case "pending":
        return <Clock className="h-3 w-3 text-gray-600" />
      default:
        return <Clock className="h-3 w-3 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "completed_with_errors":
        return "bg-yellow-100 text-yellow-800"
      case "failed":
        return "bg-red-100 text-red-800"
      case "processing":
        return "bg-blue-100 text-blue-800"
      case "pending":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  const handleJobClick = (job: UserDriveJobsResponse["jobs"][0]) => {
    if (job.status === "completed" || job.status === "completed_with_errors" || job.status === "failed") {
      setAnalysisJobId(job.job_id)
      setShowAnalysisDialog(true)
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={`relative ${hasActiveJobs ? "animate-pulse" : ""}`}>
          <Bell className="h-5 w-5" />
          {hasActiveJobs && <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-600 rounded-full animate-ping" />}
          {jobs.length > 0 && (
            <Badge
              variant="secondary"
              className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
            >
              {jobs.filter((job) => job.status === "processing" || job.status === "pending").length || jobs.length}
            </Badge>
          )}
          <span className="sr-only">Processing jobs</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end" sideOffset={8}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Processing Jobs</h3>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="h-6 w-6 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-1">Monitor your upload processes</p>
        </div>

        <div className="max-h-96 overflow-y-auto" ref={scrollAreaRef}>
          {isLoading && jobs.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">Loading jobs...</span>
            </div>
          ) : recentJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <FolderOpen className="h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500 text-center">No processing jobs</p>
              <p className="text-xs text-gray-400 text-center mt-1">Upload files to see progress here</p>
            </div>
          ) : (
            <div className="p-2">
              {recentJobs.map((job) => (
                <div
                  key={job.job_id}
                  className={`p-3 rounded-lg transition-colors border-b border-gray-100 last:border-b-0 ${
                    job.status === "completed" || job.status === "completed_with_errors" || job.status === "failed"
                      ? "hover:bg-gray-50 cursor-pointer"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => handleJobClick(job)}
                >
                  {/* Job Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      {getStatusIcon(job.status)}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">{job.folder_name}</h4>
                        <p className="text-xs text-gray-500">{formatDate(job.created_at)}</p>
                      </div>
                    </div>
                    <Badge className={`text-xs ${getStatusColor(job.status)}`}>{job.status.replace("_", " ")}</Badge>
                  </div>

                  {/* Progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium">{(job.completion_percentage || 0).toFixed(0)}%</span>
                    </div>
                    <Progress
                      value={job.completion_percentage || 0}
                      className="h-1.5 transition-all duration-300 ease-out"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>
                        {job.processed_files}/{job.total_files} files
                      </span>
                      {job.status === "processing" && (
                        <span className="animate-pulse text-blue-600">Processing...</span>
                      )}
                    </div>
                  </div>

                  {/* Latest File */}
                  {job.latest_processed_file && job.status === "processing" && (
                    <div className="mt-2 flex items-center space-x-1 text-xs text-blue-700 bg-blue-50 rounded px-2 py-1">
                      <FileText className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{job.latest_processed_file}</span>
                      <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse flex-shrink-0"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {recentJobs.length > 0 && (
          <div className="p-3 border-t bg-gray-50">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                // Navigate to full jobs page or refresh
                fetchJobs()
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Refreshing...
                </>
              ) : (
                "Refresh Jobs"
              )}
            </Button>
          </div>
        )}
        {/* Job Analysis Dialog */}
        <JobAnalysisDialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog} jobId={analysisJobId || ""} />
      </PopoverContent>
    </Popover>
  )
}