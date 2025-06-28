"use client"
import { useState, useEffect } from "react"
import { BriefcaseIcon, RefreshCw } from "lucide-react"
import { motion } from "framer-motion"
import { ArrowUp } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MetricsCards } from "@/components/dashboard/metrics-cards"
import { FunnelChart } from "@/components/dashboard/funnel-chart"
import { DateRangePicker } from "@/components/dashboard/date-range-picker"
import { getDashboardAnalytics, invalidateAnalyticsCache, type DashboardResponse } from "@/lib/api/dashboard"
import { format, subDays } from "date-fns"

// Interview type definition
type Interview = {
  id: string
  name: string
  role: string
  time: string
  date: string
  type: string
  round: string
  avatar: string
}

export default function DashboardPage() {
  const { toast } = useToast()
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30))
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [qualifiedThreshold, setQualifiedThreshold] = useState(75)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newInterviews, setNewInterviews] = useState<Interview[]>([])
  const [formData, setFormData] = useState({
    candidateName: "",
    position: "frontend",
    date: new Date().toISOString().split("T")[0],
    time: "14:00",
    type: "technical",
  })

  const [showApplications, setShowApplications] = useState(true)
  const [showShortlisted, setShowShortlisted] = useState(true)
  const [showRejected, setShowRejected] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState("all")
  const [notes, setNotes] = useState([
    {
      id: 1,
      date: "July 15, 2025",
      content: "Applications increased by 15% this month compared to June.",
    },
    {
      id: 2,
      date: "July 10, 2025",
      content: "Rejection rate is higher for backend positions. Need to review requirements.",
    },
    {
      id: 3,
      date: "July 5, 2025",
      content: "Shortlisting process improved after implementing new screening questions.",
    },
  ])
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false)
  const [newNote, setNewNote] = useState("")

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleAddNote = () => {
    if (!newNote.trim()) return

    const today = new Date()
    const formattedDate = today.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })

    const newNoteObj = {
      id: Date.now(),
      date: formattedDate,
      content: newNote.trim(),
    }

    setNotes([newNoteObj, ...notes])
    setNewNote("")
    setIsNoteDialogOpen(false)

    toast({
      title: "Note Added",
      description: "Your note has been added successfully.",
    })
  }

  const fetchDashboardData = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true)

      const startDateStr = startDate ? format(startDate, "yyyy-MM-dd'T'HH:mm:ss'Z'") : undefined
      const endDateStr = endDate ? format(endDate, "yyyy-MM-dd'T'HH:mm:ss'Z'") : undefined

      const data = await getDashboardAnalytics(startDateStr, endDateStr, qualifiedThreshold)
      setDashboardData(data)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await invalidateAnalyticsCache()
      await fetchDashboardData(false)
      toast({
        title: "Success",
        description: "Dashboard data refreshed successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh dashboard data.",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleDateRangeChange = (newStartDate: Date | undefined, newEndDate: Date | undefined) => {
    if (newStartDate) setStartDate(newStartDate)
    if (newEndDate) setEndDate(newEndDate)
  }

  useEffect(() => {
    fetchDashboardData()
  }, [startDate, endDate, qualifiedThreshold])

  const formatDateRange = () => {
    if (dashboardData?.date_range) {
      const start = new Date(dashboardData.date_range.start_date)
      const end = new Date(dashboardData.date_range.end_date)
      return `${format(start, "MMM dd, yyyy")} - ${format(end, "MMM dd, yyyy")}`
    }
    return "Loading..."
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">{isLoading ? "Loading..." : formatDateRange()}</p>
        </div>

        <div className="flex items-center gap-3">
          <DateRangePicker startDate={startDate} endDate={endDate} onDateRangeChange={handleDateRangeChange} />
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
            className="gap-2 bg-transparent"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <MetricsCards
        metrics={
          dashboardData?.metrics || {
            jobs_count: 0,
            applications_processed: 0,
            calls_made: 0,
            qualified_applications: 0,
          }
        }
        isLoading={isLoading}
      />

      {/* Charts Section */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Funnel Chart */}
        <FunnelChart funnel={dashboardData?.funnel || { high: 0, medium: 0, low: 0 }} isLoading={isLoading} />

        {/* Additional Stats Card */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Conversion Rate</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {dashboardData?.metrics.applications_processed > 0
                      ? (
                          (dashboardData.metrics.qualified_applications /
                            dashboardData.metrics.applications_processed) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Calls per Job</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {dashboardData?.metrics.jobs_count > 0
                      ? (dashboardData.metrics.calls_made / dashboardData.metrics.jobs_count).toFixed(1)
                      : 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Applications per Job</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {dashboardData?.metrics.jobs_count > 0
                      ? (dashboardData.metrics.applications_processed / dashboardData.metrics.jobs_count).toFixed(1)
                      : 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Qualification Threshold</span>
                  <span className="text-sm font-semibold text-blue-600">{qualifiedThreshold}%</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>



      {/* Interview Section */}
      {/* <motion.div
        className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {dashboardData?.interviews?.map((interview, index) => (
          <motion.div key={index} variants={item}>
            <Card className="h-full glass-card glass-card-hover overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="text-sm font-medium">{interview.name}</CardTitle>
                <div className={`bg-blue-500 rounded-full p-2 text-white backdrop-blur-sm shadow-sm`}>
                  <BriefcaseIcon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-bold">{interview.role}</div>
                  <div
                    className={`flex items-center gap-1 text-xs font-medium glass-badge px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600`}
                  >
                    <ArrowUp className="h-3 w-3" />
                    <span>{interview.time}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground">{interview.date}</p>
                  <p className="text-xs text-muted-foreground">{interview.type}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div> */}
    </div>
  )
}
