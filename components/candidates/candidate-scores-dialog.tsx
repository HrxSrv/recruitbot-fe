"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  MessageSquare,
  Brain,
  Users,
  Calendar,
  Loader2,
} from "lucide-react"
import { getCandidateScores, type CandidateScoresResponse } from "@/lib/api/calls"
import { useToast } from "@/components/ui/use-toast"

interface CandidateScoresDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidateId: string
  candidateName: string
}

export function CandidateScoresDialog({ open, onOpenChange, candidateId, candidateName }: CandidateScoresDialogProps) {
  const [scores, setScores] = useState<CandidateScoresResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open && candidateId) {
      fetchScores()
    }
  }, [open, candidateId])

  const fetchScores = async () => {
    try {
      setLoading(true)
      const response = await getCandidateScores(candidateId)
      setScores(response)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load candidate scores",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number | null) => {
    if (!score) return "text-gray-500"
    if (score >= 80) return "text-emerald-600"
    if (score >= 60) return "text-blue-600"
    if (score >= 40) return "text-amber-600"
    return "text-red-600"
  }

  const getScoreBgColor = (score: number | null) => {
    if (!score) return "bg-gray-100"
    if (score >= 80) return "bg-emerald-50"
    if (score >= 60) return "bg-blue-50"
    if (score >= 40) return "bg-amber-50"
    return "bg-red-50"
  }

  const getTrendIcon = (improving: boolean | null, consistent: boolean | null) => {
    if (improving) return <TrendingUp className="h-4 w-4 text-emerald-600" />
    if (consistent === false) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const scoreCategories = [
    {
      key: "overall_score",
      label: "Overall Performance",
      icon: BarChart3,
      description: "Aggregate performance across all evaluations",
    },
    {
      key: "communication_score",
      label: "Communication",
      icon: MessageSquare,
      description: "Clarity, articulation, and interpersonal skills",
    },
    {
      key: "technical_score",
      label: "Technical Skills",
      icon: Brain,
      description: "Domain expertise and problem-solving abilities",
    },
    {
      key: "cultural_fit_score",
      label: "Cultural Fit",
      icon: Users,
      description: "Alignment with company values and culture",
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Performance Scores
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{candidateName}</p>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : scores ? (
            <div className="space-y-4">
              {/* Summary Stats */}
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-foreground">{scores.summary.total_calls_analyzed}</div>
                      <p className="text-xs text-muted-foreground">Interviews</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-2xl font-bold text-foreground">
                          {scores.scores.overall_score?.average?.toFixed(0) || "N/A"}
                        </span>
                        {scores.summary.score_trend &&
                          getTrendIcon(scores.summary.score_trend.improving, scores.summary.score_trend.consistent)}
                      </div>
                      <p className="text-xs text-muted-foreground">Avg Score</p>
                    </div>
                  </div>

                  {scores.summary.latest_call_date && (
                    <>
                      <Separator className="my-3" />
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Last interview: {formatDate(scores.summary.latest_call_date)}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Score Breakdown */}
              <div className="space-y-3">
                <AnimatePresence>
                  {scoreCategories.map((category, index) => {
                    const scoreData = scores.scores[category.key as keyof typeof scores.scores]
                    const IconComponent = category.icon

                    return (
                      <motion.div
                        key={category.key}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.3 }}
                      >
                        <Card
                          className={`transition-all duration-200 hover:shadow-sm ${
                            scoreData ? getScoreBgColor(scoreData.average) : "bg-gray-50"
                          }`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <IconComponent className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-sm">{category.label}</span>
                              </div>
                              {scoreData && (
                                <Badge variant="secondary" className="text-xs">
                                  {scoreData.count} call{scoreData.count !== 1 ? "s" : ""}
                                </Badge>
                              )}
                            </div>

                            {scoreData ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">Average</span>
                                  <span className={`text-lg font-bold ${getScoreColor(scoreData.average)}`}>
                                    {scoreData.average.toFixed(0)}%
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">Latest</span>
                                  <span className={`text-sm font-medium ${getScoreColor(scoreData.latest)}`}>
                                    {scoreData.latest}%
                                  </span>
                                </div>

                                {/* Progress bar */}
                                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                  <motion.div
                                    className={`h-1.5 rounded-full ${
                                      scoreData.average >= 80
                                        ? "bg-emerald-500"
                                        : scoreData.average >= 60
                                          ? "bg-blue-500"
                                          : scoreData.average >= 40
                                            ? "bg-amber-500"
                                            : "bg-red-500"
                                    }`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${scoreData.average}%` }}
                                    transition={{ delay: index * 0.1 + 0.3, duration: 0.6 }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-2">
                                <span className="text-xs text-muted-foreground">No data available</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>

              {/* Performance Trend */}
              {scores.summary.score_trend && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                  <Card className="bg-muted/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {getTrendIcon(scores.summary.score_trend.improving, scores.summary.score_trend.consistent)}
                        <span className="text-sm font-medium">Performance Trend</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {scores.summary.score_trend.improving
                          ? "Performance is improving over time"
                          : scores.summary.score_trend.consistent === false
                            ? "Performance shows some variation"
                            : "Performance is stable"}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No score data available</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
