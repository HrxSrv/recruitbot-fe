import { baseUrl } from '@/lib/config'


export interface Customer {
  id: string
  company_name: string
  email: string
  subscription_plan: "free" | "starter" | "professional" | "enterprise"
  is_active: boolean
  website?: string
  industry?: string
  company_size?: string
  created_at: string
  updated_at?: string
}

export interface CustomerCreate {
  company_name: string
  email: string
  subscription_plan?: "free" | "starter" | "professional" | "enterprise"
  website?: string
  industry?: string
  company_size?: string
}

export interface CustomerUpdate {
  company_name?: string
  email?: string
  subscription_plan?: "free" | "starter" | "professional" | "enterprise"
  is_active?: boolean
  website?: string
  industry?: string
  company_size?: string
}
class CustomerError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CustomerError"
  }
}
// Get all customers
export async function getCustomers(): Promise<Customer[]> {
  const response = await fetch(`${baseUrl}/customers/`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Failed to fetch customers")
  }

  return response.json()
}

// Get single customer
export async function getCustomer(customerId: string): Promise<Customer> {
  const response = await fetch(`${baseUrl}/customers/${customerId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Failed to fetch customer")
  }

  return response.json()
}

// Create customer
export async function createCustomer(customerData: CustomerCreate): Promise<Customer> {
  const response = await fetch(`${baseUrl}/customers/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(customerData),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || "Failed to create customer")
  }

  return response.json()
}

// Update customer
export async function updateCustomer(customerId: string, customerData: CustomerUpdate): Promise<Customer> {
  const response = await fetch(`${baseUrl}/customers/${customerId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(customerData),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || "Failed to update customer")
  }

  return response.json()
}

// Delete customer
export async function deleteCustomer(customerId: string): Promise<void> {
  const response = await fetch(`${baseUrl}/customers/${customerId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || "Failed to delete customer")
  }
}

export async function getCustomerByEmail(email: string): Promise<Customer | null> {
  try {
    const res = await fetch(`${baseUrl}/customers/by-email/${encodeURIComponent(email)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    })

    if (res.status === 404) {
      return null // Customer not found
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      throw new CustomerError(error.message || "Failed to fetch customer")
    }

    const customer = await res.json()
    return customer
  } catch (error) {
    if (error instanceof CustomerError) {
      throw error
    }
    console.error("Error fetching customer by email:", error)
    throw new CustomerError("Failed to validate customer")
  }
}