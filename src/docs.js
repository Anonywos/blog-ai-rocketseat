import { sendJson } from './router.js'

const postSchema = {
  type: 'object',
  required: ['id', 'title', 'content', 'published_at', 'created_at', 'approved_at', 'rejected_at'],
  properties: {
    id: { type: 'string', example: 'V1StGXR8_Z5jdHi6B-myT' },
    title: { type: 'string', example: 'How to care for houseplants' },
    content: { type: 'string', description: 'Post content in Markdown', example: '# Houseplants' },
    published_at: { type: 'string', format: 'date-time', nullable: true },
    created_at: { type: 'string', format: 'date-time' },
    approved_at: { type: 'string', format: 'date-time', nullable: true },
    rejected_at: { type: 'string', format: 'date-time', nullable: true },
  },
}

const postResponse = {
  description: 'Post',
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Post' } } },
}

const errorResponse = (description) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
})

const idParameter = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'Post ID',
  schema: { type: 'string' },
}

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Blog AI API',
    version: '1.0.0',
    description: 'Generate, publish, and reject Markdown blog posts.',
  },
  paths: {
    '/posts': {
      get: {
        summary: 'List posts',
        description:
          'By default, returns approved posts that have not been rejected. Set include=all to return every post; this requires a valid Bearer API key.',
        security: [{}, { bearerAuth: [] }],
        parameters: [
          {
            name: 'include',
            in: 'query',
            required: false,
            description: 'Use all to include drafts and rejected posts. Requires a Bearer API key.',
            schema: { type: 'string', enum: ['all'] },
          },
        ],
        responses: {
          200: {
            description: 'Posts',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Post' } },
              },
            },
          },
          403: errorResponse('Missing or invalid API key when include=all is requested'),
          500: errorResponse('Failed to list posts'),
        },
      },
    },
    '/posts/{id}': {
      get: {
        summary: 'Get a published post',
        parameters: [idParameter],
        responses: {
          200: postResponse,
          400: errorResponse('Invalid post ID'),
          404: errorResponse('Post not found or not published'),
          500: errorResponse('Failed to get post'),
        },
      },
    },
    '/posts/draft': {
      post: {
        summary: 'Generate a draft',
        description: 'Generates a title and Markdown content from the supplied idea.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/DraftRequest' } },
          },
        },
        responses: {
          201: postResponse,
          400: errorResponse('Invalid JSON or missing idea'),
          500: errorResponse('Failed to create post draft'),
        },
      },
    },
    '/posts/{id}/approve': {
      patch: {
        summary: 'Approve a post',
        description: 'Sets approval and publication dates and clears any rejection date.',
        parameters: [idParameter],
        responses: {
          200: postResponse,
          400: errorResponse('Invalid post ID'),
          404: errorResponse('Post not found'),
          500: errorResponse('Failed to approve post'),
        },
      },
    },
    '/posts/{id}/reject': {
      delete: {
        summary: 'Reject a post',
        description:
          'Sets the rejection date and clears approval and publication dates. The post remains in the database.',
        parameters: [idParameter],
        responses: {
          200: postResponse,
          400: errorResponse('Invalid post ID'),
          404: errorResponse('Post not found'),
          500: errorResponse('Failed to reject post'),
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'Required only for GET /posts?include=all. Set POSTS_API_KEY on the server.',
      },
    },
    schemas: {
      Post: postSchema,
      DraftRequest: {
        type: 'object',
        required: ['idea'],
        properties: {
          idea: { type: 'string', minLength: 1, example: 'How to care for houseplants' },
        },
      },
      Error: {
        type: 'object',
        required: ['error'],
        properties: { error: { type: 'string' } },
      },
    },
  },
}

export function handleDocsJson(_req, res) {
  sendJson(res, 200, openApiDocument)
}

export function handleDocsUi(_req, res) {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Blog AI API docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>window.onload = () => SwaggerUIBundle({ url: '/api/docs/json', dom_id: '#swagger-ui' })</script>
  </body>
</html>`
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(html)
}
