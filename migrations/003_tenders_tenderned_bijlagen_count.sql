-- Aantal bijlagen volgens TenderNed TNS (publicaties/{id}/documenten), voor weergave in overzicht
ALTER TABLE tenders
  ADD COLUMN IF NOT EXISTS tenderned_bijlagen_count INTEGER;

COMMENT ON COLUMN tenders.tenderned_bijlagen_count IS
  'Aantal documenten in TenderNed-lijst; bij NULL valt het overzicht terug op COUNT(documents).';
