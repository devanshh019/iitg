import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Sparkles, Award, Shield, Moon, Sunrise, Rocket, LifeBuoy, CheckCircle2, Ticket, X } from 'lucide-react';
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
      alert(err.message || 'Help request failed.');
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
    <div className="space-y-5 max-w-4xl mx-auto text-black">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-black/[0.08] shadow-apple-card">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-black" />
            <h1 className="text-xl sm:text-2xl font-bold text-black tracking-tight">Perks & Mentor Help</h1>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500">
            Show your meal vouchers at catering, collect your swag kit, and request help from on-duty mentors.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setHelpModalOpen(true)} className="gap-2 shadow-apple-sm text-xs rounded-xl bg-black text-white hover:bg-neutral-800">
          <LifeBuoy className="w-4 h-4" />
          <span>Ask a Mentor for Help</span>
        </Button>
      </div>

      {/* Meal & Swag Digital Vouchers */}
      <Card className="bg-white rounded-3xl">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-black" />
            <h3 className="font-bold text-sm text-black uppercase tracking-wide">
              Your Food & Swag Vouchers
            </h3>
          </div>
          <Badge variant="black">One-Time Scannable</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {[
            { type: 'MEAL_LUNCH', name: 'Lunch Voucher', code: 'TKN-LUNCH-941', used: true, label: 'Lunch Included' },
            { type: 'MEAL_DINNER', name: 'Dinner Voucher', code: 'TKN-DINR-882', used: false, label: 'Dinner from 8:00 PM' },
            { type: 'SWAG_KIT', name: 'Official Swag Bag', code: 'TKN-SWAG-104', used: false, label: 'T-Shirt & Sticker Pack' }
          ].map((tok, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedToken(tok)}
              className={`p-4 rounded-2xl border cursor-pointer hover:border-black/30 transition-all ${
                tok.used ? 'bg-neutral-50 border-neutral-200 opacity-60' : 'bg-white border-neutral-200 shadow-apple-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-black">{tok.name}</span>
                <Badge variant={tok.used ? 'neutral' : 'emerald'} size="sm">
                  {tok.used ? 'Redeemed' : 'Ready'}
                </Badge>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">{tok.label}</p>
              <div className="mt-3 flex items-center justify-between pt-2 border-t border-neutral-100">
                <span className="font-mono text-xs text-black font-bold">{tok.code}</span>
                <span className="text-xs text-neutral-600 font-semibold hover:text-black">Show QR →</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Achievement Badges */}
      <Card className="bg-white rounded-3xl">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-black" />
            <h3 className="font-bold text-sm text-black uppercase tracking-wide">
              Your Hackathon Badges
            </h3>
          </div>
          <Badge variant="neutral">
            {passportBadges.filter(b => b.unlocked).length} / {passportBadges.length} Unlocked
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {passportBadges.map((badge) => {
            const Icon = getBadgeIcon(badge.key);
            return (
              <div
                key={badge.key}
                className={`p-3.5 rounded-2xl border text-center transition-all ${
                  badge.unlocked
                    ? 'bg-neutral-50 border-neutral-300 shadow-sm'
                    : 'bg-neutral-50/50 border-neutral-200/60 opacity-40'
                }`}
              >
                <div
                  className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-1.5 ${
                    badge.unlocked ? 'bg-black text-white shadow-sm' : 'bg-neutral-200 text-neutral-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-xs text-black">{badge.title}</h4>
                <p className="text-[10px] text-neutral-500 mt-0.5 line-clamp-2">{badge.description}</p>
                <div className="mt-2">
                  <Badge variant={badge.unlocked ? 'black' : 'neutral'} size="sm">
                    {badge.unlocked ? 'Unlocked' : 'Locked'}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Need Help Ticket Modal */}
      <Modal isOpen={helpModalOpen} onClose={() => setHelpModalOpen(false)} title="Ask a Mentor for Guidance">
        {helpSuccess ? (
          <div className="p-6 text-center text-black font-medium text-sm">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-black" />
            Your question has been sent! Available mentors will come to your squad table shortly.
          </div>
        ) : (
          <form onSubmit={handleRequestHelp} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider block mb-1.5">
                What area do you need help with?
              </label>
              <select
                value={skillTag}
                onChange={(e) => setSkillTag(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-xs text-black focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
              >
                <option value="AI/ML">AI & Machine Learning (Models, Prompts, Python)</option>
                <option value="Systems">Backend & Database (FastAPI, SQL, APIs)</option>
                <option value="Frontend">Frontend UI (React, Tailwind, CSS)</option>
                <option value="Pitch">Pitch & Presentation (Slides, Storytelling)</option>
                <option value="DevOps">Deployments (Vercel, Docker, GitHub)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider block mb-1.5">
                Brief Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Need help fixing CORS error with backend API"
                value={helpTitle}
                onChange={(e) => setHelpTitle(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-xs text-black focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider block mb-1.5">
                What have you tried?
              </label>
              <textarea
                rows={3}
                placeholder="Briefly describe what is happening..."
                value={helpDesc}
                onChange={(e) => setHelpDesc(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-xs text-black focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" type="button" onClick={() => setHelpModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" isLoading={loading}>
                Request Mentor
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Token Modal with QR */}
      {selectedToken && (
        <Modal isOpen={!!selectedToken} onClose={() => setSelectedToken(null)} title={selectedToken.name}>
          <div className="text-center p-4">
            <div className="bg-neutral-50 p-4 rounded-3xl inline-block border border-neutral-200 my-2 shadow-inner">
              <QRCodeSVG value={`WHYCODE4U:TOKEN:${selectedToken.code}`} size={160} />
            </div>
            <div className="text-base font-mono font-bold text-black mt-2 tracking-widest">
              {selectedToken.code}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Present this barcode at the catering counter or swag desk.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};
