import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { RunnablePassthrough, RunnableSequence } from '@langchain/core/runnables'
import { Document } from '@langchain/core/documents'
import { env } from '../config/env.js'

const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  temperature: 0.2,
  apiKey: env.GOOGLE_API_KEY,
  streaming: true,
})

const RAG_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `
You are an advanced AI document assistant.

Your responsibilities:

- Understand document context deeply
- Answer naturally like ChatGPT
- Do NOT copy raw chunks
- Summarize intelligently
- Adapt answer style to user intent
- Use paragraphs or bullet points depending on the query
- Keep answers conversational and human-friendly

RULES:

1. Prefer document knowledge first
2. If documents partially contain the answer:
   - combine document knowledge with general knowledge
3. If answer does not exist in documents:
   - clearly say so
   - answer using your general knowledge
4. Never hallucinate document facts
5. Keep answers concise unless user asks for detail
6. Avoid raw citation spam
7. Keep responses natural and conversational.
8. Avoid sounding like a research paper summary.
9. Explain concepts simply unless user asks technically.
10. If the user asks:
- abstract
→ generate a concise academic abstract style response

- "explain"
→ give explanation

- "short answer"
→ concise response

- "pointwise"
→ bullets

- "paragraph"
→ paragraph format

Retrieved document context:

{context}
`
  ],
  new MessagesPlaceholder('history'),
  ['human', '{input}'],
])

export interface HistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function optimizeQuery(query: string) {
  const result = await llm.invoke(`
    Rewrite the following user query into a detailed semantic search query
    optimized for retrieving relevant document chunks from PDFs.
      
    User Query:
    "${query}"
      
    Only return the rewritten retrieval query.
  `)

  return result.content.toString()
}

function toBaseMessages(history: HistoryMessage[]): BaseMessage[] {
  return history.map((m) =>
    m.role === 'user'
      ? new HumanMessage(m.content)
      : new AIMessage(m.content)
  )
}

export async function buildQAChain(
  docs: Document[],
  history: HistoryMessage[] = []
) {
  const chain = RunnableSequence.from([
    RunnablePassthrough.assign({
      context: async () => {
        return docs
          .map((d, index) => {
            return `
                  SOURCE ${index + 1}
                  Page: ${d.metadata.page}

                  ${d.pageContent}
                  `
          })
          .join('\n\n-------------\n\n')
      },

      history: () => toBaseMessages(history),
    }),

    RAG_PROMPT,
    llm,
    new StringOutputParser(),
  ])

  return { chain }
}