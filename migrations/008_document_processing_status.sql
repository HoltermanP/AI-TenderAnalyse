-- Status voor TenderNed-download naar Blob en AI-samenvatting per document (realtime UI)
ALTER TABLE documents
  ALTER COLUMN blob_url DROP NOT NULL;

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS blob_status VARCHAR(32);

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS summary_status VARCHAR(32);

UPDATE documents
SET blob_status = 'synced'
WHERE blob_url IS NOT NULL AND blob_status IS NULL;

UPDATE documents
SET blob_status = 'failed'
WHERE blob_url IS NULL AND blob_status IS NULL;

UPDATE documents
SET summary_status = 'done'
WHERE summary IS NOT NULL
  AND btrim(summary) <> ''
  AND btrim(summary) NOT LIKE '[%'
  AND summary_status IS NULL;

UPDATE documents
SET summary_status = 'pending'
WHERE summary_status IS NULL;

ALTER TABLE documents
  ALTER COLUMN blob_status SET DEFAULT 'synced';

ALTER TABLE documents
  ALTER COLUMN summary_status SET DEFAULT 'pending';

ALTER TABLE documents
  ALTER COLUMN blob_status SET NOT NULL;

ALTER TABLE documents
  ALTER COLUMN summary_status SET NOT NULL;
