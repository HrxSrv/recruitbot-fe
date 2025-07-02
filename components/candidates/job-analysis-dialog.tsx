"use client"

import { useState, useEffect } from "react"
import { CheckCircle, AlertCircle, FileText, Clock, Download, User, ExternalLink, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { getJobAnalysis, type DriveJobAnalysis } from "@/lib/api/bulk-upload"

interface JobAnalysisDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
}

export function JobAnalysisDialog({ open, onOpenChange, jobId }: JobAnalysisDialogProps) {
  const [jobData, setJobData] = useState<DriveJobAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchJobAnalysis = async () => {
    if (!jobId) return

    try {
      setIsLoading(true)
      setError(null)
      const data = await getJobAnalysis(jobId)
      setJobData(data)
    } catch (error) {
      console.error("Failed to fetch job analysis:", error)
      setError(error instanceof Error ? error.message : "Failed to load job analysis")
      toast({
        title: "Failed to load analysis",
        description: "Could not fetch job analysis details",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open && jobId) {
      fetchJobAnalysis()
    }
  }, [open, jobId])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    return `${minutes}m ${remainingSeconds}s`
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

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.target = "_blank"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh]">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl font-semibold text-gray-900">Job Analysis</DialogTitle>
          <DialogDescription className="text-sm text-gray-600">Detailed analysis of the upload job</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-600">Loading job analysis...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
            <p className="text-red-600 text-center">{error}</p>
            <Button onClick={fetchJobAnalysis} className="mt-4">
              Try Again
            </Button>
          </div>
        ) : jobData ? (
          <div className="flex-1 overflow-hidden">
            {/* Job Summary */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-900">{jobData.folder_name}</h3>
                <Badge className={`${getStatusColor(jobData.status)}`}>{jobData.status.replace("_", " ")}</Badge>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-3">
                <div className="text-center">
                  <div className="text-2xl font-semibold text-gray-900">{jobData.total_files}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Total Files</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-green-700">{jobData.successful_uploads}</div>
                  <div className="text-xs text-green-600 uppercase tracking-wide">Successful</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-red-700">{jobData.failed_uploads}</div>
                  <div className="text-xs text-red-600 uppercase tracking-wide">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-gray-700">{jobData.processed_files}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Processed</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>Started: {formatDate(jobData.created_at)}</span>
                </div>
                {jobData.completed_at && (
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="h-4 w-4" />
                    <span>Completed: {formatDate(jobData.completed_at)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* File Details Tabs */}
            <Tabs defaultValue="failed" className="flex-1">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="failed" className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>Failed Files ({jobData.failed_uploads})</span>
                </TabsTrigger>
                <TabsTrigger value="successful" className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Successful Files ({jobData.successful_uploads})</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="failed" className="mt-4">
                <ScrollArea className="h-[400px] pr-4">
                  {jobData.failed_files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-400 mb-4" />
                      <p className="text-gray-600">No failed files</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {jobData.failed_files.map((file, index) => (
                        <div key={index} className="p-4 border border-red-200 rounded-lg bg-red-50">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <FileText className="h-5 w-5 text-red-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-gray-900 truncate">{file.filename}</h4>
                                <p className="text-xs text-red-600 mt-1">{file.error}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(file.s3_url, file.filename)}
                                className="text-xs"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Download
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(file.s3_url, "_blank")}
                                className="text-xs"
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center space-x-4">
                              <span>Failed: {formatDate(file.failed_at)}</span>
                              <span>Processing time: {formatDuration(file.processing_time_seconds)}</span>
                            </div>
                            {file.candidate_id && (
                              <div className="flex items-center space-x-1">
                                <User className="h-3 w-3" />
                                <span>Candidate ID: {file.candidate_id}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="successful" className="mt-4">
                <ScrollArea className="h-[400px] pr-4">
                  {jobData.successful_files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-600">No successful files</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {jobData.successful_files.map((file, index) => (
                        <div key={index} className="p-4 border border-green-200 rounded-lg bg-green-50">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <FileText className="h-5 w-5 text-green-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-gray-900 truncate">{file.filename}</h4>
                                <p className="text-xs text-green-600 mt-1">Successfully processed</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(file.s3_url, file.filename)}
                                className="text-xs"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Download
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(file.s3_url, "_blank")}
                                className="text-xs"
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center space-x-4">
                              <span>Processed: {formatDate(file.processed_at)}</span>
                              <span>Processing time: {formatDuration(file.processing_time_seconds)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>Candidate ID: {file.candidate_id}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
