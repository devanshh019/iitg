import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass, Trophy, MapPin, Building2, Calendar, Clock, ArrowRight,
  CheckCircle2, Sparkles, Shield, Tag, X, ExternalLink, Award, Users,
  Layers, Gift, AlertCircle, ChevronRight, Check
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useEvent, EventItem } from '../context/EventContext';

interface HackathonsDirectoryViewProps {
  onNavigate: (view: string) => void;
}

export const HackathonsDirectoryView: React.FC<HackathonsDirectoryViewProps> = ({ onNavigate }) => {
  const { events, currentEvent, selectEvent, participateInEvent, isLoading } = useEvent();
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming'>('all');
  const [participatingId, setParticipatingId] = useState<string | null>(null);
  const [selectedModalEvent, setSelectedModalEvent] = useState<EventItem | null>(null);
  const [modalTab, setModalTab] = useState<'overview' | 'prizes' | 'schedule' | 'eligibility'>('overview');
  const [now, setNow] = useState<Date>(new Date());

  // Real-time clock tick for smooth Apple countdowns
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (targetDateStr?: string) => {
    if (!targetDateStr) return 'TBD';
    const target = new Date(targetDateStr).getTime();
    const diff = target - now.getTime();
    if (diff <= 0) return '00:00:00';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getEventStatus = (event: EventItem) => {
    const startTime = event.starts_at ? new Date(event.starts_at).getTime() : 0;
    const deadlineTime = event.submission_deadline ? new Date(event.submission_deadline).getTime() : 0;
    const currentTime = now.getTime();

    if (startTime > currentTime) {
      return {
        type: 'upcoming',
        label: `Starts in: ${formatCountdown(event.starts_at)}`,
        badgeColor: 'bg-neutral-100 text-neutral-800 border-neutral-300'
      };
    } else if (deadlineTime > currentTime || event.status === 'ongoing') {
      return {
        type: 'live',
        label: 'LIVE NOW',
        badgeColor: 'bg-black text-white border-black'
      };
    } else {
      return {
        type: 'ended',
        label: 'Concluded',
        badgeColor: 'bg-neutral-100 text-neutral-500 border-neutral-200'
      };
    }
  };

  const handleParticipate = async (event: EventItem) => {
    try {
      setParticipatingId(event.id);
      await participateInEvent(event.id);
      selectEvent(event);
      setTimeout(() => {
        setParticipatingId(null);
        setSelectedModalEvent(null);
        onNavigate('problems');
      }, 400);
    } catch (err) {
      console.error(err);
      setParticipatingId(null);
      selectEvent(event);
      setSelectedModalEvent(null);
      onNavigate('problems');
    }
  };

  const filteredEvents = events.filter(e => {
    const status = getEventStatus(e);
    if (filter === 'live') return status.type === 'live';
    if (filter === 'upcoming') return status.type === 'upcoming';
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-black animate-fadeIn">
      {/* Apple Hero Header with Unique Branding */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/[0.08] shadow-apple-card relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            {/* Unique Prestigious Kicker */}
            <div className="flex items-center gap-2 mb-2.5">
              <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-black bg-neutral-100 px-2.5 py-0.5 rounded-full border border-neutral-200">
                Apex Innovation Arenas
              </span>
              <span className="text-neutral-300">•</span>
              <span className="text-xs text-neutral-500 font-medium">Multi-Organization Federation</span>
            </div>

            {/* Apple Headline */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-black leading-tight">
              The Grand League Hackathons
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-2 leading-relaxed">
              Curated premier arenas hosted by leading university councils, aerospace research laboratories, and decentralized foundations. Inspect verified prize pools, track bounties, sealed countdowns, and launch your project with zero friction.
            </p>
          </div>

          <div className="flex sm:flex-row md:flex-col gap-2.5 shrink-0">
            <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-center min-w-[130px]">
              <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Active Arenas</div>
              <div className="text-2xl font-mono font-bold text-black mt-0.5">{events.length}</div>
            </div>
          </div>
        </div>

        {/* Filter Pills with Apple Spring Hover */}
        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-black/[0.06]">
          {(['all', 'live', 'upcoming'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold tracking-tight transition-all cursor-pointer select-none active:scale-95 ${
                filter === tab
                  ? 'bg-black text-white shadow-sm'
                  : 'bg-neutral-100 text-neutral-600 hover:text-black hover:bg-neutral-200'
              }`}
            >
              {tab === 'all' && 'All Arenas'}
              {tab === 'live' && '🔥 Live Now'}
              {tab === 'upcoming' && '⏳ Starting Soon'}
            </button>
          ))}
        </div>
      </div>

      {/* Arenas Cards Grid */}
      {isLoading ? (
        <div className="p-16 text-center text-neutral-400 font-medium text-sm">
          Loading arenas directory...
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-black/[0.08] text-neutral-500 text-sm">
          No hackathon arenas found for this filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map(event => {
            const status = getEventStatus(event);
            const isSelected = currentEvent?.id === event.id;
            const orgName = event.format_config?.organization || 'Global Tech Alliance';
            const prizePool = event.format_config?.prize_pool || 'Competitive Grant';
            const venue = event.format_config?.venue_type || event.format_config?.mode || 'In-Person / Hybrid';
            const tags = event.format_config?.tags || ['Engineering', 'Hackathon'];
            const sponsors = event.format_config?.sponsors || [];

            return (
              <motion.div
                key={event.id}
                whileHover={{ y: -3 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className={`bg-white rounded-3xl border flex flex-col justify-between overflow-hidden relative group transition-shadow duration-200 cursor-pointer ${
                  isSelected
                    ? 'border-black ring-1 ring-black shadow-apple-card'
                    : 'border-black/[0.08] shadow-apple-card hover:shadow-apple-card-hover'
                }`}
                onClick={() => setSelectedModalEvent(event)}
              >
                {/* Active Indicator Ribbon */}
                {isSelected && (
                  <div className="bg-black text-white text-[10px] font-bold uppercase tracking-wider text-center py-1 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                    Current Selected Arena
                  </div>
                )}

                <div className="p-6">
                  {/* Host Organization */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 text-neutral-600 text-xs font-semibold truncate">
                      <Building2 className="w-3.5 h-3.5 shrink-0 text-black" />
                      <span className="truncate">{orgName}</span>
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${status.badgeColor}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-black tracking-tight leading-snug group-hover:text-neutral-800 transition-colors">
                    {event.title}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-2 line-clamp-2 leading-relaxed">
                    {event.description || 'High-velocity innovation sprint challenging top teams.'}
                  </p>

                  {/* Metadata Chips */}
                  <div className="mt-4 pt-4 border-t border-black/[0.06] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400 flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-black" /> Prize Pool
                      </span>
                      <span className="font-mono font-bold text-black">{prizePool}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-black" /> Mode / Venue
                      </span>
                      <span className="font-medium text-neutral-700 truncate max-w-[140px]">{venue}</span>
                    </div>

                    {sponsors.length > 0 && (
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-neutral-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-black" /> Sponsors
                        </span>
                        <span className="text-[11px] text-neutral-600 font-medium truncate max-w-[150px]">
                          {sponsors.map((s: any) => s.name).slice(0, 2).join(', ')}
                          {sponsors.length > 2 && ` +${sponsors.length - 2}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-black/[0.04]">
                    {tags.slice(0, 3).map((tag: string) => (
                      <span
                        key={tag}
                        className="text-[10px] font-medium bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer Action */}
                <div
                  className="p-4 bg-neutral-50 border-t border-black/[0.06] flex items-center justify-between gap-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setSelectedModalEvent(event)}
                    className="text-[11px] font-semibold text-neutral-600 hover:text-black transition-colors underline cursor-pointer"
                  >
                    View Dossier
                  </button>

                  <Button
                    variant={isSelected ? 'outline' : 'primary'}
                    size="sm"
                    disabled={participatingId === event.id}
                    onClick={() => handleParticipate(event)}
                    className="gap-1.5 rounded-xl text-xs py-1.5 cursor-pointer active:scale-95 transition-transform"
                  >
                    {participatingId === event.id ? (
                      'Entering...'
                    ) : isSelected ? (
                      <>
                        <span>Enter Workspace</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        <span>Participate</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Apple Spring Popup Dossier Modal */}
      <AnimatePresence>
        {selectedModalEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop with Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSelectedModalEvent(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-md cursor-pointer"
            />

            {/* Modal Dialog Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="bg-white rounded-3xl border border-black/[0.08] shadow-2xl max-w-2xl w-full relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Top Bar */}
              <div className="p-6 border-b border-black/[0.06] bg-neutral-50/70 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-black text-white px-2.5 py-0.5 rounded-full">
                      {selectedModalEvent.format_config?.organization_badge || 'Verified Arena'}
                    </span>
                    <span className="text-neutral-300">•</span>
                    <span className="text-xs text-neutral-500 font-semibold flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-black" />
                      {selectedModalEvent.format_config?.organization || 'Host Organization'}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-black tracking-tight">
                    {selectedModalEvent.title}
                  </h2>
                </div>

                <button
                  onClick={() => setSelectedModalEvent(null)}
                  className="w-8 h-8 rounded-full bg-neutral-200 hover:bg-neutral-300 text-neutral-700 flex items-center justify-center transition-colors cursor-pointer shrink-0 active:scale-90"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Apple Quick Metric Highlights */}
              <div className="grid grid-cols-3 divide-x divide-neutral-200 bg-neutral-100/50 border-b border-black/[0.06] text-center py-3.5 px-2">
                <div>
                  <div className="text-[10px] uppercase font-bold text-neutral-400">Prize Pool</div>
                  <div className="text-sm sm:text-base font-mono font-bold text-black mt-0.5">
                    {selectedModalEvent.format_config?.prize_pool || '$50,000'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-neutral-400">Format / Mode</div>
                  <div className="text-xs sm:text-sm font-semibold text-neutral-800 mt-0.5 truncate px-1">
                    {selectedModalEvent.format_config?.mode || 'In-Person'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-neutral-400">Status</div>
                  <div className="text-xs sm:text-sm font-bold text-emerald-700 mt-0.5 uppercase">
                    {getEventStatus(selectedModalEvent).label}
                  </div>
                </div>
              </div>

              {/* Dossier Tabs */}
              <div className="flex border-b border-black/[0.06] px-6 gap-6 text-xs font-semibold overflow-x-auto">
                {(['overview', 'prizes', 'schedule', 'eligibility'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setModalTab(tab)}
                    className={`py-3 relative cursor-pointer capitalize transition-colors ${
                      modalTab === tab ? 'text-black font-bold' : 'text-neutral-400 hover:text-black'
                    }`}
                  >
                    {tab === 'overview' && 'Overview & Sponsors'}
                    {tab === 'prizes' && 'Prizes & Grants'}
                    {tab === 'schedule' && 'Schedule'}
                    {tab === 'eligibility' && 'Rules & Perks'}
                    {modalTab === tab && (
                      <motion.div
                        layoutId="modalTabIndicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Scrollable Dossier Content */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs sm:text-sm">
                {modalTab === 'overview' && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                        Mission Briefing
                      </h4>
                      <p className="text-neutral-600 leading-relaxed text-xs sm:text-sm">
                        {selectedModalEvent.description || 'High-velocity innovation sprint challenging top teams.'}
                      </p>
                    </div>

                    {/* Venue / Location Details */}
                    {selectedModalEvent.format_config?.address && (
                      <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 mb-1">
                          <MapPin className="w-3.5 h-3.5 text-black" />
                          Physical Location / Matrix Hub
                        </div>
                        <div className="text-xs text-neutral-800 font-medium">
                          {selectedModalEvent.format_config.address}
                        </div>
                      </div>
                    )}

                    {/* Official Sponsors Grid */}
                    {selectedModalEvent.format_config?.sponsors && selectedModalEvent.format_config.sponsors.length > 0 && (
                      <div>
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2.5 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-black" />
                          Official Corporate & Foundation Sponsors
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {selectedModalEvent.format_config.sponsors.map((sp: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 flex flex-col justify-between"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-black text-xs">{sp.name}</span>
                                <span className="text-[10px] font-semibold text-neutral-500 bg-white px-2 py-0.5 rounded-md border border-neutral-200">
                                  {sp.tier}
                                </span>
                              </div>
                              <div className="text-[11px] text-neutral-600 mt-1">{sp.perk}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {modalTab === 'prizes' && (
                  <div className="space-y-4">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                      Grand Prize Distribution & Grants
                    </h4>
                    {selectedModalEvent.format_config?.prize_breakdown ? (
                      <div className="space-y-3">
                        {selectedModalEvent.format_config.prize_breakdown.map((pb: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl flex items-start justify-between gap-3"
                          >
                            <div>
                              <div className="font-bold text-black text-xs sm:text-sm">{pb.place}</div>
                              <div className="text-xs text-neutral-500 mt-0.5">{pb.perk}</div>
                            </div>
                            <div className="font-mono font-bold text-sm sm:text-base text-black bg-white px-3 py-1 rounded-xl border border-neutral-200 shrink-0">
                              {pb.amount}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-neutral-500 text-xs">Standard prize pool distribution across top finishers.</p>
                    )}
                  </div>
                )}

                {modalTab === 'schedule' && (
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                      Event Schedule & Critical Milestones
                    </h4>
                    {selectedModalEvent.format_config?.schedule ? (
                      <div className="space-y-2.5">
                        {selectedModalEvent.format_config.schedule.map((item: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-3 bg-neutral-50 border border-neutral-200 rounded-2xl flex items-center gap-3"
                          >
                            <span className="font-mono text-xs font-bold text-black bg-white px-2.5 py-1 rounded-lg border border-neutral-200 shrink-0">
                              {item.time}
                            </span>
                            <span className="text-xs text-neutral-700 font-medium">{item.label}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-neutral-500 text-xs">Full schedule published upon check-in.</p>
                    )}
                  </div>
                )}

                {modalTab === 'eligibility' && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                        Hacker Eligibility & Rules
                      </h4>
                      <p className="text-xs text-neutral-600 leading-relaxed">
                        {selectedModalEvent.format_config?.eligibility ||
                          'Open to all enrolled students and developers worldwide. Teams of 1 to 4 members.'}
                      </p>
                    </div>

                    {selectedModalEvent.format_config?.perks && (
                      <div>
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                          Participant Amenities & Perks
                        </h4>
                        <ul className="space-y-2">
                          {selectedModalEvent.format_config.perks.map((p: string, idx: number) => (
                            <li key={idx} className="text-xs text-neutral-700 flex items-center gap-2">
                              <Check className="w-3.5 h-3.5 text-black shrink-0" />
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 sm:p-5 border-t border-black/[0.06] bg-neutral-50 flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedModalEvent(null)}
                  className="rounded-xl text-xs py-2 cursor-pointer"
                >
                  Close
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  disabled={participatingId === selectedModalEvent.id}
                  onClick={() => handleParticipate(selectedModalEvent)}
                  className="gap-2 rounded-xl text-xs py-2 px-5 bg-black text-white hover:bg-neutral-800 cursor-pointer active:scale-95 transition-transform"
                >
                  <span>
                    {participatingId === selectedModalEvent.id
                      ? 'Entering...'
                      : currentEvent?.id === selectedModalEvent.id
                      ? 'Enter Active Workspace'
                      : 'Participate & Enter Arena'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
