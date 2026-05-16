// backend/multiRetriever.ts
import { BaseRetriever } from '@langchain/core/retrievers'
import { Document } from '@langchain/core/documents'
import { CallbackManagerForRetrieverRun } from '@langchain/core/callbacks/manager'
import { getVectorStore } from './embedder.js'

export class MultiNamespaceRetriever extends BaseRetriever {
  lc_namespace = ['custom', 'MultiNamespaceRetriever']

  private namespaces: string[]
  private k: number // docs to fetch per namespace

  constructor(namespaces: string[], k = 4) {
    super()
    this.namespaces = namespaces
    this.k = k
  }

  async _getRelevantDocuments(
    query: string,
    runManager?: CallbackManagerForRetrieverRun
  ): Promise<Document[]> {
    // Fire all namespace queries in parallel
    const perNsResults = await Promise.allSettled(
      this.namespaces.map(async (ns) => {
        const vs = await getVectorStore(ns)
        // Use similaritySearchWithScore so we can merge + sort
        return vs.similaritySearchWithScore(query, this.k)
      })
    )

    const merged: Array<[Document, number]> = []

    for (const result of perNsResults) {
      if (result.status === 'fulfilled') {
        merged.push(...result.value)
      }
      // silently skip failed namespaces (bad bookId etc.)
    }

    console.log(
      merged.map(([d, s]) => ({
        score: s,
        preview: d.pageContent.slice(0, 60),
      }))
    )

    // Sort descending by cosine similarity score
    merged.sort((a, b) => b[1] - a[1])

    // Return top (k * namespaces) but cap at a sensible limit
    const uniqueDocs = new Map()

    for (const [doc, score] of merged) {
      const key = doc.pageContent.slice(0, 120)

      if (!uniqueDocs.has(key)) {
        uniqueDocs.set(key, {
          doc,
          score,
        })
      }
    }

    // Better reranking
    const reranked = [...uniqueDocs.values()]
      .sort((a, b) => {
        const pageA = a.doc.metadata.page || 999
        const pageB = b.doc.metadata.page || 999
      
        // slight boost to earlier pages
        return pageA - pageB
      })
      .slice(0, 10)

    const cleanedDocs = reranked
      .map((r) => r.doc)
      .filter((doc) => {
        const text = doc.pageContent.trim()

        // Remove tiny chunks
        if (text.length < 150) return false

        // Remove references/bibliography
        const lower = text.toLowerCase()

        if (
          lower.includes('references') ||
          lower.includes('international journal') ||
          lower.includes('doi') ||
          lower.includes('et al') ||
          lower.includes('conference') ||
          lower.includes('ieee') ||
          lower.includes('[1]') ||
          lower.includes('[2]')
        ) {
          return false
        }

        return true
      })

    return cleanedDocs
  }
}