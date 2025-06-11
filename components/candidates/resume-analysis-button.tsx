"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Brain } from "lucide-react"
import { analyzeResume } from "@/lib/api/candidates"

interface ResumeAnalysisButtonProps {
  candidateId: string
  jobId?: string
  onAnalysisComplete: () => void
}

export function ResumeAnalysisButton({ candidateId, jobId, onAnalysisComplete }: ResumeAnalysisButtonProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const { toast } = useToast()

  const handleAnalyzeResume = async () => {
    try {
      setIsAnalyzing(true)
      
      const result = await analyzeResume(candidateId, jobId)

      toast({
        title: "Analysis Complete",
        description: "Resume has been successfully analyzed using VLM technology.",
      })

      // Call the callback to refresh the candidate data
      onAnalysisComplete()
    } catch (error) {
      console.error("Resume analysis error:", error)
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze resume. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <Button
      onClick={handleAnalyzeResume}
      disabled={isAnalyzing}
      size="sm"
      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
    >
      {isAnalyzing ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin mr-2" />
          Analyzing...
        </>
      ) : (
        <>
          <Brain className="h-3 w-3 mr-2" />
          Run Analysis
        </>
      )}
    </Button>
  )
}