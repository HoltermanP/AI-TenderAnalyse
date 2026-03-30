-- TenderNed-bijlagen: herkomst en deduplicatie
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) NOT NULL DEFAULT 'upload';

ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_source_check;

ALTER TABLE documents
  ADD CONSTRAINT documents_source_check CHECK (source IN ('upload', 'tenderned'));

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS external_document_id VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS documents_tender_external_uidx
  ON documents (tender_id, external_document_id)
  WHERE external_document_id IS NOT NULL;
