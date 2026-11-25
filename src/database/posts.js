import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

pool.on('error', (error) => {
  console.error('PostgreSQL pool error:', error.message)
})

export async function listPosts() {
  const { rows } = await pool.query(`
    SELECT id, title, content, published_at, created_at, approved_at, rejected_at
    FROM posts
    WHERE approved_at IS NOT NULL
      AND rejected_at IS NULL
    ORDER BY created_at, id
  `)
  return rows
}

export async function getPostById(id) {
  const { rows } = await pool.query(
    `
    SELECT id, title, content, published_at, created_at, approved_at, rejected_at
    FROM posts
    WHERE id = $1
  `,
    [id],
  )
  return rows[0]
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

export async function approvePost(id) {
  const { rows } = await pool.query(
    `
    UPDATE posts
    SET approved_at = CURRENT_TIMESTAMP,
        published_at = CURRENT_TIMESTAMP,
        rejected_at = NULL
    WHERE id = $1
    RETURNING id, title, content, published_at, created_at, approved_at, rejected_at
  `,
    [id],
  )
  return rows[0]
}

export async function rejectPost(id) {
  const { rows } = await pool.query(
    `
    UPDATE posts
    SET rejected_at = CURRENT_TIMESTAMP, approved_at = NULL, published_at = NULL
    WHERE id = $1
    RETURNING id, title, content, published_at, created_at, approved_at, rejected_at
  `,
    [id],
  )
  return rows[0]
}
