import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
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
import { api } from './services/api';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [branches, setBranches] = useState<any[]>([]);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [pendingTestimoniesCount, setPendingTestimoniesCount] = useState(0);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Connecting to FPM ONE Portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
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
    notifications: { title: 'Push Notification Dispatcher', subtitle: 'Broadcast targeted mobile push messages and urgent alerts' },
    audit: { title: 'Administrative Audit Trail', subtitle: 'Immutable security log of all sensitive actions and approvals' },
    settings: { title: 'System Policies & Configuration', subtitle: 'Configure attendance rules, auto clock-out limits, and grace periods' }
  };

  const currentInfo = tabTitles[currentTab];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        pendingApprovalsCount={pendingApprovalsCount}
        pendingTestimoniesCount={pendingTestimoniesCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          branches={branches}
          title={currentInfo.title}
          subtitle={currentInfo.subtitle}
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
          {currentTab === 'notifications' && <NotificationsPage />}
          {currentTab === 'audit' && <AuditLogsPage />}
          {currentTab === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
