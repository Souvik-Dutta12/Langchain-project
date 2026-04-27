interface Window {
    Clerk?: {
      session?: {
        getToken: (options?: { template?: "Omnis-template" }) => Promise<string | null>
      }
      redirectToSignIn: () => void
    }
  }