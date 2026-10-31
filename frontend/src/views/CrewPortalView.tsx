import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Calendar, Clock, AlertTriangle, ArrowRight, CheckCircle2, Shield,
  QrCode, Rocket, Sparkles, Download, Utensils, Bed, FileCode2, Users, X
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StatusRibbon } from '../components/ui/StatusRibbon';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useEvent } from '../context/EventContext';

interface CrewPortalViewProps {
  onNavigate: (view: string) => void;
  eventId?: string;
}

export const CrewPortalView: React.FC<CrewPortalViewProps> = ({ onNavigate, eventId: propEventId }) => {
  const { user } = useAuth();
  const { currentEvent } = useEvent();
  const targetEventSlug = propEventId || currentEvent?.slug || 'iitg-hacksprint-2026';

  const [missionData, setMissionData] = useState<any>(null);
  const [boardingPass, setBoardingPass] = useState<any>(null);
  const [tokens, setTokens] = useState<any[]>([]);
  const [activePassTab, setActivePassTab] = useState<'gate' | 'meals'>('gate');
  const [showPassModal, setShowPassModal] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<string>('Lunch');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPortalData();
  }, [targetEventSlug]);

  const loadPortalData = async () => {
    try {
      setLoading(true);
      const event = await apiFetch<any>(`/events/by-slug/${targetEventSlug}`);
      setMissionData(event);

      try {
        const pass = await apiFetch(`/events/${event.id}/boarding/pass`);
        setBoardingPass(pass);
      } catch (e) {}

      try {
        const toks = await apiFetch(`/events/${event.id}/fun/tokens`);
        setTokens(toks);
      } catch (e) {}
    } catch (err) {
      console.error('Failed to load mission data:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentStage = boardingPass?.status || 'registered';

  return (
    <div className="space-y-5 max-w-4xl mx-auto text-black">
      {/* Top Banner Card */}
      <div className="bg-white p-5 sm:p-7 rounded-3xl border border-black/[0.08] shadow-apple-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-black">
                Hackathon Live
              </span>
              <span className="text-neutral-300">•</span>
              <span className="text-xs text-neutral-500 font-medium">
                {currentEvent?.title || 'WhyCode4U Hackathon'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-black tracking-tight">
              {boardingPass?.participant_name ? `Welcome, ${boardingPass.participant_name}` : 'Welcome, Hacker!'}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-xl">
              24-Hour Innovation Sprint. Build, submit, and pitch your prototype.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1 sm:pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setActivePassTab('meals'); setShowPassModal(true); }}
              className="gap-1.5 text-xs rounded-xl"
            >
              <Utensils className="w-4 h-4 text-black" />
              <span>Food QR</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => { setActivePassTab('gate'); setShowPassModal(true); }}
              className="gap-1.5 text-xs rounded-xl shadow-apple-sm bg-black text-white hover:bg-neutral-800"
            >
              <QrCode className="w-4 h-4" />
              <span>Gate & Accom Pass</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Stepper Ribbon */}
      <StatusRibbon currentStage={currentStage} />

      {/* Quick Access Action Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div
          onClick={() => onNavigate('problems')}
          className="p-5 rounded-3xl bg-white border border-black/[0.08] hover:border-black/30 shadow-apple-card transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center mb-3">
              <FileCode2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-black group-hover:text-neutral-700">Problem Statements</h3>
            <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
              Explore organizer problem statements, rules, and select your team's track.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-black group-hover:translate-x-1 transition-transform">
            <span>Select Track</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('squads')}
          className="p-5 rounded-3xl bg-white border border-black/[0.08] hover:border-black/30 shadow-apple-card transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 text-black border border-neutral-200 flex items-center justify-center mb-3">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-black group-hover:text-neutral-700">My Team</h3>
            <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
              Form your squad of up to 4 members or share your invite link with friends.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-black group-hover:translate-x-1 transition-transform">
            <span>Manage Team</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('launch')}
          className="p-5 rounded-3xl bg-white border border-black/[0.08] hover:border-black/30 shadow-apple-card transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 text-black border border-neutral-200 flex items-center justify-center mb-3">
              <Rocket className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-black group-hover:text-neutral-700">Submit Project</h3>
            <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
              Submit code repo, live deployment link, and deck before strict deadline cutoff.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-black group-hover:translate-x-1 transition-transform">
            <span>Submit Deliverables</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Unified Pass Modal: Gate, Accommodation & Food QR Codes */}
      {showPassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-md" onClick={() => setShowPassModal(false)} />
          <div className="relative w-full max-w-sm bg-white border border-black/10 rounded-3xl shadow-apple-modal p-6 text-center z-10 text-black animate-fadeIn">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-black">WhyCode4U Digital Pass</span>
              <button
                onClick={() => setShowPassModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pass Tabs */}
            <div className="bg-neutral-100 p-1 rounded-2xl flex items-center justify-between mb-4">
              <button
                onClick={() => setActivePassTab('gate')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  activePassTab === 'gate' ? 'bg-black text-white shadow-sm' : 'text-neutral-600'
                }`}
              >
                <Bed className="w-3.5 h-3.5" />
                <span>Gate & Stay</span>
              </button>
              <button
                onClick={() => setActivePassTab('meals')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  activePassTab === 'meals' ? 'bg-black text-white shadow-sm' : 'text-neutral-600'
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>Food Passes</span>
              </button>
            </div>

            {activePassTab === 'gate' ? (
              <div>
                <h3 className="text-base font-bold text-black mb-0.5">
                  {boardingPass?.participant_name || 'Hacker'}
                </h3>
                <p className="text-[11px] text-neutral-500 mb-3">
                  Present at Entrance Gate or Accommodation Check-in Desk.
                </p>

                <div className="bg-neutral-50 p-4 rounded-3xl inline-block border border-neutral-200 shadow-inner my-1">
                  <QRCodeSVG
                    value={boardingPass?.token || 'WHYCODE4U:GATE:PASS:SAMPLE'}
                    size={170}
                    level="M"
                  />
                </div>

                <div className="mt-3 p-2.5 bg-neutral-50 border border-neutral-200 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                    Backup 6-Digit Code
                  </span>
                  <span className="font-mono text-base font-bold text-black tracking-widest block mt-0.5">
                    {boardingPass?.short_fallback_code || 'APOLLO-99'}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-base font-bold text-black mb-0.5">Food & Catering Vouchers</h3>
                <p className="text-[11px] text-neutral-500 mb-3">
                  Select a meal to display its one-time scannable QR pass.
                </p>

                <div className="flex gap-1.5 mb-3">
                  {['Breakfast', 'Lunch', 'Dinner'].map(meal => (
                    <button
                      key={meal}
                      onClick={() => setSelectedMeal(meal)}
                      className={`flex-1 py-1 text-xs font-bold rounded-xl transition-all border ${
                        selectedMeal === meal
                          ? 'bg-black text-white border-black'
                          : 'bg-neutral-50 text-neutral-700 border-neutral-200'
                      }`}
                    >
                      {meal}
                    </button>
                  ))}
                </div>

                <div className="bg-neutral-50 p-4 rounded-3xl inline-block border border-neutral-200 shadow-inner my-1">
                  <QRCodeSVG
                    value={`WHYCODE4U:MEAL:${selectedMeal.toUpperCase()}:${boardingPass?.short_fallback_code || 'TKN'}`}
                    size={170}
                    level="M"
                  />
                </div>

                <div className="mt-2 text-xs font-bold text-black">
                  Valid for: {selectedMeal} Service
                </div>
              </div>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowPassModal(false)}
              className="w-full mt-4 rounded-xl"
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
