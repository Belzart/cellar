-- ============================================================
-- Cellar — Initial Schema
-- Run this in your Supabase SQL editor or via supabase db push
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- for fuzzy text search

-- ============================================================
-- USER PROFILES
-- Extends auth.users with app-specific data
-- ============================================================
CREATE TABLE user_profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- WINES
-- Canonical wine records. Grows entirely from user scans.
-- ============================================================
CREATE TABLE wines (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name         TEXT NOT NULL,
  producer               TEXT,
  wine_name              TEXT,
  vintage                INTEGER CHECK (vintage > 1800 AND vintage < 2100),
  region                 TEXT,
  country                TEXT,
  appellation            TEXT,
  varietal               TEXT,                      -- primary varietal
  blend_components       JSONB NOT NULL DEFAULT '[]', -- [{varietal, percentage?}]
  style                  TEXT CHECK (style IN (
                           'red','white','rosé','sparkling',
                           'dessert','fortified','orange','other'
                         )),
  -- Normalized for fuzzy search — updated by trigger
  normalized_search_text TEXT,
  primary_label_image_url TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to keep normalized_search_text in sync
CREATE OR REPLACE FUNCTION update_wine_search_text()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.normalized_search_text := lower(
    coalesce(NEW.canonical_name, '') || ' ' ||
    coalesce(NEW.producer, '') || ' ' ||
    coalesce(NEW.wine_name, '') || ' ' ||
    coalesce(NEW.region, '') || ' ' ||
    coalesce(NEW.country, '') || ' ' ||
    coalesce(NEW.appellation, '') || ' ' ||
    coalesce(NEW.varietal, '') || ' ' ||
    coalesce(NEW.vintage::text, '')
  );
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER wines_search_text_sync
  BEFORE INSERT OR UPDATE ON wines
  FOR EACH ROW EXECUTE FUNCTION update_wine_search_text();

-- Indexes for wines
CREATE INDEX wines_trgm_idx ON wines USING gin(normalized_search_text gin_trgm_ops);
CREATE INDEX wines_producer_idx ON wines(producer);
CREATE INDEX wines_vintage_idx ON wines(vintage);
CREATE INDEX wines_style_idx ON wines(style);
CREATE INDEX wines_varietal_idx ON wines(varietal);
CREATE INDEX wines_country_idx ON wines(country);

-- ============================================================
-- WINE ALIASES
-- Maps raw OCR/extracted text to canonical wine records.
-- Enables fuzzy deduplication over time.
-- ============================================================
CREATE TABLE wine_aliases (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wine_id    UUID NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
  raw_name   TEXT NOT NULL,
  source     TEXT NOT NULL CHECK (source IN ('ocr', 'manual', 'api')),
  confidence REAL NOT NULL DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(wine_id, raw_name)
);

CREATE INDEX wine_aliases_wine_id_idx ON wine_aliases(wine_id);
CREATE INDEX wine_aliases_raw_name_trgm ON wine_aliases USING gin(lower(raw_name) gin_trgm_ops);

-- ============================================================
-- UPLOADED IMAGES
-- All images the user uploads — labels and shelf photos.
-- Original files are preserved in Supabase Storage.
-- ============================================================
CREATE TABLE uploaded_images (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type              TEXT NOT NULL CHECK (type IN ('label', 'shelf', 'other')),
  storage_path      TEXT NOT NULL,           -- path inside the bucket
  storage_bucket    TEXT NOT NULL DEFAULT 'cellar-images',
  original_filename TEXT,
  mime_type         TEXT,
  width             INTEGER,
  height            INTEGER,
  file_size_bytes   INTEGER,
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX uploaded_images_user_id_idx ON uploaded_images(user_id);
CREATE INDEX uploaded_images_type_idx    ON uploaded_images(type, user_id);

-- ============================================================
-- EXTRACTION JOBS
-- Tracks the async AI vision pipeline for each image.
-- raw_model_output is always preserved for auditability.
-- ============================================================
CREATE TABLE extraction_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploaded_image_id UUID NOT NULL REFERENCES uploaded_images(id) ON DELETE CASCADE,
  job_type          TEXT NOT NULL DEFAULT 'label' CHECK (job_type IN ('label', 'shelf')),
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (
                      status IN ('pending','processing','completed','failed')
                    ),
  raw_model_output  JSONB,    -- full response from AI model, never modified
  parsed_output     JSONB,    -- structured, validated extraction result
  confidence        REAL CHECK (confidence >= 0 AND confidence <= 1),
  error_message     TEXT,
  retry_count       INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ
);

CREATE INDEX extraction_jobs_user_id_idx          ON extraction_jobs(user_id);
CREATE INDEX extraction_jobs_status_idx           ON extraction_jobs(status);
CREATE INDEX extraction_jobs_uploaded_image_idx   ON extraction_jobs(uploaded_image_id);

-- ============================================================
-- TASTINGS
-- The heart of the app — one row per drinking event.
-- ============================================================
CREATE TABLE tastings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wine_id           UUID NOT NULL REFERENCES wines(id) ON DELETE RESTRICT,
  uploaded_image_id UUID REFERENCES uploaded_images(id) ON DELETE SET NULL,
  tasted_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  location_text     TEXT,
  rating            REAL CHECK (rating >= 1 AND rating <= 5),  -- 0.5 increments
  notes             TEXT,
  would_drink_again BOOLEAN,
  is_favorite       BOOLEAN NOT NULL DEFAULT FALSE,
  price_paid_cents  INTEGER CHECK (price_paid_cents >= 0),  -- cents, avoid floats
  price_currency    TEXT NOT NULL DEFAULT 'USD',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION tastings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER tastings_set_updated_at
  BEFORE UPDATE ON tastings
  FOR EACH ROW EXECUTE FUNCTION tastings_updated_at();

CREATE INDEX tastings_user_id_idx   ON tastings(user_id);
CREATE INDEX tastings_wine_id_idx   ON tastings(wine_id);
CREATE INDEX tastings_tasted_at_idx ON tastings(user_id, tasted_at DESC);
CREATE INDEX tastings_favorites_idx ON tastings(user_id, is_favorite)
  WHERE is_favorite = TRUE;
CREATE INDEX tastings_rating_idx    ON tastings(user_id, rating DESC)
  WHERE rating IS NOT NULL;

-- ============================================================
-- TASTE PROFILE SNAPSHOTS
-- Recomputed after every tasting save.
-- Rules-based: weighted avg by varietal, region, recency.
-- ============================================================
CREATE TABLE taste_profile_snapshots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tasting_count       INTEGER NOT NULL DEFAULT 0,
  preferred_varietals JSONB NOT NULL DEFAULT '[]',  -- [{varietal, avg_rating, count, weight}]
  preferred_regions   JSONB NOT NULL DEFAULT '[]',  -- [{region, country, avg_rating, count, weight}]
  preferred_styles    JSONB NOT NULL DEFAULT '[]',  -- [{style, avg_rating, count, percentage}]
  disliked_patterns   JSONB NOT NULL DEFAULT '[]',  -- [{type, value, avg_rating, count}]
  insights            JSONB NOT NULL DEFAULT '[]',  -- [{type, text, confidence, supporting_count}]
  raw_stats           JSONB                         -- full data for future ML use
);

CREATE INDEX taste_profile_user_computed_idx
  ON taste_profile_snapshots(user_id, computed_at DESC);

-- ============================================================
-- RECOMMENDATION SESSIONS
-- Each shelf-photo upload creates one session.
-- ============================================================
CREATE TABLE recommendation_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploaded_image_id UUID REFERENCES uploaded_images(id) ON DELETE SET NULL,
  session_type      TEXT NOT NULL DEFAULT 'shelf' CHECK (session_type IN ('shelf','manual')),
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (
                      status IN ('pending','processing','completed','failed')
                    ),
  model_version     TEXT,
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);

CREATE INDEX recommendation_sessions_user_id_idx ON recommendation_sessions(user_id);
CREATE INDEX recommendation_sessions_status_idx  ON recommendation_sessions(status);

-- ============================================================
-- RECOMMENDATION CANDIDATES
-- Each bottle identified in a shelf photo.
-- ============================================================
CREATE TABLE recommendation_candidates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            UUID NOT NULL REFERENCES recommendation_sessions(id) ON DELETE CASCADE,
  candidate_name_raw    TEXT NOT NULL,
  candidate_producer_raw TEXT,
  candidate_vintage_raw INTEGER,
  candidate_varietal_raw TEXT,
  candidate_region_raw  TEXT,
  matched_wine_id       UUID REFERENCES wines(id) ON DELETE SET NULL,
  match_confidence      REAL NOT NULL DEFAULT 0 CHECK (match_confidence >= 0 AND match_confidence <= 1),
  palate_score          REAL NOT NULL DEFAULT 0 CHECK (palate_score >= 0 AND palate_score <= 1),
  final_score           REAL NOT NULL DEFAULT 0 CHECK (final_score >= 0 AND final_score <= 1),
  recommendation_tier   TEXT CHECK (recommendation_tier IN ('best_match','safe_bet','wildcard','avoid')),
  explanation_text      TEXT,
  extracted_data        JSONB,
  rank_position         INTEGER,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX recommendation_candidates_session_idx ON recommendation_candidates(session_id);
CREATE INDEX recommendation_candidates_score_idx   ON recommendation_candidates(session_id, final_score DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- All tables are private to the authenticated user.
-- Wines are semi-shared: any authenticated user can read/write
-- (single-user app initially, but ready to expand).
-- ============================================================

ALTER TABLE user_profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE wines                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE wine_aliases             ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_images          ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_jobs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tastings                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE taste_profile_snapshots  ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_candidates ENABLE ROW LEVEL SECURITY;

-- user_profiles
CREATE POLICY "own profile" ON user_profiles
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- wines (readable and writable by any authenticated user)
CREATE POLICY "auth read wines"   ON wines FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert wines" ON wines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update wines" ON wines FOR UPDATE TO authenticated USING (true);

-- wine_aliases
CREATE POLICY "auth read aliases"   ON wine_aliases FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert aliases" ON wine_aliases FOR INSERT TO authenticated WITH CHECK (true);

-- uploaded_images
CREATE POLICY "own images" ON uploaded_images
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- extraction_jobs
CREATE POLICY "own jobs" ON extraction_jobs
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- tastings
CREATE POLICY "own tastings" ON tastings
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- taste_profile_snapshots
CREATE POLICY "own profiles" ON taste_profile_snapshots
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- recommendation_sessions
CREATE POLICY "own sessions" ON recommendation_sessions
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- recommendation_candidates (access via session ownership)
CREATE POLICY "own candidates" ON recommendation_candidates
  USING (
    EXISTS (
      SELECT 1 FROM recommendation_sessions rs
      WHERE rs.id = recommendation_candidates.session_id
        AND rs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recommendation_sessions rs
      WHERE rs.id = recommendation_candidates.session_id
        AND rs.user_id = auth.uid()
    )
  );

-- ============================================================
-- STORAGE SETUP
-- Run this AFTER creating the bucket "cellar-images" in the
-- Supabase dashboard (set it to private).
-- ============================================================

-- Storage RLS (run in Supabase dashboard → Storage → Policies)
-- Policy: Users can upload to their own folder
-- Bucket: cellar-images
-- Folder structure: {user_id}/{type}/{filename}
--
-- INSERT policy:
-- (bucket_id = 'cellar-images' AND auth.uid()::text = (storage.foldername(name))[1])
--
-- SELECT policy:
-- (bucket_id = 'cellar-images' AND auth.uid()::text = (storage.foldername(name))[1])
