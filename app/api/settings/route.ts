export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { z } from 'zod'

const PatchSettingsSchema = z.object({
  smtp_mail_enabled: z.boolean().optional(),
  smtp_host: z.string().max(255).nullable().optional(),
  smtp_port: z.number().int().min(1).max(65535).optional(),
  smtp_secure: z.boolean().optional(),
  smtp_user: z.string().max(255).nullable().optional(),
  smtp_password: z.string().optional(),
  smtp_from_email: z.string().email().max(255).nullable().optional().or(z.literal('')),
  smtp_from_name: z.string().max(255).nullable().optional(),
})

export async function GET() {
  try {
    const rows = await sql`
      SELECT
        smtp_mail_enabled,
        smtp_host,
        smtp_port,
        smtp_secure,
        smtp_user,
        smtp_from_email,
        smtp_from_name,
        (smtp_password IS NOT NULL AND smtp_password <> '') AS smtp_password_set
      FROM app_settings
      LIMIT 1
    `
    if (!rows.length) {
      return NextResponse.json({
        smtp_mail_enabled: false,
        smtp_host: null,
        smtp_port: 587,
        smtp_secure: false,
        smtp_user: null,
        smtp_from_email: null,
        smtp_from_name: null,
        smtp_password_set: false,
      })
    }
    const r = rows[0] as Record<string, unknown>
    return NextResponse.json({
      smtp_mail_enabled: r.smtp_mail_enabled ?? false,
      smtp_host: r.smtp_host,
      smtp_port: r.smtp_port ?? 587,
      smtp_secure: r.smtp_secure ?? false,
      smtp_user: r.smtp_user,
      smtp_from_email: r.smtp_from_email,
      smtp_from_name: r.smtp_from_name,
      smtp_password_set: r.smtp_password_set ?? false,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Instellingen laden mislukt'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const raw: unknown = await request.json()
    const data = PatchSettingsSchema.parse(raw)

    const sets: string[] = []
    const sqlParams: unknown[] = []
    let idx = 1

    if (data.smtp_mail_enabled !== undefined) {
      sets.push(`smtp_mail_enabled = $${idx++}`)
      sqlParams.push(data.smtp_mail_enabled)
    }
    if (data.smtp_host !== undefined) {
      sets.push(`smtp_host = $${idx++}`)
      sqlParams.push(data.smtp_host)
    }
    if (data.smtp_port !== undefined) {
      sets.push(`smtp_port = $${idx++}`)
      sqlParams.push(data.smtp_port)
    }
    if (data.smtp_secure !== undefined) {
      sets.push(`smtp_secure = $${idx++}`)
      sqlParams.push(data.smtp_secure)
    }
    if (data.smtp_user !== undefined) {
      sets.push(`smtp_user = $${idx++}`)
      sqlParams.push(data.smtp_user)
    }
    if (data.smtp_password !== undefined && data.smtp_password !== '') {
      sets.push(`smtp_password = $${idx++}`)
      sqlParams.push(data.smtp_password)
    }
    if (data.smtp_from_email !== undefined) {
      sets.push(`smtp_from_email = $${idx++}`)
      sqlParams.push(data.smtp_from_email === '' ? null : data.smtp_from_email)
    }
    if (data.smtp_from_name !== undefined) {
      sets.push(`smtp_from_name = $${idx++}`)
      sqlParams.push(data.smtp_from_name)
    }

    if (!sets.length) {
      return NextResponse.json({ error: 'Geen velden om bij te werken' }, { status: 400 })
    }

    await sql(
      `UPDATE app_settings SET ${sets.join(', ')}, updated_at = NOW()`,
      sqlParams
    )

    const rows = await sql`
      SELECT
        smtp_mail_enabled,
        smtp_host,
        smtp_port,
        smtp_secure,
        smtp_user,
        smtp_from_email,
        smtp_from_name,
        (smtp_password IS NOT NULL AND smtp_password <> '') AS smtp_password_set
      FROM app_settings
      LIMIT 1
    `
    const r = rows[0] as Record<string, unknown>
    return NextResponse.json({
      smtp_mail_enabled: r.smtp_mail_enabled ?? false,
      smtp_host: r.smtp_host,
      smtp_port: r.smtp_port ?? 587,
      smtp_secure: r.smtp_secure ?? false,
      smtp_user: r.smtp_user,
      smtp_from_email: r.smtp_from_email,
      smtp_from_name: r.smtp_from_name,
      smtp_password_set: r.smtp_password_set ?? false,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? 'Ongeldige invoer' },
        { status: 400 }
      )
    }
    const message = err instanceof Error ? err.message : 'Opslaan mislukt'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
