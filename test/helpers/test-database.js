import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { Pool } from 'pg'
import { createPostsRepository } from '../../src/database/posts.js'

export async function createTestDatabase() {
  const connectionString = process.env.TEST_DATABASE_URL
  if (!connectionString) {
    throw new Error('Set TEST_DATABASE_URL to a PostgreSQL database before running database tests')
  }

  const schema = `test_${randomUUID().replaceAll('-', '')}`
  const admin = new Pool({ connectionString })
  let database

  try {
    await admin.query(`CREATE SCHEMA "${schema}"`)
    database = new Pool({ connectionString, options: `-c search_path=${schema}` })
    const migration = await readFile(
      new URL('../../migrations/001.do.create_posts.sql', import.meta.url),
      'utf8',
    )
    await database.query(migration)

    return {
      posts: createPostsRepository(database),
      async close() {
        await database.end()
        try {
          await admin.query(`DROP SCHEMA "${schema}" CASCADE`)
        } finally {
          await admin.end()
        }
      },
    }
  } catch (error) {
    if (database) await database.end()
    try {
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
    } finally {
      await admin.end()
    }
    throw error
  }
}
