import { Request, Response } from 'express';
import { BibleGameService } from '../services/bibleGameService';
import { BibleAiService } from '../services/bibleAiService';
import { AuditService } from '../services/auditService';

export const getTodayChallengeHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    const challengeDate = typeof req.query.date === 'string' ? req.query.date : undefined;
    const overview = await BibleGameService.getTodayOverview(req.user.userId, req.user.memberId, challengeDate);
    return res.status(200).json({ success: true, data: overview });
  } catch (err: any) {
    console.error('[BIBLE GAME ERROR] getTodayChallengeHandler:', err.message);
    return res.status(500).json({ success: false, error: err.message || 'Failed to retrieve today\'s challenge.' });
  }
};

export const startOrResumeSessionHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    const challengeDate = typeof req.body.date === 'string' ? req.body.date : undefined;
    const session = await BibleGameService.startOrResumeSession(req.user.userId, req.user.memberId, challengeDate);
    return res.status(200).json({ success: true, data: session });
  } catch (err: any) {
    console.error('[BIBLE GAME ERROR] startOrResumeSessionHandler:', err.message);
    return res.status(400).json({ success: false, error: err.message || 'Failed to start challenge session.' });
  }
};

export const startQuestionHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    const { questionIndex, date } = req.body;
    if (typeof questionIndex !== 'number') {
      return res.status(400).json({ success: false, error: 'questionIndex is required and must be a number.' });
    }
    const timing = await BibleGameService.startQuestion(
      req.user.userId,
      req.user.memberId,
      questionIndex,
      typeof date === 'string' ? date : undefined
    );
    return res.status(200).json({ success: true, data: timing });
  } catch (err: any) {
    console.error('[BIBLE GAME ERROR] startQuestionHandler:', err.message);
    return res.status(400).json({ success: false, error: err.message || 'Failed to start question timer.' });
  }
};

export const submitAnswerHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    const { questionIndex, selectedOptionIndex, isTimeout, date } = req.body;

    if (typeof questionIndex !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'questionIndex is required and must be a number.'
      });
    }

    const optIndex = (typeof selectedOptionIndex === 'number') ? selectedOptionIndex : null;

    const result = await BibleGameService.submitAnswer(
      req.user.userId,
      req.user.memberId,
      questionIndex,
      optIndex,
      {
        isTimeout: Boolean(isTimeout || optIndex === null || optIndex === -1),
        challengeDate: typeof date === 'string' ? date : undefined
      }
    );

    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    console.error('[BIBLE GAME ERROR] submitAnswerHandler:', err.message);
    const statusCode = err.message.includes('already') ? 409 : 400;
    return res.status(statusCode).json({ success: false, error: err.message || 'Failed to submit answer.' });
  }
};

export const completeChallengeHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    const challengeDate = typeof req.body.date === 'string' ? req.body.date : undefined;
    const result = await BibleGameService.completeChallenge(req.user.userId, req.user.memberId, challengeDate);
    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    console.error('[BIBLE GAME ERROR] completeChallengeHandler:', err.message);
    return res.status(400).json({ success: false, error: err.message || 'Failed to complete challenge.' });
  }
};

export const getProgressHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    const data = await BibleGameService.getUserProgressHistory(req.user.userId, req.user.memberId);
    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    console.error('[BIBLE GAME ERROR] getProgressHandler:', err.message);
    return res.status(500).json({ success: false, error: err.message || 'Failed to retrieve progress.' });
  }
};

export const getLeaderboardHandler = async (req: Request, res: Response) => {
  try {
    const branchId = typeof req.query.branchId === 'string' ? req.query.branchId : undefined;
    const currentMemberId = req.user?.memberId;
    const leaderboard = await BibleGameService.getLeaderboard(currentMemberId, branchId);
    return res.status(200).json({ success: true, data: leaderboard });
  } catch (err: any) {
    console.error('[BIBLE GAME ERROR] getLeaderboardHandler:', err.message);
    return res.status(500).json({ success: false, error: err.message || 'Failed to retrieve leaderboard.' });
  }
};

// =============================================================================
// ADMIN CONTROLLERS
// =============================================================================

export const listAdminQuestionsHandler = async (req: Request, res: Response) => {
  try {
    const { category, difficulty, status, search } = req.query;
    const questions = await BibleGameService.getQuestions({
      category: typeof category === 'string' ? category : undefined,
      difficulty: typeof difficulty === 'string' ? difficulty : undefined,
      status: typeof status === 'string' ? status : undefined,
      search: typeof search === 'string' ? search : undefined
    });
    return res.status(200).json({ success: true, data: questions });
  } catch (err: any) {
    console.error('[BIBLE GAME ADMIN ERROR] listAdminQuestionsHandler:', err.message);
    return res.status(500).json({ success: false, error: err.message || 'Failed to list questions.' });
  }
};

export const getAdminQuestionByIdHandler = async (req: Request, res: Response) => {
  try {
    const question = await BibleGameService.getQuestionById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, error: 'Bible question not found.' });
    }
    return res.status(200).json({ success: true, data: question });
  } catch (err: any) {
    console.error('[BIBLE GAME ADMIN ERROR] getAdminQuestionByIdHandler:', err.message);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch question.' });
  }
};

export const createAdminQuestionHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    const question = await BibleGameService.createQuestion(
      req.body,
      req.user.userId,
      req.user.fullName
    );

    await AuditService.log(
      req.user.fullName,
      req.user.roleCode,
      'BIBLE_QUESTION_CREATE',
      'bible_game_questions',
      question.id,
      req.user.userId,
      undefined,
      { questionText: question.questionText, category: question.category, status: question.status },
      req.ip
    );

    return res.status(201).json({ success: true, data: question });
  } catch (err: any) {
    console.error('[BIBLE GAME ADMIN ERROR] createAdminQuestionHandler:', err.message);
    return res.status(400).json({ success: false, error: err.message || 'Failed to create question.' });
  }
};

export const updateAdminQuestionHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    const question = await BibleGameService.updateQuestion(req.params.id, req.body);

    await AuditService.log(
      req.user.fullName,
      req.user.roleCode,
      'BIBLE_QUESTION_UPDATE',
      'bible_game_questions',
      question.id,
      req.user.userId,
      undefined,
      { status: question.status, category: question.category },
      req.ip
    );

    return res.status(200).json({ success: true, data: question });
  } catch (err: any) {
    console.error('[BIBLE GAME ADMIN ERROR] updateAdminQuestionHandler:', err.message);
    const status = err.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ success: false, error: err.message || 'Failed to update question.' });
  }
};

export const archiveAdminQuestionHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    const question = await BibleGameService.archiveQuestion(req.params.id);

    await AuditService.log(
      req.user.fullName,
      req.user.roleCode,
      'BIBLE_QUESTION_ARCHIVE',
      'bible_game_questions',
      question.id,
      req.user.userId,
      undefined,
      undefined,
      req.ip
    );

    return res.status(200).json({ success: true, data: question, message: 'Question archived successfully.' });
  } catch (err: any) {
    console.error('[BIBLE GAME ADMIN ERROR] archiveAdminQuestionHandler:', err.message);
    const status = err.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ success: false, error: err.message || 'Failed to archive question.' });
  }
};

export const getAdminDailyChallengeHandler = async (req: Request, res: Response) => {
  try {
    const challengeDate = typeof req.query.date === 'string' ? req.query.date : undefined;
    const overview = await BibleGameService.getAdminChallengeOverview(challengeDate);
    return res.status(200).json({ success: true, data: overview });
  } catch (err: any) {
    console.error('[BIBLE GAME ADMIN ERROR] getAdminDailyChallengeHandler:', err.message);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch daily challenge overview.' });
  }
};

export const getAdminStatsHandler = async (req: Request, res: Response) => {
  try {
    const stats = await BibleGameService.getAdminAggregateStats();
    return res.status(200).json({ success: true, data: stats });
  } catch (err: any) {
    console.error('[BIBLE GAME ADMIN ERROR] getAdminStatsHandler:', err.message);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch aggregate stats.' });
  }
};

export const getAdminSettingsHandler = async (req: Request, res: Response) => {
  try {
    const settings = await BibleGameService.getSettings();
    return res.status(200).json({ success: true, data: settings });
  } catch (err: any) {
    console.error('[BIBLE GAME ADMIN ERROR] getAdminSettingsHandler:', err.message);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch settings.' });
  }
};

export const updateAdminSettingsHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    const updated = await BibleGameService.updateSettings(req.body);

    await AuditService.log(
      req.user.fullName,
      req.user.roleCode,
      'BIBLE_SETTINGS_UPDATE',
      'bible_game_settings',
      'general',
      req.user.userId,
      undefined,
      updated,
      req.ip
    );

    return res.status(200).json({ success: true, data: updated });
  } catch (err: any) {
    console.error('[BIBLE GAME ADMIN ERROR] updateAdminSettingsHandler:', err.message);
    return res.status(400).json({ success: false, error: err.message || 'Failed to update settings.' });
  }
};

export const generateAiQuestionHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { category, difficulty } = req.body;
    if (!category || typeof category !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'category is required and must be a valid Scripture category.'
      });
    }

    if (!difficulty || typeof difficulty !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'difficulty is required (easy, medium, hard).'
      });
    }

    const generated = await BibleAiService.generateQuestion(category, difficulty);

    await AuditService.log(
      req.user.fullName,
      req.user.roleCode,
      'BIBLE_QUESTION_AI_GENERATE',
      'bible_game_questions',
      'draft_ai',
      req.user.userId,
      undefined,
      { category, difficulty, reference: generated.bibleReference },
      req.ip
    );

    return res.status(200).json({
      success: true,
      data: generated,
      message: 'AI question generated successfully.'
    });
  } catch (err: any) {
    const rawError = err.message || 'Failed to generate question with AI.';
    const sanitizedError = BibleAiService.sanitizeSecret(rawError);
    console.error('[BIBLE GAME ADMIN ERROR] generateAiQuestionHandler:', sanitizedError);

    let statusCode = 400;
    if (sanitizedError.includes('not configured') || sanitizedError.includes('API key is not configured')) {
      statusCode = 503;
    } else if (sanitizedError.includes('429') || sanitizedError.toLowerCase().includes('quota') || sanitizedError.toLowerCase().includes('rate limit')) {
      statusCode = 429;
    } else if (sanitizedError.includes('403') || sanitizedError.toLowerCase().includes('permission denied')) {
      statusCode = 403;
    } else if (sanitizedError.includes('404') || sanitizedError.toLowerCase().includes('not found')) {
      statusCode = 404;
    }

    return res.status(statusCode).json({
      success: false,
      error: sanitizedError
    });
  }
};

