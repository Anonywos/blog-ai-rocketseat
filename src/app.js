import { createServer } from 'node:http'
import { createRouter } from './router.js'
import { handleDocsJson, handleDocsUi } from './docs.js'
import { createPostHandlers } from './routes/posts.js'

export function createApp(options) {
  const {
    handleApprovePost,
    handleCreatePostDraft,
    handleGetPost,
    handleListPosts,
    handleRejectPost,
  } = createPostHandlers(options)

  const routes = [
    { method: 'GET', path: '/api/docs', handler: handleDocsUi },
    { method: 'GET', path: '/api/docs/json', handler: handleDocsJson },
    {
      method: 'GET',
      path: '/posts',
      handler: handleListPosts,
      errorMessage: 'Failed to list posts',
    },
    {
      method: 'GET',
      path: '/posts/:id',
      handler: handleGetPost,
      errorMessage: 'Failed to get post',
      invalidParamsMessage: 'Invalid post ID',
    },
    {
      method: 'POST',
      path: '/posts/draft',
      handler: handleCreatePostDraft,
      errorMessage: 'Failed to create post draft',
    },
    {
      method: 'PATCH',
      path: '/posts/:id/approve',
      handler: handleApprovePost,
      errorMessage: 'Failed to approve post',
      invalidParamsMessage: 'Invalid post ID',
    },
    {
      method: 'DELETE',
      path: '/posts/:id/reject',
      handler: handleRejectPost,
      errorMessage: 'Failed to reject post',
      invalidParamsMessage: 'Invalid post ID',
    },
  ]

  return createServer(createRouter(routes))
}
