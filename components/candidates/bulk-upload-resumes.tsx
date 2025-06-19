"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, X, CheckCircle, AlertCircle, FileText, Loader2, Clock, Timer, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import {
  bulkUploadResumes,
  getBulkUploadStatus,
  uploadCSVCandidates,
  downloadSampleCSV,
  type BulkUploadStatusResponse,
  type CSVUploadResponse,
} from "@/lib/api/bulk-upload"

interface BulkUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  jobTitle: string
  onUploadComplete?: () => void
}

interface FileWithStatus {
  file: File
  status: "pending" | "uploading" | "success" | "error"
  error?: string
  fileId?: string
}

export function BulkUploadDialog({ open, onOpenChange, jobId, jobTitle, onUploadComplete }: BulkUploadDialogProps) {
  const [files, setFiles] = useState<FileWithStatus[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [bulkUploadId, setBulkUploadId] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<BulkUploadStatusResponse | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [uploadCompleted, setUploadCompleted] = useState(false)
  const [hasNotifiedParent, setHasNotifiedParent] = useState(false)
  const { toast } = useToast()
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const [uploadMode, setUploadMode] = useState<"resume" | "csv">("resume")
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvUploadResult, setCsvUploadResult] = useState<CSVUploadResponse | null>(null)
  const [isCsvUploading, setIsCsvUploading] = useState(false)

  // Accepted file types
  const acceptedFileTypes = {
    "application/pdf": [".pdf"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  }

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach((rejection) => {
          toast({
            title: "File rejected",
            description: `${rejection.file.name}: ${rejection.errors[0]?.message || "Invalid file type"}`,
            variant: "destructive",
          })
        })
      }

      const newFiles: FileWithStatus[] = acceptedFiles.map((file) => ({
        file,
        status: "pending",
      }))

      setFiles((prev) => [...prev, ...newFiles])
    },
    [toast],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: isUploading,
  })

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const clearAll = () => {
    setFiles([])
    setUploadStatus(null)
    setShowResults(false)
    setUploadCompleted(false)
    setHasNotifiedParent(false)
    setBulkUploadId(null)
    setCsvFile(null)
    setCsvUploadResult(null)
    setUploadMode("resume")
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }

  const handleClose = () => {
    if (isUploading || (uploadStatus?.is_active && uploadStatus.status === "processing")) {
      toast({
        title: "Upload in progress",
        description: "Please wait for the upload to complete.",
        variant: "destructive",
      })
      return
    }

    if (uploadCompleted && !hasNotifiedParent && uploadStatus) {
      const hasResults = uploadStatus.successful_uploads > 0 || uploadStatus.failed_uploads > 0
      if (hasResults) {
        toast({
          title: "Review results",
          description: "Please review the upload results before closing.",
          variant: "destructive",
        })
        return
      }
    }

    clearAll()
    onOpenChange(false)
  }

  const handleDoneClick = () => {
    setHasNotifiedParent(true)
    if (onUploadComplete && uploadCompleted) {
      onUploadComplete()
    }
    clearAll()
    onOpenChange(false)
  }

  const startUpload = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select files to upload",
        variant: "destructive",
      })
      return
    }

    try {
      setIsUploading(true)
      setUploadCompleted(false)
      setHasNotifiedParent(false)
      setFiles((prev) => prev.map((f) => ({ ...f, status: "uploading" })))

      const response = await bulkUploadResumes(
        jobId,
        files.map((f) => f.file),
      )

      setBulkUploadId(response.bulk_upload_id)
      setShowResults(true)

      if (response.invalid_files.length > 0) {
        toast({
          title: "Some files rejected",
          description: `${response.invalid_files.length} files were rejected during validation.`,
          variant: "destructive",
        })
      }

      toast({
        title: "Upload started",
        description: `Processing ${response.total_files} files`,
      })

      startStatusPolling(response.bulk_upload_id)
    } catch (error) {
      console.error("Upload failed:", error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to start upload",
        variant: "destructive",
      })
      setFiles((prev) => prev.map((f) => ({ ...f, status: "error", error: "Upload failed" })))
    } finally {
      setIsUploading(false)
    }
  }

  const startStatusPolling = (uploadId: string) => {
    const pollStatus = async () => {
      try {
        const status = await getBulkUploadStatus(uploadId)
        setUploadStatus(status)

        if (!status.is_active) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }

          setUploadCompleted(true)

          if (status.status === "completed") {
            toast({
              title: "Upload completed",
              description: `Successfully processed ${status.successful_uploads} files`,
              duration: 5000,
            })
          } else if (status.status === "completed_with_errors") {
            toast({
              title: "Upload completed with errors",
              description: `${status.successful_uploads} successful, ${status.failed_uploads} failed`,
              variant: "destructive",
              duration: 7000,
            })
          } else {
            toast({
              title: "Upload failed",
              description: status.error_message || "The upload job failed",
              variant: "destructive",
              duration: 7000,
            })
          }
        }
      } catch (error) {
        console.error("Failed to get upload status:", error)
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
      }
    }

    pollIntervalRef.current = setInterval(pollStatus, 2000)
    pollStatus()
  }

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    return `${minutes}m ${remainingSeconds}s`
  }

  const copyFileList = () => {
    if (!uploadStatus?.successful_files.length) return

    const fileList = uploadStatus.successful_files
      .map((f) => `${f.filename} (${formatFileSize(f.file_size)})`)
      .join("\n")

    navigator.clipboard.writeText(fileList)
    toast({
      title: "Copied to clipboard",
      description: "File list copied successfully",
    })
  }

  const handleCsvUpload = async () => {
    if (!csvFile) return

    try {
      setIsCsvUploading(true)
      setShowResults(true)

      const result = await uploadCSVCandidates(jobId, csvFile)
      setCsvUploadResult(result)

      if (result.successful_uploads > 0) {
        toast({
          title: "CSV upload completed",
          description: `Successfully created ${result.successful_uploads} candidates`,
          duration: 5000,
        })
      }

      if (result.failed_uploads > 0 || result.duplicate_emails > 0) {
        toast({
          title: "Upload completed with issues",
          description: `${result.successful_uploads} successful, ${result.failed_uploads + result.duplicate_emails} failed/duplicates`,
          variant: "destructive",
          duration: 7000,
        })
      }
    } catch (error) {
      console.error("CSV upload failed:", error)
      toast({
        title: "CSV upload failed",
        description: error instanceof Error ? error.message : "Failed to upload CSV",
        variant: "destructive",
      })
    } finally {
      setIsCsvUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl h-[90vh] ">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl font-semibold text-gray-900">Bulk Upload Resumes</DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Upload multiple resume files for "{uploadStatus?.job_title || jobTitle}"
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-full">
        <div className="flex-1 overflow-hidden">
          {!showResults && (
            <div className="space-y-6">
              {/* Upload Mode Tabs */}
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setUploadMode("resume")}
                  className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                    uploadMode === "resume" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Resume Files
                </button>
                <button
                  onClick={() => setUploadMode("csv")}
                  className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                    uploadMode === "csv" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  CSV Upload
                </button>
              </div>

              {/* Resume Upload Mode */}
              {uploadMode === "resume" && (
                <>
                  {/* Dropzone */}
                  <div
                    {...getRootProps()}
                    className={`
                      relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
                      ${
                        isDragActive
                          ? "border-blue-400 bg-blue-50"
                          : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                      }
                      ${isUploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                    `}
                  >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center space-y-3">
                      <div className="p-3 bg-gray-100 rounded-full">
                        <Upload className="h-6 w-6 text-gray-600" />
                      </div>
                      {isDragActive ? (
                        <p className="text-base font-medium text-blue-700">Drop files here</p>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-base font-medium text-gray-900">Drop files here or click to browse</p>
                          <p className="text-sm text-gray-500">PDF, DOC, DOCX • Max 10MB per file</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* File List */}
                  {files.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900">Selected files ({files.length})</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearAll}
                          disabled={isUploading}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          Clear all
                        </Button>
                      </div>

                      <div className="border rounded-lg">
                        <ScrollArea className="h-32">
                          <div className="p-2 space-y-1">
                            {files.map((fileWithStatus, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
                              >
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                  <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {fileWithStatus.file.name}
                                    </p>
                                    <p className="text-xs text-gray-500">{formatFileSize(fileWithStatus.file.size)}</p>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                  {fileWithStatus.status === "pending" && (
                                    <Badge variant="secondary" className="text-xs">
                                      Ready
                                    </Badge>
                                  )}
                                  {fileWithStatus.status === "uploading" && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                      Processing
                                    </Badge>
                                  )}
                                  {fileWithStatus.status === "success" && (
                                    <Badge className="text-xs bg-green-100 text-green-800 hover:bg-green-100">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Success
                                    </Badge>
                                  )}
                                  {fileWithStatus.status === "error" && (
                                    <Badge variant="destructive" className="text-xs">
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      Error
                                    </Badge>
                                  )}

                                  {!isUploading && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeFile(index)}
                                      className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  )}

                  {/* Upload Button */}
                  <div className="flex justify-end pt-2">
                    <Button onClick={startUpload} disabled={files.length === 0 || isUploading} className="min-w-32">
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Starting...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload {files.length} files
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}

              {/* CSV Upload Mode */}
              {uploadMode === "csv" && (
                <div className="space-y-6">
                  {/* CSV Instructions */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-blue-900">CSV Upload Instructions</h4>
                        <div className="text-sm text-blue-800 mt-1 space-y-1">
                          <p>
                            • Required columns: <strong>name</strong>, <strong>phone</strong> (with country code)
                          </p>
                          <p>
                            • Optional columns: <strong>email</strong>, <strong>location</strong>
                          </p>
                          <p>• Phone numbers must include country code (e.g., +1234567890)</p>
                          <p>• Candidates will be automatically applied to this job</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sample CSV Download */}
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Need a template?</h4>
                      <p className="text-xs text-gray-500">Download a sample CSV file to get started</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadSampleCSV}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Download Sample CSV
                    </Button>
                  </div>

                  {/* CSV File Upload */}
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setCsvFile(file)
                          }
                        }}
                        className="hidden"
                        id="csv-upload"
                        disabled={isCsvUploading}
                      />
                      <label
                        htmlFor="csv-upload"
                        className={`cursor-pointer ${isCsvUploading ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <div className="flex flex-col items-center space-y-3">
                          <div className="p-3 bg-gray-100 rounded-full">
                            <FileText className="h-6 w-6 text-gray-600" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-base font-medium text-gray-900">
                              {csvFile ? csvFile.name : "Choose CSV file"}
                            </p>
                            <p className="text-sm text-gray-500">CSV files only • Max 10MB</p>
                          </div>
                        </div>
                      </label>
                    </div>

                    {csvFile && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-4 w-4 text-gray-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{csvFile.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(csvFile.size)}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCsvFile(null)}
                          disabled={isCsvUploading}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* CSV Upload Button */}
                  <div className="flex justify-end pt-2">
                    <Button onClick={handleCsvUpload} disabled={!csvFile || isCsvUploading} className="min-w-32">
                      {isCsvUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload CSV
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results Interface */}
          {showResults && (uploadStatus || csvUploadResult) && (
            <div className="space-y-6">
              {/* Resume Upload Results */}
              {uploadStatus && (
                <>
                  {/* Status Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-900">
                          {uploadStatus.is_active ? "Processing" : "Completed"}
                        </span>
                      </div>
                      {uploadStatus.processing_time_seconds && (
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <Timer className="h-3 w-3" />
                          <span>
                            {uploadStatus.is_active ? "Running" : "Finished"} in{" "}
                            {formatDuration(uploadStatus.processing_time_seconds)}
                          </span>
                        </div>
                      )}
                    </div>
                    <Badge
                      variant={
                        uploadStatus.status === "completed"
                          ? "default"
                          : uploadStatus.status === "completed_with_errors"
                            ? "secondary"
                            : uploadStatus.status === "failed"
                              ? "destructive"
                              : "secondary"
                      }
                      className={
                        uploadStatus.status === "completed"
                          ? "bg-green-100 text-green-800 hover:bg-green-100"
                          : uploadStatus.status === "completed_with_errors"
                            ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                            : ""
                      }
                    >
                      {uploadStatus.status.replace("_", " ")}
                    </Badge>
                  </div>

                  {/* Progress Bar */}
                  {uploadStatus.is_active && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">{uploadStatus.progress_percentage.toFixed(0)}%</span>
                      </div>
                      <Progress value={uploadStatus.progress_percentage} className="h-2" />
                      <p className="text-xs text-gray-500 text-center">
                        {uploadStatus.processed_files} of {uploadStatus.total_files} files processed
                      </p>
                    </div>
                  )}

                  {/* Resume Results Summary */}
                  {!uploadStatus.is_active && uploadCompleted && (
                    <div className="space-y-4">
                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-semibold text-gray-900">{uploadStatus.total_files}</div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Total</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-semibold text-green-700">{uploadStatus.successful_uploads}</div>
                          <div className="text-xs text-green-600 uppercase tracking-wide">Successful</div>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded-lg">
                          <div className="text-2xl font-semibold text-red-700">{uploadStatus.failed_uploads}</div>
                          <div className="text-xs text-red-600 uppercase tracking-wide">Failed</div>
                        </div>
                      </div>

                      {/* Error Message */}
                      {uploadStatus.error_message && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <h4 className="text-sm font-medium text-red-800">Error</h4>
                              <p className="text-sm text-red-700 mt-1">{uploadStatus.error_message}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* File Results */}
                      <div className="space-y-4">
                        {/* Successful Files */}
                        {uploadStatus.successful_files.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium text-green-700">
                                Successful ({uploadStatus.successful_files.length})
                              </h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={copyFileList}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Copy list
                              </Button>
                            </div>
                            <div className="border rounded-lg bg-green-50">
                              <ScrollArea className="h-32">
                                <div className="p-2 space-y-1 w-[97%]">
                                  {uploadStatus.successful_files.map((file, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center justify-between p-2 bg-white rounded text-sm"
                                    >
                                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                                        <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                                        <span className="font-medium truncate">{file.filename}</span>
                                      </div>
                                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                                        <span>{formatFileSize(file.file_size)}</span>
                                        {file.processing_time_seconds && (
                                          <span>{file.processing_time_seconds.toFixed(1)}s</span>
                                        )}
                                        {file.file_id && (
                                          <code className="bg-gray-100 px-1 rounded text-xs">
                                            {file.file_id.slice(-6)}
                                          </code>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          </div>
                        )}

                        {/* Invalid Files */}
                        {uploadStatus.invalid_files.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-orange-700 mb-2">
                              Invalid ({uploadStatus.invalid_files.length})
                            </h4>
                            <div className="border rounded-lg bg-orange-50">
                              <ScrollArea className="h-24">
                                <div className="p-2 space-y-1">
                                  {uploadStatus.invalid_files.map((file, index) => (
                                    <div
                                      key={index}
                                      className="flex items-start space-x-2 p-2 bg-white rounded text-sm"
                                    >
                                      <AlertCircle className="h-3 w-3 text-orange-600 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">{file.filename}</p>
                                        <p className="text-xs text-orange-700">{file.error}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          </div>
                        )}

                        {/* Failed Files */}
                        {uploadStatus.failed_files.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-red-700 mb-2">
                              Failed ({uploadStatus.failed_files.length})
                            </h4>
                            <div className="border rounded-lg bg-red-50">
                              <ScrollArea className="h-24">
                                <div className="p-2 space-y-1">
                                  {uploadStatus.failed_files.map((file, index) => (
                                    <div
                                      key={index}
                                      className="flex items-start space-x-2 p-2 bg-white rounded text-sm"
                                    >
                                      <AlertCircle className="h-3 w-3 text-red-600 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">{file.filename}</p>
                                        <p className="text-xs text-red-700">{file.error}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Summary */}
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            {uploadStatus.status === "completed" ? (
                              <CheckCircle className="h-5 w-5 text-blue-600" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-blue-900">Summary</h4>
                            <p className="text-sm text-blue-800 mt-1">
                              {uploadStatus.status === "completed" &&
                                `All ${uploadStatus.successful_uploads} files were successfully processed and are ready for candidate creation.`}
                              {uploadStatus.status === "completed_with_errors" &&
                                `${uploadStatus.successful_uploads} files processed successfully. ${uploadStatus.failed_uploads} files require attention.`}
                              {uploadStatus.status === "failed" &&
                                "The upload job failed. Please review the errors and try again."}
                            </p>
                            <p className="text-xs text-blue-600 mt-2">
                              Completed {new Date(uploadStatus.updated_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* CSV Upload Results */}
              {csvUploadResult && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">CSV Upload Results</h3>
                    <Badge
                      variant={csvUploadResult.failed_uploads === 0 ? "default" : "secondary"}
                      className={
                        csvUploadResult.failed_uploads === 0
                          ? "bg-green-100 text-green-800 hover:bg-green-100"
                          : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                      }
                    >
                      {csvUploadResult.failed_uploads === 0 ? "Success" : "Completed with issues"}
                    </Badge>
                  </div>

                  {/* CSV Stats */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-semibold text-gray-900">{csvUploadResult.total_records}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Total</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-semibold text-green-700">{csvUploadResult.successful_uploads}</div>
                      <div className="text-xs text-green-600 uppercase tracking-wide">Created</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-semibold text-red-700">{csvUploadResult.failed_uploads}</div>
                      <div className="text-xs text-red-600 uppercase tracking-wide">Failed</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-semibold text-orange-700">{csvUploadResult.duplicate_emails}</div>
                      <div className="text-xs text-orange-600 uppercase tracking-wide">Duplicates</div>
                    </div>
                  </div>

                  {/* Created Candidates */}
                  {csvUploadResult.created_candidates.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-green-700 mb-2">
                        Created Candidates ({csvUploadResult.created_candidates.length})
                      </h4>
                      <div className="border rounded-lg bg-green-50">
                        <ScrollArea className="h-32">
                          <div className="p-2 space-y-1">
                            {csvUploadResult.created_candidates.map((candidate, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 bg-white rounded text-sm"
                              >
                                <div className="flex items-center space-x-2 flex-1 min-w-0">
                                  <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{candidate.name}</p>
                                    <p className="text-xs text-gray-500">{candidate.phone}</p>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500">Row {candidate.row_number}</div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  )}

                  {/* Failed Records */}
                  {csvUploadResult.failed_records.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-red-700 mb-2">
                        Failed Records ({csvUploadResult.failed_records.length})
                      </h4>
                      <div className="border rounded-lg bg-red-50">
                        <ScrollArea className="h-24">
                          <div className="p-2 space-y-1">
                            {csvUploadResult.failed_records.map((record, index) => (
                              <div key={index} className="flex items-start space-x-2 p-2 bg-white rounded text-sm">
                                <AlertCircle className="h-3 w-3 text-red-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900">Row {record.row_number}</p>
                                  <p className="text-xs text-red-700">{record.error}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  )}

                  {/* Duplicate Records */}
                  {csvUploadResult.duplicate_records.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-orange-700 mb-2">
                        Duplicate Records ({csvUploadResult.duplicate_records.length})
                      </h4>
                      <div className="border rounded-lg bg-orange-50">
                        <ScrollArea className="h-24">
                          <div className="p-2 space-y-1">
                            {csvUploadResult.duplicate_records.map((record, index) => (
                              <div key={index} className="flex items-start space-x-2 p-2 bg-white rounded text-sm">
                                <AlertCircle className="h-3 w-3 text-orange-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900">Row {record.row_number}</p>
                                  <p className="text-xs text-orange-700">{record.error}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  )}

                  {/* CSV Summary */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-blue-900">CSV Upload Summary</h4>
                        <p className="text-sm text-blue-800 mt-1">{csvUploadResult.message}</p>
                        <p className="text-xs text-blue-600 mt-2">
                          Processed in {csvUploadResult.processing_time_seconds}s by {csvUploadResult.uploaded_by}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <Separator />
              <div className="flex justify-between">
                <Button variant="outline" onClick={clearAll} disabled={uploadStatus?.is_active}>
                  Upload more files
                </Button>
                <Button
                  onClick={handleDoneClick}
                  disabled={uploadStatus?.is_active && uploadStatus.status === "processing"}
                  variant={uploadCompleted && !hasNotifiedParent ? "default" : "outline"}
                >
                  {uploadStatus?.is_active ? "Processing..." : "Done"}
                </Button>
              </div>
            </div>
          )}
        </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
