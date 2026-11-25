import { fileURLToPath } from 'node:url'
import { Client } from 'pg'

const { connectionParameters } = new Client({ connectionString: process.env.DATABASE_URL })
const { database, host, options, password, port, ssl, sslnegotiation, user } = connectionParameters

// Preserve connection settings the CLI reads through pg's environment variables.
const pgEnvironment = {
  PGDATABASE: database,
  PGOPTIONS: options,
  PGSSLNEGOTIATION: sslnegotiation,
  PGSSLMODE: ssl === false ? 'disable' : undefined,
}
for (const [name, value] of Object.entries(pgEnvironment)) {
  if (value != null) process.env[name] = value
}

export default {
  driver: 'pg',
  migrationPattern: fileURLToPath(new URL('./migrations/*.sql', import.meta.url)),
  host,
  port,
  username: user,
  password,
  ssl,
}
