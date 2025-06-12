"use client"

import type React from "react"

import { useState } from "react"
import { Upload, User, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { uploadResumeGeneral, uploadResumeForJob, type CandidateUploadData } from "@/lib/api/candidates"

interface ResumeUploadWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadComplete?: () => void
  jobId?: string
  jobTitle?: string
  mode: "job-specific" | "general"
}

const steps = [
  { id: 1, name: "Candidate Details", icon: User },
  { id: 2, name: "Upload Resume", icon: FileText },
]

export function ResumeUploadWizard({
  open,
  onOpenChange,
  onUploadComplete,
  jobId,
  jobTitle,
  mode,
}: ResumeUploadWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [candidateData, setCandidateData] = useState<CandidateUploadData>({
    name: "",
    email: "",
    phone: "",
    location: "",
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const { toast } = useToast()

  const resetForm = () => {
    setCurrentStep(1)
    setCandidateData({ name: "", email: "", phone: "", location: "" })
    setSelectedFile(null)
    setDragActive(false)
  }

  const handleClose = () => {
    onOpenChange(false)
    resetForm()
  }

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (validateFile(file)) {
        setSelectedFile(file)
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (validateFile(file)) {
        setSelectedFile(file)
      }
    }
  }

  const validateFile = (file: File) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    const maxSize = 10 * 1024 * 1024 // 10MB

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, DOC, or DOCX file.",
        variant: "destructive",
      })
      return false
    }

    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      })
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a resume file to upload.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      let result
      if (mode === "job-specific" && jobId) {
        result = await uploadResumeForJob(jobId, selectedFile, candidateData)
      } else {
        result = await uploadResumeGeneral(selectedFile, candidateData)
      }

      toast({
        title: "Success!",
        description: result.message || "Resume uploaded successfully!",
      })

      handleClose()
      onUploadComplete?.()
    } catch (error: any) {
      console.error("Upload error:", error)
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload resume. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-4 p-6">
        <DialogHeader className="flex-none">
          <DialogTitle className="text-2xl">
            {mode === "job-specific" ? `Upload Resume for ${jobTitle}` : "Upload Resume to Candidate Pool"}
          </DialogTitle>
          <DialogDescription>
            {mode === "job-specific"
              ? "Add a candidate's resume for this specific job position"
              : "Add a candidate's resume to the general candidate pool"}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="relative mb-8 mt-2 flex-none">
          <div className="relative flex justify-between">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={cn("flex flex-col items-center gap-2 relative", {
                  "text-primary": currentStep === step.id,
                  "text-muted-foreground": currentStep !== step.id,
                })}
              >
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "absolute left-[calc(50%+12px)] w-[200px] right-[calc(-50%+12px)] top-4 h-px -translate-y-1/2 bg-border transition-colors duration-200",
                      {
                        "bg-primary": currentStep > step.id,
                      },
                    )}
                  />
                )}
                <div
                  className={cn(
                    "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-sm font-medium transition-colors duration-200",
                    {
                      "border-primary bg-primary text-primary-foreground": currentStep === step.id,
                      "border-muted-foreground bg-background": currentStep !== step.id,
                      "border-green-500 bg-green-500 text-white": currentStep > step.id,
                    },
                  )}
                >
                  {currentStep > step.id ? <CheckCircle className="h-4 w-4" /> : step.id}
                </div>
                <span className="text-sm font-medium">{step.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Steps */}
        <div className="flex-1 min-h-0 overflow-y-auto px-1">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Candidate Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter full name (optional - will be extracted if not provided)"
                    value={candidateData.name || ""}
                    onChange={(e) => setCandidateData((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address (optional - will be extracted if not provided)"
                    value={candidateData.email || ""}
                    onChange={(e) => setCandidateData((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="Enter phone number (optional - will be extracted if not provided)"
                    value={candidateData.phone || ""}
                    onChange={(e) => setCandidateData((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="Enter location (optional - will be extracted if not provided)"
                    value={candidateData.location || ""}
                    onChange={(e) => setCandidateData((prev) => ({ ...prev, location: e.target.value }))}
                  />
                </div>
              </div>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Optional Information</p>
                      <p>
                        All fields are optional. If you don't provide candidate details, our AI will automatically
                        extract this information from the resume using advanced document analysis.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div
                className={cn(
                  "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                  dragActive ? "border-primary bg-primary/5" : "border-gray-300",
                  selectedFile ? "border-green-500 bg-green-50" : "",
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                {selectedFile ? (
                  <div className="space-y-4">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                    <div>
                      <p className="text-lg font-medium text-green-800">File Selected</p>
                      <p className="text-sm text-green-600">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setSelectedFile(null)}>
                      Choose Different File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-lg font-medium text-gray-900">Upload Resume</p>
                      <p className="text-sm text-gray-500">Drag and drop your resume here, or click to browse</p>
                      <p className="text-xs text-gray-400 mt-2">Supports PDF, DOC, DOCX files up to 10MB</p>
                    </div>
                  </div>
                )}
              </div>

              {mode === "job-specific" && (
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div className="text-sm text-purple-800">
                        <p className="font-medium mb-1">Job-Specific Upload</p>
                        <p>
                          This resume will be automatically associated with the job "{jobTitle}" and the candidate will
                          be added to the application pipeline.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 flex-none border-t">
          <Button
            variant="outline"
            size="lg"
            onClick={handlePrevious}
            disabled={currentStep === 1 || loading}
            className="min-w-[100px]"
          >
            Previous
          </Button>

          <div className="flex gap-2">
            {currentStep === 2 ? (
              <Button size="lg" onClick={handleSubmit} disabled={loading || !selectedFile} className="min-w-[120px]">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Uploading...
                  </>
                ) : (
                  "Upload Resume"
                )}
              </Button>
            ) : (
              <Button size="lg" onClick={handleNext} disabled={loading} className="min-w-[100px]">
                Next
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}