import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import {
  ACHIEVEMENTS,
  DAILY_MISSIONS,
  REDEMPTION_CATALOG,
  VIRTUAL_SHOP_ITEMS,
} from './src/data/economyAndMissions.ts';
import { INITIAL_QUIZ_QUESTIONS } from './src/data/quizQuestions.ts';
import { DEFAULT_LEVELS } from './src/data/worldsAndLevels.ts';
import { replayPuzzleSession } from './src/game/puzzleLogic.ts';
import type {
  AgeMode,
  AppSettingsConfig,
  AuditLogEntry,
  FraudFlag,
  GameLevelConfig,
  LeaderboardEntry,
  NotificationItem,
  ParentalControlsState,
  PlayerProgress,
  PuzzleMove,
  QuizQuestion,
  RedemptionRequest,
  RedemptionStatus,
  ReviewStatus,
  UserPreferences,
  UserProfile,
  UserRole,
  WalletBalances,
  WalletTransaction,
} from './src/types/index.ts';

const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'muslim_blast_store.json');

interface StoredUserRecord {
  profile: UserProfile;
  passwordHash: string;
  wallets: WalletBalances;
  progress: PlayerProgress;
  preferences: UserPreferences;
  parental: ParentalControlsState & { pinHash?: string };
}

interface ActiveGameSession {
  id: string;
  userId: string;
  levelId: number;
  seed: number;
  status: 'active' | 'completed' | 'failed';
  createdAt: string;
}

interface PersistedDatabase {
  users: Record<string, StoredUserRecord>;
  emailIndex: Record<string, string>;
  sessions: Record<string, ActiveGameSession>;
  transactions: WalletTransaction[];
  idempotencyKeys: Record<string, boolean>;
  redemptions: RedemptionRequest[];
  levels: GameLevelConfig[];
  quizzes: QuizQuestion[];
  notifications: Record<string, NotificationItem[]>;
  fraudFlags: FraudFlag[];
  auditLogs: AuditLogEntry[];
  settings: AppSettingsConfig;
  adminCredentialHash: string | null;
  demoRevenueStats: {
    adRevenueIdrTest: number;
    sponsoredCampaignRevenueIdr: number;
    operationalCostIdr: number;
    rewardLiabilityPoints: number;
  };
}

function hashSecret(raw: string, salt?: string): string {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(raw, s, 64).toString('hex');
  return `${s}:${derived}`;
}

function verifySecret(raw: string, stored: string): boolean {
  const [salt, expected] = stored.split(':');
  if (!salt || !expected) return false;
  const derived = crypto.scryptSync(raw, salt, 64).toString('hex');
  const a = Buffer.from(derived, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function signToken(payload: { userId: string; role: UserRole; exp: number }): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyToken(token: string): { userId: string; role: UserRole; exp: number } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      userId: string;
      role: UserRole;
      exp: number;
    };
    if (Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function createInitialDb(): PersistedDatabase {
  return {
    users: {},
    emailIndex: {},
    sessions: {},
    transactions: [],
    idempotencyKeys: {},
    redemptions: [],
    levels: DEFAULT_LEVELS,
    quizzes: INITIAL_QUIZ_QUESTIONS,
    notifications: {},
    fraudFlags: [],
    auditLogs: [
      {
        id: crypto.randomUUID(),
        actorId: 'system',
        action: 'SYSTEM_INIT',
        details: 'Inisialisasi penyimpanan server-authoritative Muslim Blast v1.0.',
        createdAt: new Date().toISOString(),
      },
    ],
    settings: {
      realRewardsEnabled: process.env.ENABLE_REAL_WORLD_REWARDS === 'true',
      maintenanceMode: false,
      adsTestMode: true,
      minRedemptionPoints: 10000,
      dailyRedemptionLimitPoints: 50000,
      monthlyBudgetCapPoints: 5000000,
      rewardsConfig: {
        registrationKoin: 500,
        levelCompleteKoin: 50,
        dailyCheckinKoin: 100,
        quizCompleteKoin: 100,
        missionCompleteKoin: 250,
        achievementKoin: 500,
      },
    },
    adminCredentialHash: null,
    demoRevenueStats: {
      adRevenueIdrTest: 0,
      sponsoredCampaignRevenueIdr: 0,
      operationalCostIdr: 0,
      rewardLiabilityPoints: 0,
    },
  };
}

function loadDb(): PersistedDatabase {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const initial = createInitialDb();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw) as PersistedDatabase;
  } catch {
    const fallback = createInitialDb();
    fs.writeFileSync(DB_FILE, JSON.stringify(fallback, null, 2), 'utf8');
    return fallback;
  }
}

const db = loadDb();

function saveDb() {
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmpFile, DB_FILE);
}

function addAuditLog(actorId: string, action: string, details: string) {
  db.auditLogs.unshift({
    id: crypto.randomUUID(),
    actorId,
    action,
    details,
    createdAt: new Date().toISOString(),
  });
  if (db.auditLogs.length > 300) db.auditLogs.length = 300;
}

function pushNotification(
  userId: string,
  title: string,
  body: string,
  category: NotificationItem['category']
) {
  if (!db.notifications[userId]) db.notifications[userId] = [];
  db.notifications[userId].unshift({
    id: crypto.randomUUID(),
    title,
    body,
    category,
    read: false,
    createdAt: new Date().toISOString(),
  });
  if (db.notifications[userId].length > 50) db.notifications[userId].length = 50;
}

function creditWallet(
  user: StoredUserRecord,
  currency: WalletTransaction['currency'],
  amount: number,
  source: string,
  description: string,
  idempotencyKey?: string
): boolean {
  if (amount <= 0) return false;
  if (idempotencyKey) {
    if (db.idempotencyKeys[idempotencyKey]) return false;
    db.idempotencyKeys[idempotencyKey] = true;
  }

  if (currency === 'koin_ilmu') user.wallets.koinIlmu += amount;
  if (currency === 'permata_hikmah') user.wallets.permataHikmah += amount;
  if (currency === 'bintang_prestasi') user.wallets.bintangPrestasi += amount;
  if (currency === 'reward_point') user.wallets.availableRewardPoints += amount;

  db.transactions.unshift({
    id: crypto.randomUUID(),
    userId: user.profile.id,
    currency,
    amount,
    type: 'credit',
    source,
    description,
    createdAt: new Date().toISOString(),
    idempotencyKey,
  });
  if (db.transactions.length > 1000) db.transactions.length = 1000;
  return true;
}

function debitWallet(
  user: StoredUserRecord,
  currency: WalletTransaction['currency'],
  amount: number,
  source: string,
  description: string,
  idempotencyKey?: string
): boolean {
  if (amount <= 0) return false;
  if (idempotencyKey && db.idempotencyKeys[idempotencyKey]) return false;

  if (currency === 'koin_ilmu') {
    if (user.wallets.koinIlmu < amount) return false;
    user.wallets.koinIlmu -= amount;
  } else if (currency === 'permata_hikmah') {
    if (user.wallets.permataHikmah < amount) return false;
    user.wallets.permataHikmah -= amount;
  } else if (currency === 'reward_point') {
    if (user.wallets.availableRewardPoints < amount) return false;
    user.wallets.availableRewardPoints -= amount;
  } else {
    return false;
  }

  if (idempotencyKey) db.idempotencyKeys[idempotencyKey] = true;

  db.transactions.unshift({
    id: crypto.randomUUID(),
    userId: user.profile.id,
    currency,
    amount,
    type: 'debit',
    source,
    description,
    createdAt: new Date().toISOString(),
    idempotencyKey,
  });
  return true;
}

// Simple in-memory rate limiter
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(maxPerMinute: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown';
    const key = `${req.path}:${ip}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      rateBuckets.set(key, { count: 1, resetAt: now + 60_000 });
      next();
      return;
    }
    if (bucket.count >= maxPerMinute) {
      res.status(429).json({ error: 'Terlalu banyak permintaan. Coba lagi sebentar lagi.' });
      return;
    }
    bucket.count += 1;
    next();
  };
}

interface AuthedRequest extends Request {
  authUser?: StoredUserRecord;
  authRole?: UserRole;
  isAdminToken?: boolean;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk terlebih dahulu.' });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Sesi telah kedaluwarsa atau tidak valid.' });
    return;
  }
  if (payload.userId === 'admin_console' && payload.role === 'admin') {
    req.authRole = 'admin';
    req.isAdminToken = true;
    next();
    return;
  }
  const user = db.users[payload.userId];
  if (!user) {
    res.status(401).json({ error: 'Akun tidak ditemukan.' });
    return;
  }
  if (user.profile.suspended) {
    res.status(403).json({ error: 'Akun sedang ditangguhkan oleh administrator.' });
    return;
  }
  req.authUser = user;
  req.authRole = user.profile.role;
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.isAdminToken || req.authRole === 'admin') {
    next();
    return;
  }
  res.status(403).json({ error: 'Akses ditolak. Memerlukan peran administrator.' });
}

function sanitizeUserResponse(user: StoredUserRecord) {
  return {
    profile: user.profile,
    wallets: user.wallets,
    progress: user.progress,
    preferences: user.preferences,
    parental: {
      pinSet: user.parental.pinSet,
      dailyLimitMinutes: user.parental.dailyLimitMinutes,
      adsAllowed: user.parental.adsAllowed,
      childModeLocked: user.parental.childModeLocked,
    },
    notifications: db.notifications[user.profile.id] || [],
    transactions: db.transactions.filter((t) => t.userId === user.profile.id).slice(0, 60),
    redemptions: db.redemptions.filter((r) => r.userId === user.profile.id),
  };
}

function createDefaultUser(
  name: string,
  email: string,
  password: string,
  ageMode: AgeMode,
  referredByCode?: string
): StoredUserRecord {
  const id = crypto.randomUUID();
  const referralCode = `MB${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  let referredBy: string | undefined;
  if (referredByCode) {
    const referrer = Object.values(db.users).find(
      (u) => u.profile.referralCode === referredByCode.trim().toUpperCase()
    );
    if (referrer && referrer.profile.ageMode === 'adult' && ageMode === 'adult') {
      referredBy = referrer.profile.id;
    }
  }

  const user: StoredUserRecord = {
    profile: {
      id,
      name: name.trim().slice(0, 50),
      email: email.trim().toLowerCase(),
      role: 'player',
      ageMode,
      ageConfirmed: true,
      level: 1,
      xp: 0,
      suspended: false,
      referralCode,
      referredBy,
      createdAt: new Date().toISOString(),
    },
    passwordHash: hashSecret(password),
    wallets: {
      koinIlmu: 0,
      permataHikmah: 5,
      bintangPrestasi: 0,
      availableRewardPoints: 0,
      pendingRewardPoints: 0,
    },
    progress: {
      completedLevels: {},
      highestUnlockedLevel: 1,
      quizzesCompleted: 0,
      quizCorrectTotal: 0,
      hijaiyahStudiedIds: [],
      completedMissionIds: [],
      claimedAchievementIds: [],
      checkinStreak: 0,
      lastCheckinDate: null,
      totalBlocksCleared: 0,
      inventory: {
        boost_hammer: 2,
        boost_shuffle: 2,
        boost_moves: 1,
        cap_emerald: 1,
        pack_explorer: 1,
        theme_garden: 1,
      },
      equippedCap: 'cap_emerald',
      equippedBackpack: 'pack_explorer',
      equippedTheme: 'theme_garden',
    },
    preferences: {
      soundEnabled: true,
      soundVolume: 0.6,
      hapticsEnabled: true,
      reducedMotion: false,
    },
    parental: {
      pinSet: false,
      dailyLimitMinutes: 45,
      adsAllowed: false,
      childModeLocked: ageMode === 'child',
    },
  };

  creditWallet(
    user,
    'koin_ilmu',
    db.settings.rewardsConfig.registrationKoin,
    'registration',
    'Bonus selamat datang pemain baru Muslim Blast',
    `reg:${id}`
  );
  pushNotification(
    id,
    'Selamat Datang di Muslim Blast!',
    `Mimo menghadiahkan ${db.settings.rewardsConfig.registrationKoin} Koin Ilmu untuk memulai petualanganmu.`,
    'reward'
  );
  return user;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Public bootstrap info
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      maintenanceMode: db.settings.maintenanceMode,
      realRewardsEnabled: db.settings.realRewardsEnabled,
      adsTestMode: db.settings.adsTestMode,
    });
  });

  app.get('/api/public/catalog', (_req, res) => {
    res.json({
      levels: db.levels,
      quizzes: db.quizzes,
      missions: DAILY_MISSIONS,
      achievements: ACHIEVEMENTS,
      shopItems: VIRTUAL_SHOP_ITEMS,
      redemptionCatalog: REDEMPTION_CATALOG.map((item) => ({
        ...item,
        enabled: db.settings.realRewardsEnabled && item.enabled,
      })),
      settings: db.settings,
    });
  });

  // Auth: Register
  app.post('/api/auth/register', rateLimit(15), (req, res) => {
    const { name, email, password, ageMode, referralCode } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      ageMode?: AgeMode;
      referralCode?: string;
    };

    if (!name || name.trim().length < 2) {
      res.status(400).json({ error: 'Nama minimal 2 karakter.' });
      return;
    }
    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Alamat email tidak valid.' });
      return;
    }
    if (!password || password.length < 6) {
      res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
      return;
    }

    const normEmail = email.trim().toLowerCase();
    if (db.emailIndex[normEmail]) {
      res.status(409).json({ error: 'Email sudah terdaftar. Silakan masuk.' });
      return;
    }

    const mode: AgeMode = ageMode === 'adult' ? 'adult' : 'child';
    const user = createDefaultUser(name, normEmail, password, mode, referralCode);
    db.users[user.profile.id] = user;
    db.emailIndex[normEmail] = user.profile.id;
    addAuditLog(user.profile.id, 'USER_REGISTERED', `Mode usia: ${mode}`);
    saveDb();

    const token = signToken({
      userId: user.profile.id,
      role: user.profile.role,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({ token, user: sanitizeUserResponse(user) });
  });

  // Auth: Login
  app.post('/api/auth/login', rateLimit(20), (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    const normEmail = (email || '').trim().toLowerCase();
    const userId = db.emailIndex[normEmail];
    const user = userId ? db.users[userId] : undefined;

    if (!user || !password || !verifySecret(password, user.passwordHash)) {
      res.status(401).json({ error: 'Email atau kata sandi salah.' });
      return;
    }
    if (user.profile.suspended) {
      res.status(403).json({ error: 'Akun Anda sedang ditangguhkan.' });
      return;
    }

    const token = signToken({
      userId: user.profile.id,
      role: user.profile.role,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ token, user: sanitizeUserResponse(user) });
  });

  // Quick Guest / Family Local Account creation so users can play immediately
  app.post('/api/auth/guest', rateLimit(20), (req, res) => {
    const { name, ageMode } = req.body as { name?: string; ageMode?: AgeMode };
    const mode: AgeMode = ageMode === 'adult' ? 'adult' : 'child';
    const suffix = crypto.randomBytes(3).toString('hex');
    const guestEmail = `tamu_${suffix}@muslimblast.local`;
    const user = createDefaultUser(
      name?.trim() || (mode === 'child' ? 'Sahabat Mimo' : 'Pemain Keluarga'),
      guestEmail,
      crypto.randomBytes(12).toString('hex'),
      mode
    );
    db.users[user.profile.id] = user;
    db.emailIndex[guestEmail] = user.profile.id;
    saveDb();

    const token = signToken({
      userId: user.profile.id,
      role: user.profile.role,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
    res.status(201).json({ token, user: sanitizeUserResponse(user) });
  });

  app.get('/api/me', requireAuth, (req: AuthedRequest, res) => {
    if (!req.authUser) {
      res.status(404).json({ error: 'Profil tidak ditemukan.' });
      return;
    }
    res.json({ user: sanitizeUserResponse(req.authUser) });
  });

  // Preferences & Parental Controls
  app.patch('/api/me/preferences', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const { soundEnabled, soundVolume, hapticsEnabled, reducedMotion } = req.body as Partial<UserPreferences>;
    if (typeof soundEnabled === 'boolean') user.preferences.soundEnabled = soundEnabled;
    if (typeof soundVolume === 'number') user.preferences.soundVolume = Math.max(0, Math.min(1, soundVolume));
    if (typeof hapticsEnabled === 'boolean') user.preferences.hapticsEnabled = hapticsEnabled;
    if (typeof reducedMotion === 'boolean') user.preferences.reducedMotion = reducedMotion;
    saveDb();
    res.json({ preferences: user.preferences });
  });

  app.post('/api/me/mode', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const { ageMode, pin } = req.body as { ageMode?: AgeMode; pin?: string };
    if (user.parental.pinSet && user.parental.pinHash) {
      if (!pin || !verifySecret(pin, user.parental.pinHash)) {
        res.status(403).json({ error: 'PIN Orang Tua diperlukan untuk mengubah mode usia.' });
        return;
      }
    }
    user.profile.ageMode = ageMode === 'adult' ? 'adult' : 'child';
    if (user.profile.ageMode === 'child') {
      user.parental.adsAllowed = false;
      user.parental.childModeLocked = true;
    }
    saveDb();
    res.json({ user: sanitizeUserResponse(user) });
  });

  app.post('/api/me/parental', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const { currentPin, newPin, dailyLimitMinutes, adsAllowed, childModeLocked } = req.body as {
      currentPin?: string;
      newPin?: string;
      dailyLimitMinutes?: number;
      adsAllowed?: boolean;
      childModeLocked?: boolean;
    };

    if (user.parental.pinSet && user.parental.pinHash) {
      if (!currentPin || !verifySecret(currentPin, user.parental.pinHash)) {
        res.status(403).json({ error: 'PIN Orang Tua saat ini tidak sesuai.' });
        return;
      }
    }

    if (newPin && /^\d{4}$/.test(newPin)) {
      user.parental.pinHash = hashSecret(newPin);
      user.parental.pinSet = true;
    }
    if (typeof dailyLimitMinutes === 'number') {
      user.parental.dailyLimitMinutes = Math.max(10, Math.min(240, dailyLimitMinutes));
    }
    if (typeof adsAllowed === 'boolean') {
      user.parental.adsAllowed = user.profile.ageMode === 'child' ? false : adsAllowed;
    }
    if (typeof childModeLocked === 'boolean') {
      user.parental.childModeLocked = childModeLocked;
    }
    saveDb();
    res.json({ user: sanitizeUserResponse(user) });
  });

  // Game Session Start (Server issues deterministic seed)
  app.post('/api/game/session/start', requireAuth, rateLimit(40), (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const { levelId } = req.body as { levelId?: number };
    const level = db.levels.find((l) => l.id === Number(levelId));
    if (!level) {
      res.status(404).json({ error: 'Level tidak ditemukan.' });
      return;
    }

    const sessionId = crypto.randomUUID();
    const seed = crypto.randomInt(100_000, 999_999_999);
    db.sessions[sessionId] = {
      id: sessionId,
      userId: user.profile.id,
      levelId: level.id,
      seed,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    saveDb();

    res.json({ sessionId, seed, level });
  });

  // Game Session Complete (Server replays all moves deterministically!)
  app.post('/api/game/session/complete', requireAuth, rateLimit(40), (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const { sessionId, moves, idempotencyKey } = req.body as {
      sessionId?: string;
      moves?: PuzzleMove[];
      idempotencyKey?: string;
    };

    if (!sessionId || !Array.isArray(moves) || !idempotencyKey) {
      res.status(400).json({ error: 'Data sesi permainan tidak lengkap.' });
      return;
    }

    if (db.idempotencyKeys[idempotencyKey]) {
      res.json({ ok: true, deduplicated: true, user: sanitizeUserResponse(user) });
      return;
    }

    const session = db.sessions[sessionId];
    if (!session || session.userId !== user.profile.id || session.status !== 'active') {
      res.status(404).json({ error: 'Sesi permainan tidak aktif atau bukan milik Anda.' });
      return;
    }

    const level = db.levels.find((l) => l.id === session.levelId);
    if (!level) {
      res.status(404).json({ error: 'Konfigurasi level tidak ditemukan.' });
      return;
    }

    const replay = replayPuzzleSession(session.seed, level, moves);
    if (!replay.verified) {
      db.fraudFlags.unshift({
        id: crypto.randomUUID(),
        userId: user.profile.id,
        reason: `Replay sesi puzzle tidak valid pada level ${level.id}`,
        severity: 'high',
        status: 'open',
        createdAt: new Date().toISOString(),
      });
      session.status = 'failed';
      saveDb();
      res.status(400).json({ error: 'Validasi langkah permainan gagal.' });
      return;
    }

    user.progress.totalBlocksCleared += replay.finalState.totalBlocksCleared;
    let koinAwarded = 0;
    let permataAwarded = 0;

    if (replay.finalState.status === 'won') {
      session.status = 'completed';
      const prev = user.progress.completedLevels[level.id];
      const firstClear = !prev;
      const bestStars = Math.max(prev?.stars || 0, replay.stars);
      const bestScore = Math.max(prev?.highScore || 0, replay.finalState.score);
      user.progress.completedLevels[level.id] = { stars: bestStars, highScore: bestScore };
      user.progress.highestUnlockedLevel = Math.max(
        user.progress.highestUnlockedLevel,
        Math.min(db.levels.length, level.id + 1)
      );

      koinAwarded = firstClear ? level.rewardKoin : Math.round(level.rewardKoin * 0.4);
      permataAwarded = firstClear ? level.rewardPermata : 0;

      creditWallet(
        user,
        'koin_ilmu',
        koinAwarded,
        'puzzle_victory',
        `Menyelesaikan Level ${level.id}: ${level.title}`,
        `${idempotencyKey}:koin`
      );
      if (permataAwarded > 0) {
        creditWallet(
          user,
          'permata_hikmah',
          permataAwarded,
          'puzzle_victory',
          `Hadiah bintang pertama Level ${level.id}`,
          `${idempotencyKey}:permata`
        );
      }

      user.profile.xp += 40 + replay.stars * 15;
      user.profile.level = 1 + Math.floor(user.profile.xp / 200);
    } else {
      session.status = 'failed';
      db.idempotencyKeys[idempotencyKey] = true;
    }

    saveDb();
    res.json({
      ok: true,
      status: replay.finalState.status,
      verifiedScore: replay.finalState.score,
      stars: replay.stars,
      koinAwarded,
      permataAwarded,
      user: sanitizeUserResponse(user),
    });
  });

  // Quiz submission
  app.post('/api/quiz/submit', requireAuth, rateLimit(30), (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const { category, totalQuestions, correctCount, idempotencyKey } = req.body as {
      category?: string;
      totalQuestions?: number;
      correctCount?: number;
      idempotencyKey?: string;
    };

    const total = Number(totalQuestions || 0);
    const correct = Number(correctCount || 0);
    if (total <= 0 || total > 30 || correct < 0 || correct > total || !idempotencyKey) {
      res.status(400).json({ error: 'Data hasil kuis tidak valid.' });
      return;
    }

    user.progress.quizzesCompleted += 1;
    user.progress.quizCorrectTotal += correct;
    user.profile.xp += correct * 12 + 20;
    user.profile.level = 1 + Math.floor(user.profile.xp / 200);

    const reward = correct >= Math.ceil(total / 2) ? db.settings.rewardsConfig.quizCompleteKoin : 30;
    creditWallet(
      user,
      'koin_ilmu',
      reward,
      'islamic_quiz',
      `Menyelesaikan Kuis ${category || 'Umum'} (${correct}/${total} benar)`,
      idempotencyKey
    );
    saveDb();

    res.json({ ok: true, koinAwarded: reward, user: sanitizeUserResponse(user) });
  });

  // Hijaiyah lesson progress
  app.post('/api/hijaiyah/complete', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const { letterId } = req.body as { letterId?: number };
    const id = Number(letterId);
    if (!Number.isInteger(id) || id < 1 || id > 28) {
      res.status(400).json({ error: 'ID huruf Hijaiyah tidak valid.' });
      return;
    }
    let koinAwarded = 0;
    if (!user.progress.hijaiyahStudiedIds.includes(id)) {
      user.progress.hijaiyahStudiedIds.push(id);
      koinAwarded = 25;
      creditWallet(
        user,
        'koin_ilmu',
        koinAwarded,
        'hijaiyah',
        `Mempelajari Huruf Hijaiyah #${id}`,
        `hijaiyah:${user.profile.id}:${id}`
      );
      user.profile.xp += 15;
      user.profile.level = 1 + Math.floor(user.profile.xp / 200);
      saveDb();
    }
    res.json({ ok: true, koinAwarded, user: sanitizeUserResponse(user) });
  });

  // Daily check-in
  app.post('/api/checkin', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const today = new Date().toISOString().slice(0, 10);
    if (user.progress.lastCheckinDate === today) {
      res.status(409).json({ error: 'Check-in harian hari ini sudah diklaim.' });
      return;
    }
    user.progress.checkinStreak += 1;
    user.progress.lastCheckinDate = today;
    const reward = db.settings.rewardsConfig.dailyCheckinKoin + Math.min(user.progress.checkinStreak - 1, 6) * 20;
    creditWallet(
      user,
      'koin_ilmu',
      reward,
      'daily_checkin',
      `Check-in harian ke-${user.progress.checkinStreak}`,
      `checkin:${user.profile.id}:${today}`
    );
    if (user.progress.checkinStreak % 7 === 0) {
      creditWallet(
        user,
        'permata_hikmah',
        10,
        'daily_checkin_bonus',
        'Bonus istiqamah 7 hari beruntun',
        `checkin_gem:${user.profile.id}:${today}`
      );
    }
    saveDb();
    res.json({ ok: true, reward, user: sanitizeUserResponse(user) });
  });

  // Claim Daily Mission
  app.post('/api/missions/claim', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const { missionId } = req.body as { missionId?: string };
    const mission = DAILY_MISSIONS.find((m) => m.id === missionId);
    if (!mission) {
      res.status(404).json({ error: 'Misi tidak ditemukan.' });
      return;
    }
    if (user.progress.completedMissionIds.includes(mission.id)) {
      res.status(409).json({ error: 'Hadiah misi ini sudah diklaim.' });
      return;
    }

    const levelsWon = Object.keys(user.progress.completedLevels).length;
    const metricMap = {
      levels_won: levelsWon,
      quizzes_completed: user.progress.quizzesCompleted,
      hijaiyah_studied: user.progress.hijaiyahStudiedIds.length,
      blocks_cleared: user.progress.totalBlocksCleared,
    };
    if (metricMap[mission.progressKey] < mission.targetCount) {
      res.status(400).json({ error: 'Target misi belum terpenuhi.' });
      return;
    }

    user.progress.completedMissionIds.push(mission.id);
    const reward = db.settings.rewardsConfig.missionCompleteKoin;
    creditWallet(
      user,
      'koin_ilmu',
      reward,
      'daily_mission',
      `Misi Kebaikan: ${mission.title}`,
      `mission:${user.profile.id}:${mission.id}`
    );
    saveDb();
    res.json({ ok: true, reward, user: sanitizeUserResponse(user) });
  });

  // Claim Achievement
  app.post('/api/achievements/claim', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const { achievementId } = req.body as { achievementId?: string };
    const ach = ACHIEVEMENTS.find((a) => a.id === achievementId);
    if (!ach) {
      res.status(404).json({ error: 'Pencapaian tidak ditemukan.' });
      return;
    }
    if (user.progress.claimedAchievementIds.includes(ach.id)) {
      res.status(409).json({ error: 'Pencapaian sudah diklaim.' });
      return;
    }

    const levelsWon = Object.keys(user.progress.completedLevels).length;
    const valMap = {
      levels_won: levelsWon,
      quizzes_completed: user.progress.quizzesCompleted,
      hijaiyah_mastered: user.progress.hijaiyahStudiedIds.length,
      missions_completed: user.progress.completedMissionIds.length,
      checkin_streak: user.progress.checkinStreak,
    };
    if (valMap[ach.metricKey] < ach.targetValue) {
      res.status(400).json({ error: 'Syarat pencapaian belum terpenuhi.' });
      return;
    }

    user.progress.claimedAchievementIds.push(ach.id);
    creditWallet(
      user,
      'bintang_prestasi',
      ach.bintangReward,
      'achievement',
      `Prestasi: ${ach.title}`,
      `ach_star:${user.profile.id}:${ach.id}`
    );
    creditWallet(
      user,
      'koin_ilmu',
      db.settings.rewardsConfig.achievementKoin,
      'achievement',
      `Bonus Koin Prestasi: ${ach.title}`,
      `ach_koin:${user.profile.id}:${ach.id}`
    );
    saveDb();
    res.json({ ok: true, user: sanitizeUserResponse(user) });
  });

  // Virtual Shop & Mascot Equipment
  app.post('/api/shop/buy', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const { itemId } = req.body as { itemId?: string };
    const item = VIRTUAL_SHOP_ITEMS.find((i) => i.id === itemId);
    if (!item) {
      res.status(404).json({ error: 'Item tidak ditemukan.' });
      return;
    }

    if (item.category !== 'booster' && (user.progress.inventory[item.id] || 0) > 0) {
      res.status(409).json({ error: 'Item kosmetik ini sudah dimiliki.' });
      return;
    }

    if (item.priceKoin && item.priceKoin > 0) {
      const ok = debitWallet(
        user,
        'koin_ilmu',
        item.priceKoin,
        'virtual_shop',
        `Membeli ${item.name}`
      );
      if (!ok) {
        res.status(400).json({ error: 'Saldo Koin Ilmu tidak mencukupi.' });
        return;
      }
    } else if (item.pricePermata && item.pricePermata > 0) {
      const ok = debitWallet(
        user,
        'permata_hikmah',
        item.pricePermata,
        'virtual_shop',
        `Membeli ${item.name}`
      );
      if (!ok) {
        res.status(400).json({ error: 'Saldo Permata Hikmah tidak mencukupi.' });
        return;
      }
    }

    user.progress.inventory[item.id] = (user.progress.inventory[item.id] || 0) + 1;
    saveDb();
    res.json({ ok: true, user: sanitizeUserResponse(user) });
  });

  app.post('/api/mascot/equip', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const { itemId } = req.body as { itemId?: string };
    const item = VIRTUAL_SHOP_ITEMS.find((i) => i.id === itemId);
    if (!item || (user.progress.inventory[item.id] || 0) < 1) {
      res.status(400).json({ error: 'Item belum dimiliki.' });
      return;
    }
    if (item.category === 'mascot_cap') user.progress.equippedCap = item.id;
    if (item.category === 'mascot_backpack') user.progress.equippedBackpack = item.id;
    if (item.category === 'theme') user.progress.equippedTheme = item.id;
    saveDb();
    res.json({ ok: true, user: sanitizeUserResponse(user) });
  });

  app.post('/api/game/use-booster', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const { itemId } = req.body as { itemId?: string };
    if (!itemId || (user.progress.inventory[itemId] || 0) < 1) {
      res.status(400).json({ error: 'Stok booster habis. Beli di Toko Item Virtual.' });
      return;
    }
    user.progress.inventory[itemId] -= 1;
    saveDb();
    res.json({ ok: true, user: sanitizeUserResponse(user) });
  });

  // Rewarded Ad Test Endpoint (strictly disabled in Child Mode; grants Koin Ilmu only, NEVER cash)
  app.post('/api/ads/rewarded-test', requireAuth, rateLimit(10), (req: AuthedRequest, res) => {
    const user = req.authUser!;
    if (user.profile.ageMode === 'child' || !user.parental.adsAllowed) {
      res.status(403).json({ error: 'Iklan dinonaktifkan dalam Mode Anak / Kontrol Orang Tua.' });
      return;
    }
    const { idempotencyKey } = req.body as { idempotencyKey?: string };
    if (!idempotencyKey) {
      res.status(400).json({ error: 'Idempotency key diperlukan.' });
      return;
    }
    const granted = creditWallet(
      user,
      'koin_ilmu',
      75,
      'rewarded_ad_test',
      'Bonus virtual Koin Ilmu dari iklan uji coba (tidak dapat diuangkan)',
      idempotencyKey
    );
    if (granted) {
      db.demoRevenueStats.adRevenueIdrTest += 150;
      saveDb();
    }
    res.json({ ok: true, koinAwarded: granted ? 75 : 0, user: sanitizeUserResponse(user) });
  });

  // Adult-only Redemption Request (disabled by default until compliance & provider active)
  app.post('/api/wallet/redeem', requireAuth, rateLimit(10), (req: AuthedRequest, res) => {
    const user = req.authUser!;
    if (user.profile.ageMode !== 'adult') {
      res.status(403).json({ error: 'Fitur dompet hadiah nyata hanya untuk akun dewasa terverifikasi.' });
      return;
    }
    if (!db.settings.realRewardsEnabled) {
      res.status(403).json({
        error:
          'Penukaran hadiah nyata dinonaktifkan secara default sampai kepatuhan hukum, pendanaan sponsor, dan penyedia pembayaran resmi diaktifkan oleh administrator.',
      });
      return;
    }

    const { catalogId, destinationHint, idempotencyKey } = req.body as {
      catalogId?: string;
      destinationHint?: string;
      idempotencyKey?: string;
    };
    const item = REDEMPTION_CATALOG.find((c) => c.id === catalogId);
    if (!item || !destinationHint || !idempotencyKey) {
      res.status(400).json({ error: 'Permintaan penukaran tidak lengkap.' });
      return;
    }
    if (db.idempotencyKeys[idempotencyKey]) {
      res.status(409).json({ error: 'Permintaan duplikat terdeteksi (idempotency).' });
      return;
    }
    if (item.pointsRequired < db.settings.minRedemptionPoints) {
      res.status(400).json({ error: 'Belum memenuhi minimum penukaran.' });
      return;
    }
    if (user.wallets.availableRewardPoints < item.pointsRequired) {
      res.status(400).json({ error: 'Saldo Reward Point tidak mencukupi.' });
      return;
    }

    db.idempotencyKeys[idempotencyKey] = true;
    user.wallets.availableRewardPoints -= item.pointsRequired;
    user.wallets.pendingRewardPoints += item.pointsRequired;

    const reqRecord: RedemptionRequest = {
      id: crypto.randomUUID(),
      userId: user.profile.id,
      userName: user.profile.name,
      catalogId: item.id,
      method: item.method,
      points: item.pointsRequired,
      destinationHint: destinationHint.slice(0, 64),
      status: 'Pending',
      idempotencyKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.redemptions.unshift(reqRecord);
    saveDb();
    res.status(201).json({ ok: true, request: reqRecord, user: sanitizeUserResponse(user) });
  });

  // Notifications mark read
  app.post('/api/notifications/read-all', requireAuth, (req: AuthedRequest, res) => {
    const list = db.notifications[req.authUser!.profile.id] || [];
    list.forEach((n) => {
      n.read = true;
    });
    saveDb();
    res.json({ notifications: list });
  });

  // Leaderboard (real users + clearly labeled demo entries if < 5 players)
  app.get('/api/leaderboard', (_req, res) => {
    const realEntries: LeaderboardEntry[] = Object.values(db.users)
      .filter((u) => !u.profile.suspended)
      .map((u) => ({
        rank: 0,
        userId: u.profile.id,
        name: u.profile.name,
        level: u.profile.level,
        bintangPrestasi: u.wallets.bintangPrestasi,
        levelsCleared: Object.keys(u.progress.completedLevels).length,
        isDemoData: false,
      }));

    const demoEntries: LeaderboardEntry[] =
      realEntries.length < 5
        ? [
            { rank: 0, userId: 'demo-1', name: 'Aisyah (Data Demo)', level: 8, bintangPrestasi: 145, levelsCleared: 28, isDemoData: true },
            { rank: 0, userId: 'demo-2', name: 'Umar (Data Demo)', level: 6, bintangPrestasi: 110, levelsCleared: 21, isDemoData: true },
            { rank: 0, userId: 'demo-3', name: 'Fatimah (Data Demo)', level: 5, bintangPrestasi: 85, levelsCleared: 16, isDemoData: true },
          ]
        : [];

    const combined = [...realEntries, ...demoEntries]
      .sort((a, b) => b.bintangPrestasi - a.bintangPrestasi || b.levelsCleared - a.levelsCleared)
      .slice(0, 20)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    res.json({ leaderboard: combined });
  });

  // =========================================================================
  // ADMIN AUTH & DASHBOARD API
  // =========================================================================
  app.get('/api/admin/auth-status', (_req, res) => {
    const envConfigured = Boolean(process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0);
    res.json({
      envConfigured,
      claimed: Boolean(db.adminCredentialHash),
    });
  });

  // First-run admin setup/claim when ADMIN_PASSCODE env is unset
  app.post('/api/admin/bootstrap', rateLimit(10), (req, res) => {
    if (process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0) {
      res.status(409).json({ error: 'ADMIN_PASSCODE sudah dikonfigurasi di environment server.' });
      return;
    }
    if (db.adminCredentialHash) {
      res.status(409).json({ error: 'Kata sandi admin sudah diklaim sebelumnya.' });
      return;
    }
    const { passcode } = req.body as { passcode?: string };
    if (!passcode || passcode.length < 8) {
      res.status(400).json({ error: 'Kata sandi admin minimal 8 karakter.' });
      return;
    }
    db.adminCredentialHash = hashSecret(passcode);
    addAuditLog('admin_console', 'ADMIN_CLAIMED', 'Kredensial admin pertama berhasil ditetapkan.');
    saveDb();

    const token = signToken({
      userId: 'admin_console',
      role: 'admin',
      exp: Date.now() + 12 * 60 * 60 * 1000,
    });
    res.status(201).json({ token });
  });

  app.post('/api/admin/login', rateLimit(15), (req, res) => {
    const { passcode } = req.body as { passcode?: string };
    const envPass = process.env.ADMIN_PASSCODE?.trim();

    let ok = false;
    if (envPass) {
      const a = Buffer.from(passcode || '');
      const b = Buffer.from(envPass);
      ok = a.length === b.length && crypto.timingSafeEqual(a, b);
    } else if (db.adminCredentialHash && passcode) {
      ok = verifySecret(passcode, db.adminCredentialHash);
    }

    if (!ok) {
      res.status(401).json({ error: 'Kode akses administrator salah.' });
      return;
    }

    const token = signToken({
      userId: 'admin_console',
      role: 'admin',
      exp: Date.now() + 12 * 60 * 60 * 1000,
    });
    res.json({ token });
  });

  app.get('/api/admin/overview', requireAuth, requireAdmin, (_req, res) => {
    const allUsers = Object.values(db.users);
    const totalCompletedLevels = allUsers.reduce(
      (sum, u) => sum + Object.keys(u.progress.completedLevels).length,
      0
    );
    const totalQuizzes = allUsers.reduce((sum, u) => sum + u.progress.quizzesCompleted, 0);
    const totalHijaiyah = allUsers.reduce((sum, u) => sum + u.progress.hijaiyahStudiedIds.length, 0);

    res.json({
      stats: {
        totalUsers: allUsers.length,
        dailyActiveUsers: allUsers.filter((u) => !u.profile.suspended).length,
        completedLevels: totalCompletedLevels,
        learningProgressTotal: totalQuizzes + totalHijaiyah,
        verifiedAdRevenueIdr: db.demoRevenueStats.adRevenueIdrTest,
        sponsoredCampaignRevenueIdr: db.demoRevenueStats.sponsoredCampaignRevenueIdr,
        rewardLiabilitiesPoints: allUsers.reduce(
          (s, u) => s + u.wallets.availableRewardPoints + u.wallets.pendingRewardPoints,
          0
        ),
        pendingRedemptions: db.redemptions.filter((r) => r.status === 'Pending' || r.status === 'Under Review').length,
        fraudAlertsOpen: db.fraudFlags.filter((f) => f.status === 'open').length,
        operationalCostsIdr: db.demoRevenueStats.operationalCostIdr,
      },
      users: allUsers.map((u) => ({
        ...u.profile,
        wallets: u.wallets,
        levelsCleared: Object.keys(u.progress.completedLevels).length,
      })),
      levels: db.levels,
      quizzes: db.quizzes,
      redemptions: db.redemptions,
      transactions: db.transactions.slice(0, 100),
      fraudFlags: db.fraudFlags,
      auditLogs: db.auditLogs.slice(0, 80),
      settings: db.settings,
    });
  });

  app.post('/api/admin/users/:userId/suspend', requireAuth, requireAdmin, (req, res) => {
    const target = db.users[req.params.userId];
    if (!target) {
      res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
      return;
    }
    target.profile.suspended = Boolean(req.body?.suspended);
    addAuditLog('admin_console', 'USER_SUSPEND_TOGGLE', `User ${target.profile.id} -> ${target.profile.suspended}`);
    saveDb();
    res.json({ ok: true });
  });

  app.put('/api/admin/levels/:levelId', requireAuth, requireAdmin, (req, res) => {
    const id = Number(req.params.levelId);
    const idx = db.levels.findIndex((l) => l.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Level tidak ditemukan.' });
      return;
    }
    const { title, maxMoves, targetScore, rewardKoin } = req.body as {
      title?: string;
      maxMoves?: number;
      targetScore?: number;
      rewardKoin?: number;
    };
    const curr = db.levels[idx];
    db.levels[idx] = {
      ...curr,
      title: title ? title.slice(0, 80) : curr.title,
      maxMoves: maxMoves ? Math.max(8, Math.min(50, Number(maxMoves))) : curr.maxMoves,
      objective: {
        ...curr.objective,
        targetScore: targetScore ? Math.max(300, Number(targetScore)) : curr.objective.targetScore,
      },
      rewardKoin: rewardKoin ? Math.max(10, Number(rewardKoin)) : curr.rewardKoin,
      isConfiguredByAdmin: true,
    };
    addAuditLog('admin_console', 'LEVEL_UPDATED', `Level ${id} diperbarui`);
    saveDb();
    res.json({ ok: true, level: db.levels[idx] });
  });

  app.post('/api/admin/quiz/:questionId/review', requireAuth, requireAdmin, (req, res) => {
    const q = db.quizzes.find((item) => item.id === req.params.questionId);
    if (!q) {
      res.status(404).json({ error: 'Pertanyaan tidak ditemukan.' });
      return;
    }
    const { reviewStatus, question, explanation, referenceNote } = req.body as {
      reviewStatus?: ReviewStatus;
      question?: string;
      explanation?: string;
      referenceNote?: string;
    };
    if (reviewStatus) q.reviewStatus = reviewStatus;
    if (question) q.question = question;
    if (explanation) q.explanation = explanation;
    if (referenceNote) q.referenceNote = referenceNote;
    addAuditLog('admin_console', 'CONTENT_REVIEW', `Soal ${q.id} -> ${q.reviewStatus}`);
    saveDb();
    res.json({ ok: true, question: q });
  });

  app.post('/api/admin/redemptions/:reqId/status', requireAuth, requireAdmin, (req, res) => {
    const item = db.redemptions.find((r) => r.id === req.params.reqId);
    if (!item) {
      res.status(404).json({ error: 'Permintaan penukaran tidak ditemukan.' });
      return;
    }
    const { status, adminNote } = req.body as { status?: RedemptionStatus; adminNote?: string };
    if (!status) {
      res.status(400).json({ error: 'Status diperlukan.' });
      return;
    }
    if ((status === 'Rejected' || status === 'Failed') && item.status !== 'Rejected' && item.status !== 'Failed') {
      const user = db.users[item.userId];
      if (user) {
        user.wallets.pendingRewardPoints = Math.max(0, user.wallets.pendingRewardPoints - item.points);
        user.wallets.availableRewardPoints += item.points;
      }
    }
    if (status === 'Completed' && item.status !== 'Completed') {
      const user = db.users[item.userId];
      if (user) {
        user.wallets.pendingRewardPoints = Math.max(0, user.wallets.pendingRewardPoints - item.points);
      }
    }
    item.status = status;
    if (adminNote) item.adminNote = adminNote;
    item.updatedAt = new Date().toISOString();
    addAuditLog('admin_console', 'REDEMPTION_STATUS', `Redemption ${item.id} -> ${status}`);
    saveDb();
    res.json({ ok: true, redemption: item });
  });

  app.put('/api/admin/settings', requireAuth, requireAdmin, (req, res) => {
    const body = req.body as Partial<AppSettingsConfig>;
    if (typeof body.realRewardsEnabled === 'boolean') {
      db.settings.realRewardsEnabled = body.realRewardsEnabled;
    }
    if (typeof body.maintenanceMode === 'boolean') {
      db.settings.maintenanceMode = body.maintenanceMode;
    }
    if (typeof body.adsTestMode === 'boolean') {
      db.settings.adsTestMode = body.adsTestMode;
    }
    if (body.rewardsConfig) {
      db.settings.rewardsConfig = { ...db.settings.rewardsConfig, ...body.rewardsConfig };
    }
    addAuditLog('admin_console', 'SETTINGS_UPDATED', JSON.stringify(db.settings));
    saveDb();
    res.json({ ok: true, settings: db.settings });
  });

  app.post('/api/admin/announcements', requireAuth, requireAdmin, (req, res) => {
    const { title, body } = req.body as { title?: string; body?: string };
    if (!title || !body) {
      res.status(400).json({ error: 'Judul dan isi pengumuman wajib diisi.' });
      return;
    }
    Object.keys(db.users).forEach((uid) => pushNotification(uid, title, body, 'admin'));
    addAuditLog('admin_console', 'ANNOUNCEMENT_SENT', title);
    saveDb();
    res.json({ ok: true });
  });

  app.post('/api/admin/fraud/:flagId/resolve', requireAuth, requireAdmin, (req, res) => {
    const flag = db.fraudFlags.find((f) => f.id === req.params.flagId);
    if (!flag) {
      res.status(404).json({ error: 'Peringatan tidak ditemukan.' });
      return;
    }
    flag.status = 'resolved';
    addAuditLog('admin_console', 'FRAUD_RESOLVED', flag.id);
    saveDb();
    res.json({ ok: true });
  });

  app.get('/api/admin/export', requireAuth, requireAdmin, (_req, res) => {
    const header = 'tx_id,user_id,currency,amount,type,source,created_at\n';
    const rows = db.transactions
      .map(
        (t) =>
          `${t.id},${t.userId},${t.currency},${t.amount},${t.type},"${t.source.replace(/"/g, '""')}",${t.createdAt}`
      )
      .join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="muslim-blast-transactions.csv"');
    res.send(header + rows);
  });

  // Vite dev middleware or production static serving
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(process.cwd(), 'dist'));
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Muslim Blast server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Muslim Blast server:', err);
  process.exit(1);
});
