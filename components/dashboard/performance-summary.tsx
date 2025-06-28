"use client"

import type React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { Progress } from "@/components/ui/progress"
import type { DashboardMetrics } from "@/lib/api/dashboard"

interface PerformanceSummaryProps {
  metrics: DashboardMetrics
  qualifiedThreshold: number
  isLoading?: boolean
}

export function PerformanceSummary({ metrics, qualifiedThreshold, isLoading }: PerformanceSummaryProps) {
  // Calculate conversion rate
  const conversionRate =
    metrics.applications_processed > 0 ? (metrics.qualified_applications / metrics.applications_processed) * 100 : 0

  // Calculate other metrics
  const callsPerJob = metrics.jobs_count > 0 ? metrics.calls_made / metrics.jobs_count : 0
  const applicationsPerJob = metrics.jobs_count > 0 ? metrics.applications_processed / metrics.jobs_count : 0

  // Gauge chart data for conversion rate
  const gaugeData = [
    { name: "Conversion", value: conversionRate, fill: "#1e40af" }, // blue-700
    { name: "Remaining", value: 100 - conversionRate, fill: "#e5e7eb" }, // gray-200
  ]

  // Custom gauge chart component
  const GaugeChart = () => (
    <div className="relative">
      {/* <ResponsiveContainer width="100%" height={120}>
        <PieChart>
          <Pie
            data={gaugeData}
            cx="50%"
            cy="50%"
            startAngle={180}
            endAngle={0}
            innerRadius={40}
            outerRadius={60}
            dataKey="value"
          >
            {gaugeData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer> */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center mt-4">
          <div className="text-2xl font-bold text-blue-700">{conversionRate.toFixed(1)}%</div>
          <div className="text-xs text-gray-500">Conversion</div>
        </div>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <Card className="animate-pulse border-gray-200">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-32"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-4 bg-gray-200 rounded w-12"></div>
                  </div>
                  <div className="h-2 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Performance Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Conversion Rate Gauge */}
        <div className="text-center">
          <GaugeChart />
          <p className="text-sm text-gray-500 mt-2">Target: {qualifiedThreshold}%</p>
        </div>

        {/* Supporting Metrics */}
        <div className="space-y-4">
          {/* Calls per Job */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Calls per Job</span>
              <span className="text-sm font-semibold text-gray-900">{callsPerJob.toFixed(1)}</span>
            </div>
            <Progress
              value={Math.min((callsPerJob / 10) * 100, 100)}
              className="h-2 bg-blue-50"
              style={
                {
                  "--progress-background": "#dbeafe",
                  "--progress-foreground": "#3b82f6",
                } as React.CSSProperties
              }
            />
          </div>

          {/* Applications per Job */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Applications per Job</span>
              <span className="text-sm font-semibold text-gray-900">{applicationsPerJob.toFixed(1)}</span>
            </div>
            <Progress
              value={Math.min((applicationsPerJob / 50) * 100, 100)}
              className="h-2 bg-blue-50"
              style={
                {
                  "--progress-background": "#dbeafe",
                  "--progress-foreground": "#60a5fa",
                } as React.CSSProperties
              }
            />
          </div>

          {/* Qualified Threshold Reference */}
          <div className="pt-2 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Qualified Threshold</span>
              <span className="text-sm font-semibold text-blue-600">{qualifiedThreshold}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
