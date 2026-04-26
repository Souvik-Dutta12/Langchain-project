interface Window {
    Clerk?: {
      session?: {
        getToken: (options?: { template?: string }) => Promise<string | null>
      }
      redirectToSignIn: () => void
    }
  }