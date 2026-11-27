import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { createTestDatabase } from '../helpers/test-database.js'

const database = await createTestDatabase()
after(() => database.close())

test('persists the draft, approval, rejection, and public visibility rules', async () => {
  const { posts } = database
  const draft = await posts.insertPostDraft({
    id: 'integration-post',
    title: 'Title',
    content: '# Body',
  })

  assert.equal(draft.title, 'Title')
  assert.equal(draft.created_at instanceof Date, true)
  assert.equal(draft.approved_at, null)
  assert.equal(draft.published_at, null)
  assert.equal(draft.rejected_at, null)
  assert.deepEqual(await posts.listPosts(), [])
  assert.equal((await posts.listPosts({ includeAll: true })).length, 1)
  assert.equal(await posts.getPostById(draft.id), undefined)

  const approved = await posts.approvePost(draft.id)
  assert.equal(approved.approved_at instanceof Date, true)
  assert.equal(approved.published_at instanceof Date, true)
  assert.equal(approved.rejected_at, null)
  assert.equal((await posts.listPosts()).length, 1)
  assert.equal((await posts.getPostById(draft.id)).id, draft.id)

  const rejected = await posts.rejectPost(draft.id)
  assert.equal(rejected.rejected_at instanceof Date, true)
  assert.equal(rejected.approved_at, null)
  assert.equal(rejected.published_at, null)
  assert.deepEqual(await posts.listPosts(), [])
  assert.equal(await posts.getPostById(draft.id), undefined)
  assert.equal((await posts.listPosts({ includeAll: true })).length, 1)

  const reapproved = await posts.approvePost(draft.id)
  assert.equal(reapproved.rejected_at, null)
  assert.equal((await posts.listPosts()).length, 1)
  assert.equal(await posts.approvePost('unknown'), undefined)
  assert.equal(await posts.rejectPost('unknown'), undefined)
})
