-- ============================================================
-- Migration 004 — Bite: Nutrition Tracking
-- ============================================================

-- ── Nutrition Goals ──────────────────────────────────────────
create table if not exists nutrition_goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  calories_goal int  not null default 2000,
  protein_g_goal int not null default 150,
  carbs_g_goal  int  not null default 200,
  fat_g_goal    int  not null default 65,
  water_ml_goal int  not null default 2500,
  steps_goal    int  not null default 10000,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(user_id)
);

-- ── Meal Entries ─────────────────────────────────────────────
create table if not exists meal_entries (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  logged_at          timestamptz not null default now(),
  meal_type          text not null default 'snack'
                       check (meal_type in ('breakfast','lunch','dinner','snack')),
  source             text not null default 'manual'
                       check (source in ('manual','ai_text','ai_photo','barcode','saved_food','saved_meal')),
  -- user's raw input if text/AI
  raw_input          text,
  -- link to analysis job
  analysis_job_id    uuid,
  -- display
  name               text not null,
  serving_description text,
  quantity           numeric(6,2) not null default 1,
  -- macros
  calories           int  not null default 0,
  protein_g          numeric(6,1) not null default 0,
  carbs_g            numeric(6,1) not null default 0,
  fat_g              numeric(6,1) not null default 0,
  fiber_g            numeric(6,1),
  sugar_g            numeric(6,1),
  sodium_mg          numeric(7,1),
  -- meta
  notes              text,
  uploaded_image_id  uuid references uploaded_images(id),
  saved_food_id      uuid,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ── Meal Analysis Jobs ────────────────────────────────────────
create table if not exists meal_analysis_jobs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  status            text not null default 'pending'
                      check (status in ('pending','processing','completed','failed')),
  source            text not null check (source in ('text','photo')),
  raw_input         text,
  uploaded_image_id uuid references uploaded_images(id),
  raw_ai_output     jsonb,
  parsed_result     jsonb,
  confidence        numeric(3,2),
  error_message     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── Saved Foods (personal library) ───────────────────────────
create table if not exists saved_foods (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  name                text not null,
  serving_description text,
  calories            int  not null default 0,
  protein_g           numeric(6,1) not null default 0,
  carbs_g             numeric(6,1) not null default 0,
  fat_g               numeric(6,1) not null default 0,
  fiber_g             numeric(6,1),
  sugar_g             numeric(6,1),
  sodium_mg           numeric(7,1),
  is_favorite         bool not null default false,
  use_count           int  not null default 0,
  last_used_at        timestamptz,
  created_at          timestamptz not null default now()
);

-- ── Water Entries ─────────────────────────────────────────────
create table if not exists water_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  amount_ml  int  not null,
  logged_at  timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ── Step Entries ──────────────────────────────────────────────
create table if not exists step_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  steps      int  not null,
  date       date not null,
  source     text not null default 'manual' check (source in ('manual','health_sync')),
  created_at timestamptz not null default now(),
  unique(user_id, date)
);

-- ── RLS ───────────────────────────────────────────────────────
alter table nutrition_goals    enable row level security;
alter table meal_entries       enable row level security;
alter table meal_analysis_jobs enable row level security;
alter table saved_foods        enable row level security;
alter table water_entries      enable row level security;
alter table step_entries       enable row level security;

create policy "users manage own nutrition_goals"    on nutrition_goals    for all using (auth.uid() = user_id);
create policy "users manage own meal_entries"       on meal_entries       for all using (auth.uid() = user_id);
create policy "users manage own meal_analysis_jobs" on meal_analysis_jobs for all using (auth.uid() = user_id);
create policy "users manage own saved_foods"        on saved_foods        for all using (auth.uid() = user_id);
create policy "users manage own water_entries"      on water_entries      for all using (auth.uid() = user_id);
create policy "users manage own step_entries"       on step_entries       for all using (auth.uid() = user_id);

-- ── updated_at triggers ───────────────────────────────────────
-- (reuse function from earlier migrations if already exists)
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger nutrition_goals_updated_at
  before update on nutrition_goals
  for each row execute function update_updated_at_column();

create trigger meal_entries_updated_at
  before update on meal_entries
  for each row execute function update_updated_at_column();

create trigger meal_analysis_jobs_updated_at
  before update on meal_analysis_jobs
  for each row execute function update_updated_at_column();

-- ── Indexes ───────────────────────────────────────────────────
create index if not exists meal_entries_user_logged
  on meal_entries(user_id, logged_at desc);

create index if not exists saved_foods_user_use_count
  on saved_foods(user_id, use_count desc);

create index if not exists water_entries_user_logged
  on water_entries(user_id, logged_at desc);
