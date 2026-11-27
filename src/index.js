import { createApp } from './app.js'

const { API_HOST, API_PORT, API_PROTOCOL = 'http' } = process.env

const server = createApp()

server.listen(API_PORT, API_HOST, () => {
  console.log(`Server running on ${API_PROTOCOL}://localhost:${API_PORT}/`)
})
