import React, { useState } from 'react';
import { ShieldCheck, LogIn, AlertCircle, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@fpmchurch.org');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [showResetHelp, setShowResetHelp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const setDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    setError(null);
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
              <span className="text-white text-xs font-bold tracking-wider uppercase">FPM ONE</span>
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

            {/* Quick Demo Switcher */}
            <div className="mt-7 pt-5 border-t border-slate-100">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2.5">
                Quick Switch Demo Roles
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setDemoAccount('admin@fpmchurch.org')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    email === 'admin@fpmchurch.org'
                      ? 'bg-amber-50/70 border-[#C59B27]/50 ring-1 ring-[#C59B27]/40'
                      : 'bg-[#F8FAFC] hover:bg-slate-100/90 border-slate-200'
                  }`}
                >
                  <div className="text-[#070E1B] font-bold">Super Admin</div>
                  <div className="text-[10px] text-slate-500">Global Oversight</div>
                </button>
                <button
                  type="button"
                  onClick={() => setDemoAccount('pastor.david@fpmchurch.org')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    email === 'pastor.david@fpmchurch.org'
                      ? 'bg-amber-50/70 border-[#C59B27]/50 ring-1 ring-[#C59B27]/40'
                      : 'bg-[#F8FAFC] hover:bg-slate-100/90 border-slate-200'
                  }`}
                >
                  <div className="text-[#070E1B] font-bold">Branch Pastor</div>
                  <div className="text-[10px] text-slate-500">HQ Chapter</div>
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
    </div>
  );
};
