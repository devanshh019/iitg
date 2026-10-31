import React, { useState, useEffect } from 'react';
import { Compass, Trophy, MapPin, Building2, Calendar, Clock, ArrowRight, CheckCircle2, Sparkles, Shield, Tag } from 'lucide-react';
import { Card } from '../components/ui/Card';
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
  const [now, setNow] = useState<Date>(new Date());

  // Real-time clock tick for countdowns
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
        // Automatically route to Problem Statements to see live timer & challenges
        onNavigate('problems');
      }, 500);
    } catch (err) {
      console.error(err);
      setParticipatingId(null);
      selectEvent(event);
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
      {/* Apple Hero Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/[0.08] shadow-apple-card relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-black">
                Multi-Organization Hackathons
              </span>
              <span className="text-neutral-300">•</span>
              <span className="text-xs text-neutral-500 font-medium">WhyCode4U Network</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black">
              Explore & Participate in Hackathons
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1.5 leading-relaxed">
              Select an active mission hosted by world-class universities and engineering foundations. Enter with 1-click, inspect sealed countdowns, lock your problem statement, and launch your project.
            </p>
          </div>

          <div className="flex sm:flex-col gap-2 shrink-0">
            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-center flex-1 sm:w-36">
              <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Active Events</div>
              <div className="text-2xl font-mono font-bold text-black mt-0.5">{events.length}</div>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-black/[0.06]">
          {(['all', 'live', 'upcoming'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                filter === tab
                  ? 'bg-black text-white shadow-sm'
                  : 'bg-neutral-100 text-neutral-600 hover:text-black hover:bg-neutral-200'
              }`}
            >
              {tab === 'all' && 'All Hackathons'}
              {tab === 'live' && '🔥 Live Now'}
              {tab === 'upcoming' && '⏳ Starting Soon'}
            </button>
          ))}
        </div>
      </div>

      {/* Hackathons Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-neutral-400 font-medium text-sm">
          Loading hackathons directory...
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-black/[0.08] text-neutral-500 text-sm">
          No hackathons found matching this filter.
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

            return (
              <div
                key={event.id}
                className={`bg-white rounded-3xl border transition-all duration-200 flex flex-col justify-between overflow-hidden relative group hover:shadow-apple-card-hover ${
                  isSelected
                    ? 'border-black ring-1 ring-black shadow-apple-card'
                    : 'border-black/[0.08] shadow-apple-card'
                }`}
              >
                {/* Active Indicator Ribbon */}
                {isSelected && (
                  <div className="bg-black text-white text-[10px] font-bold uppercase tracking-wider text-center py-1 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                    Current Selected Hackathon
                  </div>
                )}

                <div className="p-6">
                  {/* Host Organization */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 text-neutral-500 text-xs font-semibold truncate">
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
                  <h3 className="text-base font-bold text-black tracking-tight leading-snug group-hover:text-black">
                    {event.title}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-2 line-clamp-3 leading-relaxed">
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
                      <span className="font-medium text-neutral-700 truncate max-w-[150px]">{venue}</span>
                    </div>
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
                <div className="p-4 bg-neutral-50 border-t border-black/[0.06] flex items-center justify-between gap-3">
                  <div className="text-[11px] text-neutral-500">
                    {status.type === 'upcoming' ? (
                      <span className="font-mono font-medium text-neutral-700">Sealed Teaser</span>
                    ) : (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        PS Available
                      </span>
                    )}
                  </div>

                  <Button
                    variant={isSelected ? 'outline' : 'primary'}
                    size="sm"
                    disabled={participatingId === event.id}
                    onClick={() => handleParticipate(event)}
                    className="gap-1.5 rounded-xl text-xs py-1.5 cursor-pointer"
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
