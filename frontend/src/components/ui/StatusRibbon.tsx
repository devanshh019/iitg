import React from 'react';
import { CheckCircle2, Circle, Rocket, Shield, QrCode, Award, Terminal } from 'lucide-react';

export type MissionStage = 'registered' | 'squad_locked' | 'boarded' | 'launched' | 'reviewed' | 'debrief';

interface StatusRibbonProps {
  currentStage: MissionStage | string;
}

const STAGES: Array<{ key: MissionStage; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'registered', label: 'Registered', icon: Terminal },
  { key: 'squad_locked', label: 'Squad Locked', icon: Shield },
  { key: 'boarded', label: 'Boarded', icon: QrCode },
  { key: 'launched', label: 'Launched', icon: Rocket },
  { key: 'reviewed', label: 'Reviewed', icon: CheckCircle2 },
  { key: 'debrief', label: 'Debrief', icon: Award }
];

export const StatusRibbon: React.FC<StatusRibbonProps> = ({ currentStage }) => {
  const currentIndex = STAGES.findIndex(s => s.key === currentStage);
  const activeIdx = currentIndex === -1 ? 0 : currentIndex;

  return (
    <div className="w-full bg-space-900/90 backdrop-blur-md border border-space-800 rounded-xl p-3 my-4 overflow-x-auto shadow-glass">
      <div className="flex items-center justify-between min-w-[550px] relative">
        {/* Connecting progress track */}
        <div className="absolute top-1/2 left-6 right-6 h-0.5 bg-space-800 -translate-y-1/2 -z-0" />
        <div
          className="absolute top-1/2 left-6 h-0.5 bg-gradient-to-r from-cyan-500 to-amber-500 -translate-y-1/2 -z-0 transition-all duration-500"
          style={{ width: `${(activeIdx / (STAGES.length - 1)) * 90}%` }}
        />

        {STAGES.map((stage, idx) => {
          const isDone = idx < activeIdx;
          const isCurrent = idx === activeIdx;
          const Icon = stage.icon;

          return (
            <div key={stage.key} className="flex flex-col items-center z-10">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isDone
                    ? 'bg-cyan-500 text-space-950 shadow-glow-cyan'
                    : isCurrent
                    ? 'bg-amber-500 text-space-950 ring-4 ring-amber-500/30 animate-pulse'
                    : 'bg-space-800 text-slate-500 border border-space-700'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span
                className={`mt-1.5 text-xs font-mono tracking-tight font-medium ${
                  isCurrent ? 'text-amber-400 font-bold' : isDone ? 'text-cyan-400' : 'text-slate-500'
                }`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
