import assert from 'node:assert/strict'
import test from 'node:test'
import { createApp } from '../../src/app.js'

test('serves Swagger UI and the OpenAPI document', async () => {
  const server = createApp({ posts: {} })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

  try {
    const address = `http://127.0.0.1:${server.address().port}`
    const page = await fetch(`${address}/api/docs`)
    assert.equal(page.status, 200)
    assert.match(page.headers.get('content-type'), /text\/html/)
    assert.match(await page.text(), /swagger-ui-bundle\.js/)

    const response = await fetch(`${address}/api/docs/json`)
    assert.equal(response.status, 200)
    const specification = await response.json()
    assert.equal(specification.openapi, '3.0.3')
    assert.ok(specification.paths['/posts'].get)
    assert.ok(specification.paths['/posts/{id}/approve'].patch)
    assert.ok(specification.components.securitySchemes.bearerAuth)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})
