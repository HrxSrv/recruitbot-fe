// Google Drive Picker utilities using modern Google Identity Services

declare global {
  interface Window {
    google: any
    gapi: any
  }
}

export interface GoogleDriveFile {
  id: string
  name: string
  mimeType: string
  parents?: string[]
}

export interface DrivePickerResult {
  folderId: string
  folderName: string
  accessToken: string
}

// Load Google Identity Services and Picker API
export const loadGoogleAPIs = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Google APIs can only be loaded in browser environment"))
      return
    }

    // Check if already loaded
    if (window.google?.accounts && window.gapi) {
      resolve()
      return
    }

    let scriptsLoaded = 0
    const totalScripts = 2

    const checkAllLoaded = () => {
      scriptsLoaded++
      if (scriptsLoaded === totalScripts) {
        resolve()
      }
    }

    // Load Google Identity Services (GSI)
    const gsiScript = document.createElement("script")
    gsiScript.src = "https://accounts.google.com/gsi/client"
    gsiScript.onload = checkAllLoaded
    gsiScript.onerror = () => reject(new Error("Failed to load Google Identity Services"))
    document.head.appendChild(gsiScript)

    // Load Google API and Picker
    const gapiScript = document.createElement("script")
    gapiScript.src = "https://apis.google.com/js/api.js"
    gapiScript.onload = () => {
      // Load Picker after gapi is loaded
      window.gapi.load("picker", {
        callback: checkAllLoaded,
        onerror: () => reject(new Error("Failed to load Google Picker API")),
      })
    }
    gapiScript.onerror = () => reject(new Error("Failed to load Google API"))
    document.head.appendChild(gapiScript)
  })
}

// Initialize Google APIs
export const initializeGoogleAPI = async (clientId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts) {
      reject(new Error("Google Identity Services not loaded"))
      return
    }

    try {
      // Initialize Google Identity Services
      window.google.accounts.id.initialize({
        client_id: clientId,
      })
      resolve()
    } catch (error) {
      reject(new Error("Failed to initialize Google Identity Services"))
    }
  })
}

// Get access token using Google Identity Services
export const getGoogleAccessToken = async (clientId: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error("Google OAuth2 not available"))
      return
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/drive.readonly",
      callback: (response: any) => {
        if (response.error) {
          reject(new Error(`OAuth error: ${response.error}`))
          return
        }
        resolve(response.access_token)
      },
    })

    tokenClient.requestAccessToken()
  })
}

// Create and show Google Drive Picker
export const showDrivePicker = (accessToken: string, apiKey: string): Promise<DrivePickerResult> => {
  return new Promise((resolve, reject) => {
    if (!window.google?.picker) {
      reject(new Error("Google Picker API not loaded"))
      return
    }

    try {
      const picker = new window.google.picker.PickerBuilder()
        .addView(
          new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS)
            .setIncludeFolders(true)
            .setSelectFolderEnabled(true),
        )
        .setOAuthToken(accessToken)
        .setDeveloperKey(apiKey)
        .setCallback((data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const folder = data.docs[0]
            resolve({
              folderId: folder.id,
              folderName: folder.name,
              accessToken: accessToken,
            })
          } else if (data.action === window.google.picker.Action.CANCEL) {
            reject(new Error("User cancelled folder selection"))
          }
        })
        .build()

      picker.setVisible(true)
    } catch (error) {
      reject(new Error("Failed to create Google Picker"))
    }
  })
}

// Main function to pick a Google Drive folder
export const pickGoogleDriveFolder = async (clientId: string): Promise<DrivePickerResult> => {
  try {
    // Load APIs if not already loaded
    await loadGoogleAPIs()

    // Initialize Google API
    await initializeGoogleAPI(clientId)

    // Get access token using new OAuth2 flow
    const accessToken = await getGoogleAccessToken(clientId)

    // Show picker and get result
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || ""
    if (!apiKey) {
      throw new Error("Google API key not configured")
    }

    const result = await showDrivePicker(accessToken, apiKey)

    return result
  } catch (error) {
    console.error("Error picking Google Drive folder:", error)
    throw error
  }
}
