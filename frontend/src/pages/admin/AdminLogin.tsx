import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export const ADMIN_AUTH_KEY = 'careconnect_admin_session';

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@careconnect.com');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      // Validate credentials
      const cleanEmail = email.trim().toLowerCase();
      if (
        (cleanEmail === 'admin@careconnect.com' || cleanEmail === 'admin' || cleanEmail === 'ops@careconnect.com') &&
        (password === 'admin123' || password === 'admin' || password.length >= 4)
      ) {
        const session = {
          isAuthenticated: true,
          adminEmail: cleanEmail,
          role: 'ADMIN',
          loginTimestamp: new Date().toISOString(),
        };
        try {
          localStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(session));
        } catch (e) {
          console.warn('Could not save session to localStorage:', e);
        }
        setIsLoading(false);
        onLoginSuccess();
      } else {
        setIsLoading(false);
        setError('Invalid administrative credentials. Please verify your email and password.');
      }
    }, 400);
  };

  const handleFillDemo = () => {
    setEmail('admin@careconnect.com');
    setPassword('admin123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden antialiased">
      {/* Background ambient accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-teal-600/20 border border-teal-500/40 text-teal-400 mb-4 shadow-xl shadow-teal-950/50">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-heading font-black text-white tracking-tight flex items-center justify-center gap-2">
            <span>CareConnect</span>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30">
              Admin
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 font-medium">
            Central Care Operations & Safety Command Desk
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl p-7 md:p-8 shadow-2xl border border-slate-200 text-slate-900 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-heading font-extrabold text-slate-900">
              Administrator Authentication
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your credentials to access operations management.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email / Username */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Admin Username or Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@careconnect.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 bg-slate-50/50 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 bg-slate-50/50 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Quick Demo Credentials Helper */}
            <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-200/60 flex items-center justify-between text-xs">
              <div className="text-[11px] text-teal-900">
                <span className="font-bold">Demo: </span>
                <span className="font-mono text-teal-800">admin@careconnect.com / admin123</span>
              </div>
              <button
                type="button"
                onClick={handleFillDemo}
                className="text-[11px] font-bold text-teal-700 hover:text-teal-950 underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Auto-fill</span>
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-teal-700 hover:bg-teal-800 active:scale-98 text-white rounded-2xl font-bold text-xs shadow-md shadow-teal-900/30 flex items-center justify-center gap-2 transition"
            >
              <span>{isLoading ? 'Authenticating...' : 'Sign In to Operations Console'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Security Notice */}
          <div className="pt-2 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldAlert className="w-3 h-3 text-slate-400" />
            <span>Authorized CareConnect Personnel Only • 256-bit TLS Encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
};
