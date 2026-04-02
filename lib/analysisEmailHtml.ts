import type { Tender, Analysis } from '@/lib/db'
import {
  formatCurrency,
  formatDate,
  recommendationToLabel,
  scoreToLabel,
} from '@/lib/utils'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function listHtml(title: string, items: string[] | null): string {
  if (!items?.length) return ''
  const lis = items.map((x) => `<li>${esc(x)}</li>`).join('')
  return `<h3>${esc(title)}</h3><ul>${lis}</ul>`
}

export function buildAnalysisEmailHtml(params: {
  tender: Tender
  analysis: Analysis
  companyName: string
}): string {
  const { tender, analysis, companyName } = params
  const rec = recommendationToLabel(analysis.recommendation)
  const scoreLab = analysis.score != null ? scoreToLabel(analysis.score) : '—'

  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8" /></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #1a1a1a;">
  <p style="font-size: 12px; color: #666;">AI-TenderAnalyse — ${esc(companyName)}</p>
  <h1 style="font-size: 20px;">${esc(tender.title)}</h1>
  <p><strong>Aanbestedende dienst:</strong> ${esc(tender.contracting_authority ?? '—')}</p>
  ${tender.deadline ? `<p><strong>Deadline:</strong> ${esc(formatDate(tender.deadline))}</p>` : ''}
  ${tender.value != null ? `<p><strong>Waarde:</strong> ${esc(formatCurrency(tender.value, tender.currency ?? 'EUR'))}</p>` : ''}
  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 16px 0;" />
  <p><strong>Score:</strong> ${analysis.score ?? 0} / 100 (${esc(scoreLab)})</p>
  <p><strong>Aanbeveling:</strong> ${esc(rec)}</p>
  <p><strong>Winkans:</strong> ${analysis.win_probability ?? 0}%</p>
  ${analysis.effort_estimate ? `<p><strong>Inspanning:</strong> ${esc(analysis.effort_estimate)}</p>` : ''}
  ${analysis.summary ? `<h2>Samenvatting</h2><p>${esc(analysis.summary).replace(/\n/g, '<br/>')}</p>` : ''}
  ${listHtml('Sterktes', analysis.strengths)}
  ${listHtml('Zwaktes', analysis.weaknesses)}
  ${listHtml('Kansen', analysis.opportunities)}
  ${listHtml('Risico’s', analysis.risks)}
  <p style="font-size: 11px; color: #888; margin-top: 24px;">Verzonden via AI-TenderAnalyse</p>
</body>
</html>`
}
