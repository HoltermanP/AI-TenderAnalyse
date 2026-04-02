-- effort_estimate kan door het model langer zijn dan 500 tekens (toelichting + tone of voice).
ALTER TABLE analyses
  ALTER COLUMN effort_estimate TYPE TEXT;
