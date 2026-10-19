import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, KeyRound } from 'lucide-react';
import { api } from '../services/api';

interface ResetPasswordPageProps {
  onNavigateHome: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onNavigateHome }) => {
  const [token, setToken] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [verifyingToken, setVerifyingToken] = useState<boolean>(true);
  const [tokenValid, setTokenValid] = useState<boolean>(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token') || '';
    const emailParam = params.get('email') || '';

    setToken(tokenParam);
    setEmail(emailParam);

    if (!tokenParam) {
      setVerifyingToken(false);
      setTokenValid(false);
      setTokenError('Missing password reset token. Please check your reset link or request a new one.');
      return;
    }

    const verify = async () => {
      try {
        const res = await api.verifyResetToken(tokenParam);
        if (res.valid) {
          setTokenValid(true);
          if (res.email) setEmail(res.email);
        } else {
          setTokenValid(false);
          setTokenError(res.error || 'This password reset link is invalid or has expired.');
        }
      } catch (err: any) {
        setTokenValid(false);
        setTokenError(err.message || 'Failed to verify password reset token.');
      } finally {
        setVerifyingToken(false);
      }
    };

    verify();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newPassword || newPassword.length < 6) {
      setFormError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.resetPassword(token, newPassword);
      if (res.success) {
        setResetSuccess(true);
      } else {
        setFormError(res.error || 'Failed to reset password. Please try again.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-600 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-amber-500 blur-3xl" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Church Emblem & Title */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-amber-500/30 shadow-xl shadow-black/40 mb-4">
            <KeyRound className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Reset Account Password
          </h2>
          <p className="mt-1 text-xs font-semibold text-amber-400/90 tracking-widest uppercase">
            Faith Preachers Ministries Int'l
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-slate-800/80 backdrop-blur-md py-8 px-4 shadow-2xl shadow-black/60 sm:rounded-2xl sm:px-10 border border-slate-700/60">
            {/* 1. Loading State */}
            {verifyingToken && (
              <div className="text-center py-8 space-y-3">
                <div className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-medium text-slate-300">Validating password reset link...</p>
              </div>
            )}

            {/* 2. Token Error State */}
            {!verifyingToken && !tokenValid && !resetSuccess && (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-red-200">Reset Link Expired or Invalid</h4>
                    <p className="text-xs text-red-300/80 mt-1 leading-relaxed">
                      {tokenError || 'This password reset link is invalid, has already been used, or has expired after 60 minutes.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition-all shadow-md"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Sign In</span>
                </button>
              </div>
            )}

            {/* 3. Reset Password Success State */}
            {!verifyingToken && resetSuccess && (
              <div className="text-center py-4 space-y-5">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Password Reset Complete</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Your password has been securely updated. You can now log into the FPM Global Admin Portal and Android mobile app with your new credentials.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20"
                >
                  Proceed to Sign In
                </button>
              </div>
            )}

            {/* 4. Active Password Reset Form */}
            {!verifyingToken && tokenValid && !resetSuccess && (
              <form onSubmit={handleSubmit} className="space-y-5">
                {email && (
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700 text-xs text-slate-300">
                    Resetting password for: <span className="font-bold text-white">{email}</span>
                  </div>
                )}

                {formError && (
                  <div className="p-3 rounded-lg bg-red-950/50 border border-red-500/30 text-xs text-red-300 font-medium flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      className="block w-full pl-10 pr-10 py-2.5 bg-slate-900/70 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      required
                      className="block w-full pl-10 pr-10 py-2.5 bg-slate-900/70 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit CTA */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={onNavigateHome}
                    className="text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
