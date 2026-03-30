export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import type { Tender, Analysis, CompanyInfo } from '@/lib/db'
import { recommendationToLabel, formatDate, formatCurrency, scoreToLabel } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { tenderId: string }
    const { tenderId } = body

    if (!tenderId) {
      return NextResponse.json({ error: 'tenderId is verplicht' }, { status: 400 })
    }

    // Fetch data
    const tenderRows = await sql`SELECT * FROM tenders WHERE id = ${tenderId}`
    if (!tenderRows.length) {
      return NextResponse.json({ error: 'Tender niet gevonden' }, { status: 404 })
    }
    const tender = tenderRows[0] as Tender

    const analysisRows = await sql`SELECT * FROM analyses WHERE tender_id = ${tenderId}`
    const analysis = (analysisRows[0] as Analysis) ?? null

    const companyRows = await sql`SELECT * FROM company_info LIMIT 1`
    const company = (companyRows[0] as CompanyInfo) ?? { name: 'Mijn Bedrijf' }

    // Generate HTML-based PDF content
    const html = generateAnalysisHtml(tender, analysis, company)

    // Return as HTML for browser printing / PDF conversion
    // In production, you would use a PDF library like @react-pdf/renderer or Puppeteer
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="tender-analyse-${tender.id.slice(0, 8)}.html"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'PDF genereren mislukt'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function generateAnalysisHtml(
  tender: Tender,
  analysis: Analysis | null,
  company: CompanyInfo
): string {
  const date = new Date().toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const recLabel = analysis ? recommendationToLabel(analysis.recommendation) : '—'
  const scoreLabel = analysis?.score ? scoreToLabel(analysis.score) : '—'

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <title>Tender Analyse — ${tender.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=IBM+Plex+Mono:wght@400;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Space Grotesk', sans-serif; background: #0A0A0B; color: #F4F6FA; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #1E1E28; }
    .logo { font-size: 24px; font-weight: 700; }
    .logo .ai { color: #4B8EFF; }
    .date { color: #6B82A8; font-size: 14px; }
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; line-height: 1.3; }
    h2 { font-size: 18px; font-weight: 600; color: #4B8EFF; margin: 24px 0 12px; }
    .meta { display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 32px; }
    .meta-item { display: flex; flex-direction: column; gap: 2px; }
    .meta-label { font-size: 11px; color: #6B82A8; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'IBM Plex Mono', monospace; }
    .meta-value { font-size: 15px; font-weight: 600; }
    .score-box { background: #111116; border: 1px solid #1E1E28; border-radius: 12px; padding: 24px; display: flex; gap: 32px; align-items: center; margin-bottom: 24px; }
    .score-number { font-family: 'IBM Plex Mono', monospace; font-size: 48px; font-weight: 700; color: #4B8EFF; line-height: 1; }
    .recommendation { font-size: 20px; font-weight: 700; color: ${analysis?.recommendation === 'bid' ? '#22c55e' : analysis?.recommendation === 'no_bid' ? '#FF4D1C' : '#f59e0b'}; }
    .section { background: #111116; border: 1px solid #1E1E28; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .summary { line-height: 1.7; color: #d0d8e8; margin-bottom: 16px; }
    ul { list-style: none; padding: 0; }
    li { padding: 6px 0 6px 20px; position: relative; color: #d0d8e8; font-size: 14px; line-height: 1.5; }
    li::before { content: '•'; position: absolute; left: 0; color: #4B8EFF; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #1E1E28; display: flex; justify-content: space-between; color: #6B82A8; font-size: 12px; font-family: 'IBM Plex Mono', monospace; }
    @media print { body { background: white; color: black; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo"><span class="ai">AI</span>-TenderAnalyse</div>
    <div class="date">Rapport gegenereerd op ${date}</div>
  </div>

  <h1>${tender.title}</h1>

  <div class="meta">
    <div class="meta-item">
      <span class="meta-label">Aanbestedende dienst</span>
      <span class="meta-value">${tender.contracting_authority ?? '—'}</span>
    </div>
    ${tender.deadline ? `<div class="meta-item">
      <span class="meta-label">Deadline</span>
      <span class="meta-value">${formatDate(tender.deadline)}</span>
    </div>` : ''}
    ${tender.value ? `<div class="meta-item">
      <span class="meta-label">Waarde</span>
      <span class="meta-value">${formatCurrency(tender.value)}</span>
    </div>` : ''}
    <div class="meta-item">
      <span class="meta-label">Categorie</span>
      <span class="meta-value">${tender.category ?? '—'}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Geanalyseerd door</span>
      <span class="meta-value">${company.name}</span>
    </div>
  </div>

  ${analysis ? `
  <div class="score-box">
    <div>
      <div style="color: #6B82A8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'IBM Plex Mono', monospace; margin-bottom: 4px;">Winkans Score</div>
      <div class="score-number">${analysis.score ?? 0}</div>
      <div style="color: #6B82A8; font-size: 13px;">/ 100 — ${scoreLabel}</div>
    </div>
    <div style="flex: 1;">
      <div style="color: #6B82A8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'IBM Plex Mono', monospace; margin-bottom: 8px;">Aanbeveling</div>
      <div class="recommendation">${recLabel}</div>
      <div style="color: #6B82A8; font-size: 14px; margin-top: 4px;">Winkans: ${analysis.win_probability ?? 0}%</div>
      ${analysis.effort_estimate ? `<div style="color: #6B82A8; font-size: 13px; margin-top: 4px;">Inspanning: ${analysis.effort_estimate}</div>` : ''}
    </div>
  </div>

  ${analysis.summary ? `
  <div class="section">
    <h2>Samenvatting</h2>
    <p class="summary">${analysis.summary}</p>
  </div>` : ''}

  <div class="grid-2">
    ${analysis.strengths?.length ? `
    <div class="section">
      <h2>Sterktes</h2>
      <ul>${analysis.strengths.map((s) => `<li>${s}</li>`).join('')}</ul>
    </div>` : ''}

    ${analysis.weaknesses?.length ? `
    <div class="section">
      <h2>Zwaktes</h2>
      <ul>${analysis.weaknesses.map((w) => `<li>${w}</li>`).join('')}</ul>
    </div>` : ''}

    ${analysis.opportunities?.length ? `
    <div class="section">
      <h2>Kansen</h2>
      <ul>${analysis.opportunities.map((o) => `<li>${o}</li>`).join('')}</ul>
    </div>` : ''}

    ${analysis.risks?.length ? `
    <div class="section">
      <h2>Risicos</h2>
      <ul>${analysis.risks.map((r) => `<li>${r}</li>`).join('')}</ul>
    </div>` : ''}
  </div>
  ` : '<p style="color: #6B82A8; text-align: center; padding: 48px;">Geen analyse beschikbaar voor deze tender.</p>'}

  <div class="footer">
    <span>AI-TenderAnalyse — AI-Group.nl</span>
    <span>AI-FIRST · WE SHIP FAST</span>
  </div>
</body>
</html>`
}
