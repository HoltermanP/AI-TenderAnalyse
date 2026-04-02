/** Browser-event om live polling van documentstatus te starten/stoppen tijdens sync/analyse */
export const TENDER_DOCUMENTS_PROGRESS = 'tender-documents-progress' as const

export type TenderDocumentsProgressDetail = {
  tenderId: string
  phase: 'start' | 'end'
}

export function emitTenderDocumentsProgress(
  tenderId: string,
  phase: 'start' | 'end'
): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(TENDER_DOCUMENTS_PROGRESS, {
      detail: { tenderId, phase } satisfies TenderDocumentsProgressDetail,
    })
  )
}
