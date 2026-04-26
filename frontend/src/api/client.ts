import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

// Intercept every outgoing request — attach Clerk JWT
apiClient.interceptors.request.use(async (config) => {
  // window.Clerk is globally available after ClerkProvider mounts
  const token = await window.Clerk?.session?.getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 globally — redirect to sign-in
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.Clerk?.redirectToSignIn()
    }
    return Promise.reject(error)
  }
)

export default apiClient