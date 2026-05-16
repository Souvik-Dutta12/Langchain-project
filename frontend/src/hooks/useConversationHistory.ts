import { useEffect, useState } from "react"
import axios from "axios"

export interface ConversationHistoryItem {
  _id: string
  bookIds: string[]
  createdAt: string
}

export function useConversationHistory() {
  const [history, setHistory] = useState<
    ConversationHistoryItem[]
  >([])

  const [loading, setLoading] = useState(false)

  const fetchHistory = async () => {
    try {
      setLoading(true)

      const token =
        await window.Clerk?.session?.getToken()

      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/chat/conversations`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      setHistory(res.data)

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  return {
    history,
    loading,
    refetch: fetchHistory,
  }
}