export interface PersonalInfo {
  name: string
  email: string
  phone?: string
  location?: string
}

export interface ResumeAnalysis {
  skills: string[]
  experience_years: number
  education?: string
  previous_roles: string[]
  matching_score: number
  analysis_summary: string
  resume_file_path?: string
}

export interface QuestionAnswer {
  question: string
  answer: string
  ideal_answer?: string
  score?: number
  analysis?: string
}

export interface CallQA {
  call_id?: string
  call_date?: string
  questions_answers: QuestionAnswer[]
  overall_score?: number
  interview_summary?: string
  call_duration_minutes?: number
}

export interface JobApplication {
  job_id: string
  application_date: string
  status: "applied" | "screening" | "interview" | "rejected" | "hired"
  matching_score: number
  notes?: string
  call_qa?: CallQA
}

export interface Candidate {
  id: string
  personal_info: PersonalInfo
  resume_analysis: ResumeAnalysis
  applications: JobApplication[]
  total_applications: number
  status: "active" | "hired" | "inactive"
  created_at?: string
}

export interface CandidateListResponse {
  candidates: Candidate[]
  total: number
  page: number
  per_page: number
  has_next: boolean
}

export interface FileMetadata {
  candidate_id: string
  file_path: string
  file_type: string
  file_size_bytes: number
  original_filename: string
  upload_date: string
  extraction_method?: string
}

export interface StatusUpdateResponse {
  candidate_id: string
  old_status: string
  new_status: string
  updated_by: string
  timestamp: string
  notes?: string
}

export interface UploadResponse {
  message: string
  candidate_id?: string
  job_application_id?: string
  status: string
}

export interface CandidateUploadData {
  name?: string
  email?: string
  phone?: string
  location?: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

// Get auth token from localStorage with SSR safety
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null // SSR check
  
  try {
    const token = localStorage.getItem("auth_token")
    return token
  } catch (error) {
    console.error("Error accessing localStorage:", error)
    return null
  }
}

// Check if token is expired
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const currentTime = Math.floor(Date.now() / 1000)
    return payload.exp < currentTime
  } catch (error) {
    console.error("Error parsing token:", error)
    return true
  }
}

// Enhanced fetch with auth and timeout
async function fetchWithAuth(url: string, options: RequestInit = {}, timeout = 10000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  // Get auth token from localStorage
  const authToken = getAuthToken()

  // Debug logging
  console.log("=== Candidates API Request Debug ===")
  console.log("URL:", url)
  console.log("Auth token found:", !!authToken)
  
  if (authToken) {
    console.log("Auth token value:", `${authToken.substring(0, 10)}...`)
    console.log("Token expired:", isTokenExpired(authToken))
  }

  try {
    const requestOptions: RequestInit = {
      ...options,
      signal: controller.signal,
      headers: {
        // Only set Content-Type if it's not FormData (for file uploads)
        ...(!(options.body instanceof FormData) && { "Content-Type": "application/json" }),
        // Set Authorization header with Bearer token
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
        ...options.headers,
      },
    }

    console.log("Request headers:", requestOptions.headers)

    const response = await fetch(url, requestOptions)

    console.log("Response status:", response.status)
    console.log("Response headers:", Object.fromEntries(response.headers.entries()))

    // Handle token expiration
    if (response.status === 401 && authToken) {
      console.warn("Token may be expired, clearing localStorage")
      localStorage.removeItem("auth_token")
      // Optionally clear refresh token if you have one
      localStorage.removeItem("refresh_token")
    }

    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    console.error("Candidates API fetch error:", error)
    throw error
  }
}

// Refresh token function
async function refreshTokenIfNeeded(): Promise<boolean> {
  const refreshToken = localStorage.getItem("refresh_token")
  
  if (!refreshToken) {
    console.log("No refresh token available")
    return false
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Refresh-Token": refreshToken,
      },
    })

    if (response.ok) {
      const data = await response.json()
      localStorage.setItem("auth_token", data.auth_token)
      console.log("Token refreshed successfully")
      return true
    } else {
      console.warn("Token refresh failed")
      // Clear invalid refresh token
      localStorage.removeItem("refresh_token")
      localStorage.removeItem("auth_token")
      return false
    }
  } catch (error) {
    console.error("Error refreshing token:", error)
    return false
  }
}

// Enhanced fetch with automatic token refresh
async function fetchWithAutoRefresh(url: string, options: RequestInit = {}, timeout = 10000) {
  let response = await fetchWithAuth(url, options, timeout)
  
  // If unauthorized and we have a refresh token, try to refresh
  if (response.status === 401) {
    const refreshed = await refreshTokenIfNeeded()
    if (refreshed) {
      // Retry the original request with new token
      response = await fetchWithAuth(url, options, timeout)
    }
  }
  
  return response
}

// Candidates API Functions
export async function listCandidates(
  params: {
    skip?: number
    limit?: number
    status_filter?: string
    job_id_filter?: string
  } = {},
): Promise<CandidateListResponse> {
  try {
    const searchParams = new URLSearchParams()

    if (params.skip !== undefined) searchParams.set("skip", params.skip.toString())
    if (params.limit !== undefined) searchParams.set("limit", params.limit.toString())
    if (params.status_filter) searchParams.set("status_filter", params.status_filter)
    if (params.job_id_filter) searchParams.set("job_id_filter", params.job_id_filter)

    const queryString = searchParams.toString()
    const endpoint = queryString ? `/?${queryString}` : "/"

    const response = await fetchWithAutoRefresh(`${API_BASE_URL}/candidates${endpoint}`)

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.")
      }
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Failed to fetch candidates: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching candidates:", error)
    throw error
  }
}

export async function getCandidate(candidateId: string): Promise<Candidate> {
  try {
    const response = await fetchWithAutoRefresh(`${API_BASE_URL}/candidates/${candidateId}`)

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.")
      }
      if (response.status === 404) {
        throw new Error("Candidate not found.")
      }
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Failed to fetch candidate: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching candidate:", error)
    throw error
  }
}

export async function updateCandidateStatus(
  candidateId: string, 
  newStatus: string, 
  notes?: string
): Promise<StatusUpdateResponse> {
  try {
    const body = new URLSearchParams()
    body.set("new_status", newStatus)
    if (notes) body.set("notes", notes)

    const response = await fetchWithAutoRefresh(`${API_BASE_URL}/candidates/${candidateId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.")
      }
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Failed to update candidate status: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error updating candidate status:", error)
    throw error
  }
}

export async function deleteCandidateFiles(candidateId: string): Promise<{ status: string; message: string }> {
  try {
    const response = await fetchWithAutoRefresh(`${API_BASE_URL}/candidates/files/${candidateId}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.")
      }
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Failed to delete candidate files: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error deleting candidate files:", error)
    throw error
  }
}

export async function getFileMetadata(candidateId: string): Promise<FileMetadata> {
  try {
    const response = await fetchWithAutoRefresh(`${API_BASE_URL}/candidates/files/${candidateId}/metadata`)

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.")
      }
      if (response.status === 404) {
        throw new Error("File metadata not found.")
      }
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Failed to fetch file metadata: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching file metadata:", error)
    throw error
  }
}

export async function downloadResume(candidateId: string): Promise<Blob> {
  try {
    const candidate = await getCandidate(candidateId)
    const filePath = candidate.resume_analysis.resume_file_path

    if (!filePath) {
      throw new Error("No resume file available for this candidate")
    }

    // Use the enhanced fetch for file download
    const response = await fetchWithAutoRefresh(
      `${API_BASE_URL}/files/download?path=${encodeURIComponent(filePath)}`
    )

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.")
      }
      if (response.status === 404) {
        throw new Error("Resume file not found.")
      }
      throw new Error("Failed to download resume")
    }

    return response.blob()
  } catch (error) {
    console.error("Error downloading resume:", error)
    throw error
  }
}

export async function associateCandidateWithJob(candidateId: string, jobId: string): Promise<any> {
  const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/candidates/${candidateId}/associate-job/${jobId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.detail || "Failed to associate candidate with job")
  }

  return response.json()
}

// Upload Functions
export async function uploadResumeGeneral(
  resumeFile: File,
  candidateData?: CandidateUploadData
): Promise<UploadResponse> {
  try {
    const formData = new FormData()
    formData.append("resume", resumeFile)

    // Only append non-empty values
    if (candidateData?.name?.trim()) {
      formData.append("candidate_name", candidateData.name.trim())
    }
    if (candidateData?.email?.trim()) {
      formData.append("candidate_email", candidateData.email.trim())
    }
    if (candidateData?.phone?.trim()) {
      formData.append("candidate_phone", candidateData.phone.trim())
    }
    if (candidateData?.location?.trim()) {
      formData.append("candidate_location", candidateData.location.trim())
    }

    const response = await fetchWithAutoRefresh(`${API_BASE_URL}/candidates/upload-resume`, {
      method: "POST",
      body: formData,
      // Note: Don't set Content-Type header for FormData, browser will set it automatically with boundary
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.")
      }
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Failed to upload resume: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error uploading resume:", error)
    throw error
  }
}

export async function uploadResumeForJob(
  jobId: string,
  resumeFile: File,
  candidateData?: CandidateUploadData
): Promise<UploadResponse> {
  try {
    const formData = new FormData()
    formData.append("resume", resumeFile)

    // Only append non-empty values
    if (candidateData?.name?.trim()) {
      formData.append("candidate_name", candidateData.name.trim())
    }
    if (candidateData?.email?.trim()) {
      formData.append("candidate_email", candidateData.email.trim())
    }
    if (candidateData?.phone?.trim()) {
      formData.append("candidate_phone", candidateData.phone.trim())
    }
    if (candidateData?.location?.trim()) {
      formData.append("candidate_location", candidateData.location.trim())
    }

    const response = await fetchWithAutoRefresh(`${API_BASE_URL}/candidates/upload-resume-for-job/${jobId}`, {
      method: "POST",
      body: formData,
      // Note: Don't set Content-Type header for FormData, browser will set it automatically with boundary
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.")
      }
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Failed to upload resume for job: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error uploading resume for job:", error)
    throw error
  }
}

export async function analyzeResume(candidateId: string, jobId?: string): Promise<any> {
  try {
    const requestBody = new URLSearchParams()
    if (jobId) {
      requestBody.append("job_id", jobId)
    }
    requestBody.append("force_vision", "false")

    const response = await fetchWithAutoRefresh(`${API_BASE_URL}/candidates/analyze-resume/${candidateId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: requestBody.toString(),
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.")
      }
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Failed to analyze resume: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error analyzing resume:", error)
    throw error
  }
}