import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Sparkles, Award, Shield, Moon, Sunrise, Rocket, LifeBuoy, CheckCircle2, Ticket } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { apiFetch } from '../api/client';

interface PassportViewProps {
  eventId?: string;
}

export const PassportView: React.FC<PassportViewProps> = ({ eventId = 'apollo-24' }) => {
  const [missionId, setMissionId] = useState('');
  const [passportBadges, setPassportBadges] = useState<any[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);
  const [selectedToken, setSelectedToken] = useState<any>(null);

  // Mentor Pit stop ticket state
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [skillTag, setSkillTag] = useState('AI/ML');
  const [helpTitle, setHelpTitle] = useState('');
  const [helpDesc, setHelpDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [helpSuccess, setHelpSuccess] = useState(false);

  useEffect(() => {
    loadPassport();
  }, [eventId]);

  const loadPassport = async () => {
    try {
      const ev = await apiFetch(`/events/by-slug/${eventId}`);
      setMissionId(ev.id);

      const badges = await apiFetch(`/events/${ev.id}/fun/passport`);
      setPassportBadges(badges);

      try {
        const toks = await apiFetch(`/events/${ev.id}/fun/tokens`);
        setTokens(toks);
      } catch (e) {}
    } catch (e) {
      console.error(e);
    }
  };

  const handleRequestHelp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await apiFetch(`/events/${missionId}/fun/help-tickets?skill_tag=${encodeURIComponent(skillTag)}&title=${encodeURIComponent(helpTitle)}&description=${encodeURIComponent(helpDesc)}`, {
        method: 'POST'
      });
      setHelpSuccess(true);
      setTimeout(() => {
        setHelpModalOpen(false);
        setHelpSuccess(false);
        setHelpTitle('');
        setHelpDesc('');
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Help ticket submission failed.');
    } finally {
      setLoading(false);
    }
  };

  const getBadgeIcon = (key: string) => {
    switch (key) {
      case 'early_bird': return Sunrise;
      case 'squad_captain': return Shield;
      case 'mentor_magnet': return Sparkles;
      case 'night_owl': return Moon;
      case 'first_launch': return Rocket;
      default: return Award;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h1 className="text-2xl font-bold font-mono text-white tracking-tight">Crew Passport & Pit Stop</h1>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Mission achievements, meal/swag tokens, and mentor support tickets.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setHelpModalOpen(true)} className="gap-2 shadow-glow-cyan">
          <LifeBuoy className="w-4 h-4" />
          <span>Mentor Pit Stop (Need Help)</span>
        </Button>
      </div>

      {/* Passport Stamps & Badges */}
      <Card glow="amber">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="font-mono font-bold text-sm text-slate-100 uppercase tracking-wider">
              Mission Flight Passport Stamps
            </h3>
          </div>
          <Badge variant="amber">
            {passportBadges.filter(b => b.unlocked).length} / {passportBadges.length} UNLOCKED
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {passportBadges.map((badge) => {
            const Icon = getBadgeIcon(badge.key);
            return (
              <div
                key={badge.key}
                className={`p-4 rounded-xl border text-center transition-all ${
                  badge.unlocked
                    ? 'bg-space-900 border-amber-500/50 shadow-glow-amber'
                    : 'bg-space-950/40 border-space-850 opacity-40'
                }`}
              >
                <div
                  className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 ${
                    badge.unlocked ? 'bg-amber-500 text-space-950 shadow-md' : 'bg-space-800 text-slate-500'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <h4 className="font-mono font-bold text-xs text-white">{badge.title}</h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-tight">{badge.description}</p>
                <div className="mt-2">
                  <Badge variant={badge.unlocked ? 'amber' : 'slate'} size="sm">
                    {badge.unlocked ? 'STAMPED' : 'LOCKED'}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Meal & Swag Tokens Section */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-cyan-400" />
            <h3 className="font-mono font-bold text-sm text-slate-100 uppercase tracking-wider">
              One-Time Meal & Swag Tokens
            </h3>
          </div>
          <Badge variant="cyan">ONE-TIME SCANNABLE</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { type: 'MEAL_LUNCH', name: 'Orbital Lunch Ration', code: 'TKN-LUNCH-941', used: true },
            { type: 'MEAL_DINNER', name: 'Flight Dinner Ration', code: 'TKN-DINR-882', used: false },
            { type: 'SWAG_KIT', name: 'Official Mission Swag Pack', code: 'TKN-SWAG-104', used: false }
          ].map((tok, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedToken(tok)}
              className={`p-4 rounded-xl border cursor-pointer hover:border-cyan-500/50 transition-all ${
                tok.used ? 'bg-space-950/50 border-space-850 opacity-60' : 'bg-space-900 border-space-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-white">{tok.name}</span>
                <Badge variant={tok.used ? 'slate' : 'emerald'} size="sm">
                  {tok.used ? 'REDEEMED' : 'READY'}
                </Badge>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-sm text-amber-400 font-bold">{tok.code}</span>
                <span className="text-[10px] text-cyan-400 font-mono">Tap for Barcode →</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Need Help Ticket Modal */}
      <Modal isOpen={helpModalOpen} onClose={() => setHelpModalOpen(false)} title="Mentor Pit Stop Request">
        {helpSuccess ? (
          <div className="p-6 text-center text-emerald-400 font-mono text-sm">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
            Ticket transmitted! Available mentors notified by skill tag.
          </div>
        ) : (
          <form onSubmit={handleRequestHelp} className="space-y-4">
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">Required Mentor Skill Specialization</label>
              <select
                value={skillTag}
                onChange={(e) => setSkillTag(e.target.value)}
                className="w-full bg-space-950 border border-space-800 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              >
                <option value="AI/ML">AI & Machine Learning (PyTorch, LLMs, Agents)</option>
                <option value="Systems">Distributed Systems & Database Reliability</option>
                <option value="Frontend">Frontend Architecture & UI Physics</option>
                <option value="Web3">Smart Contracts & Cryptographic Primitives</option>
                <option value="DevOps">Cloud Infra, Docker & CI/CD Pipelines</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">Brief Issue Summary</label>
              <input
                type="text"
                required
                placeholder="e.g. Model inference latency spiking under concurrency"
                value={helpTitle}
                onChange={(e) => setHelpTitle(e.target.value)}
                className="w-full bg-space-950 border border-space-800 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">Context / Reproduction</label>
              <textarea
                rows={3}
                placeholder="Explain what you have tried and what telemetry you observe..."
                value={helpDesc}
                onChange={(e) => setHelpDesc(e.target.value)}
                className="w-full bg-space-950 border border-space-800 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" type="button" onClick={() => setHelpModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" isLoading={loading}>
                Dispatch Help Ticket
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Token Modal with QR */}
      {selectedToken && (
        <Modal isOpen={!!selectedToken} onClose={() => setSelectedToken(null)} title={selectedToken.name}>
          <div className="text-center p-4">
            <div className="bg-white p-4 rounded-2xl inline-block shadow-lg my-2">
              <QRCodeSVG value={`HACKOS:TOKEN:${selectedToken.code}`} size={160} />
            </div>
            <div className="text-lg font-mono font-bold text-amber-400 mt-3 tracking-widest">
              {selectedToken.code}
            </div>
            <p className="text-xs font-mono text-slate-400 mt-1">
              Present barcode at kit hangar or catering station. One-time redemption.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};
