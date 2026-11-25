import { timingSafeEqual } from 'node:crypto'
import { nanoid } from 'nanoid'
import {
  approvePost,
  getPostById,
  insertPostDraft,
  listPosts,
  rejectPost,
} from '../database/posts.js'
import { mastra } from '../mastra/index.js'
import { postContentSchema } from '../mastra/agents/post-agent.js'
import { sendJson } from '../router.js'

const { POST_MODEL, POSTS_API_KEY } = process.env
const expectedPostsApiKey = Buffer.from(POSTS_API_KEY ?? '')

function hasValidPostsApiKey(authorization) {
  const token = /^Bearer +([^\s,]+)$/i.exec(authorization ?? '')?.[1]
  if (!token || expectedPostsApiKey.length === 0) return false

  const receivedKey = Buffer.from(token)
  return (
    //timingSafeEqual prevent timing attacks by comparing the tokens in constant time
    receivedKey.length === expectedPostsApiKey.length &&
    timingSafeEqual(receivedKey, expectedPostsApiKey)
  )
}

export async function handleListPosts(req, res) {
  const includeAll = req.query.has('include', 'all')
  if (includeAll) {
    res.setHeader('Cache-Control', 'no-store')
    if (!hasValidPostsApiKey(req.headers.authorization)) {
      sendJson(res, 403, { error: 'Forbidden' })
      return
    }
  }

  const posts = await listPosts({ includeAll })
  sendJson(res, 200, posts)
}

export async function handleGetPost(req, res) {
  const post = await getPostById(req.params.id)
  if (!post) {
    sendJson(res, 404, { error: 'Post not found' })
    return
  }

  sendJson(res, 200, post)
}

export async function handleCreatePostDraft(req, res) {
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

  sendJson(res, 201, post)
}

export async function handleApprovePost(req, res) {
  const post = await approvePost(req.params.id)
  if (!post) {
    sendJson(res, 404, { error: 'Post not found' })
    return
  }

  sendJson(res, 200, post)
}

export async function handleRejectPost(req, res) {
  const post = await rejectPost(req.params.id)
  if (!post) {
    sendJson(res, 404, { error: 'Post not found' })
    return
  }

  sendJson(res, 200, post)
}
