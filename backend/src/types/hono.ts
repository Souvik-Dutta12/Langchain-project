import { verifyToken } from '@clerk/backend'


type ClerkPayload = Awaited<ReturnType<typeof verifyToken>>

export type AppVariables = {
  userId: string
  clerkPayload: ClerkPayload & {
    email?: string  
  }
} 