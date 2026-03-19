-- ============================================================
-- Migration 003: Cellar Inventory + User Settings
-- Run in: Supabase → SQL Editor
-- ============================================================

-- ── Add cellar_name to user_profiles ─────────────────────
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS cellar_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS email TEXT DEFAULT NULL;

-- ── Cellar Inventory ──────────────────────────────────────
-- Tracks physical bottles the user currently has at home.
-- One row per wine. Quantity decrements as bottles are drunk.
CREATE TABLE IF NOT EXISTS cellar_inventory (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wine_id               UUID NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
  quantity              INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  purchase_date         DATE,
  purchase_price_cents  INTEGER,          -- stored in cents
  purchase_currency     TEXT DEFAULT 'USD',
  storage_note          TEXT,             -- "basement rack", "wine fridge", etc.
  added_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One row per user/wine combination
  UNIQUE(user_id, wine_id)
);

-- RLS
ALTER TABLE cellar_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own inventory"
  ON cellar_inventory FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cellar_inventory_user ON cellar_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_cellar_inventory_wine ON cellar_inventory(wine_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON cellar_inventory
  FOR EACH ROW EXECUTE FUNCTION update_inventory_updated_at();
