import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

pool.on('error', (error) => {
  console.error('PostgreSQL pool error:', error.message)
})

export async function listPosts() {
  const { rows } = await pool.query(`
    SELECT id, title, content, published_at, created_at, approved_at, rejected_at
    FROM posts
    ORDER BY created_at, id
  `)
  return rows
}

export async function insertPostDraft({ id, title, content }) {
  const {
    rows: [post],
  } = await pool.query(
    `
    INSERT INTO posts (id, title, content)
    VALUES ($1, $2, $3)
    RETURNING id, title, content, published_at, created_at, approved_at, rejected_at
  `,
    [id, title, content],
  )
  return post
}
