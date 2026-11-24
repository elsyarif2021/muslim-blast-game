-- ============================================================================
-- MUSLIM BLAST v1.0 - Initial PostgreSQL / Supabase Migration
-- Includes all 36 core tables, UUID PKs, FKs, indexes, timestamps, RLS,
-- role-based access control, and server-authoritative transactional functions.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Timestamp helper trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT UNIQUE,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  suspended BOOLEAN NOT NULL DEFAULT FALSE,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('player', 'reviewer', 'admin')) DEFAULT 'player',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Helper for RLS role checks
CREATE OR REPLACE FUNCTION public.has_role(check_user UUID, check_role TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user AND role = check_role
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 3. user_preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  sound_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sound_volume NUMERIC(3,2) NOT NULL DEFAULT 0.60,
  haptics_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  reduced_motion BOOLEAN NOT NULL DEFAULT FALSE,
  language TEXT NOT NULL DEFAULT 'id',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. parental_controls
CREATE TABLE IF NOT EXISTS public.parental_controls (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  pin_hash TEXT,
  daily_limit_minutes INTEGER NOT NULL DEFAULT 45,
  ads_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  child_mode_locked BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. age_eligibility
CREATE TABLE IF NOT EXISTS public.age_eligibility (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  age_mode TEXT NOT NULL CHECK (age_mode IN ('child', 'adult')) DEFAULT 'child',
  verified_adult BOOLEAN NOT NULL DEFAULT FALSE,
  birth_year INTEGER,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. wallets (Never directly writable by client users)
CREATE TABLE IF NOT EXISTS public.wallets (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  koin_ilmu BIGINT NOT NULL DEFAULT 0 CHECK (koin_ilmu >= 0),
  permata_hikmah BIGINT NOT NULL DEFAULT 0 CHECK (permata_hikmah >= 0),
  bintang_prestasi BIGINT NOT NULL DEFAULT 0 CHECK (bintang_prestasi >= 0),
  available_reward_points BIGINT NOT NULL DEFAULT 0 CHECK (available_reward_points >= 0),
  pending_reward_points BIGINT NOT NULL DEFAULT 0 CHECK (pending_reward_points >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. wallet_transactions
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  currency TEXT NOT NULL CHECK (currency IN ('koin_ilmu', 'permata_hikmah', 'bintang_prestasi', 'reward_point')),
  amount BIGINT NOT NULL,
  tx_type TEXT NOT NULL CHECK (tx_type IN ('credit', 'debit')),
  source TEXT NOT NULL,
  description TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. game_levels
CREATE TABLE IF NOT EXISTS public.game_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_number INTEGER UNIQUE NOT NULL,
  world_id INTEGER NOT NULL CHECK (world_id BETWEEN 1 AND 8),
  title TEXT NOT NULL,
  max_moves INTEGER NOT NULL,
  colors_count INTEGER NOT NULL CHECK (colors_count BETWEEN 4 AND 6),
  target_score INTEGER NOT NULL,
  collect_color TEXT,
  collect_count INTEGER,
  reward_koin INTEGER NOT NULL DEFAULT 50,
  reward_permata INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. game_sessions
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  level_number INTEGER NOT NULL,
  seed BIGINT NOT NULL,
  moves_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  verified_score INTEGER NOT NULL DEFAULT 0,
  stars INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'failed', 'rejected')) DEFAULT 'active',
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. player_progress
CREATE TABLE IF NOT EXISTS public.player_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  level_number INTEGER NOT NULL,
  stars INTEGER NOT NULL DEFAULT 0 CHECK (stars BETWEEN 0 AND 3),
  high_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, level_number)
);

-- 11. quiz_categories
CREATE TABLE IF NOT EXISTS public.quiz_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. quiz_questions
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.quiz_categories(id) ON DELETE CASCADE,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Mudah', 'Sedang', 'Sulit')),
  question_text TEXT NOT NULL,
  options_json JSONB NOT NULL,
  correct_index INTEGER NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  explanation TEXT NOT NULL,
  reference_note TEXT NOT NULL,
  review_status TEXT NOT NULL CHECK (review_status IN ('draft_needs_expert_review', 'pending_review', 'approved', 'rejected')) DEFAULT 'draft_needs_expert_review',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. quiz_attempts
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  koin_awarded INTEGER NOT NULL DEFAULT 0,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. hijaiyah_lessons
CREATE TABLE IF NOT EXISTS public.hijaiyah_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_order INTEGER UNIQUE NOT NULL,
  arabic_char TEXT NOT NULL,
  name TEXT NOT NULL,
  transliteration TEXT NOT NULL,
  makhraj_note TEXT NOT NULL,
  audio_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. learning_progress
CREATE TABLE IF NOT EXISTS public.learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.hijaiyah_lessons(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, lesson_id)
);

-- 16. daily_missions
CREATE TABLE IF NOT EXISTS public.daily_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_count INTEGER NOT NULL,
  reward_koin INTEGER NOT NULL DEFAULT 250,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. mission_progress
CREATE TABLE IF NOT EXISTS public.mission_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES public.daily_missions(id) ON DELETE CASCADE,
  mission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  progress_count INTEGER NOT NULL DEFAULT 0,
  claimed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, mission_id, mission_date)
);

-- 18. daily_checkins
CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  streak_day INTEGER NOT NULL DEFAULT 1,
  reward_koin INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, checkin_date)
);

-- 19. achievements
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  bintang_reward INTEGER NOT NULL DEFAULT 10,
  koin_reward INTEGER NOT NULL DEFAULT 500,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. user_achievements
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, achievement_id)
);

-- 21. virtual_items
CREATE TABLE IF NOT EXISTS public.virtual_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price_koin INTEGER,
  price_permata INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 22. user_inventory
CREATE TABLE IF NOT EXISTS public.user_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.virtual_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  equipped BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, item_id)
);

-- 23. reward_campaigns
CREATE TABLE IF NOT EXISTS public.reward_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  sponsor_name TEXT NOT NULL,
  budget_points BIGINT NOT NULL DEFAULT 0,
  spent_points BIGINT NOT NULL DEFAULT 0,
  adult_only BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 24. reward_claims
CREATE TABLE IF NOT EXISTS public.reward_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.reward_campaigns(id) ON DELETE CASCADE,
  points_awarded BIGINT NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 25. redemption_catalog
CREATE TABLE IF NOT EXISTS public.redemption_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method TEXT NOT NULL,
  title TEXT NOT NULL,
  points_required BIGINT NOT NULL,
  min_age INTEGER NOT NULL DEFAULT 18,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 26. redemption_requests
CREATE TABLE IF NOT EXISTS public.redemption_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  catalog_id UUID NOT NULL REFERENCES public.redemption_catalog(id),
  points BIGINT NOT NULL CHECK (points > 0),
  destination_hint TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Pending', 'Under Review', 'Approved', 'Processing', 'Completed', 'Rejected', 'Failed')) DEFAULT 'Pending',
  idempotency_key TEXT UNIQUE NOT NULL,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 27. payment_events
CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  redemption_request_id UUID NOT NULL REFERENCES public.redemption_requests(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL,
  provider_reference TEXT,
  status TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 28. referrals
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  eligible_adult BOOLEAN NOT NULL DEFAULT FALSE,
  bonus_awarded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 29. ad_events
CREATE TABLE IF NOT EXISTS public.ad_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  ad_unit_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  is_test BOOLEAN NOT NULL DEFAULT TRUE,
  koin_rewarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 30. offerwall_events
CREATE TABLE IF NOT EXISTS public.offerwall_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_tx_id TEXT UNIQUE NOT NULL,
  points_credited BIGINT NOT NULL DEFAULT 0,
  signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 31. leaderboard
CREATE TABLE IF NOT EXISTS public.leaderboard (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  bintang_prestasi BIGINT NOT NULL DEFAULT 0,
  levels_cleared INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 32. notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 33. app_settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 34. content_reviews
CREATE TABLE IF NOT EXISTS public.content_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'needs_revision')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 35. fraud_flags
CREATE TABLE IF NOT EXISTS public.fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  status TEXT NOT NULL CHECK (status IN ('open', 'resolved')) DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 36. audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON public.wallet_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON public.game_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_cat ON public.quiz_questions(category_id, review_status);
CREATE INDEX IF NOT EXISTS idx_redemption_status ON public.redemption_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_status ON public.fraud_flags(status, severity);

-- Apply RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parental_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.age_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hijaiyah_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemption_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemption_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offerwall_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (users can read own state; balances only modified by SECURITY DEFINER RPCs / service role)
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own display_name" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users read own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users read own wallet tx" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users read own progress" ON public.player_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Public read game levels" ON public.game_levels FOR SELECT USING (TRUE);
CREATE POLICY "Public read approved quizzes" ON public.quiz_questions FOR SELECT USING (review_status = 'approved' OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'reviewer'));
CREATE POLICY "Public read hijaiyah" ON public.hijaiyah_lessons FOR SELECT USING (TRUE);
CREATE POLICY "Public read leaderboard" ON public.leaderboard FOR SELECT USING (TRUE);
CREATE POLICY "Admin full access settings" ON public.app_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Server-authoritative currency credit function (with idempotency)
CREATE OR REPLACE FUNCTION public.credit_virtual_currency(
  p_user_id UUID,
  p_currency TEXT,
  p_amount BIGINT,
  p_source TEXT,
  p_description TEXT,
  p_idempotency_key TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_existing UUID;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  SELECT id INTO v_existing FROM public.wallet_transactions WHERE idempotency_key = p_idempotency_key;
  IF v_existing IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.wallet_transactions(user_id, currency, amount, tx_type, source, description, idempotency_key)
  VALUES (p_user_id, p_currency, p_amount, 'credit', p_source, p_description, p_idempotency_key);

  IF p_currency = 'koin_ilmu' THEN
    UPDATE public.wallets SET koin_ilmu = koin_ilmu + p_amount, updated_at = NOW() WHERE user_id = p_user_id;
  ELSIF p_currency = 'permata_hikmah' THEN
    UPDATE public.wallets SET permata_hikmah = permata_hikmah + p_amount, updated_at = NOW() WHERE user_id = p_user_id;
  ELSIF p_currency = 'bintang_prestasi' THEN
    UPDATE public.wallets SET bintang_prestasi = bintang_prestasi + p_amount, updated_at = NOW() WHERE user_id = p_user_id;
  ELSIF p_currency = 'reward_point' THEN
    UPDATE public.wallets SET available_reward_points = available_reward_points + p_amount, updated_at = NOW() WHERE user_id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Unsupported currency';
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Server-authoritative adult redemption request (blocks child accounts & checks feature flag)
CREATE OR REPLACE FUNCTION public.request_adult_redemption(
  p_user_id UUID,
  p_catalog_id UUID,
  p_destination_hint TEXT,
  p_idempotency_key TEXT
) RETURNS UUID AS $$
DECLARE
  v_age_mode TEXT;
  v_verified BOOLEAN;
  v_points BIGINT;
  v_enabled BOOLEAN;
  v_avail BIGINT;
  v_req_id UUID;
BEGIN
  SELECT age_mode, verified_adult INTO v_age_mode, v_verified
  FROM public.age_eligibility WHERE user_id = p_user_id;

  IF v_age_mode <> 'adult' OR v_verified IS NOT TRUE THEN
    RAISE EXCEPTION 'Adult eligibility verification required';
  END IF;

  SELECT points_required, enabled INTO v_points, v_enabled
  FROM public.redemption_catalog WHERE id = p_catalog_id;

  IF v_enabled IS NOT TRUE THEN
    RAISE EXCEPTION 'Real-world redemption catalog item is disabled by default';
  END IF;

  SELECT available_reward_points INTO v_avail FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
  IF v_avail < v_points THEN
    RAISE EXCEPTION 'Insufficient reward points';
  END IF;

  UPDATE public.wallets
  SET available_reward_points = available_reward_points - v_points,
      pending_reward_points = pending_reward_points + v_points,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO public.redemption_requests(user_id, catalog_id, points, destination_hint, status, idempotency_key)
  VALUES (p_user_id, p_catalog_id, v_points, p_destination_hint, 'Pending', p_idempotency_key)
  RETURNING id INTO v_req_id;

  RETURN v_req_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
