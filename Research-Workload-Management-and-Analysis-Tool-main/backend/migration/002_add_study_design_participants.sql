-- Migration: Add study_design and participants fields to research_papers
-- Date: 2026

ALTER TABLE research_papers 
ADD COLUMN IF NOT EXISTS study_design TEXT,
ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '{"description": "", "sample_size": ""}'::jsonb;

-- Optional: Index for study_design queries
CREATE INDEX IF NOT EXISTS idx_research_papers_study_design ON research_papers(study_design);