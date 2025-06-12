"use client"

import type React from "react"

import { useState } from "react"
import { Plus, Bot, Briefcase } from "lucide-react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { assistantsAPI, type CreateAssistantRequest, type JobContext } from "@/lib/api/assistants"

interface CreateAssistantDialogProps {
  customerId: string
  onAssistantCreated: () => void
}

export function CreateAssistantDialog({ customerId, onAssistantCreated }: CreateAssistantDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [assistantType, setAssistantType] = useState<"generic" | "job-specific">("generic")

  // Form state
  const [name, setName] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [experienceLevel, setExperienceLevel] = useState("")
  const [requirements, setRequirements] = useState("")

  const resetForm = () => {
    setName("")
    setJobTitle("")
    setJobDescription("")
    setCompanyName("")
    setExperienceLevel("")
    setRequirements("")
    setAssistantType("generic")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("Assistant name is required")
      return
    }

    if (assistantType === "job-specific" && (!jobTitle.trim() || !jobDescription.trim())) {
      toast.error("Job title and description are required for job-specific assistants")
      return
    }

    setLoading(true)

    try {
      const requestData: CreateAssistantRequest = {
        customer_id: customerId,
        name: name.trim(),
        metadata: {
          type: assistantType,
          created_by: "user", // You might want to get this from auth context
        },
      }

      // Add job context for job-specific assistants
      if (assistantType === "job-specific") {
        const jobContext: JobContext = {
          job_id: "custom", // This would be actual job ID in real scenario
          job_title: jobTitle.trim(),
          job_description: jobDescription.trim(),
          company_name: companyName.trim() || "Company",
          experience_level: experienceLevel || "any",
          requirements: requirements.split("\n").filter((req) => req.trim()),
          questions: [
            {
              question: "Can you tell me about your relevant experience for this role?",
              ideal_answer: "Detailed experience matching job requirements",
              weight: 1.0,
            },
            {
              question: "What interests you about this position?",
              ideal_answer: "Specific interest in role and company",
              weight: 0.8,
            },
            {
              question: "Do you have any questions about the role or company?",
              ideal_answer: "Thoughtful questions showing engagement",
              weight: 0.5,
            },
          ],
        }
        requestData.job_context = jobContext
      }

      await assistantsAPI.createAssistant(requestData)

      toast.success("Assistant created successfully!")
      resetForm()
      setOpen(false)
      onAssistantCreated()
    } catch (error) {
      console.error("Error creating assistant:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create assistant")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Assistant
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create AI Interview Assistant</DialogTitle>
          <DialogDescription>Create a new AI assistant to conduct interviews for your company.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Assistant Type Selection */}
          <div className="grid grid-cols-2 gap-4">
            <Card
              className={`cursor-pointer transition-colors ${assistantType === "generic" ? "ring-2 ring-primary" : ""}`}
              onClick={() => setAssistantType("generic")}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Generic Assistant
                </CardTitle>
                <CardDescription className="text-xs">
                  General-purpose interview assistant for basic screening
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className={`cursor-pointer transition-colors ${
                assistantType === "job-specific" ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setAssistantType("job-specific")}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Job-Specific Assistant
                </CardTitle>
                <CardDescription className="text-xs">Tailored assistant for specific job requirements</CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Assistant Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Senior Developer Interviewer"
                required
              />
            </div>

            {/* Job-Specific Fields */}
            {assistantType === "job-specific" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title *</Label>
                    <Input
                      id="jobTitle"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g., Senior React Developer"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g., Tech Corp"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jobDescription">Job Description *</Label>
                  <Textarea
                    id="jobDescription"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Describe the role, responsibilities, and what you're looking for..."
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experienceLevel">Experience Level</Label>
                  <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                      <SelectItem value="mid">Mid Level (3-5 years)</SelectItem>
                      <SelectItem value="senior">Senior Level (6+ years)</SelectItem>
                      <SelectItem value="lead">Lead/Principal (8+ years)</SelectItem>
                      <SelectItem value="any">Any Level</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requirements">Key Requirements</Label>
                  <Textarea
                    id="requirements"
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    placeholder="Enter each requirement on a new line..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">Enter each requirement on a separate line</p>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Assistant"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
