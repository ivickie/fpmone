import React, { useState, useEffect } from 'react';
import {
  BookOpen, Plus, Search, Filter, CheckCircle2, AlertCircle, Eye,
  Edit2, Archive, Sparkles, Award, Flame, Users, Trophy, RefreshCw,
  Check, X, HelpCircle, Calendar, Settings as SettingsIcon, ChevronRight,
  Zap, Footprints, Compass, Shield, Info, Lock
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export interface BibleQuestion {
  id: string;
  questionText: string;
  options: [string, string, string, string];
  correctOptionIndex: number;
  explanation: string;
  bibleReference: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'draft' | 'published' | 'archived';
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BadgeItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  displayOrder: number;
}

export const CATEGORIES = [
  'Bible Characters',
  'Old Testament',
  'New Testament',
  'Life and Teachings of Jesus',
  'Miracles and Parables',
  'Books of the Bible',
  'Scripture Knowledge'
];

export const DIFFICULTIES = ['easy', 'medium', 'hard'];

export const CANONICAL_BADGES: BadgeItem[] = [
  { id: 'FIRST_STEPS', name: 'First Steps', description: 'Completed your first daily Bible challenge.', icon: 'Footprints', xpReward: 10, displayOrder: 1 },
  { id: 'PERFECT_FIVE', name: 'Perfect Five', description: 'Answered all 5 questions correctly in a challenge.', icon: 'Award', xpReward: 25, displayOrder: 2 },
  { id: 'STREAK_3', name: 'Three-Day Streak', description: 'Completed daily challenges on 3 consecutive days.', icon: 'Flame', xpReward: 15, displayOrder: 3 },
  { id: 'STREAK_7', name: 'Seven-Day Streak', description: 'Completed daily challenges on 7 consecutive days.', icon: 'Zap', xpReward: 30, displayOrder: 4 },
  { id: 'BIBLE_EXPLORER', name: 'Bible Explorer', description: 'Completed 25 daily Bible challenges.', icon: 'Compass', xpReward: 50, displayOrder: 5 },
  { id: 'CENTURION_XP', name: 'Centurion', description: 'Earned 100 or more cumulative XP in Scripture knowledge.', icon: 'Shield', xpReward: 20, displayOrder: 6 }
];

export const BibleChallengePage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'questions' | 'challenge' | 'settings'>('questions');
  const [questions, setQuestions] = useState<BibleQuestion[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [dailyChallenge, setDailyChallenge] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [badges, setBadges] = useState<BadgeItem[]>(CANONICAL_BADGES);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<BibleQuestion | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<BibleQuestion | null>(null);
  const [previewSelectedOption, setPreviewSelectedOption] = useState<number | null>(null);
  const [previewRevealed, setPreviewRevealed] = useState(false);
  const [editingBadge, setEditingBadge] = useState<BadgeItem | null>(null);
  const [badgeEditReward, setBadgeEditReward] = useState<number>(10);
  const [badgeEditName, setBadgeEditName] = useState<string>('');
  const [badgeSaving, setBadgeSaving] = useState(false);

  // Form state
  const [formQuestionText, setFormQuestionText] = useState('');
  const [formCategory, setFormCategory] = useState(CATEGORIES[0]);
  const [formDifficulty, setFormDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [formOptions, setFormOptions] = useState<[string, string, string, string]>(['', '', '', '']);
  const [formCorrectIndex, setFormCorrectIndex] = useState(0);
  const [formExplanation, setFormExplanation] = useState('');
  const [formBibleReference, setFormBibleReference] = useState('');
  const [formStatus, setFormStatus] = useState<'draft' | 'published'>('published');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  // Settings form
  const [xpPerCorrect, setXpPerCorrect] = useState(10);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(15);
  const [savingSettings, setSavingSettings] = useState(false);

  // Live preview timer simulation (15 seconds)
  const [previewRemainingMs, setPreviewRemainingMs] = useState(15000);
  const [previewTimerActive, setPreviewTimerActive] = useState(false);
  const [previewEarnedXp, setPreviewEarnedXp] = useState<number>(0);
  const [previewIsTimeout, setPreviewIsTimeout] = useState(false);

  // Lock body scroll when any modal is open
  useEffect(() => {
    const isAnyModalOpen = isEditorOpen || !!previewQuestion || !!editingBadge;
    if (isAnyModalOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isEditorOpen, previewQuestion, editingBadge]);

  useEffect(() => {
    let interval: any;
    if (previewQuestion && previewTimerActive && previewRemainingMs > 0 && !previewRevealed) {
      interval = setInterval(() => {
        setPreviewRemainingMs((prev) => {
          if (prev <= 100) {
            clearInterval(interval);
            setPreviewRevealed(true);
            setPreviewIsTimeout(true);
            setPreviewEarnedXp(0);
            return 0;
          }
          return prev - 100;
        });
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [previewQuestion, previewTimerActive, previewRemainingMs, previewRevealed]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [qRes, statsRes, challengeRes, settingsRes] = await Promise.all([
        api.getBibleQuestions({
          search: search || undefined,
          category: categoryFilter || undefined,
          difficulty: difficultyFilter || undefined,
          status: statusFilter || undefined
        }),
        api.getBibleAdminStats(),
        api.getBibleDailyChallenge(),
        api.getBibleSettings()
      ]);

      const loadedQuestions = Array.isArray(qRes?.data) ? qRes.data : [];
      setStats(statsRes?.data || null);
      setDailyChallenge(challengeRes?.data || null);

      if (loadedQuestions.length === 0 && typeof window !== 'undefined' && window.location.search.includes('mockAdmin=true')) {
        setQuestions([
          {
            id: 'mock-q-1',
            questionText: 'Which young shepherd used a sling and a smooth stone to strike down Goliath?',
            options: ['David', 'Jonathan', 'Saul', 'Solomon'],
            correctOptionIndex: 0,
            explanation: 'David struck the Philistine champion in the name of the Lord.',
            bibleReference: '1 Samuel 17:48-50',
            category: 'Old Testament',
            difficulty: 'easy',
            status: 'published',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'mock-q-2',
            questionText: 'In which gospel does Jesus declare: "I am the way, the truth, and the life"?',
            options: ['Matthew', 'Mark', 'Luke', 'John'],
            correctOptionIndex: 3,
            explanation: 'Jesus declared this to Thomas in John 14:6.',
            bibleReference: 'John 14:6',
            category: 'New Testament',
            difficulty: 'medium',
            status: 'published',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]);
        setStats({
          publishedQuestions: 36,
          totalQuestions: 40,
          totalChallengesCompleted: 124,
          totalXpAwarded: 1240.5,
          totalParticipants: 45
        });
        setDailyChallenge({
          challenge: { challengeDate: '2026-10-26' },
          stats: { totalParticipants: 45, completedCount: 38, averageScore: 4.6 },
          questions: [
            {
              id: 'mock-q-1',
              questionText: 'Which young shepherd used a sling and a smooth stone to strike down Goliath?',
              options: ['David', 'Jonathan', 'Saul', 'Solomon'],
              correctOptionIndex: 0,
              explanation: 'David struck the Philistine champion in the name of the Lord.',
              bibleReference: '1 Samuel 17:48-50',
              category: 'Old Testament',
              difficulty: 'easy'
            }
          ]
        });
      } else {
        setQuestions(loadedQuestions);
      }

      if (settingsRes?.data) {
        setSettings(settingsRes.data);
        setXpPerCorrect(settingsRes.data.xpPerCorrectAnswer || 10);
        setTimeLimitSeconds(settingsRes.data.timeLimitSeconds || 15);
        if (settingsRes.data.badges && Array.isArray(settingsRes.data.badges) && settingsRes.data.badges.length > 0) {
          setBadges(settingsRes.data.badges);
        }
      }
    } catch (err: any) {
      console.error('Failed to load Bible Challenge admin data:', err);
      showToast(err.message || 'Failed to load Bible Challenge records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [categoryFilter, difficultyFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const openCreateModal = () => {
    setEditingQuestion(null);
    setFormQuestionText('');
    setFormCategory(CATEGORIES[0]);
    setFormDifficulty('medium');
    setFormOptions(['', '', '', '']);
    setFormCorrectIndex(0);
    setFormExplanation('');
    setFormBibleReference('');
    setFormStatus('published');
    setFormError(null);
    setAiSuccessMessage(null);
    setIsEditorOpen(true);
  };

  const openEditModal = (q: BibleQuestion) => {
    setEditingQuestion(q);
    setFormQuestionText(q.questionText);
    setFormCategory(q.category);
    setFormDifficulty(q.difficulty);
    setFormOptions([...q.options] as [string, string, string, string]);
    setFormCorrectIndex(q.correctOptionIndex);
    setFormExplanation(q.explanation);
    setFormBibleReference(q.bibleReference);
    setFormStatus(q.status === 'draft' ? 'draft' : 'published');
    setFormError(null);
    setAiSuccessMessage(null);
    setIsEditorOpen(true);
  };

  const handleGenerateWithAi = async () => {
    if (!formCategory) {
      setFormError('Please select a Category before generating a question.');
      return;
    }
    if (!formDifficulty) {
      setFormError('Please select a Difficulty before generating a question.');
      return;
    }

    const hasExistingContent =
      formQuestionText.trim().length > 0 ||
      formOptions.some(o => o.trim().length > 0) ||
      formBibleReference.trim().length > 0 ||
      formExplanation.trim().length > 0;

    if (hasExistingContent) {
      const confirmOverwrite = window.confirm(
        editingQuestion
          ? 'Generating an AI question will overwrite the current form fields for this question. Do you wish to continue?'
          : 'You already have question details entered. Overwrite them with a newly generated AI question?'
      );
      if (!confirmOverwrite) {
        return;
      }
    }

    setIsGeneratingAi(true);
    setFormError(null);
    setAiSuccessMessage(null);

    try {
      const res = await api.generateBibleQuestion({
        category: formCategory,
        difficulty: formDifficulty
      });

      if (!res.success || !res.data) {
        throw new Error((res as any).error || 'Failed to generate question with AI.');
      }

      const generated = res.data;

      // Populate all required fields
      setFormQuestionText(generated.questionText);
      setFormCategory(generated.category);
      setFormDifficulty(generated.difficulty);
      setFormOptions(generated.options);
      setFormCorrectIndex(generated.correctOptionIndex);
      setFormBibleReference(generated.bibleReference);
      setFormExplanation(generated.explanation);

      setAiSuccessMessage(`Generated 1 ${generated.difficulty} question for "${generated.category}". All fields are editable.`);
      showToast('AI Scripture question generated! Review and edit before saving.', 'success');
    } catch (err: any) {
      console.error('AI question generation error:', err);
      const errMsg = err.message || 'Failed to generate question with AI.';
      setFormError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleOptionChange = (index: number, val: string) => {
    const updated = [...formOptions] as [string, string, string, string];
    updated[index] = val;
    setFormOptions(updated);
  };

  const handleSaveQuestion = async (publishIntent: 'draft' | 'published') => {
    setFormError(null);

    // Validation
    if (!formQuestionText.trim()) {
      setFormError('Question prompt text is required.');
      return;
    }
    for (let i = 0; i < 4; i++) {
      if (!formOptions[i].trim()) {
        setFormError(`Answer choice ${String.fromCharCode(65 + i)} cannot be empty.`);
        return;
      }
    }
    const distinct = new Set(formOptions.map(o => o.trim().toLowerCase()));
    if (distinct.size !== 4) {
      setFormError('All four answer choices must be unique and non-duplicate.');
      return;
    }
    if (!formBibleReference.trim()) {
      setFormError('Scriptural Bible reference is required (e.g. "Genesis 1:1").');
      return;
    }
    if (!formExplanation.trim()) {
      setFormError('A concise biblical explanation is required.');
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        questionText: formQuestionText.trim(),
        options: formOptions.map(o => o.trim()),
        correctOptionIndex: formCorrectIndex,
        explanation: formExplanation.trim(),
        bibleReference: formBibleReference.trim(),
        category: formCategory,
        difficulty: formDifficulty,
        status: publishIntent
      };

      if (editingQuestion) {
        await api.updateBibleQuestion(editingQuestion.id, payload);
        showToast('Question updated successfully.', 'success');
      } else {
        await api.createBibleQuestion(payload);
        showToast('New question created successfully.', 'success');
      }

      setIsEditorOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save question.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleArchiveQuestion = async (q: BibleQuestion) => {
    if (!window.confirm(`Are you sure you want to archive "${q.questionText.slice(0, 50)}..."? Historical records will be preserved.`)) {
      return;
    }
    try {
      await api.archiveBibleQuestion(q.id);
      showToast('Question archived successfully.', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to archive question.', 'error');
    }
  };

  const openPreview = (q: BibleQuestion) => {
    setPreviewQuestion(q);
    setPreviewSelectedOption(null);
    setPreviewRevealed(false);
    setPreviewRemainingMs(15000);
    setPreviewTimerActive(true);
    setPreviewEarnedXp(0);
    setPreviewIsTimeout(false);
  };

  const handleSelectPreviewOption = (optionIndex: number) => {
    if (previewRevealed || !previewQuestion) return;
    setPreviewSelectedOption(optionIndex);
    setPreviewTimerActive(false);
    setPreviewRevealed(true);
    setPreviewIsTimeout(false);

    // Authoritative Speed-based XP: round(10 * remaining / 15, 1)
    if (optionIndex === previewQuestion.correctOptionIndex) {
      const remainingSeconds = Math.max(0, Math.min(15, previewRemainingMs / 1000));
      const tenths = Math.round((10 * remainingSeconds / 15) * 10);
      setPreviewEarnedXp(tenths / 10);
    } else {
      setPreviewEarnedXp(0);
    }
  };

  const handleResetPreview = () => {
    setPreviewSelectedOption(null);
    setPreviewRevealed(false);
    setPreviewRemainingMs(15000);
    setPreviewTimerActive(true);
    setPreviewEarnedXp(0);
    setPreviewIsTimeout(false);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.updateBibleSettings({
        xpPerCorrectAnswer: Number(xpPerCorrect),
        maxBaseXp: Number(xpPerCorrect) * 5,
        timeLimitSeconds: Number(timeLimitSeconds)
      });
      showToast('Bible Challenge gameplay settings updated.', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update settings.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const openBadgeModal = (badge: BadgeItem) => {
    setEditingBadge(badge);
    setBadgeEditReward(badge.xpReward);
    setBadgeEditName(badge.name);
  };

  const handleSaveBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBadge) return;
    setBadgeSaving(true);
    try {
      const updatedBadges = badges.map(b =>
        b.id === editingBadge.id ? { ...b, name: badgeEditName, xpReward: Number(badgeEditReward) } : b
      );
      await api.updateBibleSettings({
        badges: updatedBadges
      });
      setBadges(updatedBadges);
      showToast(`Badge "${badgeEditName}" updated successfully.`, 'success');
      setEditingBadge(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to update badge.', 'error');
    } finally {
      setBadgeSaving(false);
    }
  };

  const renderBadgeIcon = (iconName: string, className: string = 'w-5 h-5') => {
    switch (iconName.toLowerCase()) {
      case 'award':
        return <Award className={className} />;
      case 'flame':
        return <Flame className={className} />;
      case 'zap':
        return <Zap className={className} />;
      case 'footprints':
        return <Footprints className={className} />;
      case 'compass':
        return <Compass className={className} />;
      case 'shield':
        return <Shield className={className} />;
      default:
        return <Trophy className={className} />;
    }
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6 min-w-0 animate-in fade-in duration-200">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-4 sm:p-6 rounded-2xl text-white shadow-lg border border-slate-700/50 min-w-0">
        <div className="space-y-1.5 min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold tracking-wider uppercase border border-amber-400/30">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>FPM Global Daily Game</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white break-words">
            Bible Challenge Management
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Authoritative Scripture quiz portal. Curate verified questions, monitor daily participation, inspect speed-based scoring, and configure gameplay rules.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap sm:flex-nowrap pt-1 sm:pt-0">
          <button
            onClick={openCreateModal}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-95 min-h-[44px]"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>New Question</span>
          </button>
          <button
            onClick={loadData}
            title="Refresh records"
            aria-label="Refresh records"
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-600/60 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500 truncate">Question Bank</p>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-lg sm:text-xl font-bold text-slate-900">{stats.publishedQuestions}</span>
                <span className="text-xs text-slate-400">/ {stats.totalQuestions} total</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500 truncate">Completed Plays</p>
              <span className="text-lg sm:text-xl font-bold text-slate-900 truncate block">
                {Number(stats.totalChallengesCompleted || 0).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Flame className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500 truncate">Total XP Awarded</p>
              <span className="text-lg sm:text-xl font-bold text-slate-900 truncate block">
                {Number(stats.totalXpAwarded || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} XP
              </span>
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500 truncate">Unique Players</p>
              <span className="text-lg sm:text-xl font-bold text-slate-900 truncate block">
                {Number(stats.totalParticipants || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Switcher - Horizontally scrollable on mobile without clipping */}
      <div className="border-b border-slate-200 bg-white rounded-t-xl overflow-x-auto scrollbar-none -webkit-overflow-scrolling-touch">
        <div className="flex px-2 sm:px-4 min-w-max">
          <button
            onClick={() => setActiveTab('questions')}
            className={`py-3 sm:py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition whitespace-nowrap min-h-[44px] cursor-pointer ${
              activeTab === 'questions'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>Question Bank ({questions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('challenge')}
            className={`py-3 sm:py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition whitespace-nowrap min-h-[44px] cursor-pointer ${
              activeTab === 'challenge'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span>Today's Daily Challenge</span>
            {dailyChallenge?.challenge && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold shrink-0">
                Active
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 sm:py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition whitespace-nowrap min-h-[44px] cursor-pointer ${
              activeTab === 'settings'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-4 h-4 shrink-0" />
            <span>Game Rules & Badges</span>
          </button>
        </div>
      </div>

      {/* TAB 1: QUESTION BANK */}
      {activeTab === 'questions' && (
        <div className="space-y-4 min-w-0">
          {/* Filters Bar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between min-w-0">
            <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72 lg:w-80 min-w-0">
              <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search Scripture, topic, reference..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 min-h-[44px]"
              />
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full md:w-auto">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-full text-xs py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 min-h-[44px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                value={difficultyFilter}
                onChange={e => setDifficultyFilter(e.target.value)}
                className="w-full text-xs py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 min-h-[44px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="">All Difficulties</option>
                {DIFFICULTIES.map(d => (
                  <option key={d} value={d}>{d.toUpperCase()}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full text-xs py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 min-h-[44px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Question List */}
          {questions.length === 0 ? (
            <div className="bg-white rounded-xl p-8 sm:p-12 text-center border border-slate-200">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No questions found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                Try adjusting your search criteria or create a new question for the daily challenge.
              </p>
              <button
                onClick={openCreateModal}
                className="mt-4 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg transition min-h-[44px] inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create Question</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 min-w-0">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 hover:border-slate-300 shadow-xs transition space-y-3 min-w-0"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60 break-words">
                        {q.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase ${
                        q.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        q.difficulty === 'medium' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {q.difficulty}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        q.status === 'published' ? 'bg-emerald-100 text-emerald-800' :
                        q.status === 'draft' ? 'bg-slate-100 text-slate-700' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {q.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <button
                        onClick={() => openPreview(q)}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition min-h-[38px] cursor-pointer"
                        title="Simulate Mobile Gameplay"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>
                      <button
                        onClick={() => openEditModal(q)}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition min-h-[38px] cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      {q.status !== 'archived' && (
                        <button
                          onClick={() => handleArchiveQuestion(q)}
                          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition min-h-[38px] cursor-pointer"
                          title="Archive without breaking completed games"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          <span>Archive</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900 break-words leading-snug">
                    {q.questionText}
                  </h3>

                  {/* 4 Choices Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 min-w-0">
                    {q.options.map((opt, oIdx) => {
                      const isCorrect = oIdx === q.correctOptionIndex;
                      return (
                        <div
                          key={oIdx}
                          className={`p-2.5 rounded-lg text-xs flex items-center justify-between gap-2 border min-w-0 ${
                            isCorrect
                              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 font-semibold'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center font-bold text-[10px] ${
                              isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <span className="break-words min-w-0">{opt}</span>
                          </div>
                          {isCorrect && (
                            <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded shrink-0">
                              Correct
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Reference & Explanation Footer - Natural wrap without clipping */}
                  <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 border border-slate-100 space-y-1.5 sm:space-y-0 sm:flex sm:items-start sm:justify-between sm:gap-4 min-w-0">
                    <div className="shrink-0">
                      <span className="font-semibold text-slate-900">Reference: </span>
                      <span className="text-amber-800 font-bold">{q.bibleReference}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 italic break-words leading-relaxed flex-1 sm:text-right">
                      "{q.explanation}"
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TODAY'S DAILY CHALLENGE */}
      {activeTab === 'challenge' && (
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-xs space-y-5 sm:space-y-6 min-w-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4 border-b border-slate-100 pb-4 min-w-0">
            <div className="min-w-0">
              <span className="text-[11px] sm:text-xs uppercase font-bold text-amber-600 tracking-wider block">
                Africa/Lagos Authoritative Cycle
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5 break-words">
                Daily Challenge: {dailyChallenge?.challenge?.challengeDate || 'Loading...'}
              </h2>
            </div>

            {dailyChallenge?.stats && (
              <div className="grid grid-cols-3 gap-2 sm:gap-4 text-xs bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shrink-0">
                <div className="text-center sm:text-left">
                  <span className="text-[11px] text-slate-500 block">Players</span>
                  <span className="text-sm sm:text-base font-extrabold text-slate-900">
                    {dailyChallenge.stats.totalParticipants}
                  </span>
                </div>
                <div className="text-center sm:text-left">
                  <span className="text-[11px] text-slate-500 block">Completed</span>
                  <span className="text-sm sm:text-base font-extrabold text-emerald-600">
                    {dailyChallenge.stats.completedCount}
                  </span>
                </div>
                <div className="text-center sm:text-left">
                  <span className="text-[11px] text-slate-500 block">Avg Score</span>
                  <span className="text-sm sm:text-base font-extrabold text-amber-600">
                    {dailyChallenge.stats.averageScore} / 5
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide">
                Selected 5 Questions for Today's Round (Shared across all members)
              </h3>
              {dailyChallenge?.questions && dailyChallenge.questions.length > 0 && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 self-start sm:self-auto">
                  {dailyChallenge.questions.length} / 5 Questions Loaded
                </span>
              )}
            </div>

            {(!dailyChallenge?.questions || dailyChallenge.questions.length === 0) && (
              <div className="p-6 sm:p-8 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50 space-y-3">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">
                  No questions currently loaded for today's challenge.
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Questions are automatically selected from the published question bank each day. If questions are missing or uninitialized, refresh to auto-generate.
                </p>
                <button
                  type="button"
                  onClick={() => loadData()}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 min-h-[44px]"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Daily Challenge</span>
                </button>
              </div>
            )}

            {dailyChallenge?.questions?.map((q: any, i: number) => (
              <div key={q.id} className="p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold text-amber-600">Question {i + 1} of 5</span>
                    {q.category && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 font-semibold text-slate-700">
                        {q.category}
                      </span>
                    )}
                    {q.difficulty && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${
                        q.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-800' :
                        q.difficulty === 'hard' ? 'bg-rose-100 text-rose-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {q.difficulty}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 font-medium break-words">{q.bibleReference}</span>
                </div>

                <p className="text-sm font-bold text-slate-900 break-words leading-snug">{q.questionText}</p>

                {/* 4 Choices Grid - Responsive 1 col on mobile, 2 col on tablet/desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs min-w-0">
                  {q.options?.map((opt: string, optI: number) => (
                    <div
                      key={optI}
                      className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 min-w-0 ${
                        optI === q.correctOptionIndex
                          ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-900'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-5 h-5 shrink-0 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px]">
                          {String.fromCharCode(65 + optI)}
                        </span>
                        <span className="break-words min-w-0">{opt}</span>
                      </div>
                      {optI === q.correctOptionIndex && (
                        <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                          Correct
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 italic pt-1 break-words leading-relaxed">
                  "{q.explanation}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: GAME RULES & BADGES */}
      {activeTab === 'settings' && (
        <div className="space-y-6 min-w-0">
          {/* Rules & Speed-Based Scoring Breakdown */}
          <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Authoritative Gameplay & Scoring Rules</h2>
                <p className="text-xs text-slate-500">Live rules enforced across the Android app and backend server.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  5 Questions Per Round
                </span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Each daily challenge offers exactly 5 questions selected deterministically for all church members.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-600 shrink-0" />
                  15-Second Timer
                </span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Questions count down from 15.0s. Submissions received at or after 15.0s strictly expire with 0.0 XP.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-blue-600 shrink-0" />
                  Immediate Option Lock
                </span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Options lock instantly on tap. Answers cannot be changed or replayed after submission.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-purple-600 shrink-0" />
                  Africa/Lagos Reset
                </span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Daily challenges reset at 00:00:00 Africa/Lagos (WAT / UTC+1). Streaks increment on consecutive days.
                </p>
              </div>
            </div>

            {/* Speed-Based Scoring Formula Card */}
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Speed-Based XP Scoring Formula</span>
              </div>
              <p className="text-xs text-amber-900/90 leading-relaxed">
                <code className="bg-amber-100/80 px-1.5 py-0.5 rounded font-mono font-bold">XP = round(10 × remaining_seconds / 15, 1)</code>. Faster correct answers earn higher rewards up to 10.0 XP per question (max 50.0 XP per round):
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 text-[11px]">
                <div className="p-2 rounded-lg bg-white/80 border border-amber-200 text-center">
                  <span className="block text-slate-500">15.0s left</span>
                  <span className="font-bold text-emerald-700 text-xs">10.0 XP</span>
                </div>
                <div className="p-2 rounded-lg bg-white/80 border border-amber-200 text-center">
                  <span className="block text-slate-500">12.0s left</span>
                  <span className="font-bold text-emerald-700 text-xs">8.0 XP</span>
                </div>
                <div className="p-2 rounded-lg bg-white/80 border border-amber-200 text-center">
                  <span className="block text-slate-500">7.5s left</span>
                  <span className="font-bold text-emerald-700 text-xs">5.0 XP</span>
                </div>
                <div className="p-2 rounded-lg bg-white/80 border border-amber-200 text-center">
                  <span className="block text-slate-500">4.1s left</span>
                  <span className="font-bold text-emerald-700 text-xs">2.7 XP</span>
                </div>
                <div className="p-2 rounded-lg bg-white/80 border border-amber-200 text-center">
                  <span className="block text-slate-500">0.0s / Expired</span>
                  <span className="font-bold text-rose-700 text-xs">0.0 XP</span>
                </div>
                <div className="p-2 rounded-lg bg-white/80 border border-amber-200 text-center">
                  <span className="block text-slate-500">Incorrect</span>
                  <span className="font-bold text-rose-700 text-xs">0.0 XP</span>
                </div>
              </div>
            </div>
          </div>

          {/* Badges Collection & Management */}
          <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Achievement Badges ({badges.length})</h2>
                <p className="text-xs text-slate-500">Unlockable rewards awarded automatically upon meeting milestone criteria.</p>
              </div>
            </div>

            {/* Badges Responsive Grid: 1 col mobile, 2 col tablet, 3 col desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 min-w-0">
              {badges.map((b) => (
                <div
                  key={b.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white shadow-xs space-y-3 flex flex-col justify-between min-w-0"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60 shrink-0">
                        {renderBadgeIcon(b.icon, 'w-5 h-5')}
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 shrink-0">
                        +{b.xpReward} XP
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900 break-words">{b.name}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed mt-0.5 break-words">
                        {b.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-slate-400">ID: {b.id}</span>
                    <button
                      type="button"
                      onClick={() => openBadgeModal(b)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition min-h-[36px] cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Reward</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gameplay Server Parameters */}
          <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-xs max-w-2xl space-y-4 min-w-0">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Game Configuration Parameters</h2>
              <p className="text-xs text-slate-500 mt-0.5">Authoritative server values for daily questions and session timing.</p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  XP Awarded Per Correct Answer
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={xpPerCorrect}
                  onChange={e => setXpPerCorrect(Number(e.target.value))}
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 min-h-[44px]"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Maximum base XP for a perfect 5/5 round is {xpPerCorrect * 5} XP.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Question Time Limit (Seconds)
                </label>
                <input
                  type="number"
                  min="5"
                  max="30"
                  value={timeLimitSeconds}
                  onChange={e => setTimeLimitSeconds(Number(e.target.value))}
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 min-h-[44px]"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Authoritative 15-second countdown per question.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Authoritative Calendar Timezone
                </label>
                <input
                  type="text"
                  disabled
                  value="Africa/Lagos (WAT / UTC+1)"
                  className="w-full px-3 py-2.5 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed min-h-[44px]"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Controls 00:00:00 midnight daily reset and consecutive streak transitions.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl transition min-h-[44px] cursor-pointer"
                >
                  {savingSettings ? 'Saving...' : 'Update Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUESTION EDITOR MODAL - Full Responsive & Scroll Safe */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-hidden">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="question-editor-title"
            className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] animate-in zoom-in-95 duration-200 overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5 shrink-0 bg-white">
              <div className="min-w-0 pr-2">
                <h3 id="question-editor-title" className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  {editingQuestion ? 'Edit Bible Question' : 'Create New Bible Question'}
                </h3>
                <p className="text-xs text-slate-500 truncate">Provide verified biblical question, choices, and scriptural proof.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body - Vertical Scrolling Area */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs font-medium focus:outline-none">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="break-words">{formError}</span>
                </div>
              )}

              {aiSuccessMessage && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="break-words">{aiSuccessMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiSuccessMessage(null)}
                    className="text-amber-700 hover:text-amber-950 text-[11px] font-bold underline cursor-pointer shrink-0"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* AI GENERATION TOOLBAR - Stacks neatly on mobile */}
              <div className="p-3 sm:p-4 bg-gradient-to-r from-amber-500/10 via-amber-50/50 to-slate-50 border border-amber-200/80 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>AI Question Assistant</span>
                  </div>
                  <button
                    type="button"
                    disabled={isGeneratingAi || formSubmitting}
                    onClick={handleGenerateWithAi}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[44px]"
                    title="Generate a Bible trivia question matching selected Category & Difficulty"
                  >
                    {isGeneratingAi ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating with AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                        <span>{formQuestionText.trim() ? 'Regenerate with AI' : 'Generate with AI'}</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Category</label>
                    <select
                      value={formCategory}
                      onChange={e => setFormCategory(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-xs font-normal focus:outline-none focus:ring-2 focus:ring-amber-500/20 min-h-[44px]"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Difficulty</label>
                    <select
                      value={formDifficulty}
                      onChange={e => setFormDifficulty(e.target.value as any)}
                      className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-xs font-normal focus:outline-none focus:ring-2 focus:ring-amber-500/20 min-h-[44px]"
                    >
                      <option value="easy">Easy (Foundational / Well-known)</option>
                      <option value="medium">Medium (Standard Scripture knowledge)</option>
                      <option value="hard">Hard (Deep study & specific details)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Question Prompt */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-bold">Question Prompt</label>
                  <span className="text-[11px] text-slate-400">Clear & unambiguous</span>
                </div>
                <textarea
                  rows={3}
                  value={formQuestionText}
                  onChange={e => setFormQuestionText(e.target.value)}
                  placeholder="e.g. Which young shepherd used a sling and a smooth stone to strike down Goliath?"
                  className="w-full p-3 border border-slate-300 rounded-lg text-xs sm:text-sm font-normal focus:outline-none focus:ring-2 focus:ring-amber-500/20 min-h-[80px]"
                />
              </div>

              {/* Four Answer Choices */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Four Answer Choices (Select radio button for the correct answer)
                </label>
                <div className="space-y-2">
                  {formOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2 min-w-0">
                      <label className="flex items-center justify-center min-w-[44px] min-h-[44px] cursor-pointer shrink-0 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition">
                        <input
                          type="radio"
                          name="correctOption"
                          checked={formCorrectIndex === i}
                          onChange={() => setFormCorrectIndex(i)}
                          className="w-4 h-4 text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <span className="font-bold text-slate-700 ml-1.5 text-xs">
                          {String.fromCharCode(65 + i)}
                        </span>
                      </label>
                      <input
                        type="text"
                        value={opt}
                        onChange={e => handleOptionChange(i, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                        className={`flex-1 min-w-0 p-2.5 border rounded-lg text-xs sm:text-sm font-normal min-h-[44px] ${
                          formCorrectIndex === i
                            ? 'border-emerald-400 bg-emerald-50/30'
                            : 'border-slate-300'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Bible Reference</label>
                  <input
                    type="text"
                    value={formBibleReference}
                    onChange={e => setFormBibleReference(e.target.value)}
                    placeholder="e.g. 1 Samuel 17:48-50"
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs sm:text-sm font-normal focus:outline-none focus:ring-2 focus:ring-amber-500/20 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-xs font-normal focus:outline-none focus:ring-2 focus:ring-amber-500/20 min-h-[44px]"
                  >
                    <option value="published">Published (Ready for daily selection)</option>
                    <option value="draft">Draft (Save without publishing)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Scriptural Explanation (Shown upon submission)
                </label>
                <textarea
                  rows={2}
                  value={formExplanation}
                  onChange={e => setFormExplanation(e.target.value)}
                  placeholder="e.g. David reached into his bag, took out a stone, slung it, and struck the Philistine on the forehead in the name of the Lord."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs sm:text-sm font-normal focus:outline-none focus:ring-2 focus:ring-amber-500/20 min-h-[60px]"
                />
              </div>
            </div>

            {/* Modal Footer - Stacked cleanly on mobile, row on desktop */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 sm:p-5 border-t border-slate-100 shrink-0 bg-slate-50/80 rounded-b-2xl">
              <div className="text-[11px] text-slate-500 hidden sm:block">
                * All fields remain fully editable before saving.
              </div>
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-white transition cursor-pointer min-h-[44px] flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={formSubmitting || isGeneratingAi}
                  onClick={() => handleSaveQuestion('draft')}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition disabled:opacity-50 cursor-pointer min-h-[44px] flex items-center justify-center"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={formSubmitting || isGeneratingAi}
                  onClick={() => handleSaveQuestion('published')}
                  className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition disabled:opacity-50 cursor-pointer shadow-sm min-h-[44px] flex items-center justify-center"
                >
                  {formSubmitting ? 'Saving...' : 'Publish Question'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BADGE EDIT MODAL */}
      {editingBadge && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 flex flex-col max-h-[calc(100dvh-2rem)] overflow-hidden animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  {renderBadgeIcon(editingBadge.icon, 'w-4 h-4')}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Achievement Badge</h3>
                  <p className="text-xs text-slate-500 font-mono">ID: {editingBadge.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingBadge(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBadge} className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Badge Title</label>
                <input
                  type="text"
                  value={badgeEditName}
                  onChange={e => setBadgeEditName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Unlock Criteria</label>
                <textarea
                  disabled
                  value={editingBadge.description}
                  rows={2}
                  className="w-full p-2.5 border border-slate-200 bg-slate-100 rounded-lg text-xs text-slate-500 cursor-not-allowed"
                />
                <p className="text-[11px] text-slate-400 mt-1">Unlock conditions are validated authoritatively by game service logic.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bonus XP Reward</label>
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={badgeEditReward}
                  onChange={e => setBadgeEditReward(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm min-h-[44px]"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">Bonus XP credited to member cumulative score upon initial unlock.</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBadge(null)}
                  className="w-full sm:w-auto px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={badgeSaving}
                  className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition min-h-[44px]"
                >
                  {badgeSaving ? 'Saving...' : 'Save Badge Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIVE MOBILE PREVIEW MODAL - Height and scroll safe */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          <div className="bg-slate-900 rounded-3xl max-w-sm w-full p-4 sm:p-5 shadow-2xl border-4 border-slate-800 text-slate-100 space-y-3.5 animate-in zoom-in-95 duration-200 max-h-[calc(100dvh-1.5rem)] overflow-y-auto min-w-0">
            {/* Phone Screen Mockup Header */}
            <div className="flex items-center justify-between text-xs text-amber-400 font-bold border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Bible Challenge App Preview</span>
              </span>
              <button
                onClick={() => setPreviewQuestion(null)}
                className="text-slate-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                aria-label="Close preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 min-w-0">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold gap-1">
                <span className="text-amber-300 uppercase tracking-wider truncate">{previewQuestion.category}</span>
                <span className={`px-2 py-0.5 rounded-full font-mono text-xs font-bold shrink-0 ${
                  previewRemainingMs <= 3000 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                }`}>
                  ⏱ {(previewRemainingMs / 1000).toFixed(1)}s
                </span>
                <span className="shrink-0">Q 1 of 5</span>
              </div>

              {/* 15-second Countdown bar */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
                <div
                  className={`h-full transition-all duration-100 ${
                    previewRemainingMs <= 4000 ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-400 to-amber-500'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, (previewRemainingMs / 15000) * 100))}%` }}
                />
              </div>

              <div className="bg-slate-800/90 p-3.5 sm:p-4 rounded-2xl border border-slate-700/60 shadow-inner">
                <p className="text-xs sm:text-sm font-extrabold text-white leading-relaxed break-words">
                  {previewQuestion.questionText}
                </p>
              </div>

              {/* 4 Choices */}
              <div className="space-y-2 pt-1 min-w-0">
                {previewQuestion.options.map((opt, i) => {
                  const isSelected = previewSelectedOption === i;
                  const isCorrect = i === previewQuestion.correctOptionIndex;

                  let borderClass = 'border-slate-700/80 bg-slate-800/50 text-slate-200 hover:border-amber-400/60 cursor-pointer';
                  if (previewRevealed) {
                    if (isCorrect) borderClass = 'border-emerald-500 bg-emerald-950/60 text-emerald-300 font-bold';
                    else if (isSelected && !isCorrect) borderClass = 'border-rose-500 bg-rose-950/60 text-rose-300';
                    else borderClass = 'border-slate-800 bg-slate-900/40 text-slate-500 opacity-60';
                  }

                  return (
                    <button
                      key={i}
                      disabled={previewRevealed}
                      onClick={() => handleSelectPreviewOption(i)}
                      className={`w-full p-2.5 sm:p-3 rounded-xl border text-left text-xs transition flex items-center justify-between gap-2 min-h-[44px] ${borderClass}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center font-bold text-[10px] ${
                          previewRevealed && isCorrect ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'
                        }`}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="break-words min-w-0">{opt}</span>
                      </div>
                      {previewRevealed && isCorrect && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Feedback Breakdown */}
              {previewRevealed && (
                <div className="p-3.5 rounded-xl bg-slate-800/90 border border-slate-700 space-y-2 text-xs animate-in fade-in duration-200">
                  <div className="flex items-center justify-between font-bold gap-2">
                    <span className={
                      previewIsTimeout
                        ? 'text-rose-400'
                        : previewSelectedOption === previewQuestion.correctOptionIndex
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }>
                      {previewIsTimeout
                        ? '⏱ Time Expired (0.0 XP)'
                        : previewSelectedOption === previewQuestion.correctOptionIndex
                        ? `✓ Correct! +${previewEarnedXp.toFixed(1)} XP`
                        : '✗ Incorrect (0.0 XP)'}
                    </span>
                    <span className="text-amber-300 text-[11px] truncate">{previewQuestion.bibleReference}</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed break-words">
                    {previewQuestion.explanation}
                  </p>
                  <button
                    onClick={handleResetPreview}
                    className="w-full mt-2 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold min-h-[44px] cursor-pointer"
                  >
                    Restart 15s Timer Simulation
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
