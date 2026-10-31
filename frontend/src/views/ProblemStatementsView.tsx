import React, { useState, useEffect } from 'react';
import { FileCode2, Clock, CheckCircle2, AlertCircle, Shield, ArrowRight, Sparkles, BookOpen } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { apiFetch } from '../api/client';

interface ProblemStatementsViewProps {
  eventId?: string;
}

export const ProblemStatementsView: React.FC<ProblemStatementsViewProps> = ({ eventId = 'apollo-24' }) => {
  const [missionData, setMissionData] = useState<any>(null);
  const [selectedPsId, setSelectedPsId] = useState<string | null>(() => {
    return localStorage.getItem('whycode4u_selected_ps') || 'ps-ai-1';
  });
  const [timeLeft, setTimeLeft] = useState('11:42:18');
  const [isRevealed, setIsRevealed] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const problemStatements = [
    {
      id: 'ps-ai-1',
      track: 'AI & Machine Learning',
      title: 'Autonomous Real-time Edge Diagnostics',
      stage: 'Phase 1: Active Development',
      description: 'Develop low-latency machine learning models that process telemetry data directly on edge devices to predict system bottlenecks before failure occurs.',
      requirements: ['Sub-50ms inference latency', 'Model interpretability dashboard', 'Synthetic data benchmark'],
      rules: 'Pre-trained foundation models allowed with attribution; fine-tuning code must be original.'
    },
    {
      id: 'ps-sys-2',
      track: 'High-Reliability Distributed Systems',
      title: 'Byzantine Fault-Tolerant State Synchronization',
      stage: 'Phase 1: Active Development',
      description: 'Architect a peer-to-peer data replication protocol that maintains data consistency and zero data loss under high network latency and packet loss.',
      requirements: ['Deterministic state machine replication', 'Conflict-free replicated data types (CRDT)', 'Live fault injection demo'],
      rules: 'Must run locally on Docker; zero external proprietary cloud dependencies required.'
    },
    {
      id: 'ps-open-3',
      track: 'Open Innovation & Web Tech',
      title: 'Next-Generation Developer Tooling & Automation',
      stage: 'Phase 1: Active Development',
      description: 'Create developer-first tools that automate tedious workflows, code verification, continuous reliability checks, or multimodal agentic coding assistants.',
      requirements: ['Interactive web UI', 'CLI or extension interface', 'Extensible plugin architecture'],
      rules: 'Open source license required for demo codebase.'
    }
  ];

  useEffect(() => {
    loadEventData();
  }, [eventId]);

  const loadEventData = async () => {
    try {
      const ev = await apiFetch(`/events/by-slug/${eventId}`);
      setMissionData(ev);
    } catch (e) {}
  };

  const handleSelectPs = (psId: string) => {
    setSelectedPsId(psId);
    localStorage.setItem('whycode4u_selected_ps', psId);
    setSuccessMsg('Problem Statement selected for your team!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto text-black">
      {/* Top Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-black/[0.08] shadow-apple-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-black">
                Problem Statements Live
              </span>
              <span className="text-neutral-300">•</span>
              <span className="text-xs text-neutral-500 font-medium">WhyCode4U Official</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-black tracking-tight">
              Problem Statements & Challenges
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-xl">
              Choose your team's challenge track. All submissions will be evaluated against the rubric for your selected problem statement.
            </p>
          </div>

          <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-center shrink-0">
            <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Time Left to Build</div>
            <div className="text-xl sm:text-2xl font-mono font-black text-black mt-0.5 tracking-tight">{timeLeft}</div>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-neutral-50 border border-neutral-300 rounded-2xl text-xs text-black font-medium flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Hackathon Rules & Event Flow Accordion/Card */}
      <Card className="bg-white rounded-3xl">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-black" />
          <h3 className="font-bold text-sm text-black uppercase tracking-wide">
            Hackathon Rules & Event Flow
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-neutral-600">
          <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/60">
            <span className="font-bold text-black block mb-1">1. Originality</span>
            All prototype code must be written during the 24-hour sprint. Open-source libraries are permitted.
          </div>
          <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/60">
            <span className="font-bold text-black block mb-1">2. Team Limits</span>
            Teams can have 1 to 4 members. Every member must be checked in with their QR pass.
          </div>
          <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/60">
            <span className="font-bold text-black block mb-1">3. Deliverables</span>
            Your submission must include a public Git repository, live deployment URL, and presentation deck.
          </div>
          <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/60">
            <span className="font-bold text-black block mb-1">4. Hard Deadline</span>
            Submissions freeze strictly at T-00:00. Once the deadline passes, no late edits are accepted.
          </div>
        </div>
      </Card>

      {/* List of Problem Statements */}
      <div className="space-y-4">
        {problemStatements.map((ps) => {
          const isSelected = selectedPsId === ps.id;
          return (
            <Card
              key={ps.id}
              className={`transition-all rounded-3xl p-5 sm:p-6 ${
                isSelected
                  ? 'border-black ring-1 ring-black bg-white shadow-apple-lift'
                  : 'border-black/[0.08] hover:border-black/20 bg-white'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-black bg-neutral-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {ps.track}
                    </span>
                    <span className="text-[11px] text-neutral-400 font-medium">{ps.stage}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-black tracking-tight">{ps.title}</h3>
                </div>

                {isSelected ? (
                  <Badge variant="black" className="shrink-0 self-start sm:self-auto gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Selected Track</span>
                  </Badge>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectPs(ps.id)}
                    className="text-xs shrink-0 self-start sm:self-auto rounded-xl"
                  >
                    Select this PS
                  </Button>
                )}
              </div>

              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed mt-2">{ps.description}</p>

              <div className="mt-4 pt-3 border-t border-neutral-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="font-bold text-black uppercase text-[10px] tracking-wider block mb-1">
                    Key Deliverables:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-neutral-500 text-[11px]">
                    {ps.requirements.map((req, rIdx) => (
                      <li key={rIdx}>{req}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="font-bold text-black uppercase text-[10px] tracking-wider block mb-1">
                    Track Specific Rule:
                  </span>
                  <p className="text-neutral-500 text-[11px] leading-relaxed">{ps.rules}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
