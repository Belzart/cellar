-- ============================================================
-- Cellar — Vibe System Migration
-- Replaces star rating with vibe-based review system
-- ============================================================

-- Add overall_reaction column (replaces numeric rating)
ALTER TABLE tastings
  ADD COLUMN IF NOT EXISTS overall_reaction TEXT
    CHECK (overall_reaction IN ('obsessed', 'loved_it', 'liked_it', 'okay', 'not_for_me'));

-- Add vibe tags as a text array
ALTER TABLE tastings
  ADD COLUMN IF NOT EXISTS vibe_tags TEXT[] NOT NULL DEFAULT '{}';

-- Add memory_note (friendly rename of notes — keep notes for backward compat)
ALTER TABLE tastings
  ADD COLUMN IF NOT EXISTS memory_note TEXT;

-- Add optional body score (1=very light, 5=very full-bodied)
ALTER TABLE tastings
  ADD COLUMN IF NOT EXISTS body_score INTEGER
    CHECK (body_score BETWEEN 1 AND 5);

-- Make rating nullable (it already was, but we now derive it from overall_reaction)
-- No schema change needed — rating REAL already allows NULL.

-- Backfill: derive overall_reaction from existing numeric ratings
UPDATE tastings SET overall_reaction =
  CASE
    WHEN rating >= 4.5 THEN 'obsessed'
    WHEN rating >= 3.5 THEN 'loved_it'
    WHEN rating >= 2.5 THEN 'liked_it'
    WHEN rating >= 1.5 THEN 'okay'
    WHEN rating IS NOT NULL THEN 'not_for_me'
    ELSE NULL
  END
WHERE overall_reaction IS NULL AND rating IS NOT NULL;

-- Backfill: copy notes -> memory_note for existing rows
UPDATE tastings
  SET memory_note = notes
WHERE memory_note IS NULL AND notes IS NOT NULL;

-- Index for vibe tag queries (GIN for array containment)
CREATE INDEX IF NOT EXISTS tastings_vibe_tags_idx ON tastings USING gin(vibe_tags);
CREATE INDEX IF NOT EXISTS tastings_overall_reaction_idx ON tastings(user_id, overall_reaction)
  WHERE overall_reaction IS NOT NULL;
