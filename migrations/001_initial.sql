-- AI-TenderAnalyse Database Schema
-- Migration: 001_initial
-- Description: Initial database setup

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Company info (single row configuration)
CREATE TABLE IF NOT EXISTS company_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL DEFAULT '',
  description TEXT,
  strengths TEXT[] DEFAULT '{}',
  certifications TEXT[] DEFAULT '{}',
  sectors TEXT[] DEFAULT '{}',
  revenue_range VARCHAR(100),
  employee_count VARCHAR(100),
  founded_year INTEGER,
  website VARCHAR(255),
  kvk_number VARCHAR(20),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default company info row
INSERT INTO company_info (name) VALUES ('Mijn Bedrijf')
ON CONFLICT DO NOTHING;

-- Tenders
CREATE TABLE IF NOT EXISTS tenders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id VARCHAR(255) UNIQUE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  contracting_authority VARCHAR(255),
  deadline TIMESTAMPTZ,
  publication_date TIMESTAMPTZ,
  value DECIMAL(15, 2),
  currency VARCHAR(10) DEFAULT 'EUR',
  category VARCHAR(255),
  status VARCHAR(50) DEFAULT 'new' CHECK (
    status IN ('new', 'in_progress', 'analysed', 'bid', 'no_bid', 'won', 'lost')
  ),
  source VARCHAR(50) DEFAULT 'manual' CHECK (
    source IN ('tenderned', 'manual', 'import')
  ),
  url TEXT,
  cpv_codes TEXT[] DEFAULT '{}',
  nuts_codes TEXT[] DEFAULT '{}',
  procedure_type VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tenders_status_idx ON tenders(status);
CREATE INDEX IF NOT EXISTS tenders_deadline_idx ON tenders(deadline);
CREATE INDEX IF NOT EXISTS tenders_created_at_idx ON tenders(created_at DESC);

-- Analyses
CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  score INTEGER CHECK (score BETWEEN 0 AND 100),
  recommendation VARCHAR(20) CHECK (recommendation IN ('bid', 'no_bid', 'review')),
  summary TEXT,
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  risks TEXT[] DEFAULT '{}',
  opportunities TEXT[] DEFAULT '{}',
  win_probability INTEGER CHECK (win_probability BETWEEN 0 AND 100),
  effort_estimate VARCHAR(500),
  raw_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tender_id)
);

CREATE INDEX IF NOT EXISTS analyses_tender_id_idx ON analyses(tender_id);
CREATE INDEX IF NOT EXISTS analyses_recommendation_idx ON analyses(recommendation);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL,
  name VARCHAR(500) NOT NULL,
  type VARCHAR(100) NOT NULL,
  size INTEGER NOT NULL,
  blob_url TEXT NOT NULL,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS documents_tender_id_idx ON documents(tender_id);

-- Chat sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id VARCHAR(255) PRIMARY KEY,
  tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL,
  title VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id VARCHAR(255) NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_messages_session_id_idx ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages(created_at);

-- Lessons learned
CREATE TABLE IF NOT EXISTS lessons_learned (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  outcome VARCHAR(20) DEFAULT 'neutral' CHECK (outcome IN ('positive', 'negative', 'neutral')),
  category VARCHAR(100),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lessons_learned_outcome_idx ON lessons_learned(outcome);
CREATE INDEX IF NOT EXISTS lessons_learned_category_idx ON lessons_learned(category);

-- PDF exports
CREATE TABLE IF NOT EXISTS pdf_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL,
  name VARCHAR(500) NOT NULL,
  blob_url TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'analysis' CHECK (type IN ('analysis', 'report', 'presentation')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pdf_exports_tender_id_idx ON pdf_exports(tender_id);

-- Trigger to update updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenders_updated_at
  BEFORE UPDATE ON tenders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analyses_updated_at
  BEFORE UPDATE ON analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_learned_updated_at
  BEFORE UPDATE ON lessons_learned
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_info_updated_at
  BEFORE UPDATE ON company_info
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
