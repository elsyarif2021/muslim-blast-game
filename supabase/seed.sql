-- ============================================================================
-- MUSLIM BLAST v1.0 - Seed Data (App Settings, Quiz Categories, Missions, etc.)
-- ============================================================================

INSERT INTO public.app_settings (key, value_json) VALUES
('feature_flags', '{"realRewardsEnabled": false, "maintenanceMode": false, "adsTestMode": true}'::jsonb),
('rewards_config', '{"registrationKoin": 500, "levelCompleteKoin": 50, "dailyCheckinKoin": 100, "quizCompleteKoin": 100, "missionCompleteKoin": 250, "achievementKoin": 500}'::jsonb),
('redemption_limits', '{"minPoints": 10000, "dailyLimitPoints": 50000, "monthlyBudgetCapPoints": 5000000}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.quiz_categories (slug, name, description) VALUES
('rukun-islam', 'Rukun Islam', 'Lima pilar utama ajaran Islam.'),
('rukun-iman', 'Rukun Iman', 'Enam pokok keimanan seorang Muslim.'),
('akhlak-terpuji', 'Akhlak Terpuji', 'Teladan sifat jujur, amanah, sabar, dan tawadhu.'),
('adab-sehari-hari', 'Adab Sehari-hari', 'Tata krama kepada orang tua, guru, teman, dan saat makan.'),
('sejarah-islam', 'Sejarah Islam', 'Sejarah peradaban dan tokoh ilmuwan Muslim.'),
('kisah-nabi', 'Kisah Nabi', 'Keteladanan para Nabi dan Rasul Allah SWT.'),
('pengetahuan-masjid', 'Pengetahuan Masjid', 'Fungsi, adab, dan bagian-bagian masjid.'),
('wudhu', 'Wudhu', 'Syarat, rukun, dan adab bersuci sebelum shalat.'),
('shalat', 'Shalat', 'Dasar-dasar ibadah shalat lima waktu.'),
('puasa', 'Puasa', 'Ibadah puasa Ramadhan dan hikmah pengendalian diri.'),
('zakat', 'Zakat', 'Zakat fitrah, zakat mal, dan kepedulian sosial.'),
('haji', 'Haji', 'Pengetahuan dasar ibadah haji dan umrah.')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.redemption_catalog (method, title, points_required, min_age, enabled) VALUES
('DANA', 'Saldo DANA Rp25.000 (Dinonaktifkan Default)', 25000, 18, FALSE),
('OVO', 'Saldo OVO Rp25.000 (Dinonaktifkan Default)', 25000, 18, FALSE),
('GoPay', 'Saldo GoPay Rp25.000 (Dinonaktifkan Default)', 25000, 18, FALSE),
('ShopeePay', 'Saldo ShopeePay Rp25.000 (Dinonaktifkan Default)', 25000, 18, FALSE),
('Transfer Bank', 'Transfer Bank Rp50.000 (Dinonaktifkan Default)', 50000, 18, FALSE),
('Pulsa', 'Pulsa Seluler Rp10.000 (Dinonaktifkan Default)', 10000, 18, FALSE),
('Voucher Belanja', 'Voucher Belanja Rp50.000 (Dinonaktifkan Default)', 50000, 18, FALSE)
ON CONFLICT DO NOTHING;
