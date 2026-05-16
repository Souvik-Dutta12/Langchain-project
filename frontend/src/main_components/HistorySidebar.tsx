import { useConversationHistory } from "@/hooks/useConversationHistory"
import { useChatStore } from "@/store/useChatStore"
import ConversationItem from "./ConversationItem"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { FilePlusCorner, Search } from "lucide-react"

export default function HistorySidebar() {
    const {
        history,
        loading,
    } = useConversationHistory()

    const {
        activeConversationId,
        setActiveConversation,
        conversations,
    } = useChatStore()

    const loadConversation = async (
        conversationId: string
    ) => {
        try {
            const token =
                await window.Clerk?.session?.getToken()

            const res = await axios.get(
                `${import.meta.env.VITE_API_BASE_URL}/chat/conversations/${conversationId}/messages`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )

            useChatStore.setState((state) => ({
                activeConversationId: conversationId,

                conversations: {
                    ...state.conversations,

                    [conversationId]: {
                        id: conversationId,
                        bookIds: [],
                        createdAt: new Date().toISOString(),
                        messages: res.data.messages,
                    },
                },
            }))

        } catch (err) {
            console.error(err)
        }
    }

    return (
        <aside className="w-full h-full overflow-y-auto rounded-l-md bg-white dark:bg-neutral-950 flex-col">
            {/* Header */}
            <div className="p-4 border-b">
                <h2 className="font-semibold ">
                    Chat History
                </h2>
            </div>
            <div className="p-1 border-b flex flex-col gap-1">
                <Button
                variant={"secondary"}
                className="font-semibold w-full rounded-md cursor-pointer">
                    <FilePlusCorner /> New Chat
                   
                </Button>
                <Button
                variant={"secondary"}
                className="font-semibold w-full rounded-md cursor-pointer">
                   <Search /> Search Chat
                </Button>
            </div>

            {/* History */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {loading && (
                    <p className="text-sm ">
                        Loading...
                    </p>
                )}

                {history.map((conv) => (
                    <ConversationItem
                        key={conv._id}
                        title={
                            conversations[conv._id]?.messages?.[0]
                                ?.content ||
                            "New Conversation"
                        }
                        createdAt={conv.createdAt}
                        active={
                            activeConversationId === conv._id
                        }
                        onClick={() =>
                            loadConversation(conv._id)
                        }
                    />
                ))}
            </div>
        </aside>
    )
}