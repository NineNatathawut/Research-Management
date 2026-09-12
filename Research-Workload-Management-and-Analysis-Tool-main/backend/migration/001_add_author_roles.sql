-- Migration: Add author role columns to paper_authors table
-- Phase 1: Two-Stage Author Role Identification System
-- Date: 2026-09-10

-- 1. Add new columns for author role identification
ALTER TABLE paper_authors 
  ADD COLUMN IF NOT EXISTS is_co_first_author BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_co_corresponding BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS author_order INTEGER;

-- 2. Backfill author_order from existing insertion order
-- Using ROW_NUMBER() partitioned by paper_id, ordered by existing id (insertion order)
UPDATE paper_authors 
SET author_order = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY paper_id ORDER BY id) as rn
  FROM paper_authors
) sub
WHERE paper_authors.id = sub.id;

-- 3. Add index for performance on role-based queries
CREATE INDEX IF NOT EXISTS idx_paper_authors_roles 
ON paper_authors (is_first_author, is_corresponding, is_co_first_author, is_co_corresponding);

-- 4. Add index for author_order queries
CREATE INDEX IF NOT EXISTS idx_paper_authors_order 
ON paper_authors (paper_id, author_order);

-- 5. Optional: Add comment for documentation
COMMENT ON COLUMN paper_authors.is_co_first_author IS 'True if author is co-first author (equal contribution)';
COMMENT ON COLUMN paper_authors.is_co_corresponding IS 'True if author is co-corresponding author (multiple corresponding authors)';
COMMENT ON COLUMN paper_authors.author_order IS 'Position of author in the author list (1, 2, 3, ...)';