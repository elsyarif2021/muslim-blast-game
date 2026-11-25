import type {
  AgeMode,
  AppSettingsConfig,
  GameLevelConfig,
  LeaderboardEntry,
  NotificationItem,
  ParentalControlsState,
  PlayerProgress,
  PuzzleMove,
  QuizQuestion,
  RedemptionCatalogItem,
  RedemptionRequest,
  RedemptionStatus,
  ReviewStatus,
  UserPreferences,
  UserProfile,
  WalletBalances,
  WalletTransaction,
  PuzzleSessionSnapshot,
  DailyChallengeProgress,
} from '../types/index.ts';
import { localGame } from './localGame.ts';

export const isLocalGame = import.meta.env.VITE_API_MODE !== 'server';

export interface HydratedUserState {
  profile: UserProfile;
  wallets: WalletBalances;
  progress: PlayerProgress;
  preferences: UserPreferences;
  parental: ParentalControlsState;
  notifications: NotificationItem[];
  transactions: WalletTransaction[];
  redemptions: RedemptionRequest[];
}

export interface PublicCatalogResponse {
  levels: GameLevelConfig[];
  quizzes: QuizQuestion[];
  redemptionCatalog: RedemptionCatalogItem[];
  settings: AppSettingsConfig;
}

class ApiClient {
  // Keep auth tokens strictly in JS memory (never localStorage) per security policy
  private userToken: string | null = null;
  private adminToken: string | null = null;

  getSavedUser(): HydratedUserState | null {
    return isLocalGame ? localGame.getSavedUser() : null;
  }

  resumeLocalGame(): HydratedUserState | null {
    const user = this.getSavedUser();
    if (user) this.userToken = `local:${user.profile.id}`;
    return user;
  }

  get savesOnDevice(): boolean {
    return localGame.storageAvailable;
  }

  getActiveSession(): PuzzleSessionSnapshot | null {
    return isLocalGame ? localGame.getActiveSession() : null;
  }

  getDailyChallenge(): DailyChallengeProgress | null {
    return isLocalGame ? localGame.getDailyChallenge() : null;
  }

  updateProfile(name: string) {
    return this.request<{ ok: boolean; user: HydratedUserState }>('/api/me/profile', { method: 'PATCH', body: JSON.stringify({ name }) });
  }

  saveGameCheckpoint(sessionId: string, moves: PuzzleMove[]) {
    if (!isLocalGame) return Promise.resolve({ ok: true });
    return this.request<{ ok: boolean }>('/api/game/session/checkpoint', { method: 'POST', body: JSON.stringify({ sessionId, moves }) });
  }

  cancelHammer(sessionId: string) {
    return this.request<{ ok: boolean; user: HydratedUserState }>('/api/game/cancel-hammer', { method: 'POST', body: JSON.stringify({ sessionId }) });
  }

  claimDailyChallenge() {
    return this.request<{ ok: boolean; user: HydratedUserState }>('/api/daily-challenge/claim', { method: 'POST' });
  }

  exportProgress() {
    if (!isLocalGame) throw new Error('Cadangan ini tersedia untuk progres yang tersimpan di perangkat.');
    return localGame.exportProgress();
  }

  importProgress(contents: string) {
    if (!isLocalGame) throw new Error('Pemulihan ini tersedia untuk mode perangkat.');
    const user = localGame.importProgress(contents);
    this.userToken = `local:${user.profile.id}`;
    return user;
  }

  hasRecoverySave() { return isLocalGame && localGame.hasRecoverySave(); }

  undoProgressRestore() {
    if (!isLocalGame) throw new Error('Pemulihan ini tersedia untuk mode perangkat.');
    const user = localGame.undoProgressRestore();
    this.userToken = `local:${user.profile.id}`;
    return user;
  }

  setUserToken(token: string | null) {
    this.userToken = token;
  }

  getUserToken(): string | null {
    return this.userToken;
  }

  setAdminToken(token: string | null) {
    this.adminToken = token;
  }

  getAdminToken(): string | null {
    return this.adminToken;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    useAdminToken = false
  ): Promise<T> {
    const token = useAdminToken ? this.adminToken : this.userToken;
    if (isLocalGame) return localGame.request(path, options, token) as T;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
    const res = await fetch(`${baseUrl}${path}`, { ...options, headers });
    if (!res.headers.get('content-type')?.includes('application/json')) {
      throw new Error('Server permainan belum tersedia. Periksa pengaturan backend.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((data as { error?: string }).error || `Permintaan gagal (${res.status})`);
    }
    return data as T;
  }

  fetchCatalog() {
    return this.request<PublicCatalogResponse>('/api/public/catalog');
  }

  fetchLeaderboard() {
    return this.request<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard');
  }

  register(payload: {
    name: string;
    email: string;
    password: string;
    ageMode: AgeMode;
    referralCode?: string;
  }) {
    return this.request<{ token: string; user: HydratedUserState }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  login(payload: { email: string; password: string }) {
    return this.request<{ token: string; user: HydratedUserState }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  guestStart(payload: { name: string; ageMode: AgeMode }) {
    return this.request<{ token: string; user: HydratedUserState }>('/api/auth/guest', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  updatePreferences(prefs: Partial<UserPreferences>) {
    return this.request<{ preferences: UserPreferences }>('/api/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify(prefs),
    });
  }

  switchAgeMode(ageMode: AgeMode, pin?: string) {
    return this.request<{ user: HydratedUserState }>('/api/me/mode', {
      method: 'POST',
      body: JSON.stringify({ ageMode, pin }),
    });
  }

  updateParental(payload: {
    currentPin?: string;
    newPin?: string;
    dailyLimitMinutes?: number;
    adsAllowed?: boolean;
    childModeLocked?: boolean;
  }) {
    return this.request<{ user: HydratedUserState }>('/api/me/parental', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  startGameSession(levelId: number) {
    return this.request<PuzzleSessionSnapshot>(
      '/api/game/session/start',
      { method: 'POST', body: JSON.stringify({ levelId }) }
    );
  }

  completeGameSession(sessionId: string, moves: PuzzleMove[], idempotencyKey: string) {
    return this.request<{
      ok: boolean;
      status: 'won' | 'lost' | 'playing';
      verifiedScore: number;
      stars: number;
      koinAwarded: number;
      permataAwarded: number;
      user: HydratedUserState;
    }>('/api/game/session/complete', {
      method: 'POST',
      body: JSON.stringify({ sessionId, moves, idempotencyKey }),
    });
  }

  useBooster(itemId: string, sessionId?: string) {
    return this.request<{ ok: boolean; user: HydratedUserState }>('/api/game/use-booster', {
      method: 'POST',
      body: JSON.stringify({ itemId, sessionId }),
    });
  }

  submitQuiz(category: string, totalQuestions: number, correctCount: number, idempotencyKey: string) {
    return this.request<{ ok: boolean; koinAwarded: number; user: HydratedUserState }>(
      '/api/quiz/submit',
      {
        method: 'POST',
        body: JSON.stringify({ category, totalQuestions, correctCount, idempotencyKey }),
      }
    );
  }

  completeHijaiyah(letterId: number) {
    return this.request<{ ok: boolean; koinAwarded: number; user: HydratedUserState }>(
      '/api/hijaiyah/complete',
      { method: 'POST', body: JSON.stringify({ letterId }) }
    );
  }

  dailyCheckin() {
    return this.request<{ ok: boolean; reward: number; user: HydratedUserState }>('/api/checkin', {
      method: 'POST',
    });
  }

  claimMission(missionId: string) {
    return this.request<{ ok: boolean; reward: number; user: HydratedUserState }>(
      '/api/missions/claim',
      { method: 'POST', body: JSON.stringify({ missionId }) }
    );
  }

  claimAchievement(achievementId: string) {
    return this.request<{ ok: boolean; user: HydratedUserState }>('/api/achievements/claim', {
      method: 'POST',
      body: JSON.stringify({ achievementId }),
    });
  }

  buyShopItem(itemId: string) {
    return this.request<{ ok: boolean; user: HydratedUserState }>('/api/shop/buy', {
      method: 'POST',
      body: JSON.stringify({ itemId }),
    });
  }

  equipMascotItem(itemId: string) {
    return this.request<{ ok: boolean; user: HydratedUserState }>('/api/mascot/equip', {
      method: 'POST',
      body: JSON.stringify({ itemId }),
    });
  }

  triggerTestRewardedAd(idempotencyKey: string) {
    return this.request<{ ok: boolean; koinAwarded: number; user: HydratedUserState }>(
      '/api/ads/rewarded-test',
      { method: 'POST', body: JSON.stringify({ idempotencyKey }) }
    );
  }

  requestRedemption(catalogId: string, destinationHint: string, idempotencyKey: string) {
    return this.request<{ ok: boolean; request: RedemptionRequest; user: HydratedUserState }>(
      '/api/wallet/redeem',
      { method: 'POST', body: JSON.stringify({ catalogId, destinationHint, idempotencyKey }) }
    );
  }

  markNotificationsRead() {
    return this.request<{ notifications: NotificationItem[] }>('/api/notifications/read-all', {
      method: 'POST',
    });
  }

  // Admin endpoints
  adminAuthStatus() {
    return this.request<{ envConfigured: boolean; claimed: boolean }>('/api/admin/auth-status');
  }

  adminBootstrap(passcode: string) {
    return this.request<{ token: string }>('/api/admin/bootstrap', {
      method: 'POST',
      body: JSON.stringify({ passcode }),
    });
  }

  adminLogin(passcode: string) {
    return this.request<{ token: string }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ passcode }),
    });
  }

  adminOverview() {
    return this.request<Record<string, unknown>>('/api/admin/overview', {}, true);
  }

  adminSuspendUser(userId: string, suspended: boolean) {
    return this.request<{ ok: boolean }>(
      `/api/admin/users/${userId}/suspend`,
      { method: 'POST', body: JSON.stringify({ suspended }) },
      true
    );
  }

  adminUpdateLevel(levelId: number, payload: { title?: string; maxMoves?: number; targetScore?: number; rewardKoin?: number }) {
    return this.request<{ ok: boolean; level: GameLevelConfig }>(
      `/api/admin/levels/${levelId}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      true
    );
  }

  adminReviewQuiz(
    questionId: string,
    payload: { reviewStatus?: ReviewStatus; question?: string; explanation?: string; referenceNote?: string }
  ) {
    return this.request<{ ok: boolean; question: QuizQuestion }>(
      `/api/admin/quiz/${questionId}/review`,
      { method: 'POST', body: JSON.stringify(payload) },
      true
    );
  }

  adminUpdateRedemption(reqId: string, status: RedemptionStatus, adminNote?: string) {
    return this.request<{ ok: boolean }>(
      `/api/admin/redemptions/${reqId}/status`,
      { method: 'POST', body: JSON.stringify({ status, adminNote }) },
      true
    );
  }

  adminUpdateSettings(settings: Partial<AppSettingsConfig>) {
    return this.request<{ ok: boolean; settings: AppSettingsConfig }>(
      '/api/admin/settings',
      { method: 'PUT', body: JSON.stringify(settings) },
      true
    );
  }

  adminSendAnnouncement(title: string, body: string) {
    return this.request<{ ok: boolean }>(
      '/api/admin/announcements',
      { method: 'POST', body: JSON.stringify({ title, body }) },
      true
    );
  }

  adminResolveFraud(flagId: string) {
    return this.request<{ ok: boolean }>(
      `/api/admin/fraud/${flagId}/resolve`,
      { method: 'POST' },
      true
    );
  }
}

export const api = new ApiClient();
