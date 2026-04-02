export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { sql } from '@/lib/db'
import type { Tender, Analysis } from '@/lib/db'
import { buildAnalysisEmailHtml } from '@/lib/analysisEmailHtml'
import { z } from 'zod'

const BodySchema = z.object({
  tenderId: z.string().min(1),
  to: z.string().email(),
  subject: z.string().min(1).max(500).optional(),
})

function smtpConfigured(row: {
  smtp_mail_enabled: boolean
  smtp_host: string | null
  smtp_from_email: string | null
  smtp_password_set: boolean
}): boolean {
  return (
    row.smtp_mail_enabled === true &&
    !!row.smtp_host?.trim() &&
    !!row.smtp_from_email?.trim() &&
    row.smtp_password_set === true
  )
}

export async function POST(request: NextRequest) {
  try {
    const raw: unknown = await request.json()
    const { tenderId, to, subject } = BodySchema.parse(raw)

    const settingsRows = await sql`
      SELECT
        smtp_mail_enabled,
        smtp_host,
        smtp_port,
        smtp_secure,
        smtp_user,
        smtp_password,
        smtp_from_email,
        smtp_from_name,
        (smtp_password IS NOT NULL AND smtp_password <> '') AS smtp_password_set
      FROM app_settings
      LIMIT 1
    `

    if (!settingsRows.length) {
      return NextResponse.json(
        { error: 'E-mail is niet geconfigureerd. Vul SMTP in bij Instellingen.' },
        { status: 400 }
      )
    }

    const s = settingsRows[0] as {
      smtp_mail_enabled: boolean
      smtp_host: string | null
      smtp_port: number | null
      smtp_secure: boolean
      smtp_user: string | null
      smtp_password: string | null
      smtp_from_email: string | null
      smtp_from_name: string | null
      smtp_password_set: boolean
    }

    if (!smtpConfigured(s)) {
      return NextResponse.json(
        {
          error:
            'E-mail versturen staat uit of SMTP is onvolledig. Zet e-mail aan en vul alle gegevens in bij Instellingen.',
        },
        { status: 403 }
      )
    }

    const tenderRows = await sql`SELECT * FROM tenders WHERE id = ${tenderId}`
    if (!tenderRows.length) {
      return NextResponse.json({ error: 'Tender niet gevonden' }, { status: 404 })
    }
    const tender = tenderRows[0] as Tender

    const analysisRows = await sql`SELECT * FROM analyses WHERE tender_id = ${tenderId}`
    if (!analysisRows.length) {
      return NextResponse.json({ error: 'Geen analyse voor deze tender' }, { status: 404 })
    }
    const analysis = analysisRows[0] as Analysis

    const companyRows =
      await sql`SELECT name FROM company_info ORDER BY updated_at DESC NULLS LAST LIMIT 1`
    const companyName =
      (companyRows[0] as { name?: string } | undefined)?.name ?? 'Mijn bedrijf'

    const port = s.smtp_port ?? 587
    const transporter = nodemailer.createTransport({
      host: s.smtp_host!,
      port,
      secure: s.smtp_secure,
      auth:
        s.smtp_user && s.smtp_password
          ? { user: s.smtp_user, pass: s.smtp_password }
          : undefined,
    })

    const html = buildAnalysisEmailHtml({ tender, analysis, companyName })
    const subj =
      subject ?? `Tenderanalyse: ${tender.title}`.slice(0, 500)

    const from =
      s.smtp_from_name && s.smtp_from_email
        ? `"${s.smtp_from_name.replace(/"/g, '')}" <${s.smtp_from_email}>`
        : s.smtp_from_email!

    await transporter.sendMail({
      from,
      to,
      subject: subj,
      html,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? 'Ongeldige invoer' },
        { status: 400 }
      )
    }
    const message = err instanceof Error ? err.message : 'E-mail versturen mislukt'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
