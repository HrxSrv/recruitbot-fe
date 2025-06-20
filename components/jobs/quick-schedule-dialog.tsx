"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Calendar, Clock, PhoneCall, Loader2, Users } from "lucide-react"

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"
import { quickScheduleCalls, type QuickScheduleRequest } from "@/lib/api/calls"

interface QuickScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  jobTitle: string
  onScheduleComplete?: () => void
}

export function QuickScheduleDialog({
  open,
  onOpenChange,
  jobId,
  jobTitle,
  onScheduleComplete,
}: QuickScheduleDialogProps) {
  const [loading, setLoading] = useState(false)
  const [scheduleType, setScheduleType] = useState<"preferred" | "custom">("preferred")
  const [customDateTime, setCustomDateTime] = useState("")
  const { toast } = useToast()

  // Get current date and time for min attribute
  const now = new Date()
  const minDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

  const handleQuickSchedule = async () => {
    try {
      setLoading(true)

      let request: QuickScheduleRequest | undefined = undefined

      if (scheduleType === "custom" && customDateTime) {
        request = {
          scheduled_time: new Date(customDateTime).toISOString(),
        }
      }

      const result = await quickScheduleCalls(jobId, request)

      if (result.scheduling_summary.newly_scheduled > 0) {
        toast({
          title: "Calls Scheduled",
          description: `${result.scheduling_summary.newly_scheduled} calls scheduled successfully`,
        })
      } else if (result.scheduling_summary.already_scheduled > 0) {
        toast({
          title: "No Action Needed",
          description: "All candidates already have scheduled calls",
        })
      } else {
        toast({
          title: "No Candidates",
          description: "No candidates have applied yet",
        })
      }

      setScheduleType("preferred")
      setCustomDateTime("")
      onOpenChange(false)
      onScheduleComplete?.()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to schedule calls"
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
      setScheduleType("preferred")
      setCustomDateTime("")
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px] max-h-[90vh]">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <PhoneCall className="h-4 w-4" />
            Schedule Calls
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Schedule calls for all candidates applied to {jobTitle}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* Schedule Type Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Timing</Label>
              <RadioGroup value={scheduleType} onValueChange={(value) => setScheduleType(value as any)}>
                <div className="flex items-center space-x-3 p-3 rounded-md border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="preferred" id="preferred" />
                  <Label htmlFor="preferred" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">Preferred Time</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">At company default time</p>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-md border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">Custom Time</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Choose specific date and time</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Custom DateTime Input */}
            {scheduleType === "custom" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-2"
              >
                <Label htmlFor="custom-datetime" className="text-sm font-medium">
                  Date & Time
                </Label>
                <Input
                  id="custom-datetime"
                  type="datetime-local"
                  value={customDateTime}
                  onChange={(e) => setCustomDateTime(e.target.value)}
                  min={minDateTime}
                  className="w-full"
                />
              </motion.div>
            )}

            {/* Summary */}
            <div className="p-3 bg-muted/30 rounded-md border">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium">Summary</span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Job:</span>
                  <span className="font-medium text-foreground">{jobTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span className="font-medium text-foreground">
                    {scheduleType === "preferred" ? "Preferred" : "Custom"}
                  </span>
                </div>
                {scheduleType === "custom" && customDateTime && (
                  <div className="flex justify-between">
                    <span>Time:</span>
                    <span className="font-medium text-foreground">
                      {new Date(customDateTime).toLocaleDateString()} at{" "}
                      {new Date(customDateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Note */}
            <p className="text-xs text-muted-foreground">
              Schedules calls for candidates without existing appointments only.
            </p>
          </motion.div>
        </ScrollArea>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={handleClose} disabled={loading} size="sm">
            Cancel
          </Button>
          <Button
            onClick={handleQuickSchedule}
            disabled={loading || (scheduleType === "custom" && !customDateTime)}
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                Scheduling...
              </>
            ) : (
              "Schedule Calls"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
