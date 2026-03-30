-- Bedrijfsdocumenten (strategie, jaarplan, etc.): los van tender, wel in AI-analyse
ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_source_check;

ALTER TABLE documents
  ADD CONSTRAINT documents_source_check CHECK (source IN ('upload', 'tenderned', 'company'));
