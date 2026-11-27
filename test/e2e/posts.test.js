import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import supertest from 'supertest'
import { createApp } from '../../src/app.js'
import { createTestDatabase } from '../helpers/test-database.js'

const database = await createTestDatabase()
after(() => database.close())

const ideas = []
const api = supertest(
  createApp({
    posts: database.posts,
    postsApiKey: 'test-secret',
    generate: async (idea) => {
      ideas.push(idea)
      return { title: 'Generated title', content: '# Generated content' }
    },
  }),
)

test('creates a draft and protects the all-posts listing', async () => {
  const invalid = await api.post('/posts/draft').send({ idea: '' })
  assert.equal(invalid.status, 400)
  assert.deepEqual(ideas, [])

  const created = await api.post('/posts/draft').send({ idea: 'A post idea' })
  assert.equal(created.status, 201)
  assert.deepEqual(ideas, ['A post idea'])
  assert.equal(created.body.title, 'Generated title')
  assert.equal(created.body.content, '# Generated content')
  assert.equal(created.body.approved_at, null)

  const postId = created.body.id
  assert.equal((await api.get('/posts')).body.length, 0)
  assert.equal((await api.get(`/posts/${postId}`)).status, 404)
  assert.equal((await api.get('/posts?include=all')).status, 403)
  assert.equal(
    (await api.get('/posts?include=all').set('Authorization', 'Bearer invalid')).status,
    403,
  )

  const all = await api.get('/posts?include=all').set('Authorization', 'Bearer test-secret')
  assert.equal(all.status, 200)
  assert.equal(all.headers['cache-control'], 'no-store')
  assert.equal(all.body.length, 1)
  assert.equal(all.body[0].id, postId)

  const approved = await api.patch(`/posts/${postId}/approve`)
  assert.equal(approved.status, 200)
  assert.ok(approved.body.approved_at)
  assert.ok(approved.body.published_at)
  assert.equal((await api.get('/posts')).body.length, 1)
  assert.equal((await api.get(`/posts/${postId}`)).status, 200)

  const rejected = await api.delete(`/posts/${postId}/reject`)
  assert.equal(rejected.status, 200)
  assert.ok(rejected.body.rejected_at)
  assert.equal(rejected.body.approved_at, null)
  assert.equal((await api.get('/posts')).body.length, 0)
  assert.equal((await api.get(`/posts/${postId}`)).status, 404)
  assert.equal(
    (await api.get('/posts?include=all').set('Authorization', 'Bearer test-secret')).body.length,
    1,
  )
})

test('returns useful HTTP errors for unknown posts and routes', async () => {
  assert.equal((await api.patch('/posts/unknown/approve')).status, 404)
  assert.equal((await api.delete('/posts/unknown/reject')).status, 404)
  assert.equal((await api.get('/unknown')).status, 404)
  const wrongMethod = await api.post('/posts').send({})
  assert.equal(wrongMethod.status, 405)
  assert.equal(wrongMethod.headers.allow, 'GET')
})

test('serves the Swagger UI and OpenAPI document', async () => {
  const page = await api.get('/api/docs')
  assert.equal(page.status, 200)
  assert.match(page.headers['content-type'], /text\/html/)
  assert.match(page.text, /swagger-ui-bundle\.js/)

  const specification = await api.get('/api/docs/json')
  assert.equal(specification.status, 200)
  assert.equal(specification.body.openapi, '3.0.3')
  assert.ok(specification.body.paths['/posts'])
  assert.ok(specification.body.paths['/posts/{id}/approve'])
  assert.ok(specification.body.components.securitySchemes.bearerAuth)
})
