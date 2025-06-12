"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Calendar, Phone, FileText, Loader2, CheckCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { scheduleCall, CallType, type ScheduleCallRequest } from "@/lib/api/calls"

interface ScheduleCallDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidateId: string
  candidateName: string
  jobId: string
  jobTitle: string
  onScheduleComplete?: () => void
}

export function ScheduleCallDialog({
  open,
  onOpenChange,
  candidateId,
  candidateName,
  jobId,
  jobTitle,
  onScheduleComplete,
}: ScheduleCallDialogProps) {
  const [loading, setLoading] = useState(false)
  const [scheduledTime, setScheduledTime] = useState("")
  const [callType, setCallType] = useState<CallType>(CallType.SCREENING)
  const [notes, setNotes] = useState("")
  const { toast } = useToast()

  // Get current date and time for min attribute
  const now = new Date()
  const minDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

  const handleScheduleCall = async () => {
    try {
      setLoading(true)

      const request: ScheduleCallRequest = {
        candidate_id: candidateId,
        job_id: jobId,
        call_type: callType,
        ...(scheduledTime && { scheduled_time: new Date(scheduledTime).toISOString() }),
        ...(notes.trim() && { notes: notes.trim() }),
      }

      console.log("Scheduling call with request:", request)

      const response = await scheduleCall(request)

      toast({
        title: "Call Scheduled Successfully!",
        description: `${callType} call scheduled for ${candidateName}`,
      })

      // Reset form
      setScheduledTime("")
      setCallType(CallType.SCREENING)
      setNotes("")

      // Close dialog and notify parent
      onOpenChange(false)
      onScheduleComplete?.()

      console.log("Call scheduled successfully:", response)
    } catch (error) {
      console.error("Error scheduling call:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to schedule call"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      // Reset form when closing
      setScheduledTime("")
      setCallType(CallType.SCREENING)
      setNotes("")
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-blue-600" />
            Schedule Call
          </DialogTitle>
          <DialogDescription>
            Schedule a call with <strong>{candidateName}</strong> for the position <strong>{jobTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6 py-4"
        >
          {/* Call Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="call-type" className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-600" />
              Call Type
            </Label>
            <Select value={callType} onValueChange={(value) => setCallType(value as CallType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select call type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CallType.SCREENING}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    Screening Call
                  </div>
                </SelectItem>
                <SelectItem value={CallType.TECHNICAL}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    Technical Interview
                  </div>
                </SelectItem>
                <SelectItem value={CallType.FINAL}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Final Interview
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Scheduled Time (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="scheduled-time" className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-600" />
              Scheduled Time <span className="text-sm text-gray-500">(Optional)</span>
            </Label>
            <Input
              id="scheduled-time"
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              min={minDateTime}
              className="w-full"
            />
            <p className="text-xs text-gray-500">Leave empty to schedule for 1 hour from now</p>
          </div>

          {/* Notes (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-600" />
              Notes <span className="text-sm text-gray-500">(Optional)</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="Add any scheduling notes or special instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Call Details Summary */}
          <div className="p-4 bg-gray-50 rounded-lg border">
            <h4 className="font-medium text-gray-900 mb-2">Call Summary</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Candidate:</span>
                <span className="font-medium">{candidateName}</span>
              </div>
              <div className="flex justify-between">
                <span>Position:</span>
                <span className="font-medium">{jobTitle}</span>
              </div>
              <div className="flex justify-between">
                <span>Call Type:</span>
                <span className="font-medium capitalize">{callType.replace("_", " ")}</span>
              </div>
              <div className="flex justify-between">
                <span>Time:</span>
                <span className="font-medium">
                  {scheduledTime ? new Date(scheduledTime).toLocaleString() : "1 hour from now"}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleScheduleCall} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Schedule Call
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
