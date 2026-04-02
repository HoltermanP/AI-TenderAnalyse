import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import type { Tender, Analysis, CompanyInfo } from '@/lib/db'
import {
  recommendationToLabel,
  formatDate,
  formatCurrency,
  scoreToLabel,
} from '@/lib/utils'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  brand: { fontSize: 18, fontFamily: 'Helvetica-Bold' },
  brandAi: { color: '#2563eb' },
  date: { fontSize: 10, color: '#737373' },
  title: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 16,
    lineHeight: 1.35,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  metaItem: { marginRight: 20, marginBottom: 8, minWidth: 120 },
  metaLabel: {
    fontSize: 8,
    color: '#737373',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metaValue: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  scoreBox: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    gap: 24,
  },
  scoreNum: { fontSize: 36, fontFamily: 'Helvetica-Bold', color: '#2563eb' },
  recTitle: { fontSize: 8, color: '#737373', textTransform: 'uppercase', marginBottom: 4 },
  recommendation: { fontSize: 16, fontFamily: 'Helvetica-Bold' },
  section: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#2563eb',
    marginBottom: 8,
  },
  body: { lineHeight: 1.55, color: '#404040' },
  bullet: { marginBottom: 4, paddingLeft: 8, lineHeight: 1.45 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridHalf: { width: '48%' },
  footer: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    color: '#737373',
  },
  empty: { textAlign: 'center', color: '#737373', padding: 32, fontSize: 12 },
})

function recColor(
  rec: Analysis['recommendation']
): string {
  if (rec === 'bid') return '#16a34a'
  if (rec === 'no_bid') return '#ea580c'
  return '#d97706'
}

type Props = {
  tender: Tender
  analysis: Analysis | null
  company: CompanyInfo
  generatedDate: string
}

export function TenderAnalysisPdfDocument({
  tender,
  analysis,
  company,
  generatedDate,
}: Props) {
  const recLabel = analysis
    ? recommendationToLabel(analysis.recommendation)
    : '—'
  const scoreLabel = analysis?.score != null ? scoreToLabel(analysis.score) : '—'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>
            <Text style={styles.brandAi}>AI</Text>
            <Text>-TenderAnalyse</Text>
          </Text>
          <Text style={styles.date}>Rapport: {generatedDate}</Text>
        </View>

        <Text style={styles.title}>{tender.title}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Aanbestedende dienst</Text>
            <Text style={styles.metaValue}>
              {tender.contracting_authority ?? '—'}
            </Text>
          </View>
          {tender.deadline ? (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Deadline</Text>
              <Text style={styles.metaValue}>{formatDate(tender.deadline)}</Text>
            </View>
          ) : null}
          {tender.value != null ? (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Waarde</Text>
              <Text style={styles.metaValue}>
                {formatCurrency(tender.value, tender.currency ?? 'EUR')}
              </Text>
            </View>
          ) : null}
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Categorie</Text>
            <Text style={styles.metaValue}>{tender.category ?? '—'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Geanalyseerd door</Text>
            <Text style={styles.metaValue}>{company.name}</Text>
          </View>
        </View>

        {analysis ? (
          <>
            <View style={styles.scoreBox}>
              <View>
                <Text style={styles.recTitle}>Winkans score</Text>
                <Text style={styles.scoreNum}>{analysis.score ?? 0}</Text>
                <Text style={{ fontSize: 10, color: '#737373' }}>
                  / 100 — {scoreLabel}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.recTitle}>Aanbeveling</Text>
                <Text
                  style={[
                    styles.recommendation,
                    { color: recColor(analysis.recommendation) },
                  ]}
                >
                  {recLabel}
                </Text>
                <Text style={{ fontSize: 10, color: '#737373', marginTop: 4 }}>
                  Winkans: {analysis.win_probability ?? 0}%
                </Text>
                {analysis.effort_estimate ? (
                  <Text style={{ fontSize: 10, color: '#737373', marginTop: 2 }}>
                    Inspanning: {analysis.effort_estimate}
                  </Text>
                ) : null}
              </View>
            </View>

            {analysis.summary ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Samenvatting</Text>
                <Text style={styles.body}>{analysis.summary}</Text>
              </View>
            ) : null}

            <View style={styles.grid}>
              {analysis.strengths?.length ? (
                <View style={[styles.section, styles.gridHalf]}>
                  <Text style={styles.sectionTitle}>Sterktes</Text>
                  {analysis.strengths.map((s, i) => (
                    <Text key={i} style={styles.bullet}>
                      • {s}
                    </Text>
                  ))}
                </View>
              ) : null}
              {analysis.weaknesses?.length ? (
                <View style={[styles.section, styles.gridHalf]}>
                  <Text style={styles.sectionTitle}>Zwaktes</Text>
                  {analysis.weaknesses.map((w, i) => (
                    <Text key={i} style={styles.bullet}>
                      • {w}
                    </Text>
                  ))}
                </View>
              ) : null}
              {analysis.opportunities?.length ? (
                <View style={[styles.section, styles.gridHalf]}>
                  <Text style={styles.sectionTitle}>Kansen</Text>
                  {analysis.opportunities.map((o, i) => (
                    <Text key={i} style={styles.bullet}>
                      • {o}
                    </Text>
                  ))}
                </View>
              ) : null}
              {analysis.risks?.length ? (
                <View style={[styles.section, styles.gridHalf]}>
                  <Text style={styles.sectionTitle}>Risico’s</Text>
                  {analysis.risks.map((r, i) => (
                    <Text key={i} style={styles.bullet}>
                      • {r}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          </>
        ) : (
          <Text style={styles.empty}>
            Geen analyse beschikbaar voor deze tender.
          </Text>
        )}

        <View style={styles.footer} fixed>
          <Text>AI-TenderAnalyse — AI-Group.nl</Text>
          <Text>AI-FIRST · WE SHIP FAST</Text>
        </View>
      </Page>
    </Document>
  )
}
