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

    // Sort descending by cosine similarity score
    merged.sort((a, b) => b[1] - a[1])

    // Return top (k * namespaces) but cap at a sensible limit
    const cap = Math.min(merged.length, this.k * this.namespaces.length)
    return merged.slice(0, cap).map(([doc]) => doc)
  }
}