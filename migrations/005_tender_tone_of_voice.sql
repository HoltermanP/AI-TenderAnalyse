-- Per tender: tone of voice voor AI-analyse en chat (o.a. inschrijvingen)
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS tone_of_voice VARCHAR(64) NOT NULL DEFAULT 'professional';
