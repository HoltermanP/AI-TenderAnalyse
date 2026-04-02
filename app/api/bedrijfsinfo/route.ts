export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { z } from 'zod'

/** Lege of domein-zonder-schema → leeg of https-URL voor Zod `.url()`. */
function preprocessWebsite(val: unknown): string {
  if (val == null) return ''
  const t = String(val).trim()
  if (!t) return ''
  const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`
  return withScheme
}

const CompanyInfoSchema = z.object({
  name: z.string().min(1, 'Bedrijfsnaam is verplicht'),
  description: z.string().optional(),
  strengths: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  sectors: z.array(z.string()).optional(),
  revenue_range: z.string().optional(),
  employee_count: z.string().optional(),
  founded_year: z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return undefined
    const n = Number(String(val).replace(/\s/g, ''))
    if (!Number.isFinite(n)) return undefined
    const y = Math.trunc(n)
    if (y < 1000 || y > 2100) return undefined
    return y
  }, z.number().int().optional()),
  website: z.preprocess(
    preprocessWebsite,
    z.union([
      z.literal(''),
      z.string().url({
        message:
          'Ongeldige website. Gebruik een domein (bijv. mijnbedrijf.nl) of volledige URL (https://…).',
      }),
    ])
  ),
  kvk_number: z.string().optional(),
  legal_form: z.string().optional(),
  address_line: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  vat_number: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.union([z.literal(''), z.string().email()]).optional(),
  contact_phone: z.string().optional(),
  cpv_focus: z.array(z.string()).optional(),
  reference_projects: z.string().optional(),
  differentiators: z.string().optional(),
  strategic_notes: z.string().optional(),
})

export async function GET() {
  try {
    const rows =
      await sql`SELECT * FROM company_info ORDER BY updated_at DESC NULLS LAST LIMIT 1`
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
        legal_form = ${data.legal_form ?? null},
        address_line = ${data.address_line ?? null},
        postal_code = ${data.postal_code ?? null},
        city = ${data.city ?? null},
        country = ${data.country?.trim() ? data.country : null},
        vat_number = ${data.vat_number ?? null},
        contact_name = ${data.contact_name ?? null},
        contact_email = ${data.contact_email || null},
        contact_phone = ${data.contact_phone ?? null},
        cpv_focus = ${data.cpv_focus ?? []},
        reference_projects = ${data.reference_projects ?? null},
        differentiators = ${data.differentiators ?? null},
        strategic_notes = ${data.strategic_notes ?? null},
        updated_at = NOW()
      WHERE id = (SELECT id FROM company_info ORDER BY updated_at DESC NULLS LAST LIMIT 1)
      RETURNING *
    `

    if (!rows.length) {
      const inserted = await sql`
        INSERT INTO company_info (
          name, description, strengths, certifications, sectors,
          revenue_range, employee_count, founded_year, website, kvk_number,
          legal_form, address_line, postal_code, city, country,
          vat_number, contact_name, contact_email, contact_phone,
          cpv_focus, reference_projects, differentiators, strategic_notes
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
          ${data.kvk_number ?? null},
          ${data.legal_form ?? null},
          ${data.address_line ?? null},
          ${data.postal_code ?? null},
          ${data.city ?? null},
          ${data.country?.trim() ? data.country : null},
          ${data.vat_number ?? null},
          ${data.contact_name ?? null},
          ${data.contact_email || null},
          ${data.contact_phone ?? null},
          ${data.cpv_focus ?? []},
          ${data.reference_projects ?? null},
          ${data.differentiators ?? null},
          ${data.strategic_notes ?? null}
        )
        RETURNING *
      `
      return NextResponse.json(inserted[0])
    }

    return NextResponse.json(rows[0])
  } catch (err) {
    if (err instanceof z.ZodError) {
      const e = err.errors[0]
      const path = e.path.length ? `${e.path.join('.')}: ` : ''
      return NextResponse.json({ error: `${path}${e.message}` }, { status: 400 })
    }
    const message = err instanceof Error ? err.message : 'Database error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
