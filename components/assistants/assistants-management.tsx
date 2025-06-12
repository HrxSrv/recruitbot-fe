"use client"

import { useState, useEffect } from "react"
import { Bot, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { CreateAssistantDialog } from "./create-assistant-dialog"
import { AssistantCard } from "./assistant-card"
import { assistantsAPI, type AssistantResponse } from "@/lib/api/assistants"
import { useAuth } from "@/lib/context/auth-context"

export function AssistantsManagement() {
  const [assistants, setAssistants] = useState<AssistantResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const user = useAuth()
  // Mock customer ID - in real app, get from auth context
  const customerId = user.user?.customer?.id || "mock-customer-id"
  console.log("Customer ID:", customerId)
  const fetchAssistants = async (showRefreshLoader = false) => {
    if (showRefreshLoader) setRefreshing(true)
    else setLoading(true)

    try {
      const response = await assistantsAPI.listCustomerAssistants(customerId)
      setAssistants(response.assistants)
    } catch (error) {
      console.error("Error fetching assistants:", error)
      toast.error("Failed to load assistants")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAssistants()
  }, [])

  const handleRefresh = () => {
    fetchAssistants(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading assistants...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Manage your AI interview assistants. Create specialized assistants for different roles or use generic ones
            for general screening.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <CreateAssistantDialog customerId={customerId} onAssistantCreated={() => fetchAssistants()} />
        </div>
      </div>

      {/* Assistants Grid */}
      {assistants.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Bot className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium mb-2">No assistants yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first AI interview assistant to start conducting automated interviews.
          </p>
          <CreateAssistantDialog customerId={customerId} onAssistantCreated={() => fetchAssistants()} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assistants.map((assistant) => (
            <AssistantCard
              key={assistant.id}
              assistant={assistant}
              onAssistantUpdated={() => fetchAssistants()}
              onAssistantDeleted={() => fetchAssistants()}
            />
          ))}
        </div>
      )}
    </div>
  )
}
