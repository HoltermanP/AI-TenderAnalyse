#!/usr/bin/env node
/**
 * Database migration runner
 * Run: npm run db:migrate  (DATABASE_URL of .env.local met DATABASE_URL)
 */

const { neon } = require('@neondatabase/serverless')
const fs = require('fs')
const path = require('path')

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) return
  const text = fs.readFileSync(envPath, 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

loadEnvLocal()

/**
 * Split op `;` buiten regelcomments, block-comments, enkelvoudige quotes en $tag$…$tag$.
 * Nodig: Neon voert geen multi-statement prepared queries uit.
 */
function splitSqlStatements(source) {
  const statements = []
  let buf = ''
  let i = 0
  let inLineComment = false
  let inBlockComment = false
  let inSingleQuote = false
  let dollarDelimiter = null

  while (i < source.length) {
    const c = source[i]
    const next = source[i + 1]

    if (inLineComment) {
      buf += c
      if (c === '\n') inLineComment = false
      i++
      continue
    }
    if (inBlockComment) {
      buf += c
      if (c === '*' && next === '/') {
        buf += next
        i += 2
        inBlockComment = false
      } else {
        i++
      }
      continue
    }
    if (dollarDelimiter) {
      if (source.startsWith(dollarDelimiter, i)) {
        buf += dollarDelimiter
        i += dollarDelimiter.length
        dollarDelimiter = null
      } else {
        buf += c
        i++
      }
      continue
    }
    if (inSingleQuote) {
      buf += c
      if (c === "'") {
        if (next === "'") {
          buf += next
          i += 2
        } else {
          inSingleQuote = false
          i++
        }
      } else {
        i++
      }
      continue
    }

    if (c === '-' && next === '-') {
      inLineComment = true
      buf += c + next
      i += 2
      continue
    }
    if (c === '/' && next === '*') {
      inBlockComment = true
      buf += c + next
      i += 2
      continue
    }
    if (c === "'") {
      inSingleQuote = true
      buf += c
      i++
      continue
    }
    if (c === '$') {
      const rest = source.slice(i)
      const m = rest.match(/^\$([^$]*)\$/)
      if (m) {
        dollarDelimiter = m[0]
        buf += dollarDelimiter
        i += dollarDelimiter.length
        continue
      }
    }

    if (c === ';') {
      const trimmed = buf.trim()
      if (trimmed.length) statements.push(trimmed)
      buf = ''
      i++
      continue
    }

    buf += c
    i++
  }
  const tail = buf.trim()
  if (tail.length) statements.push(tail)
  return statements
}

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not set')
    process.exit(1)
  }

  const sql = neon(process.env.DATABASE_URL)
  const migrationsDir = path.join(__dirname, '..', 'migrations')

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  console.log(`Found ${files.length} migration file(s)`)

  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  for (const file of files) {
    const applied = await sql`
      SELECT 1 AS ok FROM schema_migrations WHERE filename = ${file} LIMIT 1
    `
    if (applied.length > 0) {
      console.log(`Skipping ${file} (already applied)`)
      continue
    }

    console.log(`Running migration: ${file}`)
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
    const chunks = splitSqlStatements(content)
    try {
      for (const stmt of chunks) {
        if (!stmt.trim()) continue
        await sql(stmt)
      }
      await sql`
        INSERT INTO schema_migrations (filename) VALUES (${file})
      `
      console.log(`✓ ${file} completed (${chunks.length} statement(s))`)
    } catch (err) {
      console.error(`✗ ${file} failed:`, err.message)
      process.exit(1)
    }
  }

  console.log('All migrations completed successfully!')
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
