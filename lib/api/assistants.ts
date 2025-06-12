const ASSISTANT_API_BASE_URL = "http://localhost:8001"

export interface JobContext {
  job_id: string
  job_title: string
  job_description: string
  requirements: string[]
  questions: Array<{
    question: string
    ideal_answer: string
    weight: number
  }>
  company_name: string
  experience_level: string
}

export interface CreateAssistantRequest {
  customer_id: string
  name: string
  job_context?: JobContext
  metadata?: Record<string, any>
}

export interface UpdateAssistantRequest {
  name?: string
  status?: string
  metadata?: Record<string, any>
}

export interface AssistantResponse {
  id: string
  customer_id: string
  vapi_assistant_id: string
  name: string
  status: string
  total_calls: number
  successful_calls: number
  failed_calls: number
  created_at: string
  last_used_at?: string
  metadata: Record<string, any>
}

export interface ListAssistantsResponse {
  customer_id: string
  assistants: AssistantResponse[]
  count: number
}

class AssistantsAPI {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${ASSISTANT_API_BASE_URL}${endpoint}`

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async createAssistant(data: CreateAssistantRequest): Promise<AssistantResponse> {
    return this.request<AssistantResponse>("/vapi/assistants/create", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async getCustomerAssistant(customerId: string): Promise<AssistantResponse> {
    return this.request<AssistantResponse>(`/vapi/assistants/customer/${customerId}`)
  }

  async getAssistantById(assistantId: string): Promise<AssistantResponse> {
    return this.request<AssistantResponse>(`/vapi/assistants/${assistantId}`)
  }

  async updateAssistant(assistantId: string, data: UpdateAssistantRequest): Promise<AssistantResponse> {
    return this.request<AssistantResponse>(`/vapi/assistants/${assistantId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async deleteAssistant(assistantId: string): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>(`/vapi/assistants/managed/${assistantId}`, {
      method: "DELETE",
    })
  }

  async listCustomerAssistants(customerId: string): Promise<ListAssistantsResponse> {
    return this.request<ListAssistantsResponse>(`/vapi/assistants/customer/${customerId}/list`)
  }
}

export const assistantsAPI = new AssistantsAPI()
