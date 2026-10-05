import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { ProfileModal } from './components/ProfileModal';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { MembersPage } from './pages/MembersPage';
import { BranchesPage } from './pages/BranchesPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { RolesPage } from './pages/RolesPage';
import { ServicesPage } from './pages/ServicesPage';
import { EventsPage } from './pages/EventsPage';
import { FeedPage } from './pages/FeedPage';
import { HighlightsPage } from './pages/HighlightsPage';
import { TestimoniesPage } from './pages/TestimoniesPage';
import { AttendancePage } from './pages/AttendancePage';
import { ReportsPage } from './pages/ReportsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { FinancePage } from './pages/FinancePage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { DeleteAccountPage } from './pages/DeleteAccountPage';
import { api } from './services/api';

const getInitialRoute = (): 'app' | 'privacy' | 'delete-account' => {
  if (typeof window === 'undefined') return 'app';
  const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
  if (path === '/privacy') return 'privacy';
  if (path === '/delete-account') return 'delete-account';
  return 'app';
};

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [route, setRoute] = useState<'app' | 'privacy' | 'delete-account'>(getInitialRoute);
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [branches, setBranches] = useState<any[]>([]);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [pendingTestimoniesCount, setPendingTestimoniesCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState<'profile' | 'password'>('profile');

  const navigateTo = (target: 'app' | 'privacy' | 'delete-account') => {
    setRoute(target);
    const targetPath = target === 'privacy' ? '/privacy' : target === 'delete-account' ? '/delete-account' : '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
      if (path === '/privacy') setRoute('privacy');
      else if (path === '/delete-account') setRoute('delete-account');
      else setRoute('app');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleOpenProfile = (initialTab: 'profile' | 'password' = 'profile') => {
    setProfileInitialTab(initialTab);
    setProfileModalOpen(true);
  };

  useEffect(() => {
    if (user) {
      const loadMetadata = async () => {
        try {
          const [brs, apprs, tests] = await Promise.all([
            api.getBranches(),
            api.getApprovals(),
            api.getTestimoniesQueue()
          ]);
          setBranches(brs || []);
          setPendingApprovalsCount(apprs?.length || 0);
          setPendingTestimoniesCount(tests?.filter((t: any) => t.status === 'pending_review')?.length || 0);
        } catch (err) {
          console.error('Failed to load header metadata:', err);
        }
      };
      loadMetadata();
    }
  }, [user, currentTab]);

  if (route === 'privacy') {
    return (
      <PrivacyPolicyPage
        onNavigateHome={() => navigateTo('app')}
        onNavigateDeleteAccount={() => navigateTo('delete-account')}
      />
    );
  }

  if (route === 'delete-account') {
    return (
      <DeleteAccountPage
        onNavigateHome={() => navigateTo('app')}
        onNavigatePrivacy={() => navigateTo('privacy')}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Connecting to FPM Global Portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginPage
        onNavigatePrivacy={() => navigateTo('privacy')}
        onNavigateDeleteAccount={() => navigateTo('delete-account')}
      />
    );
  }

  const tabTitles: Record<NavTab, { title: string; subtitle: string }> = {
    dashboard: { title: 'Executive Ministry Dashboard', subtitle: 'Global church KPIs, member growth, and live attendance metrics' },
    approvals: { title: 'Member Approvals Queue', subtitle: 'Review new registrations, verify worker applications, and activate accounts' },
    members: { title: 'Member Directory & Management', subtitle: 'Search member records, assign departments, and configure worker IDs' },
    branches: { title: 'Multi-Branch & Chapter Management', subtitle: 'Oversee worship centers, assign branch pastors, and view branch statistics' },
    departments: { title: 'Departments & Ministry Teams', subtitle: 'Manage choir, media, ushering, security, and departmental appointments' },
    roles: { title: 'Ministry Roles & Access Hierarchy', subtitle: 'Role-based access control and ministry privilege matrix' },
    services: { title: 'Recurring Service Schedules', subtitle: 'Define service days, start times, grace periods, and expected durations' },
    events: { title: 'Church Events & Conferences', subtitle: 'Create global conventions, worker retreats, and manage RSVP capacities' },
    feed: { title: 'Church Feed & Announcements', subtitle: 'Publish pastoral messages and targeted church notices' },
    highlights: { title: 'Post-Service Sermon Highlights', subtitle: 'Recap sermon scriptures, key takeaways, and pastoral quotes' },
    testimonies: { title: 'Testimonies Moderation Queue', subtitle: 'Review member miracle testimonies prior to public dissemination' },
    attendance: { title: 'Live Worker Attendance Console', subtitle: 'Monitor today\'s clock-ins, grace periods, late tagging, and timeouts' },
    reports: { title: 'Monthly Attendance Matrix & Analytics', subtitle: 'Worker punctuality rates, matrix grid (✓, L, A, E), and exports' },
    finance: { title: 'Finance, Treasury & General Ledger', subtitle: 'Authoritative financial ledger, income & expenses, monthly/annual statements, and audit analytics' },
    notifications: { title: 'Push Notification Dispatcher', subtitle: 'Broadcast targeted mobile push messages and urgent alerts' },
    audit: { title: 'Administrative Audit Trail', subtitle: 'Immutable security log of all sensitive actions and approvals' },
    settings: { title: 'General Settings', subtitle: 'Global ministry configuration, operational policies, branding, regional rules & system health' }
  };

  const currentInfo = tabTitles[currentTab];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setMobileMenuOpen(false);
        }}
        pendingApprovalsCount={pendingApprovalsCount}
        pendingTestimoniesCount={pendingTestimoniesCount}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        onOpenProfile={() => handleOpenProfile('profile')}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          branches={branches}
          title={currentInfo.title}
          subtitle={currentInfo.subtitle}
          onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)}
        />

        <main className="flex-1 overflow-y-auto pb-12">
          {currentTab === 'dashboard' && <DashboardPage onNavigate={setCurrentTab} />}
          {currentTab === 'approvals' && <ApprovalsPage />}
          {currentTab === 'members' && <MembersPage />}
          {currentTab === 'branches' && <BranchesPage />}
          {currentTab === 'departments' && <DepartmentsPage />}
          {currentTab === 'roles' && <RolesPage />}
          {currentTab === 'services' && <ServicesPage />}
          {currentTab === 'events' && <EventsPage />}
          {currentTab === 'feed' && <FeedPage />}
          {currentTab === 'highlights' && <HighlightsPage />}
          {currentTab === 'testimonies' && <TestimoniesPage />}
          {currentTab === 'attendance' && <AttendancePage />}
          {currentTab === 'reports' && <ReportsPage />}
          {currentTab === 'finance' && <FinancePage branches={branches} />}
          {currentTab === 'notifications' && <NotificationsPage />}
          {currentTab === 'audit' && <AuditLogsPage />}
          {currentTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Global Profile & Security Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        initialTab={profileInitialTab}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
