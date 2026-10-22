import React, { useState, useEffect } from 'react';
import {
  BookOpen, Plus, Search, Filter, CheckCircle2, AlertCircle, Eye,
  Edit2, Archive, Sparkles, Award, Flame, Users, Trophy, RefreshCw,
  Check, X, HelpCircle, Calendar, Settings as SettingsIcon, ChevronRight
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

export const BibleChallengePage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'questions' | 'challenge' | 'settings'>('questions');
  const [questions, setQuestions] = useState<BibleQuestion[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [dailyChallenge, setDailyChallenge] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
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
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(10);
  const [savingSettings, setSavingSettings] = useState(false);

  // Live preview timer simulation
  const [previewRemainingMs, setPreviewRemainingMs] = useState(10000);
  const [previewTimerActive, setPreviewTimerActive] = useState(false);
  const [previewEarnedXp, setPreviewEarnedXp] = useState<number>(0);
  const [previewIsTimeout, setPreviewIsTimeout] = useState(false);

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

      setQuestions(qRes?.data || []);
      setStats(statsRes?.data || null);
      setDailyChallenge(challengeRes?.data || null);
      if (settingsRes?.data) {
        setSettings(settingsRes.data);
        setXpPerCorrect(settingsRes.data.xpPerCorrectAnswer || 10);
        setTimeLimitSeconds(settingsRes.data.timeLimitSeconds || 10);
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
    setPreviewRemainingMs(10000);
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

    // Speed-based XP: round(10 * remaining / 10, 1) = round(remainingSeconds, 1)
    if (optionIndex === previewQuestion.correctOptionIndex) {
      const remainingSeconds = Math.max(0, Math.min(10, previewRemainingMs / 1000));
      const tenths = Math.round(remainingSeconds * 10);
      setPreviewEarnedXp(tenths / 10);
    } else {
      setPreviewEarnedXp(0);
    }
  };

  const handleResetPreview = () => {
    setPreviewSelectedOption(null);
    setPreviewRevealed(false);
    setPreviewRemainingMs(10000);
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
      showToast('Bible Challenge settings updated.', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update settings.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-2xl text-white shadow-lg border border-slate-700/50">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold tracking-wider uppercase border border-amber-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>FPM Global Daily Game</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Bible Challenge Management</h1>
          <p className="text-slate-300 text-sm max-w-2xl">
            Authoritative Scripture quiz portal. Curate verified questions, monitor daily participation, inspect speed-based scoring, and configure gameplay rules.
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-sm rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Question</span>
          </button>
          <button
            onClick={loadData}
            title="Refresh"
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-600/60 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Question Bank</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-slate-900">{stats.publishedQuestions}</span>
                <span className="text-xs text-slate-400">/ {stats.totalQuestions} total</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Completed Plays</p>
              <span className="text-xl font-bold text-slate-900">{stats.totalChallengesCompleted}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Total XP Awarded</p>
              <span className="text-xl font-bold text-slate-900">
                {Number(stats.totalXpAwarded || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} XP
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Unique Players</p>
              <span className="text-xl font-bold text-slate-900">{stats.totalParticipants}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-t-xl">
        <button
          onClick={() => setActiveTab('questions')}
          className={`py-3.5 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'questions'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Question Bank ({questions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('challenge')}
          className={`py-3.5 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'challenge'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Today's Daily Challenge</span>
          {dailyChallenge?.challenge && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
              Active
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`py-3.5 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'settings'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          <span>Game Rules & Badges</span>
        </button>
      </div>

      {/* TAB 1: QUESTION BANK */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search Scripture, topic, reference..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </form>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                value={difficultyFilter}
                onChange={e => setDifficultyFilter(e.target.value)}
                className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
              >
                <option value="">All Difficulties</option>
                {DIFFICULTIES.map(d => (
                  <option key={d} value={d}>{d.toUpperCase()}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
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
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No questions found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Try adjusting your search criteria or create a new question for the daily challenge.
              </p>
              <button
                onClick={openCreateModal}
                className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg transition"
              >
                Create Question
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 hover:border-slate-300 shadow-xs transition space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60">
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

                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        onClick={() => openPreview(q)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition flex items-center gap-1"
                        title="App Preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>
                      <button
                        onClick={() => openEditModal(q)}
                        className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md transition flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      {q.status !== 'archived' && (
                        <button
                          onClick={() => handleArchiveQuestion(q)}
                          className="px-2.5 py-1 text-xs font-medium text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-md transition flex items-center gap-1"
                          title="Archive without breaking completed games"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          <span>Archive</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900">{q.questionText}</h3>

                  {/* 4 Choices Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {q.options.map((opt, oIdx) => {
                      const isCorrect = oIdx === q.correctOptionIndex;
                      return (
                        <div
                          key={oIdx}
                          className={`p-2.5 rounded-lg text-xs flex items-center justify-between border ${
                            isCorrect
                              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 font-semibold'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                              isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <span>{opt}</span>
                          </div>
                          {isCorrect && (
                            <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                              Correct
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Reference & Explanation Footer */}
                  <div className="bg-slate-50/80 rounded-lg p-2.5 text-xs text-slate-600 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <span className="font-semibold text-slate-900">Reference: </span>
                      <span className="text-amber-800 font-medium">{q.bibleReference}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 italic max-w-xl truncate">
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
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs uppercase font-bold text-amber-600 tracking-wider">Africa/Lagos Authoritative Cycle</span>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                Daily Challenge: {dailyChallenge?.challenge?.challengeDate || 'Loading...'}
              </h2>
            </div>
            {dailyChallenge?.stats && (
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-slate-400">Total Players: </span>
                  <span className="font-bold text-slate-800">{dailyChallenge.stats.totalParticipants}</span>
                </div>
                <div>
                  <span className="text-slate-400">Completed: </span>
                  <span className="font-bold text-emerald-600">{dailyChallenge.stats.completedCount}</span>
                </div>
                <div>
                  <span className="text-slate-400">Average Score: </span>
                  <span className="font-bold text-amber-600">{dailyChallenge.stats.averageScore} / 5</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Selected 5 Questions for Today's Round (Shared across all members)
            </h3>
            {dailyChallenge?.questions?.map((q: any, i: number) => (
              <div key={q.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-600">Question {i + 1} of 5</span>
                  <span className="text-xs text-slate-500 font-medium">{q.bibleReference}</span>
                </div>
                <p className="text-sm font-bold text-slate-900">{q.questionText}</p>
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  {q.options?.map((opt: string, optI: number) => (
                    <div
                      key={optI}
                      className={`p-2 rounded-lg border ${
                        optI === q.correctOptionIndex
                          ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-900'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      {String.fromCharCode(65 + optI)}. {opt}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 italic pt-1">{q.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: GAME SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs max-w-2xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Game Configuration & Reward Parameters</h2>
            <p className="text-xs text-slate-500 mt-1">
              Authoritative server settings applied to daily challenges, scoring, and level advancement.
            </p>
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
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Currently 10 XP per question (Maximum 50 base XP for a perfect 5/5 round).
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
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Authoritative 10-second countdown per question with a 1.0s network transit grace period.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-amber-800">
                <Sparkles className="w-4 h-4" /> Speed-Based XP Formula
              </span>
              <p className="text-[11px] text-amber-900/80 leading-relaxed">
                <code>Question XP = round(10 × remaining time / 10, 1)</code>. A correct answer with 9.7s remaining awards 9.7 XP, 6.4s awards 6.4 XP, 2.1s awards 2.1 XP, and deadline expiry (or wrong answers) awards 0.0 XP. Maximum base score is 50.0 XP.
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
                className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Determines 00:00:00 midnight daily reset and consecutive streak transitions.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl transition"
              >
                {savingSettings ? 'Saving...' : 'Update Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* QUESTION EDITOR MODAL */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="question-editor-title"
            className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[90vh] animate-in zoom-in-95 duration-200 overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6 pb-4 shrink-0 bg-white">
              <div>
                <h3 id="question-editor-title" className="text-lg font-bold text-slate-900">
                  {editingQuestion ? 'Edit Bible Question' : 'Create New Bible Question'}
                </h3>
                <p className="text-xs text-slate-500">Provide verified biblical question, choices, and scriptural proof.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body - Vertical Scrolling Area */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs font-medium focus:outline-none">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {aiSuccessMessage && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{aiSuccessMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiSuccessMessage(null)}
                    className="text-amber-700 hover:text-amber-950 text-[11px] font-bold underline cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* AI GENERATION TOOLBAR */}
              <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-50/50 to-slate-50 border border-amber-200/80 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>AI Question Assistant</span>
                  </div>
                  <button
                    type="button"
                    disabled={isGeneratingAi || formSubmitting}
                    onClick={handleGenerateWithAi}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Category</label>
                    <select
                      value={formCategory}
                      onChange={e => setFormCategory(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-xs font-normal focus:outline-none focus:ring-2 focus:ring-amber-500/20"
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
                      className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-xs font-normal focus:outline-none focus:ring-2 focus:ring-amber-500/20"
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
                  className="w-full p-3 border border-slate-300 rounded-lg text-sm font-normal focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              {/* Four Answer Choices */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Four Answer Choices (Select radio button for the correct answer)
                </label>
                <div className="space-y-2">
                  {formOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="correctOption"
                          checked={formCorrectIndex === i}
                          onChange={() => setFormCorrectIndex(i)}
                          className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                        />
                        <span className="w-6 font-bold text-slate-700">
                          {String.fromCharCode(65 + i)}:
                        </span>
                      </label>
                      <input
                        type="text"
                        value={opt}
                        onChange={e => handleOptionChange(i, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                        className={`flex-1 p-2 border rounded-lg text-sm font-normal ${
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
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-normal focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-xs font-normal focus:outline-none focus:ring-2 focus:ring-amber-500/20"
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
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-normal focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-2.5 p-4 sm:p-6 pt-3 border-t border-slate-100 shrink-0 bg-slate-50/70 rounded-b-2xl">
              <div className="text-[11px] text-slate-500 hidden sm:block">
                * All fields remain fully editable before saving.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={formSubmitting || isGeneratingAi}
                  onClick={() => handleSaveQuestion('draft')}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={formSubmitting || isGeneratingAi}
                  onClick={() => handleSaveQuestion('published')}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {formSubmitting ? 'Saving...' : 'Publish Question'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIVE MOBILE PREVIEW MODAL */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-sm w-full p-5 shadow-2xl border-4 border-slate-800 text-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
            {/* Phone Screen Mockup Header */}
            <div className="flex items-center justify-between text-xs text-amber-400 font-bold border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Bible Challenge App Preview
              </span>
              <button
                onClick={() => setPreviewQuestion(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                <span className="text-amber-300 uppercase tracking-wider">{previewQuestion.category}</span>
                <span className={`px-2 py-0.5 rounded-full font-mono text-xs font-bold ${
                  previewRemainingMs <= 3000 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                }`}>
                  ⏱ {(previewRemainingMs / 1000).toFixed(1)}s
                </span>
                <span>Question 1 of 5</span>
              </div>

              {/* 10-second Countdown bar */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
                <div
                  className={`h-full transition-all duration-100 ${
                    previewRemainingMs <= 3000 ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-400 to-amber-500'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, (previewRemainingMs / 10000) * 100))}%` }}
                />
              </div>

              <div className="bg-slate-800/90 p-4 rounded-2xl border border-slate-700/60 shadow-inner">
                <p className="text-sm font-extrabold text-white leading-relaxed">
                  {previewQuestion.questionText}
                </p>
              </div>

              {/* 4 Choices */}
              <div className="space-y-2 pt-1">
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
                      className={`w-full p-3 rounded-xl border text-left text-xs transition flex items-center justify-between ${borderClass}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                          previewRevealed && isCorrect ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'
                        }`}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span>{opt}</span>
                      </div>
                      {previewRevealed && isCorrect && <Check className="w-4 h-4 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>

              {/* Feedback Breakdown */}
              {previewRevealed && (
                <div className="p-3.5 rounded-xl bg-slate-800/90 border border-slate-700 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold">
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
                    <span className="text-amber-300">{previewQuestion.bibleReference}</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {previewQuestion.explanation}
                  </p>
                  <button
                    onClick={handleResetPreview}
                    className="w-full mt-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold"
                  >
                    Restart 10s Timer Simulation
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
