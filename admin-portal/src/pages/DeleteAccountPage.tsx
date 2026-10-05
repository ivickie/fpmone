import React, { useState } from 'react';
import { 
  Trash2, ArrowLeft, AlertTriangle, ShieldCheck, CheckCircle2, 
  Mail, Lock, HelpCircle, Eye, EyeOff, FileText, ChevronRight
} from 'lucide-react';
import { api } from '../services/api';

interface DeleteAccountPageProps {
  onNavigateHome?: () => void;
  onNavigatePrivacy?: () => void;
}

export const DeleteAccountPage: React.FC<DeleteAccountPageProps> = ({
  onNavigateHome,
  onNavigatePrivacy
}) => {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [reason, setReason] = useState('Relocated / Left church');
  const [customReason, setCustomReason] = useState('');
  const [confirmedCheck, setConfirmedCheck] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    message: string;
    deletedImmediately?: boolean;
  } | null>(null);

  const handleHomeClick = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      window.location.href = '/';
    }
  };

  const handlePrivacyClick = () => {
    if (onNavigatePrivacy) {
      onNavigatePrivacy();
    } else {
      window.location.href = '/privacy';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!emailOrPhone.trim()) {
      setError('Please provide your registered email address or phone number.');
      return;
    }

    if (!confirmedCheck) {
      setError('You must check the confirmation box acknowledging permanent deletion.');
      return;
    }

    setLoading(true);
    try {
      const fullReason = reason === 'Other' && customReason.trim()
        ? `Other: ${customReason.trim()}`
        : reason;

      const res = await api.requestAccountDeletion({
        emailOrPhone: emailOrPhone.trim(),
        password: password ? password : undefined,
        reason: fullReason
      });

      setSuccessResult({
        message: res.message || 'Your account deletion request has been submitted.',
        deletedImmediately: res.deletedImmediately
      });
    } catch (err: any) {
      setError(err.message || 'Failed to submit account deletion request. Please try again or contact privacy@fpmglobal.online.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-rose-500/20 selection:text-slate-900">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleHomeClick}
            className="p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer flex items-center space-x-1 text-xs font-semibold"
            aria-label="Back to Portal"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center p-1 text-white shadow-xs">
              <Trash2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-xs font-black tracking-tight text-[#070E1B] uppercase block">
                FPM Global
              </span>
              <span className="text-[10px] text-slate-400 font-medium block -mt-0.5">
                Account & Data Deletion Portal
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handlePrivacyClick}
            className="px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-1"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Privacy Policy</span>
          </button>
          <button
            type="button"
            onClick={handleHomeClick}
            className="px-3 py-1.5 bg-[#070E1B] hover:bg-[#0B1528] text-white rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="bg-gradient-to-b from-[#1C0F13] to-[#2D1219] text-white py-10 sm:py-14 px-4 sm:px-8 border-b border-rose-950/60 relative overflow-hidden">
        <div className="max-w-3xl mx-auto relative z-10 text-center sm:text-left">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-semibold mb-3 border border-rose-500/30 backdrop-blur-xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Google Play Policy & GDPR Data Compliance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            Delete FPM Global Account & Data
          </h1>
          <p className="text-xs sm:text-sm text-rose-100/90 max-w-xl leading-relaxed">
            Faith Preachers Ministries International provides members and workers with the ability to permanently remove their account, profile data, and ministry assignments.
          </p>
        </div>
      </section>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-10 flex-1 w-full space-y-8">
        
        {/* Warning Callout */}
        <div className="p-5 sm:p-6 bg-rose-50/90 border border-rose-200 rounded-2xl shadow-xs">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl mt-0.5 shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-700" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-rose-950">Important Notice Before You Proceed</h3>
              <p className="text-xs text-rose-800 leading-relaxed">
                Deleting your account is <strong>permanent and irrevocable</strong>. Once your deletion request is processed:
              </p>
              <ul className="list-disc pl-4 text-xs text-rose-800 space-y-1">
                <li>Your mobile app access and login credentials will be permanently destroyed.</li>
                <li>Your personal member profile, photo avatars, and contact records will be expunged.</li>
                <li>Your worker ID badge (e.g. <code>FPM-0042</code>) and departmental roles will be revoked.</li>
                <li>Historical attendance clock-in records associated with your account will be detached or purged.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Form or Success State */}
        {successResult ? (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-5 animate-in fade-in duration-200">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-slate-900">
                {successResult.deletedImmediately ? 'Account Successfully Deleted' : 'Deletion Request Received'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                {successResult.message}
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl max-w-md mx-auto text-left text-xs text-slate-600 space-y-1.5">
              <div className="font-bold text-slate-800">What happens next:</div>
              {successResult.deletedImmediately ? (
                <p>All active sessions have been invalidated. You may close this window or return to the portal homepage.</p>
              ) : (
                <p>Our administrative directory will verify this request and permanently purge all associated database records within 24 to 48 business hours.</p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleHomeClick}
                className="px-6 py-2.5 bg-[#070E1B] hover:bg-[#0B1528] text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
              >
                Return to FPM Global Portal
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900">Self-Service Account Deletion Request</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete this form to submit your account for permanent deletion.
              </p>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email or Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Registered Email Address or Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={emailOrPhone}
                  onChange={e => setEmailOrPhone(e.target.value)}
                  placeholder="e.g. member@fpmchurch.org or +234..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  The exact email or phone number tied to your FPM Global church profile.
                </span>
              </div>

              {/* Optional Password for Immediate Verification */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Current Password (Optional)
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">For instant deletion</span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password to verify identity immediately"
                    className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Providing your password enables automated instant deletion. If omitted, your request will be reviewed by church admin.
                </span>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Reason for Leaving (Optional)
                </label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition cursor-pointer"
                >
                  <option value="Relocated / Left church">Relocated / Left church</option>
                  <option value="Privacy concerns">Privacy concerns</option>
                  <option value="Account created by mistake">Account created by mistake</option>
                  <option value="No longer active in ministry worker team">No longer active in ministry worker team</option>
                  <option value="Switching to a different account">Switching to a different account</option>
                  <option value="Other">Other reason</option>
                </select>

                {reason === 'Other' && (
                  <textarea
                    rows={2}
                    value={customReason}
                    onChange={e => setCustomReason(e.target.value)}
                    placeholder="Please specify your reason (optional feedback)"
                    className="w-full mt-2 p-3 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition"
                  />
                )}
              </div>

              {/* Confirmation Checkbox */}
              <div className="pt-2">
                <label className="flex items-start space-x-3 p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmedCheck}
                    onChange={e => setConfirmedCheck(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4 mt-0.5 cursor-pointer shrink-0"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed font-medium">
                    I explicitly confirm that I want to permanently delete my FPM Global account, profile details, worker ID badge, and attendance history. I understand that this action cannot be undone.
                  </span>
                </label>
              </div>

              {/* Action Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleHomeClick}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer text-center"
                >
                  Cancel & Keep Account
                </button>
                <button
                  type="submit"
                  disabled={loading || !confirmedCheck}
                  className="w-full sm:w-auto px-6 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Permanently Delete My Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Alternative Offline / Direct Contact Method */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 text-slate-900">
            <Mail className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs sm:text-sm font-bold">Alternative Contact & Manual Deletion</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            If you encounter any difficulty submitting this form or no longer have access to your registered device, you may submit a manual account deletion request by emailing:
          </p>
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1">
            <div className="font-semibold text-slate-900">
              Email: <a href="mailto:privacy@fpmglobal.online?subject=Account%20Deletion%20Request" className="text-blue-600 hover:underline">privacy@fpmglobal.online</a>
            </div>
            <div className="text-slate-500 text-[11px]">
              Include your Full Name, Registered Phone Number, and Branch Name with the subject line <em>"Account Deletion Request"</em>. Requests are handled within 48 hours.
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 text-center text-xs text-slate-500">
        <p className="font-medium">
          Faith Preachers Ministries Int'l &copy; {new Date().getFullYear()}. All Rights Reserved.
        </p>
        <div className="flex items-center justify-center space-x-4 mt-2 text-[11px] text-slate-400">
          <button type="button" onClick={handleHomeClick} className="hover:underline cursor-pointer">Portal Home</button>
          <span>•</span>
          <button type="button" onClick={handlePrivacyClick} className="hover:underline cursor-pointer">Privacy Policy</button>
        </div>
      </footer>
    </div>
  );
};
