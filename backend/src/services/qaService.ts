// backend/qaService.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { RunnablePassthrough, RunnableSequence } from '@langchain/core/runnables'
import { env } from '../config/env.js'
import { MultiNamespaceRetriever } from './multiRetriever.js'

const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  temperature: 0.2,
  apiKey: env.GOOGLE_API_KEY,
  streaming: true,
})

// ── Prompt ────────────────────────────────────────────────────────────────────
const RAG_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an intelligent assistant that answers questions strictly from the
provided PDF content. Always cite page numbers like [Page 34] or [Pages 12, 45].
If the answer is not in the context say exactly:
"This information is not available in the provided documents."

Context from the document(s):
{context}`,
  ],
  // Injects full conversation history so the model understands follow-ups
  new MessagesPlaceholder('history'),
  ['human', '{input}'],
])

// ── History helpers ───────────────────────────────────────────────────────────
export interface HistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

function toBaseMessages(history: HistoryMessage[]): BaseMessage[] {
  return history.map((m) =>
    m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
  )
}

// ── Chain factory ─────────────────────────────────────────────────────────────
/**
 * @param namespaces  One namespace per selected book (bookId = namespace key)
 * @param history     Full conversation so far (for follow-up awareness)
 */
export async function buildQAChain(
  namespaces: string[],
  history: HistoryMessage[] = []
) {
  if (namespaces.length === 0) throw new Error('At least one namespace required')

  const retriever = new MultiNamespaceRetriever(namespaces, 5)

  const chain = RunnableSequence.from([
    RunnablePassthrough.assign({
      // Retrieve docs and format them; also pass history as BaseMessage[]
      context: async (input: { input: string }) => {
        const docs = await retriever._getRelevantDocuments(input.input)
        return docs.map((d) => d.pageContent).join('\n\n') 
      },
      history: () => toBaseMessages(history),
      // Expose raw docs for source extraction after streaming
      _docs: async (input: { input: string }) =>
        retriever._getRelevantDocuments(input.input),
    }),
    RAG_PROMPT,
    llm,
    new StringOutputParser(),
  ])

  return { chain, retriever }
}

// ── Source extraction (call after chain.stream finishes) ──────────────────────
export async function extractSources(namespaces: string[], query: string) {
  const retriever = new MultiNamespaceRetriever(namespaces, 5)
  const docs = await retriever._getRelevantDocuments(query)
  return docs.map((d) => ({
    page: d.metadata.page as number,
    chunk: (d.pageContent ?? '').slice(0, 120),
    bookId: d.metadata.bookId as string,
  }))
}