import React from 'react';
import { Check, Shield, QrCode, Rocket, CheckCircle2, Award, Terminal } from 'lucide-react';

export type MissionStage = 'registered' | 'squad_locked' | 'boarded' | 'launched' | 'reviewed' | 'debrief';

interface StatusRibbonProps {
  currentStage: MissionStage | string;
}

const STAGES: Array<{ key: MissionStage; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'registered', label: '1. Register', icon: Terminal },
  { key: 'squad_locked', label: '2. Team Ready', icon: Shield },
  { key: 'boarded', label: '3. Checked In', icon: QrCode },
  { key: 'launched', label: '4. Submitted', icon: Rocket },
  { key: 'reviewed', label: '5. Reviewed', icon: CheckCircle2 }
];

export const StatusRibbon: React.FC<StatusRibbonProps> = ({ currentStage }) => {
  const currentIndex = STAGES.findIndex(s => s.key === currentStage);
  const activeIdx = currentIndex === -1 ? 0 : currentIndex;

  return (
    <div className="w-full bg-white border border-black/[0.08] rounded-2xl p-4 my-3 overflow-x-auto shadow-apple-sm">
      <div className="flex items-center justify-between min-w-[460px] relative px-4">
        {/* Track line */}
        <div className="absolute top-4 left-8 right-8 h-[2px] bg-neutral-200 -z-0" />
        <div
          className="absolute top-4 left-8 h-[2px] bg-black -z-0 transition-all duration-300"
          style={{ width: `${(activeIdx / (STAGES.length - 1)) * 88}%` }}
        />

        {STAGES.map((stage, idx) => {
          const isDone = idx < activeIdx;
          const isCurrent = idx === activeIdx;

          return (
            <div key={stage.key} className="flex flex-col items-center z-10">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isDone
                    ? 'bg-black text-white shadow-sm'
                    : isCurrent
                    ? 'bg-black text-white ring-4 ring-neutral-200 shadow-sm'
                    : 'bg-white text-neutral-400 border border-neutral-300'
                }`}
              >
                {isDone ? (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <span className="text-xs font-semibold">{idx + 1}</span>
                )}
              </div>
              <span
                className={`mt-1.5 text-xs tracking-tight ${
                  isCurrent
                    ? 'text-black font-bold'
                    : isDone
                    ? 'text-neutral-700 font-medium'
                    : 'text-neutral-400'
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
