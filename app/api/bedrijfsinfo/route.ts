export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { z } from 'zod'

const CompanyInfoSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  strengths: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  sectors: z.array(z.string()).optional(),
  revenue_range: z.string().optional(),
  employee_count: z.string().optional(),
  founded_year: z.coerce.number().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  kvk_number: z.string().optional(),
})

export async function GET() {
  try {
    const rows = await sql`SELECT * FROM company_info LIMIT 1`
    return NextResponse.json(rows[0] ?? null)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: unknown = await request.json()
    const data = CompanyInfoSchema.parse(body)

    const rows = await sql`
      UPDATE company_info
      SET
        name = ${data.name},
        description = ${data.description ?? null},
        strengths = ${data.strengths ?? []},
        certifications = ${data.certifications ?? []},
        sectors = ${data.sectors ?? []},
        revenue_range = ${data.revenue_range ?? null},
        employee_count = ${data.employee_count ?? null},
        founded_year = ${data.founded_year || null},
        website = ${data.website || null},
        kvk_number = ${data.kvk_number ?? null},
        updated_at = NOW()
      WHERE id = (SELECT id FROM company_info LIMIT 1)
      RETURNING *
    `

    if (!rows.length) {
      // Insert if no row exists
      const inserted = await sql`
        INSERT INTO company_info (
          name, description, strengths, certifications, sectors,
          revenue_range, employee_count, founded_year, website, kvk_number
        ) VALUES (
          ${data.name},
          ${data.description ?? null},
          ${data.strengths ?? []},
          ${data.certifications ?? []},
          ${data.sectors ?? []},
          ${data.revenue_range ?? null},
          ${data.employee_count ?? null},
          ${data.founded_year || null},
          ${data.website || null},
          ${data.kvk_number ?? null}
        )
        RETURNING *
      `
      return NextResponse.json(inserted[0])
    }

    return NextResponse.json(rows[0])
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    }
    const message = err instanceof Error ? err.message : 'Database error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
