// Bulk Upload API Types and Functions

export interface BulkUploadResponse {
  status: string
  message: string
  bulk_upload_id: string
  total_files: number
  invalid_files: Array<{
    filename: string
    error: string
  }>
  job_title: string
}

export interface BulkUploadStatusResponse {
  bulk_upload_id: string
  job_id: string
  job_title: string
  status: "processing" | "completed" | "completed_with_errors" | "failed" | "pending"
  is_active: boolean
  total_files: number
  processed_files: number
  successful_uploads: number
  failed_uploads: number
  progress_percentage: number
  created_at: string
  updated_at: string
  completed_at?: string
  processing_time_seconds?: number
  error_message?: string
  invalid_files: Array<{
    filename: string
    error: string
  }>
  failed_files: Array<{
    filename: string
    error: string
    failed_at: string
    processing_time_seconds?: number
  }>
  successful_files: Array<{
    filename: string
    file_id: string
    file_path: string
    file_size: number
    processed_at: string
    processing_time_seconds?: number
  }>
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

// Get auth token from localStorage with SSR safety
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null

  try {
    const token = localStorage.getItem("auth_token")
    return token
  } catch (error) {
    console.error("Error accessing localStorage:", error)
    return null
  }
}

// Enhanced fetch with auth
async function fetchWithAuth(url: string, options: RequestInit = {}, timeout = 30000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  const authToken = getAuthToken()

  try {
    const requestOptions: RequestInit = {
      ...options,
      signal: controller.signal,
      headers: {
        ...(!(options.body instanceof FormData) && { "Content-Type": "application/json" }),
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
        ...options.headers,
      },
    }

    const response = await fetch(url, requestOptions)
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

export async function bulkUploadResumes(jobId: string, files: File[]): Promise<BulkUploadResponse> {
  try {
    const formData = new FormData()

    // Append all files
    files.forEach((file) => {
      formData.append("files", file)
    })

    const response = await fetchWithAuth(`${API_BASE_URL}/bulk-upload/bulk-upload-resumes/${jobId}`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.")
      }
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Failed to start bulk upload: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error starting bulk upload:", error)
    throw error
  }
}

export async function getBulkUploadStatus(bulkUploadId: string): Promise<BulkUploadStatusResponse> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/bulk-upload/bulk-upload-status/${bulkUploadId}`)

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.")
      }
      if (response.status === 404) {
        throw new Error("Bulk upload job not found.")
      }
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Failed to get upload status: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error getting bulk upload status:", error)
    throw error
  }
}

export async function listBulkUploadJobs(
  jobId?: string,
  status?: string,
  limit = 50,
  offset = 0,
): Promise<BulkUploadStatusResponse[]> {
  try {
    const params = new URLSearchParams()
    if (jobId) params.append("job_id", jobId)
    if (status) params.append("status", status)
    params.append("limit", limit.toString())
    params.append("offset", offset.toString())

    const response = await fetchWithAuth(`${API_BASE_URL}/bulk-upload/bulk-upload-jobs?${params.toString()}`)

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.")
      }
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Failed to list upload jobs: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error listing bulk upload jobs:", error)
    throw error
  }
}
