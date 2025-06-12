"use client"

import { useState } from "react"
import { Bot, Phone, CheckCircle, XCircle, MoreVertical, Trash2, Activity } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { assistantsAPI, type AssistantResponse } from "@/lib/api/assistants"

interface AssistantCardProps {
  assistant: AssistantResponse
  onAssistantUpdated: () => void
  onAssistantDeleted: () => void
}

export function AssistantCard({ assistant, onAssistantUpdated, onAssistantDeleted }: AssistantCardProps) {
  const [loading, setLoading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleStatusToggle = async () => {
    setLoading(true)
    try {
      const newStatus = assistant.status === "active" ? "inactive" : "active"
      await assistantsAPI.updateAssistant(assistant.id, { status: newStatus })
      toast.success(`Assistant ${newStatus === "active" ? "activated" : "deactivated"}`)
      onAssistantUpdated()
    } catch (error) {
      console.error("Error updating assistant:", error)
      toast.error("Failed to update assistant status")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      await assistantsAPI.deleteAssistant(assistant.id)
      toast.success("Assistant deleted successfully")
      onAssistantDeleted()
    } catch (error) {
      console.error("Error deleting assistant:", error)
      toast.error("Failed to delete assistant")
    } finally {
      setLoading(false)
      setShowDeleteDialog(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200"
      case "inactive":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getSuccessRate = () => {
    if (assistant.total_calls === 0) return 0
    return Math.round((assistant.successful_calls / assistant.total_calls) * 100)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never"
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bot className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">{assistant.name}</CardTitle>
                {/* <p className="text-sm text-muted-foreground">ID: {assistant.vapi_assistant_id}</p> */}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(assistant.status)}>{assistant.status}</Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" disabled={loading}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleStatusToggle}>
                    {assistant.status === "active" ? (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Activate
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Usage Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                {/* <Phone className="h-4 w-4 text-blue-600" /> */}
                <span className="text-2xl font-bold">{assistant.total_calls}</span>
              </div>
              <p className="text-xs text-muted-foreground">Total Calls</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                {/* <CheckCircle className="h-4 w-4 text-green-600" /> */}
                <span className="text-2xl font-bold">{assistant.successful_calls}</span>
              </div>
              <p className="text-xs text-muted-foreground">Successful</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                {/* <Activity className="h-4 w-4 text-purple-600" /> */}
                <span className="text-2xl font-bold">{getSuccessRate()}%</span>
              </div>
              <p className="text-xs text-muted-foreground">Success Rate</p>
            </div>
          </div>

          {/* Metadata */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span>{formatDate(assistant.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Used:</span>
              <span>{formatDate(assistant.last_used_at)}</span>
            </div>
            {assistant.metadata?.type && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <Badge variant="outline" className="text-xs">
                  {assistant.metadata.type}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assistant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{assistant.name}"? This action cannot be undone and will remove the
              assistant from both your account and the VAPI service.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading} className="bg-red-600 hover:bg-red-700">
              {loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
