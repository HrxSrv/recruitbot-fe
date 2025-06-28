"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"
import type { DashboardFunnel } from "@/lib/api/dashboard"

interface FunnelChartProps {
  funnel: DashboardFunnel
  isLoading?: boolean
}

export function FunnelChart({ funnel, isLoading }: FunnelChartProps) {
  const total = funnel.high + funnel.medium + funnel.low

  const funnelData = [
    {
      label: "High Score (>80)",
      value: funnel.high,
      percentage: total > 0 ? (funnel.high / total) * 100 : 0,
      color: "#1e40af", // blue-700
      width: 100, // Full width for top
    },
    {
      label: "Medium Score (60-80)",
      value: funnel.medium,
      percentage: total > 0 ? (funnel.medium / total) * 100 : 0,
      color: "#3b82f6", // blue-500
      width: 75, // 75% width for middle
    },
    {
      label: "Low Score (<60)",
      value: funnel.low,
      percentage: total > 0 ? (funnel.low / total) * 100 : 0,
      color: "#93c5fd", // blue-300
      width: 50, // 50% width for bottom
    },
  ]

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-32"></div>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Candidate Score Distribution</CardTitle>
        <p className="text-sm text-gray-500">{total} total candidates evaluated</p>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p>No candidate data available</p>
          </div>
        ) : (
          <div className="relative h-64 flex flex-col items-center justify-center space-y-2">
            {funnelData.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.2, duration: 0.5 }}
                className="relative flex flex-col items-center"
              >
                {/* Funnel Section */}
                <div
                  className="relative flex items-center justify-center text-white font-medium text-sm"
                  style={{
                    width: `${item.width * 2.4}px`,
                    height: "60px",
                    backgroundColor: item.color,
                    clipPath:
                      index === 0
                        ? "polygon(0 0, 100% 0, 90% 100%, 10% 100%)" // Top trapezoid
                        : index === 1
                          ? "polygon(10% 0, 90% 0, 80% 100%, 20% 100%)" // Middle trapezoid
                          : "polygon(20% 0, 80% 0, 70% 100%, 30% 100%)", // Bottom trapezoid
                  }}
                >
                  <div className="text-center">
                    <div className="font-semibold">{item.value}</div>
                    <div className="text-xs opacity-90">{item.percentage.toFixed(1)}%</div>
                  </div>
                </div>

                {/* Label */}
                <div className="mt-2 text-center">
                  <div className="text-sm font-medium text-gray-700">{item.label}</div>
                </div>
              </motion.div>
            ))}

            {/* Connecting Lines */}
            <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%" style={{ zIndex: -1 }}>
              <defs>
                <linearGradient id="funnelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1e40af" stopOpacity="0.1" />
                  <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.1" />
                </linearGradient>
              </defs>

              {/* Background funnel shape */}
              <path
                d="M 120 40 L 180 40 L 165 100 L 135 100 L 150 160 L 90 160 Z"
                fill="url(#funnelGradient)"
                stroke="#e5e7eb"
                strokeWidth="1"
                opacity="0.3"
              />
            </svg>
          </div>
        )}
      </CardContent>
    </Card>
  )
}