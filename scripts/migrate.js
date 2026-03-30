#!/usr/bin/env node
/**
 * Database migration runner
 * Run: node scripts/migrate.js
 */

const { neon } = require('@neondatabase/serverless')
const fs = require('fs')
const path = require('path')

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

  for (const file of files) {
    console.log(`Running migration: ${file}`)
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
    try {
      await sql(content)
      console.log(`✓ ${file} completed`)
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
