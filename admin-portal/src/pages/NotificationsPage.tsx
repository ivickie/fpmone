import React, { useState, useEffect } from 'react';
import { Bell, Send, Users, Shield, Building2, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const NotificationsPage: React.FC = () => {
  const { selectedBranchId } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetScope, setTargetScope] = useState('entire_church');
  const [notificationType, setNotificationType] = useState('announcement');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications();
      setNotifications(data || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.broadcastNotification({
        title,
        body,
        notificationType,
        targetScope,
        targetId: targetScope === 'branch' ? selectedBranchId : undefined
      });
      setModalOpen(false);
      setTitle('');
      setBody('');
      setSuccessMessage('Push notification broadcasted successfully to all target devices!');
      await fetchNotifications();
    } catch (err: any) {
      alert(err.message || 'Broadcast failed');
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-2xs">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="font-bold text-emerald-900 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Push Notifications Dispatcher</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Broadcast targeted mobile alerts to church members, departments, or specific workers.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow flex items-center space-x-2 transition cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span>Broadcast Notification</span>
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400">Loading notifications...</div>
      ) : (
        <div className="space-y-4">
          {notifications.map(n => (
            <div key={n.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 flex items-start space-x-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-slate-900 truncate">{n.title}</h4>
                  <span className="text-[10px] text-slate-400">
                    {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.body}</p>
                <div className="flex items-center space-x-2 mt-2 text-[10px]">
                  <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded uppercase">
                    Target: {n.targetScope.replace('_', ' ')}
                  </span>
                  <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded uppercase">
                    Type: {n.notificationType}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Broadcast Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Broadcast Push Notification</h3>
            <form onSubmit={handleBroadcast} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Alert Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Upcoming Sunday Celebration Service"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Target Audience</label>
                <select
                  value={targetScope}
                  onChange={e => setTargetScope(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="entire_church">Entire Church (All Registered Devices)</option>
                  <option value="branch">Active Branch Members</option>
                  <option value="ministry_role">Workers & Ministers Only</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Notification Type</label>
                <select
                  value={notificationType}
                  onChange={e => setNotificationType(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="announcement">General Announcement</option>
                  <option value="upcoming_service">Service Reminder</option>
                  <option value="upcoming_event">Event Alert</option>
                  <option value="admin_alert">Administrative Urgent Notice</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Notification Body</label>
                <textarea
                  required
                  rows={3}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Type the message to be displayed on user lockscreens and in-app..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  Send Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
