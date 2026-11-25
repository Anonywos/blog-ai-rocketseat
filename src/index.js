import { createServer } from 'node:http'
import { createRouter } from './router.js'
import {
  handleApprovePost,
  handleCreatePostDraft,
  handleGetPost,
  handleListPosts,
} from './routes/posts.js'

const { API_HOST, API_PORT, API_PROTOCOL = 'http' } = process.env

const routes = [
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
]

const server = createServer(createRouter(routes))

server.listen(API_PORT, API_HOST, () => {
  console.log(`Server running on ${API_PROTOCOL}://localhost:${API_PORT}/`)
})
