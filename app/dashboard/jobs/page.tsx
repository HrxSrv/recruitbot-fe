"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Filter, MapPin, Plus, Search, Calendar, Briefcase, Globe } from "lucide-react"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { CreateJobDialog } from "@/components/jobs/create-job-dialog"
import { type Job, getJobsPaginated, type JobFilters } from "@/lib/api/jobs"
import { useToast } from "@/hooks/use-toast"
import { JobGridSkeleton, JobTableSkeleton } from "@/components/skeletons/job-card-skeleton"

export default function JobsPage() {
  const [view, setView] = useState<"grid" | "table">("table")
  const [searchQuery, setSearchQuery] = useState("")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalJobs, setTotalJobs] = useState(0)
  const [pageSize] = useState(12) // Fixed page size
  const router = useRouter()
  const { toast } = useToast()

  // Add filter state
  const [filters, setFilters] = useState({
    status: "all",
    job_type: "all",
    experience_level: "all",
    remote_allowed: "all",
    language: "all",
  })

  const [sortBy, setSortBy] = useState("newest")

  // Calculate active filters count
  const activeFilters = Object.values(filters).filter((value) => value !== "all").length

  // Calculate total pages
  const totalPages = Math.ceil(totalJobs / pageSize)

  // Handle filter changes
  const handleFilterChange = (filterType: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }))
    // Reset to first page when filters change
    setCurrentPage(1)
  }

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      status: "all",
      job_type: "all",
      experience_level: "all",
      remote_allowed: "all",
      language: "all",
    })
    setCurrentPage(1)
  }

  // Handle search query changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1) // Reset to first page when search changes
  }

  // Handle sort changes
  const handleSortChange = (value: string) => {
    setSortBy(value)
    setCurrentPage(1) // Reset to first page when sort changes
  }

  // Handle job click navigation
  const handleJobClick = (jobId: string) => {
    router.push(`/dashboard/jobs/${jobId}`)
  }

  // Handle page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Build API filters from current state
  const buildApiFilters = (): Omit<JobFilters, "skip" | "limit"> => {
    const apiFilters: Omit<JobFilters, "skip" | "limit"> = {}

    if (filters.status !== "all") {
      apiFilters.status_filter = filters.status as any
    }

    if (filters.job_type !== "all") {
      apiFilters.job_type_filter = filters.job_type as any
    }

    if (filters.location_filter && searchQuery.trim()) {
      apiFilters.location_filter = searchQuery.trim()
    }

    return apiFilters
  }

  // Fetch jobs with pagination
  const fetchJobs = async () => {
    try {
      setLoading(true)
      const apiFilters = buildApiFilters()
      const jobsData = await getJobsPaginated(currentPage, pageSize, apiFilters)
      setJobs(jobsData)

      // For now, we'll estimate total count based on returned data
      // In a real implementation, the API should return total count
      if (jobsData.length < pageSize && currentPage === 1) {
        setTotalJobs(jobsData.length)
      } else if (jobsData.length < pageSize) {
        setTotalJobs((currentPage - 1) * pageSize + jobsData.length)
      } else {
        // Estimate total - in production, this should come from the API
        setTotalJobs(currentPage * pageSize + 1)
      }
    } catch (error) {
      console.error("Error fetching jobs:", error)
      toast({
        title: "Error",
        description: "Failed to fetch jobs. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch jobs when page, filters, or search changes
  useEffect(() => {
    fetchJobs()
  }, [currentPage, filters, searchQuery])

  // Client-side filtering and sorting for additional filters not supported by API
  const filteredJobs = jobs.filter((job) => {
    // Additional search filtering (for title, department)
    const matchesSearch =
      !searchQuery.trim() ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.department && job.department.toLowerCase().includes(searchQuery.toLowerCase()))

    // Experience level filter (client-side since API doesn't support it)
    const matchesExperienceLevel =
      filters.experience_level === "all" || job.experience_level === filters.experience_level

    // Remote filter (client-side since API doesn't support it)
    const matchesRemote =
      filters.remote_allowed === "all" ||
      (filters.remote_allowed === "true" && job.remote_allowed) ||
      (filters.remote_allowed === "false" && !job.remote_allowed)

    // Language filter (client-side since API doesn't support it)
    const matchesLanguage = filters.language === "all" || job.language === filters.language

    return matchesSearch && matchesExperienceLevel && matchesRemote && matchesLanguage
  })

  const sortedJobs = filteredJobs.sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case "oldest":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case "title_asc":
        return a.title.localeCompare(b.title)
      case "title_desc":
        return b.title.localeCompare(a.title)
      case "status":
        const statusOrder = { active: 0, draft: 1, paused: 2, closed: 3 }
        return statusOrder[a.status] - statusOrder[b.status]
      case "applications":
        return (b.application_count || 0) - (a.application_count || 0)
      default:
        return 0
    }
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "draft":
        return "secondary"
      case "paused":
        return "outline"
      case "closed":
        return "destructive"
      default:
        return "secondary"
    }
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

  const formatSalary = (salaryRange: any) => {
    if (!salaryRange || (!salaryRange.min_salary && !salaryRange.max_salary)) {
      return "Not specified"
    }

    const { min_salary, max_salary, currency = "USD" } = salaryRange

    if (min_salary && max_salary) {
      return `${currency} ${min_salary.toLocaleString()} - ${max_salary.toLocaleString()}`
    } else if (min_salary) {
      return `${currency} ${min_salary.toLocaleString()}+`
    } else if (max_salary) {
      return `Up to ${currency} ${max_salary.toLocaleString()}`
    }

    return "Not specified"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Generate pagination items
  const generatePaginationItems = () => {
    const items = []
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages is small
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              href="#"
              isActive={currentPage === i}
              onClick={(e) => {
                e.preventDefault()
                handlePageChange(i)
              }}
            >
              {i}
            </PaginationLink>
          </PaginationItem>,
        )
      }
    } else {
      // Show first page
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            href="#"
            isActive={currentPage === 1}
            onClick={(e) => {
              e.preventDefault()
              handlePageChange(1)
            }}
          >
            1
          </PaginationLink>
        </PaginationItem>,
      )

      // Show ellipsis if needed
      if (currentPage > 3) {
        items.push(
          <PaginationItem key="ellipsis1">
            <PaginationEllipsis />
          </PaginationItem>,
        )
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              href="#"
              isActive={currentPage === i}
              onClick={(e) => {
                e.preventDefault()
                handlePageChange(i)
              }}
            >
              {i}
            </PaginationLink>
          </PaginationItem>,
        )
      }

      // Show ellipsis if needed
      if (currentPage < totalPages - 2) {
        items.push(
          <PaginationItem key="ellipsis2">
            <PaginationEllipsis />
          </PaginationItem>,
        )
      }

      // Show last page
      if (totalPages > 1) {
        items.push(
          <PaginationItem key={totalPages}>
            <PaginationLink
              href="#"
              isActive={currentPage === totalPages}
              onClick={(e) => {
                e.preventDefault()
                handlePageChange(totalPages)
              }}
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>,
        )
      }
    }

    return items
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  if (loading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 transition-all duration-300 ease-in-out">
        {/* <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground">Manage and track all your current job openings</p>
        </div> */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-background/80 p-4 rounded-lg border border-border/40 shadow-sm">
          <div className="relative w-full max-w-sm">
            <div className="w-full pl-8 rounded-md border border-input bg-transparent px-3 py-2 h-10" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-[120px] h-8 rounded-md border bg-transparent" />
            ))}
          </div>
        </div>

        {view === "grid" ? <JobGridSkeleton /> : <JobTableSkeleton />}
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 transition-all duration-300 ease-in-out">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
        <p className="text-muted-foreground">
          Manage and track all your current job openings
          {totalJobs > 0 && (
            <span className="ml-2 text-sm">
              ({totalJobs} total job{totalJobs !== 1 ? "s" : ""})
            </span>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-background/80 p-4 rounded-lg border border-border/40 shadow-sm hover:border-border/70 transition-all duration-300">
        <div className="relative w-full max-w-sm group">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
          <Input
            type="search"
            placeholder="Search jobs..."
            className="pl-8 border-border/50 hover:border-primary/50 focus:border-primary transition-colors duration-200"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="hover:bg-primary/10 transition-colors duration-200">
                <Filter className="mr-2 h-4 w-4" />
                Filter
                {activeFilters > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                    {activeFilters}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Filter Jobs</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-2">
                <div className="space-y-2 mb-2">
                  <Label htmlFor="status-filter">Status</Label>
                  <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value)}>
                    <SelectTrigger id="status-filter">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 mb-2">
                  <Label htmlFor="job-type-filter">Job Type</Label>
                  <Select value={filters.job_type} onValueChange={(value) => handleFilterChange("job_type", value)}>
                    <SelectTrigger id="job-type-filter">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 mb-2">
                  <Label htmlFor="experience-filter">Experience Level</Label>
                  <Select
                    value={filters.experience_level}
                    onValueChange={(value) => handleFilterChange("experience_level", value)}
                  >
                    <SelectTrigger id="experience-filter">
                      <SelectValue placeholder="All Levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="entry">Entry Level</SelectItem>
                      <SelectItem value="mid">Mid Level</SelectItem>
                      <SelectItem value="senior">Senior Level</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remote-filter">Remote Work</Label>
                  <Select
                    value={filters.remote_allowed}
                    onValueChange={(value) => handleFilterChange("remote_allowed", value)}
                  >
                    <SelectTrigger id="remote-filter">
                      <SelectValue placeholder="All Options" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Options</SelectItem>
                      <SelectItem value="true">Remote Allowed</SelectItem>
                      <SelectItem value="false">On-site Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language-filter">Language</Label>
                  <Select value={filters.language} onValueChange={(value) => handleFilterChange("language", value)}>
                    <SelectTrigger id="language-filter">
                      <SelectValue placeholder="All Languages" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Languages</SelectItem>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="spanish">Spanish</SelectItem>
                      <SelectItem value="french">French</SelectItem>
                      <SelectItem value="german">German</SelectItem>
                      <SelectItem value="italian">Italian</SelectItem>
                      <SelectItem value="portuguese">Portuguese</SelectItem>
                      <SelectItem value="chinese">Chinese</SelectItem>
                      <SelectItem value="japanese">Japanese</SelectItem>
                      <SelectItem value="korean">Korean</SelectItem>
                      <SelectItem value="arabic">Arabic</SelectItem>
                      <SelectItem value="hindi">Hindi</SelectItem>
                      <SelectItem value="russian">Russian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DropdownMenuSeparator />
              <div className="p-2 flex justify-between">
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  Reset
                </Button>
                <Button size="sm" onClick={() => document.body.click()}>
                  Apply
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[180px] border-border/50 hover:border-primary/50 transition-colors duration-200">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="title_asc">Title A-Z</SelectItem>
              <SelectItem value="title_desc">Title Z-A</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="applications">Most Applications</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center rounded-md border border-border/50 hover:border-primary/50 transition-colors duration-200">
            <Button
              variant={view === "table" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-l-none"
              onClick={() => setView("table")}
            >
              Table
            </Button>
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-r-none"
              onClick={() => setView("grid")}
            >
              Grid
            </Button>
          </div>

          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 transition-colors duration-200"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Add Job</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {sortedJobs.length === 0 && !loading ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            {searchQuery || activeFilters > 0 ? "No jobs found matching your criteria." : "No jobs found."}
          </div>
          {(searchQuery || activeFilters > 0) && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSearchQuery("")
                resetFilters()
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <>
          {view === "grid" ? (
            <motion.div
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              variants={container}
              initial="hidden"
              animate="show"
            >
              {sortedJobs.map((job) => (
                <motion.div key={job.id} variants={item}>
                  <Card
                    className="h-full overflow-hidden border-border/60 hover:border-primary/50 hover:shadow-md transition-all duration-300 cursor-pointer hover:scale-[1.02]"
                    onClick={() => handleJobClick(job.id)}
                  >
                    <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{job.title}</CardTitle>
                        <Badge
                          variant={getStatusColor(job.status)}
                          className="transition-colors duration-200 hover:bg-primary/20"
                        >
                          {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                        </Badge>
                      </div>
                      <CardDescription>{job.department || "No Department"}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-4 space-y-2">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="mr-1 h-4 w-4" />
                        {job.location}
                        {job.remote_allowed && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Remote OK
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center text-sm text-muted-foreground">
                        <Briefcase className="mr-1 h-4 w-4" />
                        {getJobTypeLabel(job.job_type)}
                        {job.experience_level && (
                          <span className="ml-2">
                            • {job.experience_level.charAt(0).toUpperCase() + job.experience_level.slice(1)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center text-sm text-muted-foreground">
                        <Globe className="mr-1 h-4 w-4" />
                        {job.language.charAt(0).toUpperCase() + job.language.slice(1)}
                      </div>

                      {job.application_deadline && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="mr-1 h-4 w-4" />
                          Apply by {formatDate(job.application_deadline)}
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground">Posted {formatDate(job.created_at)}</div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="overflow-auto rounded-md border border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="min-w-[150px] font-medium">Job Title</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                    <TableHead className="min-w-[120px]">Location</TableHead>
                    <TableHead className="min-w-[100px]">Type</TableHead>
                    <TableHead className="min-w-[100px]">Language</TableHead>
                    <TableHead className="min-w-[100px]">Posted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedJobs.map((job) => (
                    <TableRow
                      key={job.id}
                      className="hover:bg-muted/30 transition-colors duration-200 cursor-pointer"
                      onClick={() => handleJobClick(job.id)}
                    >
                      <TableCell className="font-medium">{job.title}</TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusColor(job.status)}
                          className="transition-colors duration-200 hover:bg-primary/20"
                        >
                          {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {job.location}
                        {job.remote_allowed && (
                          <Badge variant="outline" className="ml-1 text-xs">
                            Remote
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{getJobTypeLabel(job.job_type)}</TableCell>
                      <TableCell>{job.language.charAt(0).toUpperCase() + job.language.slice(1)}</TableCell>
                      <TableCell>{formatDate(job.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        if (currentPage > 1) {
                          handlePageChange(currentPage - 1)
                        }
                      }}
                      className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>

                  {generatePaginationItems()}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        if (currentPage < totalPages) {
                          handlePageChange(currentPage + 1)
                        }
                      }}
                      className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}

      <CreateJobDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onJobCreated={() => {
          // Reset to first page and refetch when a new job is created
          setCurrentPage(1)
          fetchJobs()
        }}
      />
    </div>
  )
}
