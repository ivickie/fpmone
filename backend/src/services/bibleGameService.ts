import { v4 as uuidv4 } from 'uuid';
import { db } from '../data/mockDb';
import { query } from '../db';
import {
  BibleQuestion,
  BibleQuestionClientView,
  BibleDailyChallenge,
  BibleUserProgress,
  BibleUserStats,
  BibleBadge,
  BibleUserBadgeRecord,
  BibleLeaderboardEntry,
  BibleQuestionCategory,
  BibleQuestionDifficulty,
  BibleQuestionStatus,
  BibleGameSettings,
  BibleQuestionTiming
} from '../types';
import {
  persistBibleQuestion,
  persistBibleDailyChallenge,
  persistBibleUserProgress,
  persistBibleUserStats,
  persistBibleUserBadge,
  persistBibleSettings
} from '../db/sync';

export interface LevelInfo {
  level: number;
  levelTitle: string;
  minXp: number;
  nextLevelXp: number;
  xpInCurrentLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
}

export const LEVEL_TIERS: Array<{ level: number; title: string; minXp: number; nextLevelXp: number }> = [
  { level: 1, title: 'Scripture Seeker', minXp: 0, nextLevelXp: 100 },
  { level: 2, title: 'Faith Disciple', minXp: 100, nextLevelXp: 250 },
  { level: 3, title: 'Word Explorer', minXp: 250, nextLevelXp: 450 },
  { level: 4, title: 'Bible Student', minXp: 450, nextLevelXp: 700 },
  { level: 5, title: 'Truth Pursuer', minXp: 700, nextLevelXp: 1000 },
  { level: 6, title: 'Scripture Scholar', minXp: 1000, nextLevelXp: 1500 },
  { level: 7, title: 'Wisdom Champion', minXp: 1500, nextLevelXp: 2100 },
  { level: 8, title: 'Kingdom Ambassador', minXp: 2100, nextLevelXp: 3000 },
  { level: 9, title: 'Faith Giant', minXp: 3000, nextLevelXp: 4000 },
  { level: 10, title: 'Master of the Word', minXp: 4000, nextLevelXp: 5500 }
];

export class BibleGameService {
  /**
   * Returns current calendar date in 'Africa/Lagos' timezone as 'YYYY-MM-DD'.
   */
  public static getTodayLagosDate(date: Date = new Date()): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Lagos',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(date);
  }

  /**
   * Returns the immediate calendar day prior to the given 'YYYY-MM-DD' in Africa/Lagos.
   */
  public static getYesterdayLagosDate(lagosDateStr: string): string {
    const [year, month, day] = lagosDateStr.split('-').map(Number);
    // Use midday UTC to prevent drift across day boundaries
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    date.setUTCDate(date.getUTCDate() - 1);
    return BibleGameService.getTodayLagosDate(date);
  }

  /**
   * Returns the start (Monday) and end (Sunday) 'YYYY-MM-DD' dates for the week containing lagosDateStr.
   */
  public static getWeekRangeLagos(lagosDateStr: string): { startOfWeek: string; endOfWeek: string } {
    const [year, month, day] = lagosDateStr.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    // Day of week: 0 = Sun, 1 = Mon, ..., 6 = Sat
    const dayOfWeek = date.getUTCDay();
    // Monday is day 1. If Sunday (0), distance to Monday is -6. Otherwise distance is 1 - dayOfWeek.
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(date);
    monday.setUTCDate(date.getUTCDate() + distanceToMonday);

    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);

    return {
      startOfWeek: BibleGameService.getTodayLagosDate(monday),
      endOfWeek: BibleGameService.getTodayLagosDate(sunday)
    };
  }

  /**
   * Authoritative Level Progression calculation based on cumulative XP.
   */
  public static calculateLevel(xp: number): LevelInfo {
    const safeXp = Math.max(0, xp);
    let matchedTier = LEVEL_TIERS[0];

    for (let i = LEVEL_TIERS.length - 1; i >= 0; i--) {
      if (safeXp >= LEVEL_TIERS[i].minXp) {
        matchedTier = LEVEL_TIERS[i];
        break;
      }
    }

    const xpInCurrentLevel = Math.round((safeXp - matchedTier.minXp) * 10) / 10;
    const levelSpan = matchedTier.nextLevelXp - matchedTier.minXp;
    const xpForNextLevel = Math.round(Math.max(0, matchedTier.nextLevelXp - safeXp) * 10) / 10;
    const progressPercent = Math.min(100, Math.round((xpInCurrentLevel / levelSpan) * 100));

    return {
      level: matchedTier.level,
      levelTitle: matchedTier.title,
      minXp: matchedTier.minXp,
      nextLevelXp: matchedTier.nextLevelXp,
      xpInCurrentLevel,
      xpForNextLevel,
      progressPercent
    };
  }

  /**
   * Sanitizes a BibleQuestion for client consumption before the question is answered.
   * Strips correctOptionIndex, explanation, and bibleReference to prevent inspection/cheating.
   */
  public static toClientQuestionView(question: BibleQuestion): BibleQuestionClientView {
    return {
      id: question.id,
      questionText: question.questionText,
      options: [...question.options] as [string, string, string, string],
      category: question.category,
      difficulty: question.difficulty
    };
  }

  /**
   * Directly queries PostgreSQL for the latest user progress record if not in memory or running in serverless.
   */
  public static async syncUserProgressFromDb(userId: string, targetDate: string): Promise<BibleUserProgress | undefined> {
    if (process.env.DATABASE_URL && process.env.IS_TEST_RUN !== 'true') {
      try {
        const res = await query(
          'SELECT * FROM bible_game_user_progress WHERE user_id = $1 AND challenge_date = $2',
          [userId, targetDate]
        );
        if (res.rows.length > 0) {
          const r = res.rows[0];
          const parsed: BibleUserProgress = {
            id: r.id,
            userId: r.user_id,
            memberId: r.member_id,
            challengeDate: typeof r.challenge_date === 'string' ? r.challenge_date.substring(0, 10) : new Date(r.challenge_date).toISOString().substring(0, 10),
            challengeId: r.challenge_id,
            currentQuestionIndex: r.current_question_index,
            activeQuestionIndex: r.active_question_index ?? undefined,
            activeQuestionStartedAt: r.active_question_started_at ? new Date(r.active_question_started_at).toISOString() : undefined,
            activeQuestionDeadlineAt: r.active_question_deadline_at ? new Date(r.active_question_deadline_at).toISOString() : undefined,
            answers: Array.isArray(r.answers) ? r.answers : (typeof r.answers === 'string' ? JSON.parse(r.answers) : []),
            score: r.score,
            totalResponseTimeMs: r.total_response_time_ms || 0,
            xpAwarded: Number(r.xp_awarded) || 0.0,
            isCompleted: Boolean(r.is_completed),
            startedAt: r.started_at ? new Date(r.started_at).toISOString() : new Date().toISOString(),
            completedAt: r.completed_at ? new Date(r.completed_at).toISOString() : undefined,
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
            updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
          };
          const idx = db.bibleUserProgress.findIndex(p => p.userId === userId && p.challengeDate === targetDate);
          if (idx >= 0) db.bibleUserProgress[idx] = parsed;
          else db.bibleUserProgress.push(parsed);
          return parsed;
        }
      } catch (err: any) {
        console.error('[DATABASE SYNC ERROR: bible_game_user_progress]', err.message);
      }
    }
    return db.bibleUserProgress.find(p => p.userId === userId && p.challengeDate === targetDate);
  }

  /**
   * Directly queries PostgreSQL for the latest user stats record if not in memory or running in serverless.
   */
  public static async syncUserStatsFromDb(userId: string, memberId: string): Promise<BibleUserStats | undefined> {
    if (process.env.DATABASE_URL && process.env.IS_TEST_RUN !== 'true') {
      try {
        const res = await query(
          'SELECT * FROM bible_game_user_stats WHERE user_id = $1 OR member_id = $2',
          [userId, memberId]
        );
        if (res.rows.length > 0) {
          const r = res.rows[0];
          const cumulativeXp = Number(r.cumulative_xp) || 0.0;
          const levelInfo = BibleGameService.calculateLevel(cumulativeXp);
          const parsed: BibleUserStats = {
            userId: r.user_id,
            memberId: r.member_id,
            cumulativeXp,
            level: r.level || levelInfo.level,
            levelTitle: levelInfo.levelTitle,
            xpInCurrentLevel: levelInfo.xpInCurrentLevel,
            xpForNextLevel: levelInfo.xpForNextLevel,
            currentStreak: r.current_streak || 0,
            bestStreak: r.best_streak || 0,
            lastCompletedDate: r.last_completed_date ? (typeof r.last_completed_date === 'string' ? r.last_completed_date.substring(0, 10) : new Date(r.last_completed_date).toISOString().substring(0, 10)) : undefined,
            totalChallengesCompleted: r.total_challenges_completed || 0,
            perfectScoresCount: r.perfect_scores_count || 0,
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
            updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
          };
          const idx = db.bibleUserStats.findIndex(s => s.userId === userId || s.memberId === memberId);
          if (idx >= 0) db.bibleUserStats[idx] = parsed;
          else db.bibleUserStats.push(parsed);
          return parsed;
        }
      } catch (err: any) {
        console.error('[DATABASE SYNC ERROR: bible_game_user_stats]', err.message);
      }
    }
    return db.bibleUserStats.find(s => s.userId === userId || s.memberId === memberId);
  }

  /**
   * Retrieves or initializes authoritative user game statistics.
   */
  public static async getOrCreateUserStats(userId: string, memberId: string): Promise<BibleUserStats> {
    let stats = await BibleGameService.syncUserStatsFromDb(userId, memberId);
    if (!stats) {
      const levelInfo = BibleGameService.calculateLevel(0);
      stats = {
        userId,
        memberId,
        cumulativeXp: 0,
        level: levelInfo.level,
        levelTitle: levelInfo.levelTitle,
        xpInCurrentLevel: levelInfo.xpInCurrentLevel,
        xpForNextLevel: levelInfo.xpForNextLevel,
        currentStreak: 0,
        bestStreak: 0,
        totalChallengesCompleted: 0,
        perfectScoresCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.bibleUserStats.push(stats);
      await persistBibleUserStats(stats);
    } else {
      // Re-synchronize level title and spans dynamically
      const levelInfo = BibleGameService.calculateLevel(stats.cumulativeXp);
      stats.level = levelInfo.level;
      stats.levelTitle = levelInfo.levelTitle;
      stats.xpInCurrentLevel = levelInfo.xpInCurrentLevel;
      stats.xpForNextLevel = levelInfo.xpForNextLevel;
    }
    return stats;
  }

  /**
   * Deterministically retrieves or creates today's 5-question daily challenge for Africa/Lagos.
   * Ensures all church members receive the exact same 5 questions in the exact same fixed sequence.
   */
  public static async getOrCreateDailyChallenge(challengeDate?: string): Promise<{
    challenge: BibleDailyChallenge;
    questions: BibleQuestion[];
  }> {
    const targetDate = challengeDate || BibleGameService.getTodayLagosDate();

    let challenge = db.bibleDailyChallenges.find(c => c.challengeDate === targetDate);
    if (!challenge) {
      // Find published questions
      const published = db.bibleQuestions.filter(q => q.status === 'published');
      if (published.length < 5) {
        throw new Error(`Insufficient published questions available. Found ${published.length}, require at least 5.`);
      }

      // Collect question IDs used in the last 14 days to prevent repetitive questions
      const recentChallenges = db.bibleDailyChallenges
        .filter(c => c.challengeDate !== targetDate)
        .slice(-14);
      const recentlyUsedIds = new Set<string>();
      for (const rc of recentChallenges) {
        rc.questionIds.forEach(id => recentlyUsedIds.add(id));
      }

      // Partition into not-recently-used vs recently-used
      const freshPool = published.filter(q => !recentlyUsedIds.has(q.id));
      const fallbackPool = published.filter(q => recentlyUsedIds.has(q.id));

      // Deterministic pseudo-random seed based on targetDate string
      let seed = 0;
      for (let i = 0; i < targetDate.length; i++) {
        seed = (seed << 5) - seed + targetDate.charCodeAt(i);
        seed |= 0;
      }
      const pseudoRandom = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
      };

      const shuffle = <T>(arr: T[]): T[] => {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
          const j = Math.floor(pseudoRandom() * (i + 1));
          [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
      };

      const selectedQuestions: BibleQuestion[] = [];
      const shuffledFresh = shuffle(freshPool);
      for (const q of shuffledFresh) {
        if (selectedQuestions.length < 5) selectedQuestions.push(q);
      }

      if (selectedQuestions.length < 5) {
        const shuffledFallback = shuffle(fallbackPool);
        for (const q of shuffledFallback) {
          if (selectedQuestions.length < 5 && !selectedQuestions.some(sq => sq.id === q.id)) {
            selectedQuestions.push(q);
          }
        }
      }

      challenge = {
        id: uuidv4(),
        challengeDate: targetDate,
        questionIds: selectedQuestions.map(q => q.id),
        status: 'published',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.bibleDailyChallenges.push(challenge);
      await persistBibleDailyChallenge(challenge);
    }

    // Resolve full questions in the recorded fixed sequence
    const fullQuestions = challenge.questionIds
      .map(id => db.bibleQuestions.find(q => q.id === id))
      .filter((q): q is BibleQuestion => Boolean(q));

    if (fullQuestions.length < 5) {
      throw new Error(`Daily challenge ${challenge.id} contains invalid or missing question references.`);
    }

    return { challenge, questions: fullQuestions };
  }

  /**
   * Retrieves today's game home payload for the authenticated member.
   * Never leaks correct answers or explanations for uncompleted challenges.
   */
  public static async getTodayOverview(userId: string, memberId: string, challengeDate?: string): Promise<{
    challengeDate: string;
    challengeId: string;
    totalQuestions: number;
    isCompleted: boolean;
    score: number;
    totalXp: number;
    totalResponseTimeMs: number;
    currentQuestionIndex: number;
    stats: BibleUserStats;
    badges: BibleBadge[];
    weeklyLeaderboardPreview: BibleLeaderboardEntry[];
    reviewedQuestions?: Array<{
      id: string;
      questionText: string;
      options: [string, string, string, string];
      selectedIndex?: number;
      correctOptionIndex: number;
      isCorrect: boolean;
      explanation: string;
      bibleReference: string;
    }>;
  }> {
    const targetDate = challengeDate || BibleGameService.getTodayLagosDate();
    const { challenge, questions } = await BibleGameService.getOrCreateDailyChallenge(targetDate);
    const stats = await BibleGameService.getOrCreateUserStats(userId, memberId);

    const progress = await BibleGameService.syncUserProgressFromDb(userId, targetDate);

    const userBadges = db.bibleUserBadges.filter(b => b.userId === userId);
    const badgesWithStatus: BibleBadge[] = db.bibleBadges.map(badge => {
      const award = userBadges.find(ub => ub.badgeId === badge.id);
      return {
        ...badge,
        earned: Boolean(award),
        awardedAt: award?.awardedAt
      };
    }).sort((a, b) => a.displayOrder - b.displayOrder);

    // Leaderboard preview (top 5)
    const leaderboardResult = await BibleGameService.getLeaderboard(memberId);
    const weeklyLeaderboardPreview = leaderboardResult.entries.slice(0, 5);

    let reviewedQuestions: any = undefined;
    if (progress && progress.isCompleted) {
      reviewedQuestions = questions.map(q => {
        const ans = progress.answers.find(a => a.questionId === q.id);
        return {
          id: q.id,
          questionText: q.questionText,
          options: q.options,
          selectedIndex: ans ? ans.selectedIndex : -1,
          correctOptionIndex: q.correctOptionIndex,
          isCorrect: Boolean(ans?.isCorrect),
          explanation: q.explanation,
          bibleReference: q.bibleReference,
          responseTimeMs: ans?.responseTimeMs || 0,
          remainingTimeMs: ans?.remainingTimeMs || 0,
          questionXp: ans?.questionXp || 0.0,
          isTimeout: Boolean(ans?.isTimeout)
        };
      });
    }

    return {
      challengeDate: targetDate,
      challengeId: challenge.id,
      totalQuestions: 5,
      isCompleted: Boolean(progress?.isCompleted),
      score: progress?.score || 0,
      totalXp: progress?.xpAwarded || 0.0,
      totalResponseTimeMs: progress?.totalResponseTimeMs || 0,
      currentQuestionIndex: progress?.currentQuestionIndex || 0,
      stats,
      badges: badgesWithStatus,
      weeklyLeaderboardPreview,
      reviewedQuestions
    };
  }

  /**
   * Starts or resumes the current user's session for today's daily challenge.
   */
  public static async startOrResumeSession(userId: string, memberId: string, challengeDate?: string): Promise<{
    challengeDate: string;
    challengeId: string;
    currentQuestionIndex: number;
    totalQuestions: number;
    isCompleted: boolean;
    score: number;
    totalXp: number;
    currentQuestion: BibleQuestionClientView | null;
    activeQuestionTiming?: BibleQuestionTiming;
    answeredQuestions: Array<{
      questionId: string;
      selectedIndex: number;
      isCorrect: boolean;
      correctOptionIndex: number;
      explanation: string;
      bibleReference: string;
      responseTimeMs: number;
      remainingTimeMs: number;
      questionXp: number;
      isTimeout: boolean;
    }>;
  }> {
    const targetDate = challengeDate || BibleGameService.getTodayLagosDate();
    const { challenge, questions } = await BibleGameService.getOrCreateDailyChallenge(targetDate);

    let progress = await BibleGameService.syncUserProgressFromDb(userId, targetDate);

    // ONE XP-EARNING COMPLETION PER MEMBER PER DAY GUARANTEE:
    // If challenge is already completed, return completed state and reviewed answers immediately.
    // Under no circumstances create a fresh attempt or reset answers/score/isCompleted!
    if (progress && progress.isCompleted) {
      const answeredQuestions = progress.answers.map(ans => {
        const q = questions.find(qItem => qItem.id === ans.questionId);
        return {
          questionId: ans.questionId,
          selectedIndex: ans.selectedIndex,
          isCorrect: ans.isCorrect,
          correctOptionIndex: q ? q.correctOptionIndex : 0,
          explanation: q ? q.explanation : '',
          bibleReference: q ? q.bibleReference : '',
          responseTimeMs: ans.responseTimeMs || 0,
          remainingTimeMs: ans.remainingTimeMs || 0,
          questionXp: ans.questionXp || 0.0,
          isTimeout: Boolean(ans.isTimeout)
        };
      });

      return {
        challengeDate: targetDate,
        challengeId: progress.challengeId || challenge.id,
        currentQuestionIndex: progress.currentQuestionIndex,
        totalQuestions: 5,
        isCompleted: true,
        score: progress.score,
        totalXp: progress.xpAwarded,
        currentQuestion: null,
        activeQuestionTiming: undefined,
        answeredQuestions
      };
    }

    if (!progress) {
      progress = {
        id: uuidv4(),
        userId,
        memberId,
        challengeDate: targetDate,
        challengeId: challenge.id,
        currentQuestionIndex: 0,
        answers: [],
        score: 0,
        totalResponseTimeMs: 0,
        xpAwarded: 0.0,
        isCompleted: false,
        startedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.bibleUserProgress.push(progress);
      await persistBibleUserProgress(progress);
    }

    const answeredQuestions = progress.answers.map(ans => {
      const q = questions.find(qItem => qItem.id === ans.questionId);
      return {
        questionId: ans.questionId,
        selectedIndex: ans.selectedIndex,
        isCorrect: ans.isCorrect,
        correctOptionIndex: q ? q.correctOptionIndex : 0,
        explanation: q ? q.explanation : '',
        bibleReference: q ? q.bibleReference : '',
        responseTimeMs: ans.responseTimeMs || 0,
        remainingTimeMs: ans.remainingTimeMs || 0,
        questionXp: ans.questionXp || 0.0,
        isTimeout: Boolean(ans.isTimeout)
      };
    });

    const activeQuestion = (!progress.isCompleted && progress.currentQuestionIndex < questions.length)
      ? BibleGameService.toClientQuestionView(questions[progress.currentQuestionIndex])
      : null;

    let activeQuestionTiming: BibleQuestionTiming | undefined = undefined;
    if (
      !progress.isCompleted &&
      progress.activeQuestionIndex === progress.currentQuestionIndex &&
      progress.activeQuestionStartedAt &&
      progress.activeQuestionDeadlineAt &&
      activeQuestion
    ) {
      activeQuestionTiming = {
        questionIndex: progress.currentQuestionIndex,
        questionId: activeQuestion.id,
        startedAt: progress.activeQuestionStartedAt,
        deadlineAt: progress.activeQuestionDeadlineAt,
        serverTime: new Date().toISOString(),
        timeLimitSeconds: 10,
        timeLimitMs: 10000
      };
    }

    const totalXp = Math.round(progress.answers.reduce((sum, a) => sum + (a.questionXp || 0), 0) * 10) / 10;

    return {
      challengeDate: targetDate,
      challengeId: challenge.id,
      currentQuestionIndex: progress.currentQuestionIndex,
      totalQuestions: 5,
      isCompleted: progress.isCompleted,
      score: progress.score,
      totalXp,
      currentQuestion: activeQuestion,
      activeQuestionTiming,
      answeredQuestions
    };
  }

  /**
   * Authoritative start handshake for timed questions.
   * Starts the 10-second countdown when the client renders the question and answer choices.
   * Idempotent & persistent: if called multiple times or after backgrounding/network interruption,
   * returns the existing deadline so elapsed time continues without resetting.
   */
  public static async startQuestion(
    userId: string,
    memberId: string,
    questionIndex: number,
    challengeDate?: string
  ): Promise<BibleQuestionTiming> {
    const targetDate = challengeDate || BibleGameService.getTodayLagosDate();
    const { challenge, questions } = await BibleGameService.getOrCreateDailyChallenge(targetDate);

    let progress = await BibleGameService.syncUserProgressFromDb(userId, targetDate);

    if (!progress) {
      await BibleGameService.startOrResumeSession(userId, memberId, targetDate);
      progress = await BibleGameService.syncUserProgressFromDb(userId, targetDate);
    }

    if (!progress) {
      throw new Error('Failed to initialize session for today.');
    }

    if (progress.isCompleted) {
      throw new Error('This daily challenge has already been completed.');
    }

    if (questionIndex !== progress.currentQuestionIndex) {
      throw new Error(`Invalid question start sequence. Expected question ${progress.currentQuestionIndex + 1}, received ${questionIndex + 1}.`);
    }

    if (questionIndex < 0 || questionIndex >= questions.length) {
      throw new Error('Question index is out of bounds.');
    }

    const currentQuestion = questions[questionIndex];
    const now = Date.now();
    const timeLimitMs = 10000; // 10 seconds

    // If timer already started for this active question, return existing deadline (anti-reset guard)
    if (
      progress.activeQuestionIndex === questionIndex &&
      progress.activeQuestionStartedAt &&
      progress.activeQuestionDeadlineAt
    ) {
      return {
        questionIndex,
        questionId: currentQuestion.id,
        startedAt: progress.activeQuestionStartedAt,
        deadlineAt: progress.activeQuestionDeadlineAt,
        serverTime: new Date(now).toISOString(),
        timeLimitSeconds: 10,
        timeLimitMs
      };
    }

    const startedAt = new Date(now).toISOString();
    const deadlineAt = new Date(now + timeLimitMs).toISOString();

    progress.activeQuestionIndex = questionIndex;
    progress.activeQuestionStartedAt = startedAt;
    progress.activeQuestionDeadlineAt = deadlineAt;
    progress.updatedAt = startedAt;

    await persistBibleUserProgress(progress);

    return {
      questionIndex,
      questionId: currentQuestion.id,
      startedAt,
      deadlineAt,
      serverTime: new Date(now).toISOString(),
      timeLimitSeconds: 10,
      timeLimitMs
    };
  }

  /**
   * Submits an answer or handles timeout for the active question index.
   * Strictly enforces server-authoritative 10-second deadline with documented 1.0s network transit tolerance.
   * Calculates speed-based XP:
   *   Question XP = round(10 * remaining time / 10, 1) = round(remainingSeconds, 1)
   * Examples:
   *   9.7s remaining -> 9.7 XP
   *   6.4s remaining -> 6.4 XP
   *   2.1s remaining -> 2.1 XP
   *   Deadline expired / Incorrect / Timeout -> 0.0 XP
   * Idempotent: protects against concurrent submissions racing against timeout or network retries.
   */
  public static async submitAnswer(
    userId: string,
    memberId: string,
    questionIndex: number,
    selectedOptionIndex: number | null,
    options?: {
      isTimeout?: boolean;
      challengeDate?: string;
    }
  ): Promise<{
    isCorrect: boolean;
    correctOptionIndex: number;
    explanation: string;
    bibleReference: string;
    score: number;
    currentQuestionIndex: number;
    isRoundFinished: boolean;
    questionXp: number;
    responseTimeMs: number;
    remainingTimeMs: number;
    isTimeout: boolean;
  }> {
    const isTimeout = Boolean(options?.isTimeout || selectedOptionIndex === null || selectedOptionIndex === -1);

    if (!isTimeout) {
      if (!Number.isInteger(selectedOptionIndex) || selectedOptionIndex! < 0 || selectedOptionIndex! > 3) {
        throw new Error('Invalid option index. Must be between 0 and 3.');
      }
    }

    const targetDate = options?.challengeDate || BibleGameService.getTodayLagosDate();
    const { challenge, questions } = await BibleGameService.getOrCreateDailyChallenge(targetDate);

    let progress = await BibleGameService.syncUserProgressFromDb(userId, targetDate);

    if (!progress) {
      throw new Error('Session not started. Please call /api/bible-game/start first.');
    }

    if (progress.isCompleted) {
      throw new Error('This daily challenge has already been completed.');
    }

    if (questionIndex < 0 || questionIndex >= questions.length) {
      throw new Error('Question index is out of bounds.');
    }

    const currentQuestion = questions[questionIndex];

    // Idempotency: check if this question was already answered (e.g. answer raced with timeout)
    const existingAnswer = progress.answers.find(a => a.questionId === currentQuestion.id);
    if (existingAnswer) {
      return {
        isCorrect: existingAnswer.isCorrect,
        correctOptionIndex: currentQuestion.correctOptionIndex,
        explanation: currentQuestion.explanation,
        bibleReference: currentQuestion.bibleReference,
        score: progress.score,
        currentQuestionIndex: progress.currentQuestionIndex,
        isRoundFinished: progress.currentQuestionIndex >= 5,
        questionXp: existingAnswer.questionXp,
        responseTimeMs: existingAnswer.responseTimeMs,
        remainingTimeMs: existingAnswer.remainingTimeMs,
        isTimeout: Boolean(existingAnswer.isTimeout)
      };
    }

    if (questionIndex !== progress.currentQuestionIndex) {
      throw new Error(`Invalid question submission sequence. Expected question ${progress.currentQuestionIndex + 1}, received ${questionIndex + 1}.`);
    }

    const receivedAt = Date.now();
    const NETWORK_TOLERANCE_MS = 1000; // 1.0 second documented network transit tolerance

    let startedAtMs = receivedAt - 10000;
    let deadlineAtMs = receivedAt;

    if (
      progress.activeQuestionIndex === questionIndex &&
      progress.activeQuestionStartedAt
    ) {
      startedAtMs = new Date(progress.activeQuestionStartedAt).getTime();
      deadlineAtMs = progress.activeQuestionDeadlineAt
        ? new Date(progress.activeQuestionDeadlineAt).getTime()
        : startedAtMs + 10000;
    }

    let selectedIndex = -1;
    let isCorrect = false;
    let responseTimeMs = 10000;
    let remainingTimeMs = 0;
    let questionXp = 0.0;
    let isTimeoutResult = false;

    if (isTimeout) {
      selectedIndex = -1;
      isCorrect = false;
      responseTimeMs = Math.min(10000, Math.max(0, receivedAt - startedAtMs));
      remainingTimeMs = 0;
      questionXp = 0.0;
      isTimeoutResult = true;
    } else if (receivedAt > deadlineAtMs + NETWORK_TOLERANCE_MS) {
      // Received strictly after deadline + network tolerance: locked as timeout/unanswered
      selectedIndex = -1;
      isCorrect = false;
      responseTimeMs = 10000;
      remainingTimeMs = 0;
      questionXp = 0.0;
      isTimeoutResult = true;
    } else {
      // Received within deadline window (or within 1.0s network transit tolerance)
      const remainingMs = Math.max(0, Math.min(10000, deadlineAtMs - receivedAt));
      const respTimeMs = Math.max(0, Math.min(10000, 10000 - remainingMs));
      const answerCorrect = selectedOptionIndex === currentQuestion.correctOptionIndex;

      // Integer tenths rounding: 9.7s -> 9.7 XP, 6.4s -> 6.4 XP, 2.1s -> 2.1 XP
      const remainingTenths = Math.max(0, Math.min(100, Math.round(remainingMs / 100)));
      const qXp = answerCorrect ? Math.round(remainingTenths) / 10 : 0.0;

      selectedIndex = selectedOptionIndex!;
      isCorrect = answerCorrect;
      responseTimeMs = respTimeMs;
      remainingTimeMs = remainingMs;
      questionXp = qXp;
      isTimeoutResult = false;
    }

    const answerRecord = {
      questionId: currentQuestion.id,
      selectedIndex,
      isCorrect,
      answeredAt: new Date(receivedAt).toISOString(),
      startedAt: progress.activeQuestionStartedAt,
      deadlineAt: progress.activeQuestionDeadlineAt,
      responseTimeMs,
      remainingTimeMs,
      questionXp,
      isTimeout: isTimeoutResult
    };

    progress.answers.push(answerRecord);

    if (isCorrect) {
      progress.score += 1;
      progress.totalResponseTimeMs = (progress.totalResponseTimeMs || 0) + responseTimeMs;
    }

    progress.currentQuestionIndex += 1;
    // Clear active question countdown for next question
    progress.activeQuestionIndex = undefined;
    progress.activeQuestionStartedAt = undefined;
    progress.activeQuestionDeadlineAt = undefined;
    progress.updatedAt = new Date(receivedAt).toISOString();

    const isRoundFinished = progress.currentQuestionIndex >= 5;

    await persistBibleUserProgress(progress);

    return {
      isCorrect,
      correctOptionIndex: currentQuestion.correctOptionIndex,
      explanation: currentQuestion.explanation,
      bibleReference: currentQuestion.bibleReference,
      score: progress.score,
      currentQuestionIndex: progress.currentQuestionIndex,
      isRoundFinished,
      questionXp,
      responseTimeMs,
      remainingTimeMs,
      isTimeout: isTimeoutResult
    };
  }

  /**
   * Completes the challenge round, awards speed-based XP idempotently, updates streaks,
   * calculates level progression, and awards unlocked badges.
   */
  public static async completeChallenge(userId: string, memberId: string, challengeDate?: string): Promise<{
    challengeDate: string;
    score: number;
    totalQuestions: number;
    xpAwarded: number;
    alreadyCompleted: boolean;
    stats: BibleUserStats;
    newlyUnlockedBadges: BibleBadge[];
    reviewedQuestions: Array<{
      id: string;
      questionText: string;
      options: [string, string, string, string];
      selectedIndex: number;
      correctOptionIndex: number;
      isCorrect: boolean;
      explanation: string;
      bibleReference: string;
      responseTimeMs: number;
      remainingTimeMs: number;
      questionXp: number;
      isTimeout: boolean;
    }>;
  }> {
    const targetDate = challengeDate || BibleGameService.getTodayLagosDate();
    const { challenge, questions } = await BibleGameService.getOrCreateDailyChallenge(targetDate);

    let progress = await BibleGameService.syncUserProgressFromDb(userId, targetDate);

    if (!progress) {
      throw new Error('No active challenge progress found for today.');
    }

    if (progress.answers.length < 5) {
      throw new Error(`Cannot complete challenge until all 5 questions are answered. Completed: ${progress.answers.length}/5.`);
    }

    let stats = await BibleGameService.getOrCreateUserStats(userId, memberId);
    const newlyUnlockedBadges: BibleBadge[] = [];

    // Helper to format reviewed questions with timing & decimal XP
    const buildReviewedQuestions = () => {
      return questions.map(q => {
        const a = progress!.answers.find(ans => ans.questionId === q.id);
        return {
          id: q.id,
          questionText: q.questionText,
          options: q.options,
          selectedIndex: a ? a.selectedIndex : -1,
          correctOptionIndex: q.correctOptionIndex,
          isCorrect: Boolean(a?.isCorrect),
          explanation: q.explanation,
          bibleReference: q.bibleReference,
          responseTimeMs: a?.responseTimeMs || 0,
          remainingTimeMs: a?.remainingTimeMs || 0,
          questionXp: a?.questionXp || 0.0,
          isTimeout: Boolean(a?.isTimeout)
        };
      });
    };

    // Idempotency: if already marked completed, never award XP or increment streaks again
    if (progress.isCompleted) {
      return {
        challengeDate: targetDate,
        score: progress.score,
        totalQuestions: 5,
        xpAwarded: 0.0,
        alreadyCompleted: true,
        stats,
        newlyUnlockedBadges: [],
        reviewedQuestions: buildReviewedQuestions()
      };
    }

    // First time completion for this daily challenge
    // Sum exact integer tenths of question XP to guarantee precise decimal score
    const totalTenths = progress.answers.reduce(
      (sum, a) => sum + Math.round((a.questionXp || 0) * 10),
      0
    );
    const roundXp = Math.min(50.0, Math.round(totalTenths) / 10);

    // Atomic PostgreSQL check & update to prevent concurrent duplicate reward
    if (process.env.DATABASE_URL && process.env.IS_TEST_RUN !== 'true') {
      const updateRes = await query(`
        UPDATE bible_game_user_progress
        SET is_completed = true,
            completed_at = NOW(),
            score = $1,
            xp_awarded = $2,
            answers = $3,
            updated_at = NOW()
        WHERE user_id = $4 AND challenge_date = $5 AND is_completed = false
        RETURNING *;
      `, [
        progress.score,
        roundXp,
        JSON.stringify(progress.answers),
        userId,
        targetDate
      ]);

      if (updateRes.rows.length === 0) {
        // Already completed in DB by a concurrent request or previous call
        progress.isCompleted = true;
        const freshStats = await BibleGameService.syncUserStatsFromDb(userId, memberId);
        return {
          challengeDate: targetDate,
          score: progress.score,
          totalQuestions: 5,
          xpAwarded: 0.0,
          alreadyCompleted: true,
          stats: freshStats || stats,
          newlyUnlockedBadges: [],
          reviewedQuestions: buildReviewedQuestions()
        };
      }
    }

    progress.isCompleted = true;
    progress.completedAt = new Date().toISOString();
    progress.xpAwarded = roundXp;
    progress.updatedAt = new Date().toISOString();
    await persistBibleUserProgress(progress);

    // Update Streak logic in Africa/Lagos
    const yesterday = BibleGameService.getYesterdayLagosDate(targetDate);
    if (!stats.lastCompletedDate) {
      // First ever challenge
      stats.currentStreak = 1;
      stats.bestStreak = Math.max(1, stats.bestStreak);
    } else if (stats.lastCompletedDate === targetDate) {
      // Already completed today earlier (safety guard)
    } else if (stats.lastCompletedDate === yesterday) {
      // Consecutive day!
      stats.currentStreak += 1;
      stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
    } else {
      // Broken streak, reset to 1
      stats.currentStreak = 1;
      stats.bestStreak = Math.max(stats.bestStreak, 1);
    }

    stats.lastCompletedDate = targetDate;
    stats.cumulativeXp = Math.round((stats.cumulativeXp + roundXp) * 10) / 10;
    stats.totalChallengesCompleted += 1;
    if (progress.score === 5) {
      stats.perfectScoresCount += 1;
    }

    const updatedLevel = BibleGameService.calculateLevel(stats.cumulativeXp);
    stats.level = updatedLevel.level;
    stats.levelTitle = updatedLevel.levelTitle;
    stats.xpInCurrentLevel = updatedLevel.xpInCurrentLevel;
    stats.xpForNextLevel = updatedLevel.xpForNextLevel;
    stats.updatedAt = new Date().toISOString();

    // Check Badge unlock criteria
    const awardBadgeIfEligible = async (badgeId: string) => {
      const existing = db.bibleUserBadges.some(b => b.userId === userId && b.badgeId === badgeId);
      if (!existing) {
        const badgeDef = db.bibleBadges.find(b => b.id === badgeId);
        if (badgeDef) {
          const record: BibleUserBadgeRecord = {
            id: uuidv4(),
            userId,
            memberId,
            badgeId,
            awardedAt: new Date().toISOString(),
            challengeDate: targetDate
          };
          db.bibleUserBadges.push(record);
          await persistBibleUserBadge(record);

          // If badge carries bonus XP
          if (badgeDef.xpReward > 0) {
            stats.cumulativeXp = Math.round((stats.cumulativeXp + badgeDef.xpReward) * 10) / 10;
            const recheckLevel = BibleGameService.calculateLevel(stats.cumulativeXp);
            stats.level = recheckLevel.level;
            stats.levelTitle = recheckLevel.levelTitle;
            stats.xpInCurrentLevel = recheckLevel.xpInCurrentLevel;
            stats.xpForNextLevel = recheckLevel.xpForNextLevel;
          }

          newlyUnlockedBadges.push({
            ...badgeDef,
            earned: true,
            awardedAt: record.awardedAt
          });
        }
      }
    };

    // 1. FIRST_STEPS: Complete first challenge
    if (stats.totalChallengesCompleted >= 1) {
      await awardBadgeIfEligible('FIRST_STEPS');
    }

    // 2. PERFECT_FIVE: 5 out of 5 in this round
    if (progress.score === 5) {
      await awardBadgeIfEligible('PERFECT_FIVE');
    }

    // 3. STREAK_3: 3 consecutive days
    if (stats.currentStreak >= 3) {
      await awardBadgeIfEligible('STREAK_3');
    }

    // 4. STREAK_7: 7 consecutive days
    if (stats.currentStreak >= 7) {
      await awardBadgeIfEligible('STREAK_7');
    }

    // 5. BIBLE_EXPLORER: 25 completed challenges
    if (stats.totalChallengesCompleted >= 25) {
      await awardBadgeIfEligible('BIBLE_EXPLORER');
    }

    // 6. CENTURION_XP: 100+ cumulative XP
    if (stats.cumulativeXp >= 100) {
      await awardBadgeIfEligible('CENTURION_XP');
    }

    await persistBibleUserStats(stats);

    return {
      challengeDate: targetDate,
      score: progress.score,
      totalQuestions: 5,
      xpAwarded: roundXp,
      alreadyCompleted: false,
      stats,
      newlyUnlockedBadges,
      reviewedQuestions: buildReviewedQuestions()
    };
  }

  /**
   * Retrieves player progress, statistics, badges, and recent challenge history.
   */
  public static async getUserProgressHistory(userId: string, memberId: string): Promise<{
    stats: BibleUserStats;
    badges: BibleBadge[];
    recentChallenges: Array<{
      challengeDate: string;
      score: number;
      xpAwarded: number;
      totalResponseTimeMs: number;
      isCompleted: boolean;
      completedAt?: string;
    }>;
  }> {
    const stats = await BibleGameService.getOrCreateUserStats(userId, memberId);

    const userBadges = db.bibleUserBadges.filter(b => b.userId === userId);
    const badges: BibleBadge[] = db.bibleBadges.map(badge => {
      const award = userBadges.find(ub => ub.badgeId === badge.id);
      return {
        ...badge,
        earned: Boolean(award),
        awardedAt: award?.awardedAt
      };
    }).sort((a, b) => a.displayOrder - b.displayOrder);

    const userProgressRecords = db.bibleUserProgress
      .filter(p => p.userId === userId && p.isCompleted)
      .sort((a, b) => b.challengeDate.localeCompare(a.challengeDate))
      .slice(0, 10);

    const recentChallenges = userProgressRecords.map(p => ({
      challengeDate: p.challengeDate,
      score: p.score,
      xpAwarded: p.xpAwarded,
      totalResponseTimeMs: p.totalResponseTimeMs || 0,
      isCompleted: p.isCompleted,
      completedAt: p.completedAt
    }));

    return { stats, badges, recentChallenges };
  }

  /**
   * Aggregates weekly XP leaderboard strictly within the current week in Africa/Lagos.
   * Respects branch filtering when specified. Privacy-safe: hides email, phone, DOB.
   * Multi-tier tie-breakers:
   *   1. weeklyXp (descending)
   *   2. totalCorrectAnswers (descending)
   *   3. totalResponseTimeMs (ascending - lowest response time across correct answers)
   *   4. earliestCompletion (ascending - earliest completion timestamp in week)
   *   5. displayName (alphabetical)
   */
  public static async getLeaderboard(
    currentUserMemberId?: string,
    branchId?: string
  ): Promise<{
    entries: BibleLeaderboardEntry[];
    userRank?: BibleLeaderboardEntry;
    weekRange: { start: string; end: string };
  }> {
    const today = BibleGameService.getTodayLagosDate();
    const { startOfWeek, endOfWeek } = BibleGameService.getWeekRangeLagos(today);

    // Find all completed challenges for days within the current week
    const weeklyProgress = db.bibleUserProgress.filter(
      p => p.isCompleted && p.challengeDate >= startOfWeek && p.challengeDate <= endOfWeek
    );

    // Group progress by member
    const memberProgressMap = new Map<string, BibleUserProgress[]>();
    for (const prog of weeklyProgress) {
      const list = memberProgressMap.get(prog.memberId) || [];
      list.push(prog);
      memberProgressMap.set(prog.memberId, list);
    }

    const candidateMemberIds = new Set<string>([
      ...memberProgressMap.keys(),
      ...db.bibleUserStats.map(s => s.memberId)
    ]);

    const candidates: Array<{
      memberId: string;
      userId: string;
      displayName: string;
      profilePictureUrl?: string;
      branchId: string;
      branchName?: string;
      weeklyXp: number;
      totalXp: number;
      totalCorrectAnswers: number;
      totalResponseTimeMs: number;
      earliestCompletion: string;
      level: number;
    }> = [];

    for (const mId of candidateMemberIds) {
      const member = db.members.find(m => m.id === mId);
      if (!member) continue;

      if (branchId && member.primaryBranchId !== branchId) {
        continue;
      }

      const branch = db.branches.find(b => b.id === member.primaryBranchId);
      const stats = db.bibleUserStats.find(s => s.memberId === mId);
      const totalXp = stats?.cumulativeXp || 0;
      const level = stats?.level || 1;

      const progs = memberProgressMap.get(mId) || [];
      let weeklyXp = 0;
      let totalCorrectAnswers = 0;
      let totalResponseTimeMs = 0;
      let earliestCompletion = '9999-99-99T99:99:99.999Z';

      for (const p of progs) {
        weeklyXp += p.xpAwarded;
        totalCorrectAnswers += p.score;
        const correctTime = p.answers
          .filter(a => a.isCorrect)
          .reduce((sum, a) => sum + (a.responseTimeMs || 0), 0);
        totalResponseTimeMs += correctTime;
        if (p.completedAt && p.completedAt < earliestCompletion) {
          earliestCompletion = p.completedAt;
        }
      }
      weeklyXp = Math.round(weeklyXp * 10) / 10;

      candidates.push({
        memberId: member.id,
        userId: member.userId,
        displayName: `${member.firstName} ${member.lastName}`.trim(),
        profilePictureUrl: member.profilePictureUrl,
        branchId: member.primaryBranchId,
        branchName: branch?.name || 'FPM Global',
        weeklyXp,
        totalXp: Math.round(totalXp * 10) / 10,
        totalCorrectAnswers,
        totalResponseTimeMs,
        earliestCompletion,
        level
      });
    }

    // Sort order:
    // 1) weeklyXp DESC
    // 2) totalCorrectAnswers DESC (tie-breaker 1)
    // 3) totalResponseTimeMs ASC (tie-breaker 2)
    // 4) earliestCompletion ASC (tie-breaker 3)
    // 5) displayName ASC
    candidates.sort((a, b) => {
      if (b.weeklyXp !== a.weeklyXp) return b.weeklyXp - a.weeklyXp;
      if (b.totalCorrectAnswers !== a.totalCorrectAnswers) return b.totalCorrectAnswers - a.totalCorrectAnswers;
      if (a.totalResponseTimeMs !== b.totalResponseTimeMs) return a.totalResponseTimeMs - b.totalResponseTimeMs;
      if (a.earliestCompletion !== b.earliestCompletion) return a.earliestCompletion.localeCompare(b.earliestCompletion);
      return a.displayName.localeCompare(b.displayName);
    });

    let currentRank = 1;
    const entries: BibleLeaderboardEntry[] = candidates.map((item, index) => {
      if (index > 0) {
        const prev = candidates[index - 1];
        if (
          prev.weeklyXp !== item.weeklyXp ||
          prev.totalCorrectAnswers !== item.totalCorrectAnswers ||
          prev.totalResponseTimeMs !== item.totalResponseTimeMs
        ) {
          currentRank = index + 1;
        }
      }
      return {
        rank: currentRank,
        memberId: item.memberId,
        userId: item.userId,
        displayName: item.displayName,
        profilePictureUrl: item.profilePictureUrl,
        branchId: item.branchId,
        branchName: item.branchName,
        weeklyXp: item.weeklyXp,
        totalXp: item.totalXp,
        totalCorrectAnswers: item.totalCorrectAnswers,
        totalResponseTimeMs: item.totalResponseTimeMs,
        level: item.level,
        isCurrentUser: item.memberId === currentUserMemberId
      };
    });

    const userRank = entries.find(e => e.memberId === currentUserMemberId);

    return {
      entries,
      userRank,
      weekRange: { start: startOfWeek, end: endOfWeek }
    };
  }

  // ===========================================================================
  // ADMIN PORTAL QUESTION MANAGEMENT & AGGREGATE METRICS
  // ===========================================================================

  public static async getQuestions(filters?: {
    category?: string;
    difficulty?: string;
    status?: string;
    search?: string;
  }): Promise<BibleQuestion[]> {
    let result = [...db.bibleQuestions];

    if (filters?.category) {
      result = result.filter(q => q.category === filters.category);
    }
    if (filters?.difficulty) {
      result = result.filter(q => q.difficulty === filters.difficulty);
    }
    if (filters?.status) {
      result = result.filter(q => q.status === filters.status);
    }
    if (filters?.search) {
      const qLower = filters.search.toLowerCase();
      result = result.filter(
        q =>
          q.questionText.toLowerCase().includes(qLower) ||
          q.bibleReference.toLowerCase().includes(qLower) ||
          q.explanation.toLowerCase().includes(qLower)
      );
    }

    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public static async getQuestionById(id: string): Promise<BibleQuestion | null> {
    return db.bibleQuestions.find(q => q.id === id) || null;
  }

  public static async createQuestion(
    data: {
      questionText: string;
      options: [string, string, string, string];
      correctOptionIndex: number;
      explanation: string;
      bibleReference: string;
      category: BibleQuestionCategory;
      difficulty: BibleQuestionDifficulty;
      status?: BibleQuestionStatus;
    },
    creatorId: string,
    creatorName: string
  ): Promise<BibleQuestion> {
    // Validation
    BibleGameService.validateQuestionData(data);

    const question: BibleQuestion = {
      id: uuidv4(),
      questionText: data.questionText.trim(),
      options: data.options.map(o => o.trim()) as [string, string, string, string],
      correctOptionIndex: data.correctOptionIndex,
      explanation: data.explanation.trim(),
      bibleReference: data.bibleReference.trim(),
      category: data.category,
      difficulty: data.difficulty,
      status: data.status || 'published',
      createdBy: creatorId,
      createdByName: creatorName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.bibleQuestions.push(question);
    await persistBibleQuestion(question);
    return question;
  }

  public static async updateQuestion(
    id: string,
    data: Partial<BibleQuestion>
  ): Promise<BibleQuestion> {
    const question = db.bibleQuestions.find(q => q.id === id);
    if (!question) {
      throw new Error(`Bible question with ID ${id} not found.`);
    }

    const merged = { ...question, ...data };
    BibleGameService.validateQuestionData(merged);

    question.questionText = merged.questionText.trim();
    question.options = merged.options.map(o => o.trim()) as [string, string, string, string];
    question.correctOptionIndex = merged.correctOptionIndex;
    question.explanation = merged.explanation.trim();
    question.bibleReference = merged.bibleReference.trim();
    question.category = merged.category;
    question.difficulty = merged.difficulty;
    question.status = merged.status;
    question.updatedAt = new Date().toISOString();

    await persistBibleQuestion(question);
    return question;
  }

  public static async archiveQuestion(id: string): Promise<BibleQuestion> {
    const question = db.bibleQuestions.find(q => q.id === id);
    if (!question) {
      throw new Error(`Bible question with ID ${id} not found.`);
    }

    // Preserve historical challenge integrity: soft-archive rather than physical delete
    question.status = 'archived';
    question.updatedAt = new Date().toISOString();
    await persistBibleQuestion(question);
    return question;
  }

  public static async getAdminChallengeOverview(challengeDate?: string): Promise<{
    challenge: BibleDailyChallenge | null;
    questions: BibleQuestion[];
    stats: {
      totalParticipants: number;
      completedCount: number;
      averageScore: number;
      perfectScoresCount: number;
    };
  }> {
    const targetDate = challengeDate || BibleGameService.getTodayLagosDate();
    const challenge = db.bibleDailyChallenges.find(c => c.challengeDate === targetDate) || null;

    let questions: BibleQuestion[] = [];
    if (challenge) {
      questions = challenge.questionIds
        .map(id => db.bibleQuestions.find(q => q.id === id))
        .filter((q): q is BibleQuestion => Boolean(q));
    }

    const progressList = db.bibleUserProgress.filter(p => p.challengeDate === targetDate);
    const completedList = progressList.filter(p => p.isCompleted);
    const totalScore = completedList.reduce((acc, p) => acc + p.score, 0);
    const averageScore = completedList.length > 0 ? Number((totalScore / completedList.length).toFixed(1)) : 0;
    const perfectScoresCount = completedList.filter(p => p.score === 5).length;

    return {
      challenge,
      questions,
      stats: {
        totalParticipants: progressList.length,
        completedCount: completedList.length,
        averageScore,
        perfectScoresCount
      }
    };
  }

  public static async getAdminAggregateStats(): Promise<{
    totalQuestions: number;
    publishedQuestions: number;
    draftQuestions: number;
    archivedQuestions: number;
    categoryBreakdown: Record<string, number>;
    difficultyBreakdown: Record<string, number>;
    totalChallengesCompleted: number;
    totalXpAwarded: number;
    totalParticipants: number;
  }> {
    const totalQuestions = db.bibleQuestions.length;
    const publishedQuestions = db.bibleQuestions.filter(q => q.status === 'published').length;
    const draftQuestions = db.bibleQuestions.filter(q => q.status === 'draft').length;
    const archivedQuestions = db.bibleQuestions.filter(q => q.status === 'archived').length;

    const categoryBreakdown: Record<string, number> = {};
    const difficultyBreakdown: Record<string, number> = {};

    for (const q of db.bibleQuestions) {
      categoryBreakdown[q.category] = (categoryBreakdown[q.category] || 0) + 1;
      difficultyBreakdown[q.difficulty] = (difficultyBreakdown[q.difficulty] || 0) + 1;
    }

    const completedProgress = db.bibleUserProgress.filter(p => p.isCompleted);
    const totalChallengesCompleted = completedProgress.length;
    const totalXpAwarded = completedProgress.reduce((acc, p) => acc + p.xpAwarded, 0);
    const totalParticipants = new Set(db.bibleUserProgress.map(p => p.userId)).size;

    return {
      totalQuestions,
      publishedQuestions,
      draftQuestions,
      archivedQuestions,
      categoryBreakdown,
      difficultyBreakdown,
      totalChallengesCompleted,
      totalXpAwarded,
      totalParticipants
    };
  }

  public static async getSettings(): Promise<BibleGameSettings> {
    return db.bibleSettings;
  }

  public static async updateSettings(settings: Partial<BibleGameSettings>): Promise<BibleGameSettings> {
    db.bibleSettings = {
      ...db.bibleSettings,
      ...settings
    };
    await persistBibleSettings(db.bibleSettings);
    return db.bibleSettings;
  }

  private static validateQuestionData(data: {
    questionText?: string;
    options?: any[];
    correctOptionIndex?: number;
    explanation?: string;
    bibleReference?: string;
    category?: any;
    difficulty?: any;
  }) {
    if (!data.questionText || typeof data.questionText !== 'string' || !data.questionText.trim()) {
      throw new Error('Question text is required.');
    }
    if (!Array.isArray(data.options) || data.options.length !== 4) {
      throw new Error('Question must have exactly four answer choices.');
    }
    for (let i = 0; i < 4; i++) {
      if (!data.options[i] || typeof data.options[i] !== 'string' || !data.options[i].trim()) {
        throw new Error(`Answer choice ${i + 1} cannot be empty.`);
      }
    }
    const uniqueOptions = new Set(data.options.map(o => o.trim().toLowerCase()));
    if (uniqueOptions.size !== 4) {
      throw new Error('Answer choices must be distinct and non-duplicate.');
    }
    if (
      typeof data.correctOptionIndex !== 'number' ||
      !Number.isInteger(data.correctOptionIndex) ||
      data.correctOptionIndex < 0 ||
      data.correctOptionIndex > 3
    ) {
      throw new Error('Correct option index must be an integer between 0 and 3.');
    }
    if (!data.bibleReference || typeof data.bibleReference !== 'string' || !data.bibleReference.trim()) {
      throw new Error('Bible reference is required (e.g. "Genesis 1:1" or "John 3:16").');
    }
    if (!data.explanation || typeof data.explanation !== 'string' || !data.explanation.trim()) {
      throw new Error('A concise scriptural explanation is required.');
    }
    const validCategories: BibleQuestionCategory[] = [
      'Bible Characters',
      'Old Testament',
      'New Testament',
      'Life and Teachings of Jesus',
      'Miracles and Parables',
      'Books of the Bible',
      'Scripture Knowledge'
    ];
    if (!data.category || !validCategories.includes(data.category)) {
      throw new Error(`Category must be one of: ${validCategories.join(', ')}.`);
    }
    const validDifficulties: BibleQuestionDifficulty[] = ['easy', 'medium', 'hard'];
    if (!data.difficulty || !validDifficulties.includes(data.difficulty)) {
      throw new Error(`Difficulty must be one of: ${validDifficulties.join(', ')}.`);
    }
  }
}
