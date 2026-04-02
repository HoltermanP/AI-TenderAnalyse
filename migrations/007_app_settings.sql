-- SMTP en app-instellingen (één rij)
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  smtp_mail_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  smtp_host VARCHAR(255),
  smtp_port INTEGER DEFAULT 587,
  smtp_secure BOOLEAN NOT NULL DEFAULT FALSE,
  smtp_user VARCHAR(255),
  smtp_password TEXT,
  smtp_from_email VARCHAR(255),
  smtp_from_name VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO app_settings (id)
SELECT uuid_generate_v4()
WHERE NOT EXISTS (SELECT 1 FROM app_settings LIMIT 1);

DROP TRIGGER IF EXISTS update_app_settings_updated_at ON app_settings;
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
