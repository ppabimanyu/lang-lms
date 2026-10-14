import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import dotenv from 'dotenv'
import * as schema from './schema'

dotenv.config()

const { Pool } = pg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/lang_lms',
})

export const db = drizzle(pool, { schema })
