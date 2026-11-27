import { timingSafeEqual } from 'node:crypto'
import { nanoid } from 'nanoid'
import { postsRepository } from '../database/posts.js'
import { mastra } from '../mastra/index.js'
import { postContentSchema } from '../mastra/agents/post-agent.js'
import { sendJson } from '../router.js'

async function generatePost(idea, postModel) {
  const postAgent = mastra.getAgentById('post-agent')
  const { object } = await postAgent.generate(idea, {
    structuredOutput: {
      schema: postContentSchema,
      jsonPromptInjection: postModel === 'openrouter/nvidia/nemotron-3-ultra-550b-a55b:free',
    },
  })
  return object
}

export function hasValidPostsApiKey(authorization, apiKey) {
  const expectedPostsApiKey = Buffer.from(apiKey ?? '')
  const token = /^Bearer +([^\s,]+)$/i.exec(authorization ?? '')?.[1]
  if (!token || expectedPostsApiKey.length === 0) return false

  const receivedKey = Buffer.from(token)
  return (
    //timingSafeEqual prevent timing attacks by comparing the tokens in constant time
    receivedKey.length === expectedPostsApiKey.length &&
    timingSafeEqual(receivedKey, expectedPostsApiKey)
  )
}

export function createPostHandlers({
  posts = postsRepository,
  generate = generatePost,
  postsApiKey = process.env.POSTS_API_KEY,
  postModel = process.env.POST_MODEL,
} = {}) {
  async function handleListPosts(req, res) {
    const includeAll = req.query.has('include', 'all')
    if (includeAll) {
      res.setHeader('Cache-Control', 'no-store')
      if (!hasValidPostsApiKey(req.headers.authorization, postsApiKey)) {
        sendJson(res, 403, { error: 'Forbidden' })
        return
      }
    }

    const results = await posts.listPosts({ includeAll })
    sendJson(res, 200, results)
  }

  async function handleGetPost(req, res) {
    const post = await posts.getPostById(req.params.id)
    if (!post) {
      sendJson(res, 404, { error: 'Post not found' })
      return
    }

    sendJson(res, 200, post)
  }

  async function handleCreatePostDraft(req, res) {
    let body = ''
    for await (const chunk of req) {
      body += chunk
    }

    let requestBody
    try {
      requestBody = JSON.parse(body)
    } catch {
      sendJson(res, 400, { error: 'Request body must be valid JSON' })
      return
    }

    if (
      typeof requestBody !== 'object' ||
      requestBody === null ||
      Array.isArray(requestBody) ||
      typeof requestBody.idea !== 'string' ||
      requestBody.idea.trim().length === 0
    ) {
      sendJson(res, 400, { error: 'A non-empty "idea" string is required' })
      return
    }

    const object = await generate(requestBody.idea, postModel)
    const post = await posts.insertPostDraft({
      id: nanoid(),
      title: object.title,
      content: object.content,
    })

    sendJson(res, 201, post)
  }

  async function handleApprovePost(req, res) {
    const post = await posts.approvePost(req.params.id)
    if (!post) {
      sendJson(res, 404, { error: 'Post not found' })
      return
    }

    sendJson(res, 200, post)
  }

  async function handleRejectPost(req, res) {
    const post = await posts.rejectPost(req.params.id)
    if (!post) {
      sendJson(res, 404, { error: 'Post not found' })
      return
    }

    sendJson(res, 200, post)
  }

  return {
    handleListPosts,
    handleGetPost,
    handleCreatePostDraft,
    handleApprovePost,
    handleRejectPost,
  }
}
