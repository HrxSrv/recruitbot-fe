"use client"

import { useState, useEffect } from "react"
import { Clock, FileText, CheckCircle, AlertCircle, Loader2, FolderOpen } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { getUserDriveJobs, type UserDriveJobsResponse } from "@/lib/api/bulk-upload"

interface DriveJobsMonitorProps {
  userId: string
  refreshTrigger?: number
}

export function DriveJobsMonitor({ userId, refreshTrigger = 0 }: DriveJobsMonitorProps) {
  const [jobs, setJobs] = useState<UserDriveJobsResponse["jobs"]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchJobs = async () => {
    try {
      setError(null)
      const response = await getUserDriveJobs(userId)
      setJobs(response.jobs)
    } catch (error) {
      console.error("Failed to fetch drive jobs:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch jobs")
      toast({
        title: "Failed to load jobs",
        description: "Unable to fetch drive processing jobs",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [userId, refreshTrigger])

  // Poll for updates every 2 seconds for active jobs
  useEffect(() => {
    const activeJobs = jobs.filter((job) => job.status === "processing" || job.status === "pending")

    if (activeJobs.length === 0) return

    const interval = setInterval(fetchJobs, 2000)
    return () => clearInterval(interval)
  }, [jobs])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 hover:bg-green-100"
      case "completed_with_errors":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
      case "failed":
        return "bg-red-100 text-red-800 hover:bg-red-100"
      case "processing":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100"
      case "pending":
        return "bg-gray-100 text-gray-800 hover:bg-gray-100"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "completed_with_errors":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case "processing":
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      case "pending":
        return <Clock className="h-4 w-4 text-gray-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FolderOpen className="h-5 w-5" />
            <span>Drive Processing Jobs</span>
          </CardTitle>
          <CardDescription>Monitor your Google Drive upload processes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading jobs...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FolderOpen className="h-5 w-5" />
            <span>Drive Processing Jobs</span>
          </CardTitle>
          <CardDescription>Monitor your Google Drive upload processes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="text-red-600 text-center">{error}</p>
            <Button onClick={fetchJobs} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FolderOpen className="h-5 w-5" />
            <span>Drive Processing Jobs</span>
          </CardTitle>
          <CardDescription>Monitor your Google Drive upload processes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <FolderOpen className="h-8 w-8 text-gray-400" />
            <p className="text-gray-500 text-center">No drive processing jobs found</p>
            <p className="text-sm text-gray-400 text-center">
              Upload resumes from Google Drive to see processing status here
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FolderOpen className="h-5 w-5" />
            <span>Drive Processing Jobs</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {jobs.length} {jobs.length === 1 ? "job" : "jobs"}
          </Badge>
        </CardTitle>
        <CardDescription>Monitor your Google Drive upload processes</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {jobs.map((job) => (
              <div
                key={job.job_id}
                className="border rounded-lg p-4 space-y-3 transition-all duration-200 hover:shadow-sm"
              >
                {/* Job Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(job.status)}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{job.folder_name}</h4>
                      <p className="text-xs text-gray-500">Started {formatDate(job.created_at)}</p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(job.status)}>{job.status.replace("_", " ")}</Badge>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">{job.completion_percentage}%</span>
                  </div>
                  <Progress value={job.completion_percentage} className="h-2 transition-all duration-300 ease-out" />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>
                      {job.processed_files} of {job.total_files} files processed
                    </span>
                    {job.status === "processing" && <span className="animate-pulse">Processing...</span>}
                  </div>
                </div>

                {/* Latest File */}
                {job.latest_processed_file && (
                  <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded-md">
                    <FileText className="h-3 w-3 text-blue-600 flex-shrink-0" />
                    <span className="text-xs text-blue-800 truncate">Latest: {job.latest_processed_file}</span>
                    {job.status === "processing" && (
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </div>
                )}

                {/* Job Stats */}
                {job.status !== "processing" && job.status !== "pending" && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                    <div className="text-center">
                      <div className="text-sm font-semibold text-gray-900">{job.total_files}</div>
                      <div className="text-xs text-gray-500">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-semibold text-green-700">
                        {job.processed_files - (job.total_files - job.processed_files)}
                      </div>
                      <div className="text-xs text-green-600">Success</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-semibold text-red-700">{job.total_files - job.processed_files}</div>
                      <div className="text-xs text-red-600">Failed</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
