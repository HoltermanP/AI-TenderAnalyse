import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import type { Tender, Analysis, CompanyInfo } from '@/lib/db'
import {
  formatCurrency,
  formatDate,
  recommendationToLabel,
  scoreToLabel,
} from '@/lib/utils'

function bulletLines(lines: string[]): Paragraph[] {
  return lines.map((line) => new Paragraph(`• ${line}`))
}

export async function buildAnalysisDocxBuffer(params: {
  tender: Tender
  analysis: Analysis | null
  company: CompanyInfo
  generatedDate: string
}): Promise<Buffer> {
  const { tender, analysis, company, generatedDate } = params

  const children: Paragraph[] = [
    new Paragraph({
      text: 'AI-TenderAnalyse',
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Rapport: ', bold: true }),
        new TextRun(generatedDate),
      ],
    }),
    new Paragraph({ text: '' }),
    new Paragraph({
      text: tender.title,
      heading: HeadingLevel.HEADING_1,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Aanbestedende dienst: ', bold: true }),
        new TextRun(tender.contracting_authority ?? '—'),
      ],
    }),
  ]

  if (tender.deadline) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Deadline: ', bold: true }),
          new TextRun(formatDate(tender.deadline)),
        ],
      })
    )
  }
  if (tender.value != null) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Waarde: ', bold: true }),
          new TextRun(formatCurrency(tender.value, tender.currency ?? 'EUR')),
        ],
      })
    )
  }
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Categorie: ', bold: true }),
        new TextRun(tender.category ?? '—'),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Geanalyseerd door: ', bold: true }),
        new TextRun(company.name ?? '—'),
      ],
    })
  )

  if (analysis) {
    const recLabel = recommendationToLabel(analysis.recommendation)
    const scoreLabel = analysis.score != null ? scoreToLabel(analysis.score) : '—'

    children.push(
      new Paragraph({ text: '' }),
      new Paragraph({
        text: 'Beoordeling',
        heading: HeadingLevel.HEADING_2,
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Score: ', bold: true }),
          new TextRun(`${analysis.score ?? 0} / 100 (${scoreLabel})`),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Aanbeveling: ', bold: true }),
          new TextRun(recLabel),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Winkans: ', bold: true }),
          new TextRun(`${analysis.win_probability ?? 0}%`),
        ],
      })
    )

    if (analysis.effort_estimate) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Inspanning: ', bold: true }),
            new TextRun(analysis.effort_estimate),
          ],
        })
      )
    }

    if (analysis.summary) {
      children.push(
        new Paragraph({ text: '' }),
        new Paragraph({
          text: 'Samenvatting',
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph(analysis.summary)
      )
    }

    const sections: { title: string; items: string[] | null }[] = [
      { title: 'Sterktes', items: analysis.strengths },
      { title: 'Zwaktes', items: analysis.weaknesses },
      { title: 'Kansen', items: analysis.opportunities },
      { title: 'Risico’s', items: analysis.risks },
    ]

    for (const { title, items } of sections) {
      if (items?.length) {
        children.push(
          new Paragraph({ text: '' }),
          new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_2,
          }),
          ...bulletLines(items)
        )
      }
    }
  } else {
    children.push(
      new Paragraph({ text: '' }),
      new Paragraph('Geen analyse beschikbaar voor deze tender.')
    )
  }

  children.push(
    new Paragraph({ text: '' }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'AI-TenderAnalyse — AI-Group.nl',
          italics: true,
        }),
      ],
    })
  )

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  })

  return Buffer.from(await Packer.toBuffer(doc))
}
