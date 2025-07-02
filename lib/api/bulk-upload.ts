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

export interface DriveJobAnalysis {
  id: any
  job_id: string
  status: "pending" | "processing" | "completed" | "completed_with_errors" | "failed"
  folder_id: string
  folder_name: string
  job_role_id?: string
  customer_id: string
  uploaded_by: string
  total_files: number
  processed_files: number
  successful_uploads: number
  failed_uploads: number
  successful_files: Array<{
    filename: string
    processed_at: string
    processing_time_seconds: number
    candidate_id: string
    s3_url: string
  }>
  failed_files: Array<{
    filename: string
    error: string
    failed_at: string
    processing_time_seconds: number
    candidate_id?: string
    s3_url: string
  }>
  error_message?: string
  created_at: string
  updated_at: string
  completed_at?: string
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

// CSV Upload Types
export interface CSVUploadResponse {
  status: string
  message: string
  total_records: number
  successful_uploads: number
  failed_uploads: number
  duplicate_emails: number
  created_candidates: Array<{
    candidate_id: string
    name: string
    email?: string
    phone: string
    location?: string
    row_number: number
    job_title: string
    applied_to_job: boolean
  }>
  failed_records: Array<{
    row_number: number
    record_data: any
    error: string
    existing_candidate_id?: string
  }>
  duplicate_records: Array<{
    row_number: number
    record_data: any
    error: string
    existing_candidate_id?: string
  }>
  processing_time_seconds: number
  uploaded_by: string
  upload_timestamp: string
}

export async function uploadCSVCandidates(jobId: string, csvFile: File): Promise<CSVUploadResponse> {
  try {
    const formData = new FormData()
    formData.append("csv_file", csvFile)

    const response = await fetchWithAuth(`${API_BASE_URL}/candidates/upload-csv-candidates/${jobId}`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.")
      }
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Failed to upload CSV: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error uploading CSV:", error)
    throw error
  }
}

export function downloadSampleCSV() {
  const csvContent = `name,phone,email,location
John Doe,+1234567890,john.doe@example.com,New York NY
Jane Smith,+1987654321,jane.smith@example.com,Los Angeles CA
Mike Johnson,+1555123456,,Chicago IL
Sarah Wilson,+1444987654,sarah.wilson@example.com,`

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.setAttribute("href", url)
  link.setAttribute("download", "sample_candidates.csv")
  link.style.visibility = "hidden"

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}


export interface DriveUploadRequest {
  folder_id: string
  folder_name: string
  access_token: string
  job_id: string
}

export interface DriveUploadResponse {
  job_id: string
  message: string
  files_found: Array<{
    name: string
    id: string
  }>
}

export interface DriveJobStatus {
  job_id: string
  status: "pending" | "processing" | "completed" | "completed_with_errors" | "failed"
  folder_name: string
  total_files: number
  processed_files: number
  successful_uploads: number
  failed_uploads: number
  completion_percentage: number
  latest_processed_file?: string
  created_at: string
  updated_at: string
  error_message?: string
}

export interface UserDriveJobsResponse {
  jobs: Array<{
    job_id: string
    folder_name: string
    status: "pending" | "processing" | "completed" | "completed_with_errors" | "failed"
    completion_percentage: number
    processed_files: number
    total_files: number
    latest_processed_file?: string
    created_at: string
  }>
}

// Upload from Google Drive
export const uploadFromGoogleDrive = async (
  data: DriveUploadRequest,
  userId: string,
  customerId: string
): Promise<DriveUploadResponse> => {
  console.log(typeof(customerId))
  console.log(typeof(userId))
  const response = await fetchWithAuth(`${API_BASE_URL}/drive/process-drive-folder`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      access_token: data.access_token,
      folder_id: data.folder_id,
      folder_name: data.folder_name,
      job_id: data.job_id,
      customer_id: customerId, // Now passed as parameter
      uploaded_by_user_id: userId, // Now passed as parameter
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || `Google Drive upload failed: ${response.status}`)
  }

  return response.json()
}

// Get drive job status
export const getDriveJobStatus = async (jobId: string): Promise<DriveJobStatus> => {
  const response = await fetchWithAuth(`${API_BASE_URL}/drive/job-status/${jobId}`)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || `Failed to get job status: ${response.status}`)
  }

  return response.json()
}

// Get user's drive jobs
export const getUserDriveJobs = async (userId: string): Promise<UserDriveJobsResponse> => {
  const response = await fetchWithAuth(`${API_BASE_URL}/drive/user-jobs/${userId}`)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || `Failed to get user jobs: ${response.status}`)
  }

  return response.json()
}


export async function getJobAnalysis(jobId: string): Promise<DriveJobAnalysis> {
  const response = await fetchWithAuth(`${API_BASE_URL}/drive/job-status/${jobId}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || "Failed to get job analysis")
  }

  return response.json()
}
