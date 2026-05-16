import { Hono } from "hono";
import type { AppVariables } from "../types/hono.js";
import { BookModel } from "../models/book.js";
import { streamSSE } from "hono/streaming";
import { buildQAChain, optimizeQuery, type HistoryMessage } from "../services/qaService.js";
import { MessageModel } from "../models/message.js";
import { ConversationModel } from "../models/conversation.js";
import { MultiNamespaceRetriever } from "../services/multiRetriever.js";

const router = new Hono<{ Variables: AppVariables }>()

router.get('/stream', async (c) => {
    const userId = c.get('userId')
    const query = c.req.query('query')
    const bookIds = c.req.query('bookIds')
    const conversationId = c.req.query('conversationId')

    if (!query || !bookIds) {
        return c.json({
            error: 'Missing query or bookId'
        }, 400)
    }
    if (query.length > 2000) {
        return c.json({
            error: 'Query too long (max 2000 chars)'
        }, 400)
    }
    const realBookIds = bookIds
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

    const books = await BookModel.find({
        _id: { $in: realBookIds },
        ownerClerkId: userId,
        status: 'ready',
    }).lean()

    if (books?.length !== realBookIds.length) {
        return c.json(
            {
                error: "Some books not found or not ready",
            },
            404
        );
    }


    return streamSSE(c, async (stream) => {
        let fullAnswer = ''
        let convId = conversationId;
        let history: HistoryMessage[] = [];

        try {
            if (convId) {
                const messages = await MessageModel.find({
                    conversationId: convId,
                })
                    .sort({ createdAt: 1 })
                    .lean();

                history = messages.map((msg) => ({
                    role: msg.role,
                    content: msg.content,
                }));
            } else {
                const conversation = await ConversationModel.create({
                    ownerClerkId: userId,
                    bookIds: realBookIds,
                });

                convId = conversation._id.toString();

                await stream.writeSSE({
                    event: "conversationId",
                    data: convId,
                });
            }

            const namespaces = books.map((book) => book.pineconeNamespace);

            const optimizedQuery = await optimizeQuery(query)
            console.log('Optimized Query:', optimizedQuery)

            const retriever = new MultiNamespaceRetriever(namespaces, 12);

            const retrievedDocs =
                await retriever._getRelevantDocuments(optimizedQuery);

            console.log(
                'Retrieved docs:',
                retrievedDocs.map((d) => ({
                    page: d.metadata.page,
                    preview: d.pageContent.slice(0, 1500),
                }))
            )

            const { chain } = await buildQAChain(
                retrievedDocs,
                history
            );
            console.log('Streaming started...')
            const result = await chain.stream({
                input: query,
            });
            
            for await (const chunk of result) {
                if (typeof chunk === "string" && chunk) {
                    fullAnswer += chunk;

                    await stream.writeSSE({
                        event: "token",
                        data: chunk.replace(/\n/g, "\\n"),
                    });
                }
            }
            console.log('Final answer:', fullAnswer)
            const sources = retrievedDocs
                .slice(0, 3)
                .map((d) => ({
                    page: d.metadata.page,
                    bookId: d.metadata.bookId,

                    reason:
                        d.pageContent.slice(0, 100),

                    snippet:
                        d.pageContent.slice(0, 180),
                }))

            console.log(sources)

            await stream.writeSSE({
                event: "sources",
                data: JSON.stringify(sources),
            });

            await MessageModel.create([
                {
                    conversationId: convId,
                    role: "user",
                    content: query,
                    sources: [],
                },
                {
                    conversationId: convId,
                    role: "assistant",
                    content: fullAnswer,
                    sources,
                },
            ]);

            await stream.writeSSE({
                event: "done",
                data: "",
            });

        } catch (error) {
            console.error('Chat stream error:', error)
            await stream.writeSSE({
                event: "error",
                data:
                    error instanceof Error
                        ? error.message
                        : "Internal server error",
            })
        }
    })

})

router.get("/conversations", async (c) => {
    const userId = c.get("userId");

    const conversations = await ConversationModel.find({
        ownerClerkId: userId,
    })
        .sort({ createdAt: -1 })
        .lean();

    return c.json(conversations);
});

// ── GET /chat/conversations/:id/messages ──────────────────────────────────
router.get("/conversations/:id/messages", async (c) => {
    const userId = c.get("userId");
    const { id } = c.req.param();

    // ── Verify ownership ────────────────────────────────────────────────────
    const conversation = await ConversationModel.findOne({
        _id: id,
        ownerClerkId: userId,
    });

    if (!conversation) {
        return c.json(
            {
                error: "Conversation not found",
            },
            404
        );
    }

    const messages = await MessageModel.find({
        conversationId: id,
    })
        .sort({ createdAt: 1 })
        .lean();

    return c.json({
        conversationId: id,
        messages,
    });
});

export default router;