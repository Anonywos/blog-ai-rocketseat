import { createServer } from 'node:http'
import { nanoid } from 'nanoid'
import { insertPostDraft, listPosts } from './database/posts.js'
import { mastra } from './mastra/index.js'
import { postContentSchema } from './mastra/agents/post-agent.js'

const { API_HOST, API_PORT, API_PROTOCOL = 'http', POST_MODEL } = process.env

const postMethods = new Map([
  ['/posts', 'GET'],
  ['/posts/draft', 'POST'],
])

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`)
  const allowedMethod = postMethods.get(pathname)

  if (!allowedMethod) {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Route not found' }))
    return
  }

  if (req.method !== allowedMethod) {
    res.writeHead(405, { Allow: allowedMethod, 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  try {
    if (allowedMethod === 'GET') {
      const posts = await listPosts()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(posts))
      return
    }

    let body = ''
    for await (const chunk of req) {
      body += chunk
    }

    let requestBody
    try {
      requestBody = JSON.parse(body)
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Request body must be valid JSON' }))
      return
    }

    if (
      typeof requestBody !== 'object' ||
      requestBody === null ||
      Array.isArray(requestBody) ||
      typeof requestBody.idea !== 'string' ||
      requestBody.idea.trim().length === 0
    ) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'A non-empty "idea" string is required' }))
      return
    }

    const postAgent = mastra.getAgentById('post-agent')
    const { object } = await postAgent.generate(requestBody.idea, {
      structuredOutput: {
        schema: postContentSchema,
        jsonPromptInjection: POST_MODEL === 'openrouter/nvidia/nemotron-3-ultra-550b-a55b:free',
      },
    })
    const post = await insertPostDraft({
      id: nanoid(),
      title: object.title,
      content: object.content,
    })

    res.writeHead(201, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(post))
  } catch (error) {
    const message = allowedMethod === 'GET' ? 'Failed to list posts' : 'Failed to create post draft'
    console.error(`${message}:`, error)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: message }))
  }
})

server.listen(API_PORT, API_HOST, () => {
  console.log(`Server running on ${API_PROTOCOL}://localhost:${API_PORT}/`)
})
