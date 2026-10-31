import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';

interface LoginPageProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, onCancel }) => {
  const { login, register } = useAuth();
  
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrorMsg('Please enter your email address');
      return;
    }

    const effectivePwd = password.trim() || 'Password123!';

    setLoading(true);
    try {
      if (mode === 'signin') {
        await login(trimmedEmail, effectivePwd);
        setSuccessMsg('Signed in successfully! Entering portal...');
      } else {
        await register(trimmedEmail, effectivePwd, name.trim());
        setSuccessMsg('Account created successfully! Entering portal...');
      }
      setTimeout(() => {
        onSuccess?.();
      }, 200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFD] flex flex-col justify-center items-center px-4 py-8 text-black">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-black text-white shadow-apple-card mb-3">
            <span className="font-bold text-lg tracking-wider">H</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black">
            Hack<span className="text-neutral-500">OS</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Apex Innovation & Hackathon Operating System
          </p>
        </div>

        {/* Card Body */}
        <div className="bg-white rounded-3xl shadow-apple-card border border-black/[0.08] p-6 sm:p-8">
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-neutral-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-neutral-50 border border-neutral-300 flex items-start gap-2.5 text-xs text-black animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-black mt-0.5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Mode Toggle */}
          <div className="bg-neutral-100 p-1 rounded-2xl flex items-center justify-between mb-5">
            <button
              type="button"
              onClick={() => { setMode('signin'); setErrorMsg(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                mode === 'signin' ? 'bg-black text-white shadow-sm' : 'text-neutral-600 hover:text-black'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setErrorMsg(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                mode === 'register' ? 'bg-black text-white shadow-sm' : 'text-neutral-600 hover:text-black'
              }`}
            >
              New Hacker Registration
            </button>
          </div>

          <form onSubmit={handleAccountSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Your Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    required={mode === 'register'}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-colors font-mono"
                />
              </div>
              <p className="text-[10px] text-neutral-400 mt-1">
                Enter any password (or leave blank to use default).
              </p>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full justify-center bg-black hover:bg-neutral-800 text-white font-semibold py-3 shadow-apple-sm rounded-xl cursor-pointer"
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span>{mode === 'signin' ? 'Sign In & Enter' : 'Register & Enter'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
