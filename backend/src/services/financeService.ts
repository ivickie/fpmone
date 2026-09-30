import { v4 as uuidv4 } from 'uuid';
import { db, FINANCE_INCOME_CATEGORIES, FINANCE_EXPENSE_CATEGORIES, FINANCE_PAYMENT_METHODS } from '../data/mockDb';
import { 
  AuthUserSession, FinanceTransaction, FinanceOpeningBalance,
  CreateFinanceTransactionDto, UpdateFinanceTransactionDto,
  MonthlyFinancialStatement, AnnualFinancialStatement,
  CategoryAnalysisItem, FinanceDashboardSummary
} from '../types';
import { AuditService } from './auditService';
import { persistFinanceTransaction, persistFinanceOpeningBalance } from '../db/sync';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export class FinanceService {
  /**
   * Validates if the authenticated user has Finance privilege.
   * Restricted strictly to:
   * 1. Super Admin
   * 2. Branch Pastor
   * 3. Church Admin (branch_admin / church_admin)
   */
  public static isAuthorized(user?: AuthUserSession): boolean {
    if (!user) return false;
    const isSuperAdmin = user.adminLevel === 'super_admin' || user.roleCode === 'SUPER_ADMIN';
    const isBranchPastor = user.roleCode === 'BRANCH_PASTOR';
    const isChurchAdmin = user.adminLevel === 'branch_admin' || user.adminLevel === 'church_admin' || user.roleCode === 'BRANCH_ADMIN';
    return isSuperAdmin || isBranchPastor || isChurchAdmin;
  }

  public static isSuperAdmin(user?: AuthUserSession): boolean {
    if (!user) return false;
    return user.adminLevel === 'super_admin' || user.roleCode === 'SUPER_ADMIN';
  }

  /**
   * Resolves effective branch scope based on user's RBAC.
   * Super Admin can access all branches or filter by branchId.
   * Branch Pastor & Church Admin are strictly hard-locked to user.branchId.
   */
  public static resolveBranchScope(user: AuthUserSession, requestedBranchId?: string): { effectiveBranchId?: string; isGlobal: boolean } {
    if (this.isSuperAdmin(user)) {
      if (requestedBranchId && requestedBranchId.trim() !== '' && requestedBranchId !== 'all') {
        return { effectiveBranchId: requestedBranchId.trim(), isGlobal: false };
      }
      return { isGlobal: true };
    }
    // Branch Pastor or Church Admin: strictly locked to user's assigned branch
    return { effectiveBranchId: user.branchId, isGlobal: false };
  }

  /**
   * Get supported categories and payment methods
   */
  public static getCategories() {
    return {
      incomeCategories: FINANCE_INCOME_CATEGORIES,
      expenseCategories: FINANCE_EXPENSE_CATEGORIES,
      paymentMethods: FINANCE_PAYMENT_METHODS
    };
  }

  /**
   * Calculates baseline opening balance for a specific branch and period.
   * Ensures ledger continuity:
   * Next Month Opening Balance = Previous Month Closing Balance.
   */
  public static calculateBranchOpeningBalance(branchId: string, targetYear: number, targetMonth: number): number {
    // 1. Check if an initial baseline exists at or prior to targetYear/targetMonth
    const initialRecords = db.financeOpeningBalances
      .filter(b => b.branchId === branchId && b.isInitial)
      .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month));

    const targetKey = targetYear * 12 + targetMonth;
    let baseAmount = 0;
    let baseKey = 0;

    if (initialRecords.length > 0) {
      // Find the most recent baseline at or before targetKey
      const applicableBase = initialRecords.find(r => (r.year * 12 + r.month) <= targetKey);
      if (applicableBase) {
        baseAmount = applicableBase.amount;
        baseKey = applicableBase.year * 12 + applicableBase.month;
      }
    }

    // 2. Aggregate active transactions strictly between baseKey and targetKey
    const activeTxs = db.financeTransactions.filter(t => {
      if (t.branchId !== branchId || t.status !== 'active') return false;
      const parts = t.transactionDate.split('-');
      if (parts.length < 2) return false;
      const txYear = parseInt(parts[0], 10);
      const txMonth = parseInt(parts[1], 10);
      const txKey = txYear * 12 + txMonth;
      return txKey >= baseKey && txKey < targetKey;
    });

    let priorIncome = 0;
    let priorExpenses = 0;

    for (const tx of activeTxs) {
      if (tx.transactionType === 'income') priorIncome += tx.amount;
      else if (tx.transactionType === 'expense') priorExpenses += tx.amount;
    }

    return Number((baseAmount + priorIncome - priorExpenses).toFixed(2));
  }

  /**
   * Calculates opening balance for either a single branch or globally (sum of all branches).
   */
  public static getOpeningBalance(branchId: string | undefined, year: number, month: number, isGlobal: boolean): number {
    if (isGlobal || !branchId) {
      // Sum across all known branches
      let total = 0;
      for (const branch of db.branches) {
        total += this.calculateBranchOpeningBalance(branch.id, year, month);
      }
      return Number(total.toFixed(2));
    }
    return this.calculateBranchOpeningBalance(branchId, year, month);
  }

  /**
   * Records a new income or expense transaction.
   */
  public static createTransaction(dto: CreateFinanceTransactionDto, user: AuthUserSession): FinanceTransaction {
    if (!this.isAuthorized(user)) {
      throw new Error('Forbidden: Unauthorized to record financial transactions.');
    }

    if (!dto.amount || dto.amount <= 0 || isNaN(dto.amount)) {
      throw new Error('Transaction amount must be a positive number greater than 0.');
    }

    if (!dto.transactionType || !['income', 'expense'].includes(dto.transactionType)) {
      throw new Error('Transaction type must be either "income" or "expense".');
    }

    if (!dto.category || !dto.category.trim()) {
      throw new Error('Transaction category is required.');
    }

    if (!dto.transactionDate || !/^\d{4}-\d{2}-\d{2}$/.test(dto.transactionDate)) {
      throw new Error('A valid transaction date in YYYY-MM-DD format is required.');
    }

    if (!dto.description || !dto.description.trim()) {
      throw new Error('Transaction description or remark is required.');
    }

    // Branch Resolution
    let branchId = user.branchId;
    if (this.isSuperAdmin(user)) {
      if (dto.branchId && dto.branchId.trim()) {
        const targetBranch = db.branches.find(b => b.id === dto.branchId);
        if (!targetBranch) throw new Error('Selected branch does not exist.');
        branchId = targetBranch.id;
      }
    }

    const branch = db.branches.find(b => b.id === branchId);
    const branchName = branch ? branch.name : 'Cathedral of Grace (HQ)';

    const newTx: FinanceTransaction = {
      id: uuidv4(),
      branchId,
      branchName,
      transactionType: dto.transactionType,
      category: dto.category.trim(),
      amount: Number(Number(dto.amount).toFixed(2)),
      transactionDate: dto.transactionDate,
      description: dto.description.trim(),
      referenceNumber: dto.referenceNumber ? dto.referenceNumber.trim() : undefined,
      paymentMethod: dto.paymentMethod?.trim() || 'Bank Transfer',
      status: 'active',
      createdBy: user.userId,
      createdByName: user.fullName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.financeTransactions.unshift(newTx);
    persistFinanceTransaction(newTx).catch(() => {});

    // Audit log
    AuditService.log(
      user.fullName,
      user.roleName,
      newTx.transactionType === 'income' ? 'FINANCE_INCOME_CREATED' : 'FINANCE_EXPENSE_CREATED',
      'finance_transaction',
      newTx.id,
      user.userId,
      null,
      newTx
    );

    return newTx;
  }

  /**
   * Updates an existing transaction.
   * Requires editReason to preserve financial auditability and avoid silent overwrites.
   */
  public static updateTransaction(id: string, dto: UpdateFinanceTransactionDto, user: AuthUserSession): FinanceTransaction {
    if (!this.isAuthorized(user)) {
      throw new Error('Forbidden: Unauthorized to edit financial transactions.');
    }

    const tx = db.financeTransactions.find(t => t.id === id);
    if (!tx) {
      throw new Error('Financial transaction not found.');
    }

    // Branch Isolation Check
    if (!this.isSuperAdmin(user) && tx.branchId !== user.branchId) {
      throw new Error('Forbidden: You can only edit financial records for your assigned branch.');
    }

    if (tx.status !== 'active') {
      throw new Error('Cannot edit an archived or voided transaction.');
    }

    if (!dto.editReason || !dto.editReason.trim()) {
      throw new Error('An audit reason is strictly required when modifying a financial record.');
    }

    const previousState = { ...tx };

    if (dto.amount !== undefined) {
      if (dto.amount <= 0 || isNaN(dto.amount)) {
        throw new Error('Transaction amount must be a positive number greater than 0.');
      }
      tx.amount = Number(Number(dto.amount).toFixed(2));
    }

    if (dto.category && dto.category.trim()) {
      tx.category = dto.category.trim();
    }

    if (dto.transactionDate && /^\d{4}-\d{2}-\d{2}$/.test(dto.transactionDate)) {
      tx.transactionDate = dto.transactionDate;
    }

    if (dto.description !== undefined && dto.description.trim()) {
      tx.description = dto.description.trim();
    }

    if (dto.referenceNumber !== undefined) {
      tx.referenceNumber = dto.referenceNumber.trim() || undefined;
    }

    if (dto.paymentMethod && dto.paymentMethod.trim()) {
      tx.paymentMethod = dto.paymentMethod.trim();
    }

    tx.updatedBy = user.userId;
    tx.updatedByName = user.fullName;
    tx.updatedAt = new Date().toISOString();

    persistFinanceTransaction(tx).catch(() => {});

    // Audit log with reason
    AuditService.log(
      user.fullName,
      user.roleName,
      'FINANCE_TRANSACTION_UPDATED',
      'finance_transaction',
      tx.id,
      user.userId,
      previousState,
      { ...tx, editReason: dto.editReason.trim() }
    );

    return tx;
  }

  /**
   * Voids or archives a financial transaction.
   * The transaction remains in the historical database but is excluded from totals.
   */
  public static voidTransaction(id: string, reason: string, user: AuthUserSession): FinanceTransaction {
    if (!this.isAuthorized(user)) {
      throw new Error('Forbidden: Unauthorized to void financial transactions.');
    }

    const tx = db.financeTransactions.find(t => t.id === id);
    if (!tx) {
      throw new Error('Financial transaction not found.');
    }

    // Branch Isolation Check
    if (!this.isSuperAdmin(user) && tx.branchId !== user.branchId) {
      throw new Error('Forbidden: You can only void financial records for your assigned branch.');
    }

    if (!reason || !reason.trim()) {
      throw new Error('A void reason is required when voiding a financial record.');
    }

    const previousState = { ...tx };
    tx.status = 'voided';
    tx.voidReason = reason.trim();
    tx.updatedBy = user.userId;
    tx.updatedByName = user.fullName;
    tx.updatedAt = new Date().toISOString();

    persistFinanceTransaction(tx).catch(() => {});

    AuditService.log(
      user.fullName,
      user.roleName,
      tx.transactionType === 'income' ? 'FINANCE_INCOME_VOIDED' : 'FINANCE_EXPENSE_VOIDED',
      'finance_transaction',
      tx.id,
      user.userId,
      previousState,
      tx
    );

    return tx;
  }

  /**
   * Retrieves a single transaction by ID with branch isolation check.
   */
  public static getTransactionById(id: string, user: AuthUserSession): FinanceTransaction {
    if (!this.isAuthorized(user)) {
      throw new Error('Forbidden: Unauthorized to view finance records.');
    }

    const tx = db.financeTransactions.find(t => t.id === id);
    if (!tx) {
      throw new Error('Financial transaction not found.');
    }

    if (!this.isSuperAdmin(user) && tx.branchId !== user.branchId) {
      throw new Error('Forbidden: Unauthorized to access financial records for another branch.');
    }

    return tx;
  }

  /**
   * Retrieves opening balance details and baseline record if configured.
   */
  public static getOpeningBalanceRecord(
    branchId: string | undefined,
    year: number,
    month: number,
    user: AuthUserSession
  ) {
    if (!this.isAuthorized(user)) {
      throw new Error('Forbidden: Unauthorized to view opening balance.');
    }

    const { effectiveBranchId, isGlobal } = this.resolveBranchScope(user, branchId);
    const calculatedAmount = this.getOpeningBalance(effectiveBranchId, year, month, isGlobal);

    const baseline = (!isGlobal && effectiveBranchId)
      ? db.financeOpeningBalances.find(b => b.branchId === effectiveBranchId && b.year === year && b.month === month)
      : undefined;

    return {
      branchId: effectiveBranchId,
      isGlobal,
      year,
      month,
      calculatedAmount,
      baselineRecord: baseline || null
    };
  }

  /**
   * Establishes or updates initial opening balance baseline for a branch.
   */
  public static setInitialOpeningBalance(
    branchId: string,
    year: number,
    month: number,
    amount: number,
    notes: string | undefined,
    user: AuthUserSession
  ): FinanceOpeningBalance {
    if (!this.isAuthorized(user)) {
      throw new Error('Forbidden: Unauthorized to establish opening balances.');
    }

    if (!this.isSuperAdmin(user) && branchId !== user.branchId) {
      throw new Error('Forbidden: You can only establish opening balances for your assigned branch.');
    }

    if (amount < 0 || isNaN(amount)) {
      throw new Error('Opening balance amount cannot be negative.');
    }

    if (month < 1 || month > 12) {
      throw new Error('Month must be between 1 and 12.');
    }

    const branch = db.branches.find(b => b.id === branchId);
    if (!branch) {
      throw new Error('Branch not found.');
    }

    let existing = db.financeOpeningBalances.find(b => b.branchId === branchId && b.year === year && b.month === month);

    const previousState = existing ? { ...existing } : null;

    if (existing) {
      existing.amount = Number(Number(amount).toFixed(2));
      existing.isInitial = true;
      existing.notes = notes?.trim() || undefined;
      existing.establishedBy = user.userId;
      existing.establishedByName = user.fullName;
      existing.updatedAt = new Date().toISOString();
    } else {
      existing = {
        id: uuidv4(),
        branchId,
        branchName: branch.name,
        year,
        month,
        amount: Number(Number(amount).toFixed(2)),
        isInitial: true,
        notes: notes?.trim() || undefined,
        establishedBy: user.userId,
        establishedByName: user.fullName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.financeOpeningBalances.push(existing);
    }

    persistFinanceOpeningBalance(existing).catch(() => {});

    AuditService.log(
      user.fullName,
      user.roleName,
      'FINANCE_INITIAL_BALANCE_SET',
      'finance_opening_balance',
      existing.id,
      user.userId,
      previousState,
      existing
    );

    return existing;
  }

  /**
   * Filtered list of transactions.
   */
  public static getTransactions(filters: {
    branchId?: string;
    transactionType?: 'income' | 'expense';
    category?: string;
    paymentMethod?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    month?: string; // YYYY-MM
    year?: string; // YYYY
    search?: string;
    page?: number;
    limit?: number;
  }, user: AuthUserSession) {
    if (!this.isAuthorized(user)) {
      throw new Error('Forbidden: Unauthorized to view finance records.');
    }

    const { effectiveBranchId, isGlobal } = this.resolveBranchScope(user, filters.branchId);

    let list = db.financeTransactions.filter(t => {
      // Branch check
      if (!isGlobal && effectiveBranchId && t.branchId !== effectiveBranchId) return false;

      // Type check
      if (filters.transactionType && t.transactionType !== filters.transactionType) return false;

      // Category check
      if (filters.category && filters.category !== 'all' && t.category.toLowerCase() !== filters.category.toLowerCase()) return false;

      // Payment method check
      if (filters.paymentMethod && filters.paymentMethod !== 'all' && t.paymentMethod.toLowerCase() !== filters.paymentMethod.toLowerCase()) return false;

      // Status check (default: all non-voided or specific)
      if (filters.status && filters.status !== 'all') {
        if (t.status !== filters.status) return false;
      }

      // Date range check
      if (filters.startDate && t.transactionDate < filters.startDate) return false;
      if (filters.endDate && t.transactionDate > filters.endDate) return false;

      // Month check (YYYY-MM)
      if (filters.month && !t.transactionDate.startsWith(filters.month)) return false;

      // Year check (YYYY)
      if (filters.year && !t.transactionDate.startsWith(filters.year)) return false;

      // Search term
      if (filters.search && filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        const matches = 
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.referenceNumber && t.referenceNumber.toLowerCase().includes(q)) ||
          (t.branchName && t.branchName.toLowerCase().includes(q)) ||
          t.createdByName.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });

    // Sort by date DESC, then createdAt DESC
    list.sort((a, b) => {
      const dateCmp = b.transactionDate.localeCompare(a.transactionDate);
      if (dateCmp !== 0) return dateCmp;
      return b.createdAt.localeCompare(a.createdAt);
    });

    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 20));
    const totalCount = list.length;
    const totalPages = Math.ceil(totalCount / limit);
    const paginated = list.slice((page - 1) * limit, page * limit);

    // Calculate sum of active transactions in this filtered result
    let totalIncome = 0;
    let totalExpenses = 0;
    for (const t of list) {
      if (t.status === 'active') {
        if (t.transactionType === 'income') totalIncome += t.amount;
        else if (t.transactionType === 'expense') totalExpenses += t.amount;
      }
    }

    return {
      transactions: paginated,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages
      },
      summary: {
        totalIncome: Number(totalIncome.toFixed(2)),
        totalExpenses: Number(totalExpenses.toFixed(2)),
        netBalance: Number((totalIncome - totalExpenses).toFixed(2))
      }
    };
  }

  /**
   * Generates a monthly financial statement.
   */
  public static getMonthlyStatement(
    branchId: string | undefined,
    year: number,
    month: number,
    user: AuthUserSession
  ): MonthlyFinancialStatement {
    if (!this.isAuthorized(user)) {
      throw new Error('Forbidden: Unauthorized to view monthly statements.');
    }

    const { effectiveBranchId, isGlobal } = this.resolveBranchScope(user, branchId);
    const openingBalance = this.getOpeningBalance(effectiveBranchId, year, month, isGlobal);

    const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
    const txs = db.financeTransactions.filter(t => {
      if (!isGlobal && effectiveBranchId && t.branchId !== effectiveBranchId) return false;
      if (t.status !== 'active') return false;
      return t.transactionDate.startsWith(monthStr);
    });

    // Income breakdown
    const incomeMap = new Map<string, { amount: number; count: number }>();
    for (const cat of FINANCE_INCOME_CATEGORIES) {
      incomeMap.set(cat, { amount: 0, count: 0 });
    }

    // Expenses breakdown
    const expenseMap = new Map<string, { amount: number; count: number }>();
    for (const cat of FINANCE_EXPENSE_CATEGORIES) {
      expenseMap.set(cat, { amount: 0, count: 0 });
    }

    let totalIncome = 0;
    let totalExpenses = 0;

    for (const t of txs) {
      if (t.transactionType === 'income') {
        totalIncome += t.amount;
        const cur = incomeMap.get(t.category) || { amount: 0, count: 0 };
        cur.amount += t.amount;
        cur.count += 1;
        incomeMap.set(t.category, cur);
      } else if (t.transactionType === 'expense') {
        totalExpenses += t.amount;
        const cur = expenseMap.get(t.category) || { amount: 0, count: 0 };
        cur.amount += t.amount;
        cur.count += 1;
        expenseMap.set(t.category, cur);
      }
    }

    totalIncome = Number(totalIncome.toFixed(2));
    totalExpenses = Number(totalExpenses.toFixed(2));
    const closingBalance = Number((openingBalance + totalIncome - totalExpenses).toFixed(2));
    const netChange = Number((totalIncome - totalExpenses).toFixed(2));

    const incomeCategories: Array<{ category: string; amount: number; count: number; percentage: number }> = [];
    incomeMap.forEach((val, cat) => {
      incomeCategories.push({
        category: cat,
        amount: Number(val.amount.toFixed(2)),
        count: val.count,
        percentage: totalIncome > 0 ? Number(((val.amount / totalIncome) * 100).toFixed(1)) : 0
      });
    });

    const expenseCategories: Array<{ category: string; amount: number; count: number; percentage: number }> = [];
    expenseMap.forEach((val, cat) => {
      expenseCategories.push({
        category: cat,
        amount: Number(val.amount.toFixed(2)),
        count: val.count,
        percentage: totalExpenses > 0 ? Number(((val.amount / totalExpenses) * 100).toFixed(1)) : 0
      });
    });

    let branchName = 'FPM Global (All Branches)';
    if (!isGlobal && effectiveBranchId) {
      const b = db.branches.find(br => br.id === effectiveBranchId);
      branchName = b ? b.name : 'Branch';
    }

    return {
      branchId: effectiveBranchId,
      branchName,
      year,
      month,
      monthName: MONTH_NAMES[month - 1] || 'Month',
      openingBalance,
      incomeCategories,
      totalIncome,
      expenseCategories,
      totalExpenses,
      closingBalance,
      netChange
    };
  }

  /**
   * Generates an annual financial statement with 12-month reconciliation.
   * Month N+1 opening balance == Month N closing balance.
   * Annual closing balance reconciles with December closing balance.
   */
  public static getAnnualStatement(
    branchId: string | undefined,
    year: number,
    user: AuthUserSession
  ): AnnualFinancialStatement {
    if (!this.isAuthorized(user)) {
      throw new Error('Forbidden: Unauthorized to view annual statements.');
    }

    const { effectiveBranchId, isGlobal } = this.resolveBranchScope(user, branchId);

    const months: AnnualFinancialStatement['months'] = [];
    let currentOpening = this.getOpeningBalance(effectiveBranchId, year, 1, isGlobal);
    const annualOpeningBalance = currentOpening;

    let totalAnnualIncome = 0;
    let totalAnnualExpenses = 0;

    for (let m = 1; m <= 12; m++) {
      const monthStr = `${year}-${m.toString().padStart(2, '0')}`;
      const monthTxs = db.financeTransactions.filter(t => {
        if (!isGlobal && effectiveBranchId && t.branchId !== effectiveBranchId) return false;
        if (t.status !== 'active') return false;
        return t.transactionDate.startsWith(monthStr);
      });

      let mIncome = 0;
      let mExpenses = 0;
      for (const t of monthTxs) {
        if (t.transactionType === 'income') mIncome += t.amount;
        else if (t.transactionType === 'expense') mExpenses += t.amount;
      }

      mIncome = Number(mIncome.toFixed(2));
      mExpenses = Number(mExpenses.toFixed(2));
      const mClosing = Number((currentOpening + mIncome - mExpenses).toFixed(2));
      const netChange = Number((mIncome - mExpenses).toFixed(2));

      months.push({
        month: m,
        monthName: MONTH_NAMES[m - 1],
        openingBalance: currentOpening,
        totalIncome: mIncome,
        totalExpenses: mExpenses,
        closingBalance: mClosing,
        netChange
      });

      totalAnnualIncome += mIncome;
      totalAnnualExpenses += mExpenses;

      // Roll forward to next month
      currentOpening = mClosing;
    }

    totalAnnualIncome = Number(totalAnnualIncome.toFixed(2));
    totalAnnualExpenses = Number(totalAnnualExpenses.toFixed(2));
    const annualClosingBalance = months[11].closingBalance;

    let branchName = 'FPM Global (All Branches)';
    if (!isGlobal && effectiveBranchId) {
      const b = db.branches.find(br => br.id === effectiveBranchId);
      branchName = b ? b.name : 'Branch';
    }

    return {
      branchId: effectiveBranchId,
      branchName,
      year,
      annualOpeningBalance,
      months,
      totalAnnualIncome,
      totalAnnualExpenses,
      annualClosingBalance
    };
  }

  /**
   * Category breakdown analysis for income or expense.
   */
  public static getCategoryAnalysis(
    type: 'income' | 'expense',
    branchId: string | undefined,
    year: number,
    month: number | undefined,
    user: AuthUserSession
  ) {
    if (!this.isAuthorized(user)) {
      throw new Error('Forbidden: Unauthorized to view category analysis.');
    }

    const { effectiveBranchId, isGlobal } = this.resolveBranchScope(user, branchId);

    const prefix = month ? `${year}-${month.toString().padStart(2, '0')}` : `${year}`;

    const txs = db.financeTransactions.filter(t => {
      if (!isGlobal && effectiveBranchId && t.branchId !== effectiveBranchId) return false;
      if (t.status !== 'active') return false;
      if (t.transactionType !== type) return false;
      return t.transactionDate.startsWith(prefix);
    });

    const categories = type === 'income' ? FINANCE_INCOME_CATEGORIES : FINANCE_EXPENSE_CATEGORIES;
    const map = new Map<string, { amount: number; count: number }>();
    for (const c of categories) {
      map.set(c, { amount: 0, count: 0 });
    }

    let total = 0;
    for (const t of txs) {
      total += t.amount;
      const cur = map.get(t.category) || { amount: 0, count: 0 };
      cur.amount += t.amount;
      cur.count += 1;
      map.set(t.category, cur);
    }

    total = Number(total.toFixed(2));

    const items: CategoryAnalysisItem[] = [];
    map.forEach((val, cat) => {
      items.push({
        category: cat,
        amount: Number(val.amount.toFixed(2)),
        count: val.count,
        percentage: total > 0 ? Number(((val.amount / total) * 100).toFixed(1)) : 0
      });
    });

    // Sort by amount DESC
    items.sort((a, b) => b.amount - a.amount);

    return {
      type,
      branchId: effectiveBranchId,
      year,
      month,
      totalAmount: total,
      transactionCount: txs.length,
      categories: items
    };
  }

  /**
   * Generates Executive Finance Dashboard Data.
   */
  public static getDashboardSummary(
    branchId: string | undefined,
    year: number,
    month: number,
    user: AuthUserSession
  ): FinanceDashboardSummary {
    if (!this.isAuthorized(user)) {
      throw new Error('Forbidden: Unauthorized to view finance dashboard.');
    }

    const { effectiveBranchId, isGlobal } = this.resolveBranchScope(user, branchId);

    // Current month statement
    const stmt = this.getMonthlyStatement(effectiveBranchId, year, month, user);

    // MTD metrics
    const mtdIncome = stmt.totalIncome;
    const mtdExpenses = stmt.totalExpenses;

    // YTD metrics
    const annualStmt = this.getAnnualStatement(effectiveBranchId, year, user);
    let ytdIncome = 0;
    let ytdExpenses = 0;
    for (let m = 0; m < month; m++) {
      ytdIncome += annualStmt.months[m].totalIncome;
      ytdExpenses += annualStmt.months[m].totalExpenses;
    }
    ytdIncome = Number(ytdIncome.toFixed(2));
    ytdExpenses = Number(ytdExpenses.toFixed(2));
    const ytdClosingBalance = annualStmt.months[month - 1].closingBalance;

    // Recent 10 transactions
    const recentTransactions = db.financeTransactions
      .filter(t => {
        if (!isGlobal && effectiveBranchId && t.branchId !== effectiveBranchId) return false;
        return t.status !== 'voided';
      })
      .slice(0, 10);

    // Monthly Trend for the year
    const monthlyTrend = annualStmt.months.map(m => ({
      month: m.month,
      monthName: m.monthName.substring(0, 3),
      income: m.totalIncome,
      expenses: m.totalExpenses,
      net: m.netChange
    }));

    // Super Admin Multi-Branch Comparison
    let branchComparison: FinanceDashboardSummary['branchComparison'];
    if (this.isSuperAdmin(user) && isGlobal) {
      branchComparison = db.branches.map(b => {
        const bStmt = this.getMonthlyStatement(b.id, year, month, user);
        return {
          branchId: b.id,
          branchName: b.name,
          branchCode: b.branchCode,
          openingBalance: bStmt.openingBalance,
          totalIncome: bStmt.totalIncome,
          totalExpenses: bStmt.totalExpenses,
          closingBalance: bStmt.closingBalance
        };
      });
    }

    return {
      branchId: effectiveBranchId,
      branchName: stmt.branchName,
      period: {
        year,
        month,
        monthName: stmt.monthName
      },
      openingBalance: stmt.openingBalance,
      totalIncome: stmt.totalIncome,
      totalExpenses: stmt.totalExpenses,
      closingBalance: stmt.closingBalance,
      mtdIncome,
      mtdExpenses,
      ytdIncome,
      ytdExpenses,
      ytdClosingBalance,
      recentTransactions,
      monthlyTrend,
      branchComparison
    };
  }

  /**
   * Generates CSV Export Content for statements and ledgers.
   */
  public static exportReportCsv(
    reportType: 'monthly_statement' | 'annual_statement' | 'income_ledger' | 'expense_ledger' | 'branch_comparison',
    branchId: string | undefined,
    year: number,
    month: number,
    user: AuthUserSession
  ): { filename: string; content: string } {
    if (!this.isAuthorized(user)) {
      throw new Error('Forbidden: Unauthorized to export financial reports.');
    }

    const { effectiveBranchId, isGlobal } = this.resolveBranchScope(user, branchId);
    let branchLabel = 'FPM Global (All Branches)';
    if (!isGlobal && effectiveBranchId) {
      const b = db.branches.find(br => br.id === effectiveBranchId);
      branchLabel = b ? b.name : 'Branch';
    }

    const dateGenerated = new Date().toISOString().replace('T', ' ').substring(0, 19);

    if (reportType === 'monthly_statement') {
      const stmt = this.getMonthlyStatement(effectiveBranchId, year, month, user);
      const lines = [
        `"FAITH PREACHERS MINISTRIES INT'L (FPM GLOBAL)"`,
        `"MONTHLY FINANCIAL STATEMENT"`,
        `"Branch: ${branchLabel}"`,
        `"Reporting Period: ${stmt.monthName} ${year}"`,
        `"Date Generated: ${dateGenerated}"`,
        `""`,
        `"SECTION","CATEGORY","TRANSACTIONS COUNT","AMOUNT (NGN)","PERCENTAGE"`,
        `"OPENING BALANCE","","","${stmt.openingBalance.toFixed(2)}","100.0%"`,
        `""`,
        `"INCOME","","","",""`
      ];

      for (const item of stmt.incomeCategories) {
        lines.push(`"","${item.category}","${item.count}","${item.amount.toFixed(2)}","${item.percentage}%"`);
      }
      lines.push(`"","TOTAL INCOME","","${stmt.totalIncome.toFixed(2)}","100.0%"`);
      lines.push(`""`);
      lines.push(`"EXPENSES","","","",""`);
      for (const item of stmt.expenseCategories) {
        lines.push(`"","${item.category}","${item.count}","${item.amount.toFixed(2)}","${item.percentage}%"`);
      }
      lines.push(`"","TOTAL EXPENSES","","${stmt.totalExpenses.toFixed(2)}","100.0%"`);
      lines.push(`""`);
      lines.push(`"SUMMARY","","","",""`);
      lines.push(`"","Opening Balance","","${stmt.openingBalance.toFixed(2)}",""`);
      lines.push(`"","Total Income","","${stmt.totalIncome.toFixed(2)}",""`);
      lines.push(`"","Total Expenses","","${stmt.totalExpenses.toFixed(2)}",""`);
      lines.push(`"","Net Change","","${stmt.netChange.toFixed(2)}",""`);
      lines.push(`"","CLOSING BALANCE","","${stmt.closingBalance.toFixed(2)}",""`);

      AuditService.log(
        user.fullName,
        user.roleName,
        'FINANCE_REPORT_EXPORTED',
        'finance_report',
        undefined,
        user.userId,
        null,
        { reportType, branchId: effectiveBranchId, year, month }
      );

      return {
        filename: `FPM_Finance_Monthly_Statement_${stmt.monthName}_${year}.csv`,
        content: lines.join('\n')
      };
    }

    if (reportType === 'annual_statement') {
      const annual = this.getAnnualStatement(effectiveBranchId, year, user);
      const lines = [
        `"FAITH PREACHERS MINISTRIES INT'L (FPM GLOBAL)"`,
        `"ANNUAL FINANCIAL STATEMENT"`,
        `"Branch: ${branchLabel}"`,
        `"Reporting Year: ${year}"`,
        `"Date Generated: ${dateGenerated}"`,
        `""`,
        `"MONTH","OPENING BALANCE (NGN)","TOTAL INCOME (NGN)","TOTAL EXPENSES (NGN)","CLOSING BALANCE (NGN)","NET CHANGE (NGN)"`
      ];

      for (const m of annual.months) {
        lines.push(`"${m.monthName}","${m.openingBalance.toFixed(2)}","${m.totalIncome.toFixed(2)}","${m.totalExpenses.toFixed(2)}","${m.closingBalance.toFixed(2)}","${m.netChange.toFixed(2)}"`);
      }

      lines.push(`""`);
      lines.push(`"ANNUAL RECONCILIATION SUMMARY","","","","",""`);
      lines.push(`"Annual Opening Balance (Jan)","${annual.annualOpeningBalance.toFixed(2)}","","","",""`);
      lines.push(`"Total Annual Income","${annual.totalAnnualIncome.toFixed(2)}","","","",""`);
      lines.push(`"Total Annual Expenses","${annual.totalAnnualExpenses.toFixed(2)}","","","",""`);
      lines.push(`"Annual Closing Balance (Dec)","${annual.annualClosingBalance.toFixed(2)}","","","",""`);

      AuditService.log(
        user.fullName,
        user.roleName,
        'FINANCE_REPORT_EXPORTED',
        'finance_report',
        undefined,
        user.userId,
        null,
        { reportType, branchId: effectiveBranchId, year }
      );

      return {
        filename: `FPM_Finance_Annual_${year}.csv`,
        content: lines.join('\n')
      };
    }

    // Ledger export (Income or Expenses)
    const txType = reportType === 'income_ledger' ? 'income' : 'expense';
    const txsResult = this.getTransactions({
      branchId: effectiveBranchId,
      transactionType: txType,
      year: String(year),
      month: month ? `${year}-${month.toString().padStart(2, '0')}` : undefined,
      limit: 10000
    }, user);

    const lines = [
      `"FAITH PREACHERS MINISTRIES INT'L (FPM GLOBAL)"`,
      `"${txType.toUpperCase()} LEDGER REPORT"`,
      `"Branch: ${branchLabel}"`,
      `"Period: ${month ? MONTH_NAMES[month - 1] + ' ' : ''}${year}"`,
      `"Date Generated: ${dateGenerated}"`,
      `""`,
      `"DATE","CATEGORY","DESCRIPTION","AMOUNT (NGN)","PAYMENT METHOD","REFERENCE","BRANCH","RECORDED BY","STATUS"`
    ];

    for (const t of txsResult.transactions) {
      lines.push(`"${t.transactionDate}","${t.category}","${t.description.replace(/"/g, '""')}","${t.amount.toFixed(2)}","${t.paymentMethod}","${t.referenceNumber || ''}","${t.branchName || ''}","${t.createdByName}","${t.status}"`);
    }

    lines.push(`""`);
    lines.push(`"TOTAL ${txType.toUpperCase()}","","","${(txType === 'income' ? txsResult.summary.totalIncome : txsResult.summary.totalExpenses).toFixed(2)}","","","","",""`);

    AuditService.log(
      user.fullName,
      user.roleName,
      'FINANCE_REPORT_EXPORTED',
      'finance_report',
      undefined,
      user.userId,
      null,
      { reportType, branchId: effectiveBranchId, year, month }
    );

    return {
      filename: `FPM_${txType.toUpperCase()}_Ledger_${year}_${month || 'Full'}.csv`,
      content: lines.join('\n')
    };
  }
}
