import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

// Intercept every outgoing request — attach Clerk JWT
apiClient.interceptors.request.use(async (config) => {
  // window.Clerk is globally available after ClerkProvider mounts
  try {
    const token = await window.Clerk?.session?.getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      // console.log('Token attached to request:', token.substring(0, 20) + '...')
    } else {
      console.warn('No token available from Clerk')
    }
  } catch (err) {
    console.error('Error getting token:', err)
  }
  return config
})

// Handle 401 globally — redirect to sign-in
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.error("Unauthorized");
      
    }
    return Promise.reject(error)
  }
)

export default apiClient