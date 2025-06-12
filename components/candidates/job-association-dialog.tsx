"use client"

import { useState, useEffect } from "react"
import { Search, Briefcase, MapPin, Calendar, Loader2, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { getJobs, type Job } from "@/lib/api/jobs"
import { cn } from "@/lib/utils"

interface JobAssociationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidateId: string
  candidateName: string
  onAssociationComplete?: () => void
}

export function JobAssociationDialog({
  open,
  onOpenChange,
  candidateId,
  candidateName,
  onAssociationComplete,
}: JobAssociationDialogProps) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [associating, setAssociating] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      fetchJobs()
    }
  }, [open])

  useEffect(() => {
    const filtered = jobs.filter(
      (job) =>
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.location.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    setFilteredJobs(filtered)
  }, [jobs, searchQuery])

  const fetchJobs = async () => {
    try {
      setLoading(true)
      const jobsData = await getJobs()
      // Filter only active jobs
      const activeJobs = jobsData.filter((job) => job.status === "active")
      setJobs(activeJobs)
      setFilteredJobs(activeJobs)
    } catch (error) {
      console.error("Error fetching jobs:", error)
      toast({
        title: "Error",
        description: "Failed to load jobs. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAssociate = async () => {
    if (!selectedJob) return

    try {
      setAssociating(true)

      const response = await fetch(`/api/candidates/${candidateId}/associate-job/${selectedJob.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Association failed")
      }

      const result = await response.json()

      toast({
        title: "Success!",
        description: `${candidateName} has been associated with ${selectedJob.title}`,
      })

      onOpenChange(false)
      onAssociationComplete?.()
      setSelectedJob(null)
      setSearchQuery("")
    } catch (error: any) {
      console.error("Association error:", error)
      toast({
        title: "Association failed",
        description: error.message || "Failed to associate candidate with job. Please try again.",
        variant: "destructive",
      })
    } finally {
      setAssociating(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setSelectedJob(null)
    setSearchQuery("")
  }

  const getJobTypeLabel = (jobType: string) => {
    switch (jobType) {
      case "full_time":
        return "Full Time"
      case "part_time":
        return "Part Time"
      case "contract":
        return "Contract"
      case "internship":
        return "Internship"
      default:
        return jobType
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col gap-4 p-6">
        <DialogHeader className="flex-none">
          <DialogTitle className="text-2xl">Associate with Job</DialogTitle>
          <DialogDescription>
            Select a job to associate {candidateName} with. This will add them to the job's application pipeline.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="flex-none">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search jobs by title, department, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Jobs List */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading jobs...</span>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? "No jobs found" : "No active jobs available"}
              </h3>
              <p className="text-gray-500">
                {searchQuery
                  ? "Try adjusting your search criteria."
                  : "There are no active jobs to associate with at the moment."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredJobs.map((job) => (
                <Card
                  key={job.id}
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover:shadow-md",
                    selectedJob?.id === job.id
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-gray-200 hover:border-gray-300",
                  )}
                  onClick={() => setSelectedJob(job)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                          {selectedJob?.id === job.id && <CheckCircle className="h-5 w-5 text-primary" />}
                        </div>

                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge variant="outline">{getJobTypeLabel(job.job_type)}</Badge>
                          {job.department && <Badge variant="outline">{job.department}</Badge>}
                          {job.remote_allowed && (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              Remote
                            </Badge>
                          )}
                          {job.experience_level && (
                            <Badge variant="outline">
                              {job.experience_level.charAt(0).toUpperCase() + job.experience_level.slice(1)} Level
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{job.location}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            <span>{job.application_count} applications</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>Posted {formatDate(job.created_at)}</span>
                          </div>
                        </div>

                        {job.description && (
                          <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                            {job.description.substring(0, 150)}
                            {job.description.length > 150 ? "..." : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 flex-none border-t">
          <Button variant="outline" onClick={handleClose} disabled={associating}>
            Cancel
          </Button>

          <Button onClick={handleAssociate} disabled={!selectedJob || associating} className="min-w-[120px]">
            {associating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Associating...
              </>
            ) : (
              "Associate with Job"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
