import assert from 'node:assert/strict'
import test from 'node:test'
import { postContentSchema } from '../../src/mastra/agents/post-agent.js'
import { hasValidPostsApiKey } from '../../src/routes/posts.js'

test('accepts only a matching Bearer key', () => {
  assert.equal(hasValidPostsApiKey('Bearer secret-123', 'secret-123'), true)
  assert.equal(hasValidPostsApiKey('bearer secret-123', 'secret-123'), true)
  assert.equal(hasValidPostsApiKey('Bearer invalid', 'secret-123'), false)
  assert.equal(hasValidPostsApiKey('Bearer secret-123', ''), false)
  assert.equal(hasValidPostsApiKey(undefined, 'secret-123'), false)
  assert.equal(hasValidPostsApiKey('Basic secret-123', 'secret-123'), false)
  assert.equal(hasValidPostsApiKey('Bearer secret-123 extra', 'secret-123'), false)
})

test('requires a non-empty title and Markdown content from the agent', () => {
  assert.equal(postContentSchema.safeParse({ title: 'Title', content: '# Content' }).success, true)
  assert.equal(postContentSchema.safeParse({ title: '', content: '# Content' }).success, false)
  assert.equal(postContentSchema.safeParse({ title: 'Title', content: '' }).success, false)
  assert.equal(postContentSchema.safeParse({ title: 'Title' }).success, false)
})
