import { create } from "zustand";
import { persist } from "zustand/middleware"
import type { ChatMessage, Conversation } from "../../../packages/types/src";

interface ChatState {
    conversations: Record<string, Conversation>
    activeConversationId: string | null
    startConversation: (id: string, bookIds: string[]) => void
    addMessage: (conversationId: string, message: ChatMessage) => void
    setActiveConversation: (id: string | null) => void
    clearConversation: (id: string) => void

}

export const useChatStore = create<ChatState>()(
    persist(
        (set) => ({
            conversations: {},
            activeConversationId: null,

            startConversation: (id, bookIds) =>
                set((state) => ({
                    activeConversationId: id,
                    conversations: {
                        ...state.conversations,
                        [id]: state.conversations[id] ?? {
                            id,
                            bookIds,
                            messages: [],
                            createdAt: new Date().toISOString(),
                        },
                    },
                })),

            addMessage: (conversationId, message) =>
                set((state) => {
                    const conv = state.conversations[conversationId]
                    if (!conv) return state
                    return {
                        conversations: {
                            ...state.conversations,
                            [conversationId]: {
                                ...conv,
                                messages: [...conv.messages, message],
                            },
                        },
                    }
                }),

            setActiveConversation: (id) => set({ activeConversationId: id }),

            clearConversation: (id) =>
                set((state) => {
                    const next = { ...state.conversations }
                    delete next[id]
                    return {
                        conversations: next,
                        activeConversationId:
                            state.activeConversationId === id ? null : state.activeConversationId,
                    }
                }),
        }),
        {
            name: 'omnis-chat-history',   // localStorage key
            // Only persist conversations, not transient UI state
            partialize: (s) => ({ conversations: s.conversations }),
        }
    )
)

