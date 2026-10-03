import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet, TrendingUp, TrendingDown, DollarSign, Calendar, Filter,
  Search, Plus, Download, Printer, RefreshCw, AlertCircle, CheckCircle2,
  Clock, ArrowUpRight, ArrowDownRight, Edit3, Trash2, Eye, X, Building2,
  ShieldAlert, Lock, ChevronLeft, ChevronRight, BarChart3, PieChart,
  FileSpreadsheet, HelpCircle, Layers, Check
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface FinanceTransaction {
  id: string;
  branchId: string;
  branchName: string;
  transactionType: 'income' | 'expense';
  category: string;
  amount: number;
  transactionDate: string;
  description: string;
  referenceNumber?: string;
  paymentMethod: string;
  status: 'active' | 'voided' | 'archived';
  voidReason?: string;
  createdBy: string;
  createdByName: string;
  updatedBy?: string;
  updatedByName?: string;
  createdAt: string;
  updatedAt: string;
}

interface MonthlyStatement {
  branchId?: string;
  branchName: string;
  year: number;
  month: number;
  monthName: string;
  openingBalance: number;
  incomeCategories: Array<{ category: string; amount: number; count: number; percentage: number }>;
  totalIncome: number;
  expenseCategories: Array<{ category: string; amount: number; count: number; percentage: number }>;
  totalExpenses: number;
  closingBalance: number;
  netChange: number;
}

interface AnnualStatement {
  branchId?: string;
  branchName: string;
  year: number;
  annualOpeningBalance: number;
  months: Array<{
    month: number;
    monthName: string;
    openingBalance: number;
    totalIncome: number;
    totalExpenses: number;
    closingBalance: number;
    netChange: number;
  }>;
  totalAnnualIncome: number;
  totalAnnualExpenses: number;
  annualClosingBalance: number;
}

interface DashboardSummary {
  branchId?: string;
  branchName: string;
  period: {
    year: number;
    month: number;
    monthName: string;
  };
  openingBalance: number;
  totalIncome: number;
  totalExpenses: number;
  closingBalance: number;
  mtdIncome: number;
  mtdExpenses: number;
  ytdIncome: number;
  ytdExpenses: number;
  ytdClosingBalance: number;
  recentTransactions: FinanceTransaction[];
  monthlyTrend: Array<{
    month: number;
    monthName: string;
    income: number;
    expenses: number;
    net: number;
  }>;
  branchComparison?: Array<{
    branchId: string;
    branchName: string;
    branchCode: string;
    openingBalance: number;
    totalIncome: number;
    totalExpenses: number;
    closingBalance: number;
  }>;
}

interface FinancePageProps {
  branches?: any[];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const FinancePage: React.FC<FinancePageProps> = ({ branches = [] }) => {
  const { user, selectedBranchId, setSelectedBranchId } = useAuth();
  const toast = useToast();

  const isSuperAdmin = user?.adminLevel === 'super_admin' || user?.roleCode === 'SUPER_ADMIN';

  // Sub-Navigation Tab
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'income' | 'expenses' | 'statements_monthly' | 'statements_annual' | 'income_analysis' | 'expense_analysis' | 'reports'
  >('dashboard');

  // Date Filters
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);

  // Branch Scope Filter
  const [branchFilter, setBranchFilter] = useState<string>(isSuperAdmin ? (selectedBranchId || '') : (user?.branchId || ''));

  // Sync with global branch selector
  useEffect(() => {
    if (isSuperAdmin) {
      setBranchFilter(selectedBranchId || '');
    } else if (user?.branchId) {
      setBranchFilter(user.branchId);
    }
  }, [selectedBranchId, isSuperAdmin, user]);

  // Categories & Payment Methods
  const [incomeCategories, setIncomeCategories] = useState<string[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);

  // Dashboard Data
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // Transactions Ledger State (Income & Expenses)
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [transactionsSummary, setTransactionsSummary] = useState({ totalIncome: 0, totalExpenses: 0, netBalance: 0 });
  const [txPagination, setTxPagination] = useState({ page: 1, limit: 15, totalCount: 0, totalPages: 1 });
  const [txLoading, setTxLoading] = useState(false);
  const [txSearch, setTxSearch] = useState('');
  const [txCategoryFilter, setTxCategoryFilter] = useState('all');
  const [txPaymentMethodFilter, setTxPaymentMethodFilter] = useState('all');
  const [txStatusFilter, setTxStatusFilter] = useState('all');

  // Monthly Statement State
  const [monthlyStatement, setMonthlyStatement] = useState<MonthlyStatement | null>(null);
  const [monthlyStmtLoading, setMonthlyStmtLoading] = useState(false);

  // Annual Statement State
  const [annualStatement, setAnnualStatement] = useState<AnnualStatement | null>(null);
  const [annualStmtLoading, setAnnualStmtLoading] = useState(false);

  // Category Analysis State
  const [categoryAnalysis, setCategoryAnalysis] = useState<any>(null);
  const [categoryAnalysisLoading, setCategoryAnalysisLoading] = useState(false);

  // Modals
  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState(false);
  const [newTxType, setNewTxType] = useState<'income' | 'expense'>('income');
  const [viewingTx, setViewingTx] = useState<FinanceTransaction | null>(null);
  const [editingTx, setEditingTx] = useState<FinanceTransaction | null>(null);
  const [voidingTx, setVoidingTx] = useState<FinanceTransaction | null>(null);
  const [isBaselineModalOpen, setIsBaselineModalOpen] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Forms State
  const [newTxForm, setNewTxForm] = useState({
    branchId: branchFilter || user?.branchId || '',
    transactionType: 'income' as 'income' | 'expense',
    category: '',
    amount: '',
    transactionDate: new Date().toISOString().substring(0, 10),
    description: '',
    referenceNumber: '',
    paymentMethod: 'Bank Transfer'
  });

  const [editTxForm, setEditTxForm] = useState({
    amount: '',
    category: '',
    transactionDate: '',
    description: '',
    referenceNumber: '',
    paymentMethod: '',
    editReason: ''
  });

  const [voidReasonInput, setVoidReasonInput] = useState('');

  const [baselineForm, setBaselineForm] = useState({
    branchId: branchFilter || user?.branchId || (branches[0]?.id || ''),
    year: selectedYear,
    month: 1,
    amount: '',
    notes: 'Initial audited opening balance baseline'
  });

  // Load Categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await api.getFinanceCategories();
        if (res.success) {
          setIncomeCategories(res.incomeCategories || []);
          setExpenseCategories(res.expenseCategories || []);
          setPaymentMethods(res.paymentMethods || []);
        }
      } catch (err: any) {
        console.error('Failed to load finance categories:', err);
      }
    };
    loadCategories();
  }, []);

  // Currency formatter
  const formatNaira = (val: number | undefined | null) => {
    const num = Number(val || 0);
    return '₦' + num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Fetch Dashboard
  const loadDashboard = async () => {
    setDashboardLoading(true);
    try {
      const res = await api.getFinanceDashboard({
        branchId: branchFilter,
        year: selectedYear,
        month: selectedMonth
      });
      if (res.success) {
        setDashboardData(res);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load finance dashboard');
    } finally {
      setDashboardLoading(false);
    }
  };

  // Fetch Transactions Ledger
  const loadTransactions = async (page = 1) => {
    setTxLoading(true);
    try {
      const typeFilter = activeTab === 'income' ? 'income' : activeTab === 'expenses' ? 'expense' : undefined;
      const res = await api.getFinanceTransactions({
        branchId: branchFilter,
        transactionType: typeFilter,
        category: txCategoryFilter !== 'all' ? txCategoryFilter : undefined,
        paymentMethod: txPaymentMethodFilter !== 'all' ? txPaymentMethodFilter : undefined,
        status: txStatusFilter !== 'all' ? txStatusFilter : undefined,
        year: String(selectedYear),
        month: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`,
        search: txSearch.trim() || undefined,
        page,
        limit: txPagination.limit
      });
      if (res.success) {
        setTransactions(res.transactions || []);
        setTxPagination(res.pagination);
        setTransactionsSummary(res.summary || { totalIncome: 0, totalExpenses: 0, netBalance: 0 });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load transactions');
    } finally {
      setTxLoading(false);
    }
  };

  // Fetch Monthly Statement
  const loadMonthlyStatement = async () => {
    setMonthlyStmtLoading(true);
    try {
      const res = await api.getFinanceMonthlyStatement({
        branchId: branchFilter,
        year: selectedYear,
        month: selectedMonth
      });
      if (res.success) {
        setMonthlyStatement(res);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load monthly statement');
    } finally {
      setMonthlyStmtLoading(false);
    }
  };

  // Fetch Annual Statement
  const loadAnnualStatement = async () => {
    setAnnualStmtLoading(true);
    try {
      const res = await api.getFinanceAnnualStatement({
        branchId: branchFilter,
        year: selectedYear
      });
      if (res.success) {
        setAnnualStatement(res);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load annual statement');
    } finally {
      setAnnualStmtLoading(false);
    }
  };

  // Fetch Category Analysis
  const loadCategoryAnalysis = async (type: 'income' | 'expense') => {
    setCategoryAnalysisLoading(true);
    try {
      const res = await api.getFinanceCategoryAnalysis({
        type,
        branchId: branchFilter,
        year: selectedYear,
        month: selectedMonth
      });
      if (res.success) {
        setCategoryAnalysis(res);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load category analysis');
    } finally {
      setCategoryAnalysisLoading(false);
    }
  };

  // Master Data Refresh trigger based on active tab
  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDashboard();
    } else if (activeTab === 'income' || activeTab === 'expenses') {
      loadTransactions(1);
    } else if (activeTab === 'statements_monthly') {
      loadMonthlyStatement();
    } else if (activeTab === 'statements_annual') {
      loadAnnualStatement();
    } else if (activeTab === 'income_analysis') {
      loadCategoryAnalysis('income');
    } else if (activeTab === 'expense_analysis') {
      loadCategoryAnalysis('expense');
    }
  }, [activeTab, branchFilter, selectedYear, selectedMonth]);

  // Handle Create Transaction
  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTxForm.amount || parseFloat(newTxForm.amount) <= 0) {
      toast.error('Please enter a valid amount greater than zero.');
      return;
    }
    if (!newTxForm.category) {
      toast.error('Please select a category.');
      return;
    }
    if (!newTxForm.description.trim()) {
      toast.error('Please provide a remark or description.');
      return;
    }

    setSubmittingAction(true);
    try {
      const targetBranchId = isSuperAdmin ? (newTxForm.branchId || user?.branchId) : user?.branchId;
      const res = await api.createFinanceTransaction({
        branchId: targetBranchId,
        transactionType: newTxForm.transactionType,
        category: newTxForm.category,
        amount: parseFloat(newTxForm.amount),
        transactionDate: newTxForm.transactionDate,
        description: newTxForm.description.trim(),
        referenceNumber: newTxForm.referenceNumber.trim() || undefined,
        paymentMethod: newTxForm.paymentMethod
      });
      if (res.success) {
        toast.success(`${newTxForm.transactionType === 'income' ? 'Income' : 'Expense'} recorded successfully.`);
        setIsNewTxModalOpen(false);
        // Refresh active tab
        if (activeTab === 'dashboard') loadDashboard();
        else if (activeTab === 'income' || activeTab === 'expenses') loadTransactions(txPagination.page);
        else if (activeTab === 'statements_monthly') loadMonthlyStatement();
        else if (activeTab === 'statements_annual') loadAnnualStatement();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to record transaction');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (tx: FinanceTransaction) => {
    setEditingTx(tx);
    setEditTxForm({
      amount: String(tx.amount),
      category: tx.category,
      transactionDate: tx.transactionDate,
      description: tx.description,
      referenceNumber: tx.referenceNumber || '',
      paymentMethod: tx.paymentMethod,
      editReason: ''
    });
  };

  // Handle Update Transaction
  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    if (!editTxForm.editReason.trim()) {
      toast.error('An audit reason is strictly required to update a financial record.');
      return;
    }

    setSubmittingAction(true);
    try {
      const res = await api.updateFinanceTransaction(editingTx.id, {
        amount: parseFloat(editTxForm.amount),
        category: editTxForm.category,
        transactionDate: editTxForm.transactionDate,
        description: editTxForm.description.trim(),
        referenceNumber: editTxForm.referenceNumber.trim() || undefined,
        paymentMethod: editTxForm.paymentMethod,
        editReason: editTxForm.editReason.trim()
      });
      if (res.success) {
        toast.success('Transaction updated and logged to audit trail.');
        setEditingTx(null);
        if (activeTab === 'dashboard') loadDashboard();
        else if (activeTab === 'income' || activeTab === 'expenses') loadTransactions(txPagination.page);
        else if (activeTab === 'statements_monthly') loadMonthlyStatement();
        else if (activeTab === 'statements_annual') loadAnnualStatement();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update transaction');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Void Transaction
  const handleVoidTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidingTx) return;
    if (!voidReasonInput.trim()) {
      toast.error('A void reason is required.');
      return;
    }

    setSubmittingAction(true);
    try {
      const res = await api.voidFinanceTransaction(voidingTx.id, voidReasonInput.trim());
      if (res.success) {
        toast.success('Transaction marked as voided and excluded from calculations.');
        setVoidingTx(null);
        setVoidReasonInput('');
        if (activeTab === 'dashboard') loadDashboard();
        else if (activeTab === 'income' || activeTab === 'expenses') loadTransactions(txPagination.page);
        else if (activeTab === 'statements_monthly') loadMonthlyStatement();
        else if (activeTab === 'statements_annual') loadAnnualStatement();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to void transaction');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Establish Baseline
  const handleSetBaseline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baselineForm.branchId) {
      toast.error('Please select a branch.');
      return;
    }
    if (baselineForm.amount === '' || parseFloat(baselineForm.amount) < 0) {
      toast.error('Please enter a valid non-negative opening balance.');
      return;
    }

    setSubmittingAction(true);
    try {
      const res = await api.setFinanceOpeningBalance({
        branchId: baselineForm.branchId,
        year: Number(baselineForm.year),
        month: Number(baselineForm.month),
        amount: parseFloat(baselineForm.amount),
        notes: baselineForm.notes
      });
      if (res.success) {
        toast.success('Initial opening balance baseline established successfully.');
        setIsBaselineModalOpen(false);
        if (activeTab === 'dashboard') loadDashboard();
        else if (activeTab === 'statements_monthly') loadMonthlyStatement();
        else if (activeTab === 'statements_annual') loadAnnualStatement();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to set baseline opening balance');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Direct CSV Export
  const handleExportCsv = async (reportType: string) => {
    try {
      toast.info('Generating CSV report...');
      const res = await api.exportFinanceReport({
        reportType,
        branchId: branchFilter,
        year: selectedYear,
        month: selectedMonth
      });
      if (res.success && res.content) {
        const blob = new Blob([res.content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', res.filename || 'report.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Export downloaded: ${res.filename}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to export CSV report');
    }
  };

  return (
    <div className="space-y-6 p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-[#0A192F] rounded-2xl p-4 sm:p-6 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold tracking-wide border border-amber-500/30 flex items-center space-x-1.5">
                <Wallet className="w-3.5 h-3.5 text-amber-400" />
                <span>FINANCE & GENERAL LEDGER</span>
              </span>
              <span className="text-xs text-slate-400 font-medium">Faith Preachers Ministries Int'l</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Financial Treasury & Accounts</h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Authoritative multi-branch general ledger, income and expense accounts in Nigerian Naira (₦), dynamic monthly balance roll-forward, and statutory statements.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => {
                setNewTxType('income');
                setNewTxForm(prev => ({
                  ...prev,
                  transactionType: 'income',
                  category: incomeCategories[0] || 'Tithe',
                  branchId: branchFilter || user?.branchId || ''
                }));
                setIsNewTxModalOpen(true);
              }}
              className="flex-1 sm:flex-none justify-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center space-x-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Income</span>
            </button>

            <button
              onClick={() => {
                setNewTxType('expense');
                setNewTxForm(prev => ({
                  ...prev,
                  transactionType: 'expense',
                  category: expenseCategories[0] || 'Salaries',
                  branchId: branchFilter || user?.branchId || ''
                }));
                setIsNewTxModalOpen(true);
              }}
              className="flex-1 sm:flex-none justify-center px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-rose-600/20 transition flex items-center space-x-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Expense</span>
            </button>

            <button
              onClick={() => {
                setBaselineForm(prev => ({
                  ...prev,
                  branchId: branchFilter || user?.branchId || (branches[0]?.id || ''),
                  year: selectedYear
                }));
                setIsBaselineModalOpen(true);
              }}
              className="w-full sm:w-auto justify-center px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium rounded-xl border border-slate-700 transition flex items-center space-x-2 cursor-pointer"
              title="Establish Initial Opening Balance Baseline"
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Set Baseline</span>
            </button>
          </div>
        </div>

        {/* Global Finance Filter Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Branch Selector */}
            <div className="flex items-center space-x-2 bg-[#070E1B] px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-400 font-medium">Branch Scope:</span>
              {isSuperAdmin ? (
                <select
                  value={branchFilter}
                  onChange={e => {
                    const val = e.target.value;
                    setBranchFilter(val);
                    setSelectedBranchId(val);
                  }}
                  className="bg-transparent text-amber-400 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="" className="bg-slate-900 text-white">All Branches (Global Overview)</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                      {b.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center space-x-1.5 text-slate-200 font-semibold">
                  <span>{user?.branchName || 'Assigned Branch'}</span>
                  <span title="Locked to assigned branch">
                    <Lock className="w-3 h-3 text-amber-400" />
                  </span>
                </div>
              )}
            </div>

            {/* Year Selector */}
            <div className="flex items-center space-x-2 bg-[#070E1B] px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-400 font-medium">Year:</span>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
              >
                {[2024, 2025, 2026, 2027].map(yr => (
                  <option key={yr} value={yr} className="bg-slate-900 text-white">{yr}</option>
                ))}
              </select>
            </div>

            {/* Month Selector */}
            <div className="flex items-center space-x-2 bg-[#070E1B] px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-400 font-medium">Month:</span>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i + 1} value={i + 1} className="bg-slate-900 text-white">{name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Refresh Button */}
          <button
            onClick={() => {
              if (activeTab === 'dashboard') loadDashboard();
              else if (activeTab === 'income' || activeTab === 'expenses') loadTransactions(txPagination.page);
              else if (activeTab === 'statements_monthly') loadMonthlyStatement();
              else if (activeTab === 'statements_annual') loadAnnualStatement();
              else if (activeTab === 'income_analysis') loadCategoryAnalysis('income');
              else if (activeTab === 'expense_analysis') loadCategoryAnalysis('expense');
            }}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            title="Refresh Finance Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modern Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 overflow-x-auto pb-2 scrollbar-none -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
        {[
          { id: 'dashboard', label: 'Overview & KPIs', icon: BarChart3 },
          { id: 'income', label: 'Income Ledger', icon: TrendingUp },
          { id: 'expenses', label: 'Expense Ledger', icon: TrendingDown },
          { id: 'statements_monthly', label: 'Monthly Statements', icon: FileSpreadsheet },
          { id: 'statements_annual', label: 'Annual Statement', icon: Layers },
          { id: 'income_analysis', label: 'Income Analysis', icon: PieChart },
          { id: 'expense_analysis', label: 'Expense Analysis', icon: PieChart },
          { id: 'reports', label: 'Report Exports', icon: Download }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          TAB 1: EXECUTIVE DASHBOARD & KPIS
          ===================================================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {dashboardLoading ? (
            <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs font-medium">Calculating general ledger balances...</p>
            </div>
          ) : dashboardData ? (
            <>
              {/* Primary 4 Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Opening Balance */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Opening Balance</span>
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-2xl font-extrabold text-slate-900">{formatNaira(dashboardData.openingBalance)}</h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                      As of 1st {dashboardData.period.monthName} {dashboardData.period.year}
                    </p>
                  </div>
                </div>

                {/* 2. Total Income MTD */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Income (MTD)</span>
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-2xl font-extrabold text-emerald-600">{formatNaira(dashboardData.totalIncome)}</h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Active inflows in {dashboardData.period.monthName}
                    </p>
                  </div>
                </div>

                {/* 3. Total Expenses MTD */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Expenses (MTD)</span>
                    <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                      <TrendingDown className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-2xl font-extrabold text-rose-600">{formatNaira(dashboardData.totalExpenses)}</h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Active outflows in {dashboardData.period.monthName}
                    </p>
                  </div>
                </div>

                {/* 4. Closing Balance */}
                <div className={`p-5 rounded-2xl border shadow-sm relative overflow-hidden ${
                  dashboardData.closingBalance >= 0
                    ? 'bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-200'
                    : 'bg-gradient-to-br from-rose-500/10 to-transparent border-rose-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Closing Balance</span>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      dashboardData.closingBalance >= 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    }`}>
                      <Wallet className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className={`text-2xl font-black ${
                      dashboardData.closingBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {formatNaira(dashboardData.closingBalance)}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Net: {formatNaira(dashboardData.totalIncome - dashboardData.totalExpenses)}
                    </p>
                  </div>
                </div>
              </div>

              {/* YTD Cumulative Summary Row */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-wrap items-center justify-between gap-6 border border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Year-To-Date (YTD) Summary</h4>
                    <p className="text-xs text-slate-400">Cumulative metrics from January through {dashboardData.period.monthName} {selectedYear}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-8">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium uppercase">YTD Income</span>
                    <p className="text-base font-bold text-emerald-400">{formatNaira(dashboardData.ytdIncome)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium uppercase">YTD Expenses</span>
                    <p className="text-base font-bold text-rose-400">{formatNaira(dashboardData.ytdExpenses)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium uppercase">YTD Closing Balance</span>
                    <p className="text-base font-black text-amber-300">{formatNaira(dashboardData.ytdClosingBalance)}</p>
                  </div>
                </div>
              </div>

              {/* Monthly Trend Visual Grid */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{selectedYear} Monthly Financial Trends</h3>
                    <p className="text-xs text-slate-500">Inflows vs. Outflows comparison across all 12 calendar months</p>
                  </div>
                  <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                    12-Month Roll-Forward
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
                  {dashboardData.monthlyTrend.map((m) => {
                    const isSelected = m.month === selectedMonth;
                    return (
                      <div
                        key={m.month}
                        onClick={() => setSelectedMonth(m.month)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/50 border-blue-400 ring-2 ring-blue-500/20'
                            : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className={`font-bold ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                            {m.monthName}
                          </span>
                          {m.net >= 0 ? (
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                          )}
                        </div>
                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between text-slate-500">
                            <span>In:</span>
                            <span className="font-semibold text-emerald-600">{formatNaira(m.income)}</span>
                          </div>
                          <div className="flex justify-between text-slate-500">
                            <span>Out:</span>
                            <span className="font-semibold text-rose-600">{formatNaira(m.expenses)}</span>
                          </div>
                          <div className="pt-1 border-t border-slate-200/60 flex justify-between font-bold">
                            <span className="text-slate-600">Net:</span>
                            <span className={m.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                              {formatNaira(m.net)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Super Admin Multi-Branch Comparison Table */}
              {isSuperAdmin && (!branchFilter || branchFilter === 'all') && dashboardData.branchComparison && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-3">
                  <div className="p-5 border-b border-slate-200/80 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Multi-Branch Financial Comparison</h3>
                      <p className="text-xs text-slate-500">
                        Overview of opening, income, expense, and closing balances across all worship centers for {dashboardData.period.monthName} {selectedYear}
                      </p>
                    </div>
                    <button
                      onClick={() => handleExportCsv('branch_comparison')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition flex items-center space-x-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Grid</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[700px]">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                        <tr>
                          <th className="px-5 py-3">Branch Name</th>
                          <th className="px-4 py-3">Code</th>
                          <th className="px-4 py-3 text-right">Opening Balance</th>
                          <th className="px-4 py-3 text-right">Total Income</th>
                          <th className="px-4 py-3 text-right">Total Expenses</th>
                          <th className="px-4 py-3 text-right">Closing Balance</th>
                          <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {dashboardData.branchComparison.map(br => (
                          <tr key={br.branchId} className="hover:bg-slate-50/70 transition">
                            <td className="px-5 py-3.5 font-bold text-slate-900 flex items-center space-x-2">
                              <Building2 className="w-4 h-4 text-blue-600" />
                              <span>{br.branchName}</span>
                            </td>
                            <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">{br.branchCode}</td>
                            <td className="px-4 py-3.5 text-right text-slate-700">{formatNaira(br.openingBalance)}</td>
                            <td className="px-4 py-3.5 text-right font-bold text-emerald-600">{formatNaira(br.totalIncome)}</td>
                            <td className="px-4 py-3.5 text-right font-bold text-rose-600">{formatNaira(br.totalExpenses)}</td>
                            <td className="px-4 py-3.5 text-right font-black text-slate-900">{formatNaira(br.closingBalance)}</td>
                            <td className="px-4 py-3.5 text-center">
                              <button
                                onClick={() => {
                                  setBranchFilter(br.branchId);
                                  setSelectedBranchId(br.branchId);
                                }}
                                className="text-blue-600 hover:text-blue-800 text-xs font-semibold hover:underline"
                              >
                                View Branch
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Recent Transactions List */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-200/80 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Recent Transactions</h3>
                    <p className="text-xs text-slate-500">Latest active entries recorded in the church general ledger</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('income')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                  >
                    <span>View All Transactions</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {dashboardData.recentTransactions.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No financial transactions recorded for this period yet.
                    </div>
                  ) : (
                    dashboardData.recentTransactions.map(tx => (
                      <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition">
                        <div className="flex items-center space-x-3.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                            tx.transactionType === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                          }`}>
                            {tx.transactionType === 'income' ? (
                              <ArrowUpRight className="w-4 h-4" />
                            ) : (
                              <ArrowDownRight className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-slate-900">{tx.category}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                                {tx.paymentMethod}
                              </span>
                              {tx.branchName && (
                                <span className="text-[10px] text-slate-400">· {tx.branchName}</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 truncate max-w-md">{tx.description}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className={`text-sm font-extrabold ${
                            tx.transactionType === 'income' ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {tx.transactionType === 'income' ? '+' : '-'}{formatNaira(tx.amount)}
                          </p>
                          <span className="text-[10px] text-slate-400">{tx.transactionDate}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* =====================================================================
          TAB 2 & 3: INCOME & EXPENSE LEDGERS
          ===================================================================== */}
      {(activeTab === 'income' || activeTab === 'expenses') && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 flex-1">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] sm:min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search description, reference, category..."
                  value={txSearch}
                  onChange={e => setTxSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadTransactions(1)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Category Filter */}
              <select
                value={txCategoryFilter}
                onChange={e => setTxCategoryFilter(e.target.value)}
                className="w-full sm:w-auto bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All Categories</option>
                {(activeTab === 'income' ? incomeCategories : expenseCategories).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Payment Method Filter */}
              <select
                value={txPaymentMethodFilter}
                onChange={e => setTxPaymentMethodFilter(e.target.value)}
                className="w-full sm:w-auto bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All Payment Methods</option>
                {paymentMethods.map(pm => (
                  <option key={pm} value={pm}>{pm}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={txStatusFilter}
                onChange={e => setTxStatusFilter(e.target.value)}
                className="w-full sm:w-auto bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="voided">Voided Only</option>
              </select>

              <button
                onClick={() => loadTransactions(1)}
                className="w-full sm:w-auto px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer text-center"
              >
                Apply Filters
              </button>
            </div>

            {/* Summary Totals Indicator */}
            <div className="text-left md:text-right pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                Total {activeTab === 'income' ? 'Income' : 'Expenses'}
              </span>
              <p className={`text-base font-extrabold ${activeTab === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatNaira(activeTab === 'income' ? transactionsSummary.totalIncome : transactionsSummary.totalExpenses)}
              </p>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {txLoading ? (
              <div className="p-12 text-center text-slate-500">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs">Loading ledger entries...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No financial transactions matching the selected criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[760px]">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Reference</th>
                      <th className="px-4 py-3">Payment Method</th>
                      <th className="px-4 py-3">Branch</th>
                      <th className="px-4 py-3 text-right">Amount (NGN)</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {transactions.map(tx => (
                      <tr key={tx.id} className={`hover:bg-slate-50/70 transition ${tx.status === 'voided' ? 'opacity-60 bg-slate-50/40' : ''}`}>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{tx.transactionDate}</td>
                        <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{tx.category}</td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={tx.description}>
                          {tx.description}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{tx.referenceNumber || '—'}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{tx.paymentMethod}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{tx.branchName}</td>
                        <td className={`px-4 py-3 text-right font-extrabold whitespace-nowrap ${
                          tx.status === 'voided' ? 'line-through text-slate-400' : tx.transactionType === 'income' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {formatNaira(tx.amount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {tx.status === 'active' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[10px] border border-emerald-200">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold text-[10px] border border-slate-200" title={tx.voidReason}>
                              Voided
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => setViewingTx(tx)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {tx.status === 'active' && (
                              <>
                                <button
                                  onClick={() => openEditModal(tx)}
                                  className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition"
                                  title="Edit with Audit Reason"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setVoidingTx(tx)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition"
                                  title="Void Transaction"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing page {txPagination.page} of {txPagination.totalPages || 1} ({txPagination.totalCount} total entries)
              </span>
              <div className="flex items-center space-x-2">
                <button
                  disabled={txPagination.page <= 1}
                  onClick={() => loadTransactions(txPagination.page - 1)}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={txPagination.page >= txPagination.totalPages}
                  onClick={() => loadTransactions(txPagination.page + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: MONTHLY FINANCIAL STATEMENT
          ===================================================================== */}
      {activeTab === 'statements_monthly' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Official Monthly Financial Statement</h2>
              <p className="text-xs text-slate-500">Categorical breakdown of opening balance, active income, operating expenses, and closing balance</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center space-x-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Statement</span>
              </button>
              <button
                onClick={() => handleExportCsv('monthly_statement')}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition flex items-center space-x-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {monthlyStmtLoading ? (
            <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs font-medium">Compiling statement...</p>
            </div>
          ) : monthlyStatement ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-4 sm:p-8 max-w-4xl mx-auto space-y-6 sm:space-y-8 print:border-none print:shadow-none print:p-0">
              {/* Official Header */}
              <div className="text-center border-b border-slate-200 pb-6 space-y-1">
                <h1 className="text-xl font-extrabold text-slate-900 tracking-wide uppercase">
                  FAITH PREACHERS MINISTRIES INT'L
                </h1>
                <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">
                  FPM GLOBAL ADMIN PORTAL — GENERAL TREASURY
                </p>
                <h2 className="text-base font-bold text-slate-800 pt-2">
                  MONTHLY FINANCIAL STATEMENT
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Branch: <span className="font-bold text-slate-800">{monthlyStatement.branchName}</span> | Period: <span className="font-bold text-slate-800">{monthlyStatement.monthName} {monthlyStatement.year}</span>
                </p>
              </div>

              {/* 1. Opening Balance Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Opening Balance Baseline</span>
                  <p className="text-[11px] text-slate-400">Position as of 1st {monthlyStatement.monthName} {monthlyStatement.year}</p>
                </div>
                <span className="text-xl font-black text-slate-900">{formatNaira(monthlyStatement.openingBalance)}</span>
              </div>

              {/* 2. Income Section */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-2 gap-1">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Church Inflows & Income</span>
                  </h3>
                  <span className="text-xs font-bold text-emerald-600">Total: {formatNaira(monthlyStatement.totalIncome)}</span>
                </div>

                <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
                  <table className="w-full text-left text-xs min-w-[440px]">
                    <thead className="text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="py-2">Income Category</th>
                        <th className="py-2 text-center">Transactions</th>
                        <th className="py-2 text-right">Amount (NGN)</th>
                        <th className="py-2 text-right">Percentage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthlyStatement.incomeCategories.map(item => (
                        <tr key={item.category}>
                          <td className="py-2.5 font-semibold text-slate-800">{item.category}</td>
                          <td className="py-2.5 text-center text-slate-500">{item.count}</td>
                          <td className="py-2.5 text-right font-bold text-slate-900">{formatNaira(item.amount)}</td>
                          <td className="py-2.5 text-right text-slate-500 font-mono">{item.percentage}%</td>
                        </tr>
                      ))}
                      <tr className="font-extrabold bg-emerald-50/40 text-emerald-800">
                        <td className="py-3 px-2">TOTAL INCOME</td>
                        <td className="py-3 text-center">
                          {monthlyStatement.incomeCategories.reduce((acc, curr) => acc + curr.count, 0)}
                        </td>
                        <td className="py-3 text-right">{formatNaira(monthlyStatement.totalIncome)}</td>
                        <td className="py-3 text-right font-mono">100.0%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Expense Section */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-2 gap-1">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span>Ministry Expenditures & Expenses</span>
                  </h3>
                  <span className="text-xs font-bold text-rose-600">Total: {formatNaira(monthlyStatement.totalExpenses)}</span>
                </div>

                <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
                  <table className="w-full text-left text-xs min-w-[440px]">
                    <thead className="text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="py-2">Expense Category</th>
                        <th className="py-2 text-center">Transactions</th>
                        <th className="py-2 text-right">Amount (NGN)</th>
                        <th className="py-2 text-right">Percentage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthlyStatement.expenseCategories.map(item => (
                        <tr key={item.category}>
                          <td className="py-2.5 font-semibold text-slate-800">{item.category}</td>
                          <td className="py-2.5 text-center text-slate-500">{item.count}</td>
                          <td className="py-2.5 text-right font-bold text-slate-900">{formatNaira(item.amount)}</td>
                          <td className="py-2.5 text-right text-slate-500 font-mono">{item.percentage}%</td>
                        </tr>
                      ))}
                      <tr className="font-extrabold bg-rose-50/40 text-rose-800">
                        <td className="py-3 px-2">TOTAL EXPENSES</td>
                        <td className="py-3 text-center">
                          {monthlyStatement.expenseCategories.reduce((acc, curr) => acc + curr.count, 0)}
                        </td>
                        <td className="py-3 text-right">{formatNaira(monthlyStatement.totalExpenses)}</td>
                        <td className="py-3 text-right font-mono">100.0%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. Final Executive Reconciliation Box */}
              <div className="bg-[#0A192F] text-white p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-1">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">MONTHLY SUMMARY & RECONCILIATION</span>
                  <span className="text-xs font-mono text-slate-400">Strict Balance Continuity</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Opening Balance:</span>
                    <span className="font-bold text-white">{formatNaira(monthlyStatement.openingBalance)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>(+) Total Income:</span>
                    <span className="font-bold text-emerald-400">+{formatNaira(monthlyStatement.totalIncome)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>(-) Total Expenses:</span>
                    <span className="font-bold text-rose-400">-{formatNaira(monthlyStatement.totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Net Monthly Cashflow:</span>
                    <span className={`font-bold ${monthlyStatement.netChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatNaira(monthlyStatement.netChange)}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-slate-700/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 text-sm">
                    <span className="font-black text-amber-300 uppercase tracking-wider">CLOSING BALANCE:</span>
                    <span className="text-xl font-black text-amber-400">{formatNaira(monthlyStatement.closingBalance)}</span>
                  </div>
                </div>
              </div>

              {/* Signatures Row */}
              <div className="pt-8 sm:pt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 text-center text-xs text-slate-600 print:pt-8 print:grid-cols-3">
                <div className="border-t border-slate-300 pt-2">
                  <p className="font-bold text-slate-900">Church Administrator</p>
                  <p className="text-[10px] text-slate-400">Prepared By</p>
                </div>
                <div className="border-t border-slate-300 pt-2">
                  <p className="font-bold text-slate-900">Branch Pastor / Minister</p>
                  <p className="text-[10px] text-slate-400">Verified & Approved</p>
                </div>
                <div className="border-t border-slate-300 pt-2">
                  <p className="font-bold text-slate-900">Senior Pastor / Overseer</p>
                  <p className="text-[10px] text-slate-400">Executive Endorsement</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* =====================================================================
          TAB 5: ANNUAL FINANCIAL STATEMENT
          ===================================================================== */}
      {activeTab === 'statements_annual' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">{selectedYear} Annual Financial Reconciliation</h2>
              <p className="text-xs text-slate-500">12-month sequential ledger reconciliation</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center space-x-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>
              <button
                onClick={() => handleExportCsv('annual_statement')}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition flex items-center space-x-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {annualStmtLoading ? (
            <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs font-medium">Reconciling annual ledger records...</p>
            </div>
          ) : annualStatement ? (
            <div className="space-y-6">
              {/* Annual Summary Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Annual Opening (Jan)</span>
                  <p className="text-lg sm:text-xl font-bold text-slate-900 mt-2">{formatNaira(annualStatement.annualOpeningBalance)}</p>
                </div>
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Annual Income</span>
                  <p className="text-lg sm:text-xl font-bold text-emerald-600 mt-2">{formatNaira(annualStatement.totalAnnualIncome)}</p>
                </div>
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Annual Expenses</span>
                  <p className="text-lg sm:text-xl font-bold text-rose-600 mt-2">{formatNaira(annualStatement.totalAnnualExpenses)}</p>
                </div>
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-300 shadow-sm bg-gradient-to-br from-amber-500/10 to-transparent">
                  <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Annual Closing (Dec)</span>
                  <p className="text-lg sm:text-xl font-black text-amber-900 mt-2">{formatNaira(annualStatement.annualClosingBalance)}</p>
                </div>
              </div>

              {/* 12-Month Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[650px]">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                      <tr>
                        <th className="px-5 py-3">Month</th>
                        <th className="px-4 py-3 text-right">Opening Balance</th>
                        <th className="px-4 py-3 text-right">Income</th>
                        <th className="px-4 py-3 text-right">Expenses</th>
                        <th className="px-4 py-3 text-right">Net Cashflow</th>
                        <th className="px-4 py-3 text-right">Closing Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {annualStatement.months.map((m, idx) => (
                        <tr key={m.month} className="hover:bg-slate-50/70 transition">
                          <td className="px-5 py-3 font-bold text-slate-900">{m.monthName}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{formatNaira(m.openingBalance)}</td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatNaira(m.totalIncome)}</td>
                          <td className="px-4 py-3 text-right font-bold text-rose-600">{formatNaira(m.totalExpenses)}</td>
                          <td className={`px-4 py-3 text-right font-bold ${m.netChange >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {m.netChange >= 0 ? '+' : ''}{formatNaira(m.netChange)}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-slate-900">{formatNaira(m.closingBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* =====================================================================
          TAB 6 & 7: CATEGORY ANALYSIS (INCOME & EXPENSES)
          ===================================================================== */}
      {(activeTab === 'income_analysis' || activeTab === 'expense_analysis') && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {activeTab === 'income_analysis' ? 'Income Category Breakdown' : 'Expense Category Breakdown'}
              </h2>
              <p className="text-xs text-slate-500">Distribution analysis and driver percentages for {selectedYear}</p>
            </div>
          </div>

          {categoryAnalysisLoading ? (
            <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs font-medium">Analyzing category distributions...</p>
            </div>
          ) : categoryAnalysis ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Distribution Cards List */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category Drivers</span>
                  <span className="text-xs font-bold text-slate-900">Total: {formatNaira(categoryAnalysis.totalAmount)}</span>
                </div>

                <div className="space-y-4">
                  {categoryAnalysis.categories.map((c: any) => (
                    <div key={c.category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">{c.category}</span>
                        <div className="flex items-center space-x-3">
                          <span className="text-slate-400">{c.count} transactions</span>
                          <span className="font-bold text-slate-900">{formatNaira(c.amount)}</span>
                          <span className="font-mono font-bold text-slate-600 w-12 text-right">{c.percentage}%</span>
                        </div>
                      </div>
                      {/* Bar indicator */}
                      <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            activeTab === 'income_analysis' ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, c.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Insights Card */}
              <div className="bg-[#0A192F] text-white p-6 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-6">
                <div>
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Treasury Insights</span>
                  <h3 className="text-lg font-bold text-white mt-2">
                    {categoryAnalysis.categories[0]?.amount > 0 ? (
                      `Primary Driver: ${categoryAnalysis.categories[0]?.category}`
                    ) : (
                      'No Recorded Activity'
                    )}
                  </h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {categoryAnalysis.categories[0]?.amount > 0
                      ? `${categoryAnalysis.categories[0]?.category} constitutes ${categoryAnalysis.categories[0]?.percentage}% of total ${activeTab === 'income_analysis' ? 'receipts' : 'outflows'} for the period.`
                      : 'Ensure all collections and payments are logged daily.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-2">
                  <div className="flex justify-between">
                    <span>Active Transactions:</span>
                    <span className="font-bold text-white">{categoryAnalysis.transactionCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Categories Active:</span>
                    <span className="font-bold text-white">
                      {categoryAnalysis.categories.filter((c: any) => c.amount > 0).length} / {categoryAnalysis.categories.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* =====================================================================
          TAB 8: REPORT EXPORTS
          ===================================================================== */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Financial Reports & Data Exports</h2>
            <p className="text-xs text-slate-500">Download formatted CSV ledgers and official statements for audit compliance and archival</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Card 1: Monthly Statement */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Monthly Financial Statement</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Full categorical breakdown of opening balance, active income, operating expenses, and closing balance for {selectedMonth}/{selectedYear}.
                </p>
              </div>
              <button
                onClick={() => handleExportCsv('monthly_statement')}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Statement (CSV)</span>
              </button>
            </div>

            {/* Card 2: Annual Statement */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Annual Reconciliation Statement</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  12-month sequential balance reconciliation verifying monthly continuity and December closing position for {selectedYear}.
                </p>
              </div>
              <button
                onClick={() => handleExportCsv('annual_statement')}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Annual (CSV)</span>
              </button>
            </div>

            {/* Card 3: Income Ledger */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Detailed Income Ledger</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Line-by-line itemized transaction records of tithes, offerings, POS payments, and donations with audit attribution.
                </p>
              </div>
              <button
                onClick={() => handleExportCsv('income_ledger')}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Income Ledger (CSV)</span>
              </button>
            </div>

            {/* Card 4: Expense Ledger */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Detailed Expense Ledger</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Line-by-line itemized expenditures across transport, salaries, rentals, utilities, and church materials.
                </p>
              </div>
              <button
                onClick={() => handleExportCsv('expense_ledger')}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Expense Ledger (CSV)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: RECORD NEW TRANSACTION (INCOME OR EXPENSE)
          ===================================================================== */}
      {isNewTxModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3.5 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white ${
                  newTxForm.transactionType === 'income' ? 'bg-emerald-600' : 'bg-rose-600'
                }`}>
                  {newTxForm.transactionType === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Record Church {newTxForm.transactionType === 'income' ? 'Income' : 'Expense'}
                </h3>
              </div>
              <button
                onClick={() => setIsNewTxModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTransaction} className="mt-4 space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setNewTxForm(prev => ({
                    ...prev,
                    transactionType: 'income',
                    category: incomeCategories[0] || 'Tithe'
                  }))}
                  className={`py-1.5 text-xs font-bold rounded-lg transition ${
                    newTxForm.transactionType === 'income'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Income Inflow (+)
                </button>
                <button
                  type="button"
                  onClick={() => setNewTxForm(prev => ({
                    ...prev,
                    transactionType: 'expense',
                    category: expenseCategories[0] || 'Salaries'
                  }))}
                  className={`py-1.5 text-xs font-bold rounded-lg transition ${
                    newTxForm.transactionType === 'expense'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Expense Outflow (-)
                </button>
              </div>

              {/* Branch Selection (for Super Admin) */}
              {isSuperAdmin && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Branch *</label>
                  <select
                    value={newTxForm.branchId}
                    onChange={e => setNewTxForm({ ...newTxForm, branchId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Amount & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Amount (NGN ₦) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="e.g. 50000"
                    value={newTxForm.amount}
                    onChange={e => setNewTxForm({ ...newTxForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={newTxForm.category}
                    onChange={e => setNewTxForm({ ...newTxForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  >
                    {(newTxForm.transactionType === 'income' ? incomeCategories : expenseCategories).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Transaction Date *</label>
                  <input
                    type="date"
                    value={newTxForm.transactionDate}
                    onChange={e => setNewTxForm({ ...newTxForm, transactionDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={newTxForm.paymentMethod}
                    onChange={e => setNewTxForm({ ...newTxForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {paymentMethods.map(pm => (
                      <option key={pm} value={pm}>{pm}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reference Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reference / Slip / Receipt #</label>
                <input
                  type="text"
                  placeholder="e.g. TRF-2026-9901 or POS Slip #"
                  value={newTxForm.referenceNumber}
                  onChange={e => setNewTxForm({ ...newTxForm, referenceNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description / Remark *</label>
                <textarea
                  rows={2}
                  placeholder="Detail the purpose, source, or recipient of this transaction..."
                  value={newTxForm.description}
                  onChange={e => setNewTxForm({ ...newTxForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewTxModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className={`w-full sm:w-auto px-5 py-2.5 text-white text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 ${
                    newTxForm.transactionType === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submittingAction && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: EDIT TRANSACTION (REQUIRES AUDIT REASON)
          ===================================================================== */}
      {editingTx && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3.5 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Modify Financial Record</h3>
                  <p className="text-[11px] text-slate-500">Audit trail reason strictly required</p>
                </div>
              </div>
              <button
                onClick={() => setEditingTx(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTransaction} className="mt-4 space-y-4">
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  Any modification to financial records dynamically updates all forward balances. The prior state and edit reason will be logged in the immutable audit trail.
                </p>
              </div>

              {/* Amount & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Amount (NGN ₦) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editTxForm.amount}
                    onChange={e => setEditTxForm({ ...editTxForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={editTxForm.category}
                    onChange={e => setEditTxForm({ ...editTxForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  >
                    {(editingTx.transactionType === 'income' ? incomeCategories : expenseCategories).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Transaction Date *</label>
                  <input
                    type="date"
                    value={editTxForm.transactionDate}
                    onChange={e => setEditTxForm({ ...editTxForm, transactionDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={editTxForm.paymentMethod}
                    onChange={e => setEditTxForm({ ...editTxForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {paymentMethods.map(pm => (
                      <option key={pm} value={pm}>{pm}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description / Remark *</label>
                <textarea
                  rows={2}
                  value={editTxForm.description}
                  onChange={e => setEditTxForm({ ...editTxForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>

              {/* Mandatory Audit Reason */}
              <div>
                <label className="block text-xs font-bold text-rose-700 mb-1">Audit Reason for Edit *</label>
                <input
                  type="text"
                  placeholder="e.g. Reconciled bank transfer reference with deacon board receipt"
                  value={editTxForm.editReason}
                  onChange={e => setEditTxForm({ ...editTxForm, editReason: e.target.value })}
                  className="w-full px-3 py-2 bg-rose-50/40 border border-rose-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  required
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5"
                >
                  {submittingAction && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: VOID TRANSACTION
          ===================================================================== */}
      {voidingTx && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3.5 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center space-x-3 text-rose-600 mb-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Void Financial Record</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to void this <span className="font-bold">{voidingTx.category}</span> transaction of <span className="font-bold text-slate-900">{formatNaira(voidingTx.amount)}</span>?
            </p>

            <div className="my-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 space-y-1">
              <p><span className="font-semibold text-slate-700">Date:</span> {voidingTx.transactionDate}</p>
              <p><span className="font-semibold text-slate-700">Branch:</span> {voidingTx.branchName}</p>
              <p><span className="font-semibold text-slate-700">Remark:</span> {voidingTx.description}</p>
            </div>

            <form onSubmit={handleVoidTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Voiding *</label>
                <input
                  type="text"
                  placeholder="e.g. Duplicate remittance slip entered in error"
                  value={voidReasonInput}
                  onChange={e => setVoidReasonInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  required
                />
              </div>

              <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setVoidingTx(null)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5"
                >
                  {submittingAction && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Void</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: ESTABLISH OPENING BALANCE BASELINE
          ===================================================================== */}
      {isBaselineModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3.5 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Establish Opening Balance</h3>
              </div>
              <button
                onClick={() => setIsBaselineModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSetBaseline} className="mt-4 space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs leading-relaxed">
                Establishes the authoritative starting opening balance baseline for a specific branch. All subsequent monthly balances roll forward dynamically.
              </div>

              {/* Branch */}
              {isSuperAdmin && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Branch *</label>
                  <select
                    value={baselineForm.branchId}
                    onChange={e => setBaselineForm({ ...baselineForm, branchId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Year & Month */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Year *</label>
                  <select
                    value={baselineForm.year}
                    onChange={e => setBaselineForm({ ...baselineForm, year: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {[2024, 2025, 2026, 2027].map(yr => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Month *</label>
                  <select
                    value={baselineForm.month}
                    onChange={e => setBaselineForm({ ...baselineForm, month: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {MONTH_NAMES.map((name, i) => (
                      <option key={i + 1} value={i + 1}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Opening Balance Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Opening Amount (NGN ₦) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 500000"
                  value={baselineForm.amount}
                  onChange={e => setBaselineForm({ ...baselineForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Baseline Audit Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Audited starting cash/bank position as of Jan 2026"
                  value={baselineForm.notes}
                  onChange={e => setBaselineForm({ ...baselineForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setIsBaselineModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5"
                >
                  {submittingAction && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Baseline</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: VIEW TRANSACTION DETAILS
          ===================================================================== */}
      {viewingTx && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3.5 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white ${
                  viewingTx.transactionType === 'income' ? 'bg-emerald-600' : 'bg-rose-600'
                }`}>
                  {viewingTx.transactionType === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Transaction Details</h3>
                  <span className="font-mono text-[10px] text-slate-400">{viewingTx.id}</span>
                </div>
              </div>
              <button
                onClick={() => setViewingTx(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Amount</span>
                  <p className={`text-xl font-black ${
                    viewingTx.status === 'voided' ? 'line-through text-slate-400' : viewingTx.transactionType === 'income' ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {formatNaira(viewingTx.amount)}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  viewingTx.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {viewingTx.status.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-2.5 bg-slate-50/60 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-medium">Category:</span>
                  <p className="font-bold text-slate-900 mt-0.5">{viewingTx.category}</p>
                </div>
                <div className="p-2.5 bg-slate-50/60 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-medium">Transaction Date:</span>
                  <p className="font-bold text-slate-900 mt-0.5">{viewingTx.transactionDate}</p>
                </div>
                <div className="p-2.5 bg-slate-50/60 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-medium">Branch:</span>
                  <p className="font-bold text-slate-900 mt-0.5">{viewingTx.branchName}</p>
                </div>
                <div className="p-2.5 bg-slate-50/60 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-medium">Payment Method:</span>
                  <p className="font-bold text-slate-900 mt-0.5">{viewingTx.paymentMethod}</p>
                </div>
              </div>

              {viewingTx.referenceNumber && (
                <div className="p-2.5 bg-slate-50/60 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-medium">Reference / Slip Number:</span>
                  <p className="font-mono text-slate-900 mt-0.5">{viewingTx.referenceNumber}</p>
                </div>
              )}

              <div className="p-2.5 bg-slate-50/60 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-medium">Description / Remark:</span>
                <p className="text-slate-800 mt-0.5 leading-relaxed">{viewingTx.description}</p>
              </div>

              {viewingTx.voidReason && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
                  <span className="font-bold">Void Reason:</span> {viewingTx.voidReason}
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex flex-col sm:flex-row sm:justify-between gap-1">
                <span>Recorded By: <span className="font-semibold text-slate-600">{viewingTx.createdByName}</span></span>
                <span>{new Date(viewingTx.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewingTx(null)}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition text-center"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancePage;
