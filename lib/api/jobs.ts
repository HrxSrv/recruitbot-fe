export interface SalaryRange {
  min_salary?: number | null
  max_salary?: number | null
  currency: string
}

export interface JobQuestion {
  question: string
  ideal_answer: string
  weight: number
}

export interface Job {
  id: string
  customer_id: string
  created_by: string
  title: string
  description: string
  requirements: string[]
  location: string
  questions: JobQuestion[]
  salary_range?: SalaryRange | null
  job_type: "full_time" | "part_time" | "contract" | "internship"
  status: "draft" | "active" | "paused" | "closed"
  department?: string | null
  experience_level?: string | null
  remote_allowed: boolean
  application_deadline?: string | null
  view_count: number
  application_count: number
  created_at: string
  updated_at?: string | null
}

export interface CreateJobData {
  title: string
  description: string
  requirements: string[]
  location: string
  questions: JobQuestion[]
  salary_range?: SalaryRange | null
  job_type: "full_time" | "part_time" | "contract" | "internship"
  status: "draft" | "active" | "paused" | "closed"
  department?: string | null
  experience_level?: string | null
  remote_allowed: boolean
  application_deadline?: string | null
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

// Helper function for API requests with timeout and authentication
async function fetchWithAuth(url: string, options: RequestInit = {}, timeout = 10000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      credentials: "include", // This ensures cookies are sent
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

export async function getJobs(): Promise<Job[]> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/jobs/`)

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.")
      }
      throw new Error(`Failed to fetch jobs: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching jobs:", error)
    throw error
  }
}

export async function getJob(id: string): Promise<Job> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/jobs/${id}`)

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.")
      }
      if (response.status === 404) {
        throw new Error("Job not found.")
      }
      throw new Error(`Failed to fetch job: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching job:", error)
    throw error
  }
}

export async function createJob(jobData: CreateJobData): Promise<Job> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/jobs/`, {
      method: "POST",
      body: JSON.stringify(jobData),
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.")
      }
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Failed to create job: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error creating job:", error)
    throw error
  }
}

export async function updateJob(id: string, jobData: Partial<CreateJobData>): Promise<Job> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/jobs/${id}`, {
      method: "PUT",
      body: JSON.stringify(jobData),
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.")
      }
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Failed to update job: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error updating job:", error)
    throw error
  }
}

export async function deleteJob(id: string): Promise<void> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/jobs/${id}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.")
      }
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Failed to delete job: ${response.statusText}`)
    }
  } catch (error) {
    console.error("Error deleting job:", error)
    throw error
  }
}
