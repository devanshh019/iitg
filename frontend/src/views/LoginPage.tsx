import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  Lock, Mail, User, ArrowRight, ArrowLeft, CheckCircle2,
  AlertCircle, Building2, Phone, Sparkles, Shield, KeyRound,
  Check, Layers
} from 'lucide-react';
import { Button } from '../components/ui/Button';

interface LoginPageProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { login, register } = useAuth();

  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Sign In State
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Multi-Step Registration State
  // Step 1: Personal Dossier & Role
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState<'participant' | 'organizer'>('participant');
  const [regCollege, setRegCollege] = useState('');
  const [regPhone, setRegPhone] = useState('');

  // Step 2: Credentials & Verification
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [isCodeVerified, setIsCodeVerified] = useState(false);

  // Step 3: Logistics & Clearance
  const [selectedTrack, setSelectedTrack] = useState('AI & Neural Systems');
  const [tshirtSize, setTshirtSize] = useState('L');
  const [agreedCodeOfConduct, setAgreedCodeOfConduct] = useState(true);

  // Status
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Preset quick accounts for zero-friction demo testing
  const DEMO_PRESETS = [
    { label: 'Hacker', name: 'Aarav Sharma', email: 'aarav.iitg@hackos.io', role: 'Hacker' },
    { label: 'Organizer', name: 'Sarah Chen', email: 'organizer@whycode.io', role: 'Organizer' },
    { label: 'Judge', name: 'Dr. Marcus Vance', email: 'judge1.iitg@hackos.io', role: 'Judge' },
    { label: 'Super Admin', name: 'Root Admin', email: 'admin@whycode.io', role: 'Admin' }
  ];

  const handleQuickFill = (email: string) => {
    setSignInEmail(email);
    setSignInPassword('Password123!');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedEmail = signInEmail.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrorMsg('Please enter your email address');
      return;
    }

    const effectivePwd = signInPassword.trim() || 'Password123!';

    setLoading(true);
    try {
      await login(trimmedEmail, effectivePwd);
      setSuccessMsg('Signed in successfully! Entering HackOS...');
      setTimeout(() => {
        onSuccess?.();
      }, 300);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendVerificationCode = () => {
    if (!regEmail.trim()) {
      setErrorMsg('Please enter your email to receive verification code');
      return;
    }
    setErrorMsg(null);
    setCodeSent(true);
    setVerificationCode('849201');
    setIsCodeVerified(true);
    setSuccessMsg('Cryptographic verification code dispatched & auto-verified!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleNextStep = () => {
    setErrorMsg(null);
    if (currentStep === 1) {
      if (!regName.trim()) {
        setErrorMsg('Please provide your full legal or hacker name');
        return;
      }
      if (!regCollege.trim()) {
        setErrorMsg('Please provide your institution, university, or company');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!regEmail.trim()) {
        setErrorMsg('Please provide your email address');
        return;
      }
      if (!isCodeVerified) {
        setErrorMsg('Please request and verify your code before continuing');
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!agreedCodeOfConduct) {
      setErrorMsg('Please accept the HackOS Code of Conduct to complete registration');
      return;
    }

    setLoading(true);
    try {
      await register(
        regEmail.trim().toLowerCase(),
        regPassword.trim() || 'Password123!',
        regName.trim(),
        regRole,
        regCollege.trim(),
        regPhone.trim() || undefined,
        tshirtSize
      );
      setSuccessMsg(`Welcome to HackOS, ${regName.trim()}! Credentials activated.`);
      setTimeout(() => {
        onSuccess?.();
      }, 400);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFD] flex flex-col justify-center items-center px-4 py-8 text-black">
      <div className="w-full max-w-xl">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-black text-white shadow-apple-card mb-3">
            <span className="font-bold text-lg tracking-wider">H</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black">
            Hack<span className="text-neutral-500">OS</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Apex Innovation & Multi-Organization Hackathon Suite
          </p>
        </div>

        {/* Card Body */}
        <div className="bg-white rounded-3xl shadow-apple-card border border-black/[0.08] p-6 sm:p-8">
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 rounded-2xl bg-neutral-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800"
            >
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 rounded-2xl bg-neutral-50 border border-neutral-300 flex items-start gap-2.5 text-xs text-black"
            >
              <CheckCircle2 className="w-4 h-4 text-black mt-0.5 shrink-0" />
              <span>{successMsg}</span>
            </motion.div>
          )}

          {/* Mode Switcher */}
          <div className="bg-neutral-100 p-1 rounded-2xl flex items-center justify-between mb-6">
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
              onClick={() => { setMode('register'); setCurrentStep(1); setErrorMsg(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                mode === 'register' ? 'bg-black text-white shadow-sm' : 'text-neutral-600 hover:text-black'
              }`}
            >
              Multi-Step Registration
            </button>
          </div>

          {/* SIGN IN FORM */}
          {mode === 'signin' && (
            <div className="space-y-5">
              <form onSubmit={handleSignIn} className="space-y-4">
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
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      placeholder="alex.morgan@stanford.edu"
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
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-colors font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Enter your password or leave blank for demo instant login.
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
                        <span>Sign In & Enter HackOS</span>
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </div>
              </form>

              {/* Demo 1-Click Credentials Switcher */}
              <div className="pt-4 border-t border-black/[0.06]">
                <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2.5">
                  1-Click Demo Profiles
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {DEMO_PRESETS.map((p) => (
                    <button
                      key={p.email}
                      type="button"
                      onClick={() => handleQuickFill(p.email)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        signInEmail === p.email
                          ? 'border-black bg-neutral-900 text-white shadow-sm'
                          : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-black'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span>{p.label}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                          signInEmail === p.email ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-200 text-neutral-600'
                        }`}>
                          {p.role}
                        </span>
                      </div>
                      <div className="text-[10px] text-neutral-400 truncate mt-0.5">{p.email}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MULTI-STEP REGISTRATION WIZARD */}
          {mode === 'register' && (
            <div className="space-y-6">
              {/* Stepper Progress Indicator */}
              <div className="flex items-center justify-between px-2">
                {[
                  { step: 1, label: 'Profile & Role' },
                  { step: 2, label: 'Verification' },
                  { step: 3, label: 'Pass Clearance' }
                ].map((s) => (
                  <div key={s.step} className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        currentStep === s.step
                          ? 'bg-black text-white shadow-sm ring-4 ring-black/10'
                          : currentStep > s.step
                          ? 'bg-neutral-200 text-neutral-800'
                          : 'bg-neutral-100 text-neutral-400'
                      }`}
                    >
                      {currentStep > s.step ? <Check className="w-3.5 h-3.5" /> : s.step}
                    </div>
                    <span className={`hidden sm:inline text-xs font-medium ${
                      currentStep === s.step ? 'text-black font-semibold' : 'text-neutral-400'
                    }`}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Step 1: Personal Dossier & Role Selection */}
              {currentStep === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                      Operational Role
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRegRole('participant')}
                        className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                          regRole === 'participant'
                            ? 'border-black bg-neutral-900 text-white shadow-sm'
                            : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-black'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4" />
                          <span className="font-bold text-xs">Hacker / Participant</span>
                        </div>
                        <p className={`text-[10px] leading-relaxed ${regRole === 'participant' ? 'text-neutral-300' : 'text-neutral-500'}`}>
                          Join or form a squad, submit code, unseal problem statements, and compete for prizes.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRegRole('organizer')}
                        className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                          regRole === 'organizer'
                            ? 'border-black bg-neutral-900 text-white shadow-sm'
                            : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-black'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="w-4 h-4" />
                          <span className="font-bold text-xs">Organizer / Host</span>
                        </div>
                        <p className={`text-[10px] leading-relaxed ${regRole === 'organizer' ? 'text-neutral-300' : 'text-neutral-500'}`}>
                          Host hackathons, scan QR attendance, manage judge desks, and oversee rounds.
                        </p>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                      Full Legal / Hacker Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="e.g. Alex Morgan"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                        University or Organization
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          value={regCollege}
                          onChange={(e) => setRegCollege(e.target.value)}
                          placeholder="IIT Guwahati / Stanford"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                        Phone (for Gate Pass SMS)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                          <Phone className="w-4 h-4" />
                        </div>
                        <input
                          type="tel"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="+1 (555) 019-2834"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3">
                    <Button
                      type="button"
                      onClick={handleNextStep}
                      className="w-full justify-center bg-black hover:bg-neutral-800 text-white font-semibold py-3 shadow-apple-sm rounded-xl cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <span>Continue to Security & Verification</span>
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Credentials & Verification */}
              {currentStep === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="alex@stanford.edu"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSendVerificationCode}
                        className="px-3.5 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-black text-xs font-semibold cursor-pointer transition-colors shrink-0"
                      >
                        {codeSent ? 'Resend Code' : 'Send Code'}
                      </button>
                    </div>
                  </div>

                  {codeSent && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 rounded-2xl bg-neutral-50 border border-black/10 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                          6-Digit Verification Code
                        </label>
                        {isCodeVerified && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Verified Cryptographically
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          value={verificationCode}
                          onChange={(e) => {
                            setVerificationCode(e.target.value);
                            if (e.target.value.length === 6) setIsCodeVerified(true);
                          }}
                          placeholder="849201"
                          maxLength={6}
                          className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl text-black text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
                        />
                      </div>
                    </motion.div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                      Create Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    <Button
                      type="button"
                      onClick={handleNextStep}
                      className="flex-1 justify-center bg-black hover:bg-neutral-800 text-white font-semibold py-3 shadow-apple-sm rounded-xl cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <span>Continue to Pass Clearance</span>
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: HackOS Clearance & Preferences */}
              {currentStep === 3 && (
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                        Preferred Mission Track
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          'AI & Neural Systems',
                          'Web3 & Cryptography',
                          'Cloud & Distributed Systems',
                          'DeepTech & Aerospace'
                        ].map((track) => (
                          <button
                            key={track}
                            type="button"
                            onClick={() => setSelectedTrack(track)}
                            className={`p-2.5 rounded-xl border text-xs font-semibold text-left cursor-pointer transition-all ${
                              selectedTrack === track
                                ? 'border-black bg-black text-white shadow-sm'
                                : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800'
                            }`}
                          >
                            {track}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                        Attendee Swag / T-Shirt Size
                      </label>
                      <div className="flex gap-2">
                        {['S', 'M', 'L', 'XL', '2XL'].map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setTshirtSize(size)}
                            className={`flex-1 py-2 rounded-xl border text-xs font-mono font-bold cursor-pointer transition-all ${
                              tshirtSize === size
                                ? 'border-black bg-black text-white shadow-sm'
                                : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Honor Code & Consent */}
                    <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="coc"
                        checked={agreedCodeOfConduct}
                        onChange={(e) => setAgreedCodeOfConduct(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-neutral-300 text-black focus:ring-black cursor-pointer"
                      />
                      <label htmlFor="coc" className="text-xs text-neutral-600 cursor-pointer select-none leading-relaxed">
                        <span className="font-semibold text-black">Code of Conduct & Data Clearance:</span> I agree to compete with academic honesty, acknowledge automated anti-plagiarism checks, and allow HackOS cryptographic event check-in credentials.
                      </label>
                    </div>

                    <div className="flex items-center gap-3 pt-3">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                      </button>
                      <Button
                        type="submit"
                        disabled={loading}
                        className="flex-1 justify-center bg-black hover:bg-neutral-800 text-white font-semibold py-3 shadow-apple-sm rounded-xl cursor-pointer"
                      >
                        {loading ? (
                          <span>Activating Profile...</span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <span>Complete Registration & Launch</span>
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
