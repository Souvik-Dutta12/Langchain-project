import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import {ClerkProvider} from "@clerk/clerk-react";
import { shadcn } from '@clerk/ui/themes'
import { ThemeProvider } from "next-themes";
import 'remixicon/fonts/remixicon.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
if(!PUBLISHABLE_KEY) throw new Error("Missing Clerk publishable key.")
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider 
    publishableKey={PUBLISHABLE_KEY}
    appearance={{
      theme: shadcn,
      elements:{
        
        formButtonPrimary:
          "bg-linear-to-t from-indigo-500 to-purple-600 text-white rounded-lg shadow-lg shadow-indigo-500/25 transition-all border-none border-b border-neutral-200 hover:shadow-indigo-500/40 hover:from-indigo-600 hover:to-purple-700"
      }
    }}
    >
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <App />
      </ThemeProvider>
    </ClerkProvider>
  </StrictMode>,
)
