import React, { useState } from 'react';
import { 
  ShieldCheck, LogIn, AlertCircle, Eye, EyeOff, Sparkles,
  KeyRound, UserCheck, CheckCircle2, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showResetHelp, setShowResetHelp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Change Password Modal State
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [changePassEmail, setChangePassEmail] = useState('');
  const [changePassCurrentPassword, setChangePassCurrentPassword] = useState('');
  const [changePassNewPassword, setChangePassNewPassword] = useState('');
  const [changePassConfirmPassword, setChangePassConfirmPassword] = useState('');
  const [showChangePassOld, setShowChangePassOld] = useState(false);
  const [showChangePassNew, setShowChangePassNew] = useState(false);
  const [showChangePassConfirm, setShowChangePassConfirm] = useState(false);
  const [changePassLoading, setChangePassLoading] = useState(false);
  const [changePassError, setChangePassError] = useState<string | null>(null);
  const [changePassSuccess, setChangePassSuccess] = useState<string | null>(null);

  // View Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [showProfilePassword, setShowProfilePassword] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePassError(null);
    setChangePassSuccess(null);

    if (!changePassEmail.trim()) {
      setChangePassError('Please enter your registered email address or phone number.');
      return;
    }
    if (!changePassCurrentPassword) {
      setChangePassError('Please enter your current password.');
      return;
    }
    if (changePassNewPassword.length < 6) {
      setChangePassError('New password must be at least 6 characters long.');
      return;
    }
    if (changePassNewPassword === changePassCurrentPassword) {
      setChangePassError('New password must be different from your current password.');
      return;
    }
    if (changePassNewPassword !== changePassConfirmPassword) {
      setChangePassError('The new passwords do not match. Please verify.');
      return;
    }

    setChangePassLoading(true);
    try {
      const res = await api.changePassword({
        emailOrPhone: changePassEmail.trim(),
        currentPassword: changePassCurrentPassword,
        newPassword: changePassNewPassword
      });
      setChangePassSuccess(res.message || 'Password updated successfully!');
      setEmail(changePassEmail.trim());
      setPassword('');
    } catch (err: any) {
      setChangePassError(err.message || 'Failed to update password. Please check your credentials.');
    } finally {
      setChangePassLoading(false);
    }
  };

  const handleViewProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);

    if (!profileEmail.trim()) {
      setProfileError('Please enter your registered email address or phone number.');
      return;
    }
    if (!profilePassword) {
      setProfileError('Please enter your password to verify your identity.');
      return;
    }

    setProfileLoading(true);
    try {
      const res = await api.lookupMemberProfile({
        emailOrPhone: profileEmail.trim(),
        password: profilePassword
      });
      setProfileData(res);
    } catch (err: any) {
      setProfileError(err.message || 'Verification failed. Please check your credentials.');
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#FAF8F5] text-slate-800 antialiased selection:bg-[#C59B27]/20 selection:text-[#070E1B]">
      {/* ======================================================== */}
      {/* LEFT PANEL: Photographic Visual & Brand Experience       */}
      {/* Hidden on mobile, proportional on tablet, 50% on desktop */}
      {/* ======================================================== */}
      <div className="hidden md:flex md:w-5/12 lg:w-1/2 relative min-h-screen bg-[#070E1B] flex-col justify-between overflow-hidden">
        {/* Supplied Church Worship Photograph */}
        <img
          src="/auth-hero.jpg"
          alt="Faith Preachers Ministries Int'l Worship Service"
          className="absolute inset-0 w-full h-full object-cover object-[center_30%] select-none pointer-events-none transition-transform duration-1000 ease-out hover:scale-105"
        />

        {/* Cinematic Brand Overlays for Contrast & Readability */}
        {/* Subtle Top Vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#070E1B]/75 via-transparent to-transparent pointer-events-none" />
        
        {/* Rich Bottom Gradient: protects the editorial typography */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070E1B] via-[#070E1B]/85 via-45% to-transparent pointer-events-none" />
        
        {/* Deep Midnight Navy tint for color harmonization */}
        <div className="absolute inset-0 bg-[#070E1B]/25 mix-blend-multiply pointer-events-none" />

        {/* Top Branding Pill / Identity */}
        <div className="relative z-10 p-6 sm:p-8 lg:p-12 flex items-center justify-between">
          <div className="inline-flex items-center space-x-3 bg-[#0B1528]/85 backdrop-blur-md border border-white/10 px-3.5 py-1.5 rounded-full shadow-lg">
            <img
              src="/church-logo.png"
              alt="Faith Preachers Ministries Int'l"
              className="w-7 h-7 rounded-full object-cover ring-1 ring-[#C59B27]/50"
            />
            <div className="flex items-center space-x-2">
              <span className="text-white text-xs font-bold tracking-wider uppercase">FPM GLOBAL</span>
              <span className="text-[#C59B27] text-xs font-bold">•</span>
              <span className="text-slate-300 text-[11px] font-medium hidden sm:inline">Admin Portal</span>
            </div>
          </div>
        </div>

        {/* Lower Left Brand Story & Headlines */}
        <div className="relative z-10 p-6 sm:p-8 lg:p-12 pb-8 sm:pb-12 max-w-xl">
          {/* Gold Kicker & Sparkle */}
          <div className="inline-flex items-center space-x-2 mb-3.5">
            <Sparkles className="w-4 h-4 text-[#C59B27]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#F6E7B9]">
              FPM GLOBAL
            </span>
          </div>

          {/* Large Editorial Headline */}
          <h1 className="text-3xl sm:text-4xl xl:text-[44px] font-extrabold text-white tracking-tight leading-[1.12] mb-3.5">
            Connecting People.<br />
            Growing the Church.
          </h1>

          {/* Supporting Statement */}
          <p className="text-slate-200/90 text-sm sm:text-[15px] leading-relaxed font-normal mb-7 max-w-lg">
            One digital space for members, workers, pastors and ministries to stay connected and engaged with the life of FPM.
          </p>

          {/* Community Indicator */}
          <div className="flex items-center space-x-3 pt-4 border-t border-white/15">
            <div className="flex -space-x-2 overflow-hidden">
              <img
                className="inline-block h-8 w-8 rounded-full ring-2 ring-[#070E1B] object-cover"
                src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150"
                alt="Member"
              />
              <img
                className="inline-block h-8 w-8 rounded-full ring-2 ring-[#070E1B] object-cover"
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150"
                alt="Worker"
              />
              <img
                className="inline-block h-8 w-8 rounded-full ring-2 ring-[#070E1B] object-cover"
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
                alt="Pastor"
              />
            </div>
            <span className="text-xs font-medium text-slate-200/90 tracking-wide">
              Growing together across our global branches
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT PANEL: Authentication Form on Warm Ivory Canvas    */}
      {/* Full width on mobile, 7/12 on tablet, 50% on desktop     */}
      {/* ======================================================== */}
      <div className="w-full md:w-7/12 lg:w-1/2 min-h-screen bg-[#FAF8F5] flex flex-col justify-between items-center p-6 sm:p-10 lg:p-12 overflow-y-auto">
        <div className="w-full flex justify-end">
          {/* Subtle Security Badge */}
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100/90 border border-slate-200/70 text-[11px] font-medium text-slate-600 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C59B27]" />
            <span>Secure Admin Access</span>
          </div>
        </div>

        {/* Authentication Form Card */}
        <div className="w-full max-w-[420px] my-auto py-6">
          <div className="bg-white rounded-2xl p-7 sm:p-9 shadow-sm border border-slate-200/70 transition-all duration-200">
            {/* Church Emblem Container */}
            <div className="w-14 h-14 rounded-2xl bg-[#FAF8F5] border border-amber-200/60 shadow-inner flex items-center justify-center mx-auto mb-4 p-1 ring-2 ring-amber-400/20">
              <img
                src="/church-logo.png"
                alt="Faith Preachers Ministries Int'l"
                className="w-11 h-11 rounded-xl object-cover"
              />
            </div>

            {/* Header Titles */}
            <div className="text-center mb-6">
              <div className="text-[11px] font-bold tracking-widest text-[#C59B27] uppercase mb-1">
                Faith Preachers Ministries Int'l
              </div>
              <h2 className="text-2xl sm:text-[28px] font-extrabold text-[#070E1B] tracking-tight">
                Welcome <span className="text-[#C59B27]">Back!</span>
              </h2>
              <p className="text-sm text-slate-500 font-normal mt-1.5">
                Sign in to your FPM Global administrator account
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-xl flex items-start space-x-2.5 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span className="font-medium leading-relaxed">{error}</span>
                </div>
              )}

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="text"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@fpmchurch.org"
                  className="w-full px-3.5 py-3 bg-[#F1F4F9] hover:bg-[#EAEFF6] focus:bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#C59B27] focus:ring-2 focus:ring-[#C59B27]/20 transition-all duration-150"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-3 pr-11 bg-[#F1F4F9] hover:bg-[#EAEFF6] focus:bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#C59B27] focus:ring-2 focus:ring-[#C59B27]/20 transition-all duration-150"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot Password Link */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className="text-slate-400">Forgot Password?</span>
                <button
                  type="button"
                  onClick={() => setShowResetHelp(!showResetHelp)}
                  className="text-[#0B1528] hover:text-[#C59B27] font-semibold transition cursor-pointer"
                >
                  Reset Password Here
                </button>
              </div>

              {/* Reset Password Advisory */}
              {showResetHelp && (
                <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-[12px] text-amber-900 flex items-start justify-between">
                  <span className="leading-snug">
                    For administrative and pastoral security, password resets must be initiated by the Global IT Directorate or Super Administrator.
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowResetHelp(false)}
                    className="text-amber-700 hover:text-amber-900 ml-2 font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 mt-2 bg-[#070E1B] hover:bg-[#0B1528] active:bg-[#03070E] text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-150 flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-[#C59B27] focus:ring-offset-2 disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-[#FAF8F5] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4 text-[#F6E7B9]" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Member & Account Self-Service Buttons */}
            <div className="pt-5 mt-5 border-t border-slate-100">
              <div className="text-center mb-2.5">
                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  Member & Account Services
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {/* Change Password Card Button */}
                <button
                  type="button"
                  onClick={() => {
                    setChangePassEmail(email || '');
                    setChangePassCurrentPassword('');
                    setChangePassNewPassword('');
                    setChangePassConfirmPassword('');
                    setChangePassError(null);
                    setChangePassSuccess(null);
                    setShowChangePassModal(true);
                  }}
                  className="p-3 bg-slate-50/80 hover:bg-slate-100/90 active:bg-slate-200/80 border border-slate-200/90 rounded-2xl text-left transition-all duration-150 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C59B27]/30"
                >
                  <div className="text-xs font-bold text-slate-800 group-hover:text-[#0B1528] flex items-center space-x-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#C59B27] shrink-0" />
                    <span className="truncate">Change Password</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                    Update security key
                  </div>
                </button>

                {/* View Profile Card Button */}
                <button
                  type="button"
                  onClick={() => {
                    setProfileEmail(email || '');
                    setProfilePassword('');
                    setProfileError(null);
                    setProfileData(null);
                    setShowProfileModal(true);
                  }}
                  className="p-3 bg-[#FCFBF8] hover:bg-[#F9F5EC] active:bg-[#F4ECE0] border border-[#E8DFC9] rounded-2xl text-left transition-all duration-150 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C59B27]/30"
                >
                  <div className="text-xs font-bold text-slate-800 group-hover:text-[#9A7416] flex items-center space-x-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-[#C59B27] shrink-0" />
                    <span className="truncate">View Profile</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                    Member & role info
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Identity */}
        <div className="w-full text-center py-2">
          <p className="text-[11px] text-slate-400 font-medium">
            Faith Preachers Ministries Int'l &copy; {new Date().getFullYear()}. All Rights Reserved.
          </p>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: CHANGE PASSWORD MODAL                            */}
      {/* ======================================================== */}
      {showChangePassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200/80 relative max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowChangePassModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center space-x-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#C59B27] shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">Change Password</h3>
                <p className="text-xs text-slate-500 mt-0.5">Update your FPM Global account security key</p>
              </div>
            </div>

            {changePassSuccess ? (
              <div className="space-y-4 py-2">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3 text-emerald-800 text-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm text-emerald-900 mb-1">Password Changed Successfully!</p>
                    <p className="leading-relaxed">{changePassSuccess}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePassModal(false);
                    setEmail(changePassEmail);
                  }}
                  className="w-full h-11 bg-[#070E1B] hover:bg-[#0B1528] text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Continue to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5">
                {changePassError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-700 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span className="leading-relaxed font-medium">{changePassError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Registered Email or Phone
                  </label>
                  <input
                    type="text"
                    required
                    value={changePassEmail}
                    onChange={e => setChangePassEmail(e.target.value)}
                    placeholder="e.g. admin@fpmchurch.org or phone"
                    className="w-full px-3 py-2.5 bg-[#F1F4F9] focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#C59B27] focus:ring-1 focus:ring-[#C59B27]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showChangePassOld ? 'text' : 'password'}
                      required
                      value={changePassCurrentPassword}
                      onChange={e => setChangePassCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full px-3 py-2.5 pr-10 bg-[#F1F4F9] focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#C59B27] focus:ring-1 focus:ring-[#C59B27]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowChangePassOld(!showChangePassOld)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showChangePassOld ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showChangePassNew ? 'text' : 'password'}
                      required
                      value={changePassNewPassword}
                      onChange={e => setChangePassNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full px-3 py-2.5 pr-10 bg-[#F1F4F9] focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#C59B27] focus:ring-1 focus:ring-[#C59B27]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowChangePassNew(!showChangePassNew)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showChangePassNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showChangePassConfirm ? 'text' : 'password'}
                      required
                      value={changePassConfirmPassword}
                      onChange={e => setChangePassConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full px-3 py-2.5 pr-10 bg-[#F1F4F9] focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#C59B27] focus:ring-1 focus:ring-[#C59B27]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowChangePassConfirm(!showChangePassConfirm)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showChangePassConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-[#C59B27] shrink-0" />
                  <span>Passwords are hashed with bcrypt encryption before storage.</span>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowChangePassModal(false)}
                    className="w-1/2 h-10 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={changePassLoading}
                    className="w-1/2 h-10 bg-[#070E1B] hover:bg-[#0B1528] text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center justify-center space-x-1.5 disabled:opacity-60 cursor-pointer"
                  >
                    {changePassLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <KeyRound className="w-3.5 h-3.5 text-[#F6E7B9]" />
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: VIEW PROFILE MODAL                               */}
      {/* ======================================================== */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200/80 relative max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              type="button"
              onClick={() => {
                setShowProfileModal(false);
                setProfileData(null);
              }}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            {!profileData ? (
              <div>
                {/* Header */}
                <div className="flex items-center space-x-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#C59B27] shrink-0">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">View Member Profile</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Authenticate to inspect your account & ministry details</p>
                  </div>
                </div>

                <form onSubmit={handleViewProfileSubmit} className="space-y-3.5">
                  {profileError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-700 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                      <span className="leading-relaxed font-medium">{profileError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Registered Email or Phone
                    </label>
                    <input
                      type="text"
                      required
                      value={profileEmail}
                      onChange={e => setProfileEmail(e.target.value)}
                      placeholder="e.g. pastor.lagos@faithpreachers.org"
                      className="w-full px-3 py-2.5 bg-[#F1F4F9] focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#C59B27] focus:ring-1 focus:ring-[#C59B27]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showProfilePassword ? 'text' : 'password'}
                        required
                        value={profilePassword}
                        onChange={e => setProfilePassword(e.target.value)}
                        placeholder="Enter your account password"
                        className="w-full px-3 py-2.5 pr-10 bg-[#F1F4F9] focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#C59B27] focus:ring-1 focus:ring-[#C59B27]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowProfilePassword(!showProfilePassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showProfilePassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowProfileModal(false)}
                      className="w-1/2 h-10 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={profileLoading}
                      className="w-1/2 h-10 bg-[#070E1B] hover:bg-[#0B1528] text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center justify-center space-x-1.5 disabled:opacity-60 cursor-pointer"
                    >
                      {profileLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <UserCheck className="w-3.5 h-3.5 text-[#F6E7B9]" />
                          <span>Inspect Profile</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Member Card Header */}
                <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#070E1B] text-amber-300 font-extrabold text-base flex items-center justify-center shadow-md">
                      {profileData.member?.firstName?.charAt(0) || 'M'}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-tight">
                        {profileData.member?.fullName}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-[#C59B27] border border-amber-200/80">
                          {profileData.member?.roleName}
                        </span>
                        <span className="inline-flex items-center space-x-1 text-[11px] text-slate-500 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          <span className="capitalize">{profileData.user?.accountStatus}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ministry & Account Information Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Email Address
                    </span>
                    <span className="font-semibold text-slate-800 break-all">{profileData.user?.email}</span>
                  </div>

                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Phone Number
                    </span>
                    <span className="font-semibold text-slate-800">{profileData.user?.phone || 'N/A'}</span>
                  </div>

                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Church Branch
                    </span>
                    <span className="font-semibold text-slate-800">{profileData.member?.branchName}</span>
                  </div>

                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Access Level
                    </span>
                    <span className="font-semibold text-slate-800 capitalize">
                      {profileData.user?.adminLevel?.replace('_', ' ') || 'Member'}
                    </span>
                  </div>

                  {profileData.member?.isWorker && profileData.member?.workerDetails && (
                    <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-100 sm:col-span-2">
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
                        Worker Directorate
                      </span>
                      <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">
                            {profileData.member.workerDetails.departmentName}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {profileData.member.workerDetails.positionName}
                          </span>
                        </div>
                        <span className="px-2 py-1 bg-white border border-amber-200/80 rounded-lg text-[11px] font-mono font-bold text-amber-900">
                          {profileData.member.workerDetails.workerCode}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Actions Footer */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileModal(false);
                      setChangePassEmail(profileData.user?.email || '');
                      setChangePassCurrentPassword('');
                      setChangePassNewPassword('');
                      setChangePassConfirmPassword('');
                      setChangePassError(null);
                      setChangePassSuccess(null);
                      setShowChangePassModal(true);
                    }}
                    className="w-full sm:w-1/2 h-10 border border-amber-200 bg-amber-50/50 hover:bg-amber-100/60 text-amber-900 text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-[#C59B27]" />
                    <span>Change Password</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEmail(profileData.user?.email || '');
                      setPassword('');
                      setShowProfileModal(false);
                      setProfileData(null);
                    }}
                    className="w-full sm:w-1/2 h-10 bg-[#070E1B] hover:bg-[#0B1528] text-white text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5 text-[#F6E7B9]" />
                    <span>Sign In With Account</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
