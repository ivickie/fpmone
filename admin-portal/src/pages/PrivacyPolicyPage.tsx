import React from 'react';
import { 
  ShieldCheck, ArrowLeft, Lock, Smartphone, Camera, 
  Trash2, Mail, ExternalLink, FileText, CheckCircle2, ChevronRight
} from 'lucide-react';

interface PrivacyPolicyPageProps {
  onNavigateHome?: () => void;
  onNavigateDeleteAccount?: () => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({
  onNavigateHome,
  onNavigateDeleteAccount
}) => {
  const handleHomeClick = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      window.location.href = '/';
    }
  };

  const handleDeleteAccountClick = () => {
    if (onNavigateDeleteAccount) {
      onNavigateDeleteAccount();
    } else {
      window.location.href = '/delete-account';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-[#C59B27]/20 selection:text-slate-900">
      {/* Top Navigation Bar */}
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
            <div className="w-8 h-8 rounded-lg bg-[#070E1B] flex items-center justify-center p-1 text-[#C59B27] shadow-xs">
              <ShieldCheck className="w-5 h-5 text-[#C59B27]" />
            </div>
            <div>
              <span className="text-xs font-black tracking-tight text-[#070E1B] uppercase block">
                FPM Global
              </span>
              <span className="text-[10px] text-slate-400 font-medium block -mt-0.5">
                Faith Preachers Ministries Int'l
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleDeleteAccountClick}
            className="px-3 py-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Delete Account</span>
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
      <section className="bg-gradient-to-b from-[#070E1B] to-[#0D1A30] text-white py-12 sm:py-16 px-4 sm:px-8 border-b border-slate-800 relative overflow-hidden">
        <div className="max-w-4xl mx-auto relative z-10 text-center sm:text-left">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-semibold mb-4 border border-white/10 backdrop-blur-xs">
            <FileText className="w-3.5 h-3.5" />
            <span>Official Policy Document • Effective October 2026</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            FPM Global Privacy Policy
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
            Faith Preachers Ministries International is committed to safeguarding your personal data, honoring your privacy, and protecting your church records with cryptographic diligence.
          </p>
        </div>
        
        {/* Subtle decorative background circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#C59B27]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Main Content Body */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-10 sm:py-12 flex-1 w-full space-y-10">
        
        {/* Key Guarantees Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Encrypted by Default</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              All communications between your mobile device, browser, and our servers are encrypted via HTTPS (TLS 1.3).
            </p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Local Biometric Security</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Fingerprint and face challenges execute exclusively on your device hardware. Raw biometric markers are never transmitted.
            </p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Zero Data Selling</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your member data is used solely for spiritual fellowship, pastoral care, and church operations. We never monetize personal info.
            </p>
          </div>
        </div>

        {/* Section 1: Overview */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2.5 text-slate-900 border-b border-slate-100 pb-3">
            <span className="text-xs font-black text-[#C59B27] uppercase tracking-wider">01.</span>
            <h2 className="text-base font-bold">Introduction & Ministry Identity</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            This Privacy Policy governs the collection, use, retention, and deletion of information by <strong>Faith Preachers Ministries International ("FPM Global", "the Ministry", "we", "us", or "our")</strong> across our official mobile applications (including the Android application <code>org.fpm.one</code>), web admin portal, and associated digital platforms.
          </p>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            By downloading our mobile app, registering as a church member or worker, or accessing the FPM Global portal, you acknowledge and agree to the practices described in this document.
          </p>
        </div>

        {/* Section 2: Data We Collect */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2.5 text-slate-900 border-b border-slate-100 pb-3">
            <span className="text-xs font-black text-[#C59B27] uppercase tracking-wider">02.</span>
            <h2 className="text-base font-bold">Information We Collect</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            To provide comprehensive church administration and ministry worker coordination, we may collect the following categories of information:
          </p>
          
          <div className="space-y-3 text-xs sm:text-sm text-slate-700">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-900 block mb-1">A. Personal Identification Information</span>
              Full legal name, phone number, email address, residential address, gender, date of birth, and emergency contact details submitted during registration.
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-900 block mb-1">B. Church & Ministry Records</span>
              Branch affiliation, department assignments (e.g. Choir, Media, Protocol, Ushering), ministry positions, date of joining or serving, and service attendance timestamps (clock-in/clock-out records).
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-900 block mb-1">C. Member Media & Uploads</span>
              Profile picture avatars and member testimonies willingly submitted for church review and publication.
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-900 block mb-1">D. Technical & Device Information</span>
              Device manufacturer, operating system version, app build number, network state, and push notification delivery tokens.
            </div>
          </div>
        </div>

        {/* Section 3: Device Permissions & Biometrics */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2.5 text-slate-900 border-b border-slate-100 pb-3">
            <span className="text-xs font-black text-[#C59B27] uppercase tracking-wider">03.</span>
            <h2 className="text-base font-bold">Device Permissions & Biometric Hardware Usage</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Our Android application requests only permissions strictly necessary for church ministry workflows:
          </p>

          <ul className="space-y-3 text-xs sm:text-sm text-slate-600">
            <li className="flex items-start space-x-3">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg mt-0.5 shrink-0">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-slate-900">Camera (QR Attendance Scanning):</strong> Used solely to scan digital QR attendance codes during church service clock-in and worker badge verification. We do not capture background pictures or store video feeds.
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg mt-0.5 shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-slate-900">Biometrics (USE_BIOMETRIC):</strong> Used to provide swift passkey unlock for workers. Android handles biometric prompts inside the secure hardware enclave. <em>No raw fingerprint or face template is ever read, stored, or transferred to FPM Global servers.</em>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg mt-0.5 shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-slate-900">Notifications (POST_NOTIFICATIONS):</strong> Used on Android 13+ to broadcast service reminders, pastoral notices, and urgent church alerts.
              </div>
            </li>
          </ul>
        </div>

        {/* Section 4: How We Use Data */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2.5 text-slate-900 border-b border-slate-100 pb-3">
            <span className="text-xs font-black text-[#C59B27] uppercase tracking-wider">04.</span>
            <h2 className="text-base font-bold">Purpose of Processing</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Personal data collected is used solely for legitimate church and ministry operations, including:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <li>Maintaining the official FPM Global member directory and pastoral registry.</li>
            <li>Tracking worker punctuality, attendance, and assigning department rosters.</li>
            <li>Broadcasting sermons, Sunday moments, service highlights, and event updates.</li>
            <li>Facilitating member approval and security verification by church leadership.</li>
            <li>Ensuring technical stability, preventing fraud, and adhering to legal obligations.</li>
          </ul>
        </div>

        {/* Section 5: Account & Data Deletion */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2.5 text-slate-900 border-b border-slate-100 pb-3">
            <span className="text-xs font-black text-[#C59B27] uppercase tracking-wider">05.</span>
            <h2 className="text-base font-bold">Your Rights & Account Deletion Policy</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            In compliance with global data privacy standards and Google Play Store policies, every member retains full control over their personal information:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <li><strong>Access & Correction:</strong> You may inspect or update your profile details via the mobile app profile tab or by contacting church administration.</li>
            <li><strong>Complete Account Deletion:</strong> You have the right to request immediate and permanent deletion of your account, authentication credentials, worker assignments, and attendance logs.</li>
          </ul>

          <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs font-bold text-rose-900 block">Need to delete your church account?</span>
              <span className="text-[11px] text-rose-700 block">
                Access our dedicated web deletion tool or review step-by-step instructions.
              </span>
            </div>
            <button
              type="button"
              onClick={handleDeleteAccountClick}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center space-x-1 shrink-0"
            >
              <span>Visit Deletion Portal</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section 6: Contact Information */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2.5 text-slate-900 border-b border-slate-100 pb-3">
            <span className="text-xs font-black text-[#C59B27] uppercase tracking-wider">06.</span>
            <h2 className="text-base font-bold">Contact Our Privacy Directorate</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            If you have questions, inquiries, or requests regarding this Privacy Policy or how your church records are handled, please contact:
          </p>
          
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs sm:text-sm">
            <div className="font-bold text-slate-900">Faith Preachers Ministries International</div>
            <div className="text-slate-600">Directorate of Administration, Legal & IT Affairs</div>
            <div className="flex items-center space-x-2 text-blue-600 pt-1">
              <Mail className="w-4 h-4" />
              <a href="mailto:privacy@fpmglobal.online" className="hover:underline font-semibold">
                privacy@fpmglobal.online
              </a>
              <span className="text-slate-400">•</span>
              <a href="mailto:info@fpmglobal.online" className="hover:underline font-semibold">
                info@fpmglobal.online
              </a>
            </div>
            <div className="text-slate-500 text-[11px] pt-1">
              Website: <a href="https://www.fpmglobal.online" target="_blank" rel="noreferrer" className="underline hover:text-slate-700">https://www.fpmglobal.online</a>
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
          <button type="button" onClick={handleDeleteAccountClick} className="hover:underline cursor-pointer text-rose-500">Delete Account</button>
        </div>
      </footer>
    </div>
  );
};
