import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'cyan' | 'amber' | 'emerald' | 'rose' | 'purple' | 'slate';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'cyan',
  size = 'md',
  className = ''
}) => {
  const variantStyles = {
    cyan: 'bg-cyan-950/80 text-cyan-400 border border-cyan-500/40',
    amber: 'bg-amber-950/80 text-amber-400 border border-amber-500/40',
    emerald: 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40',
    rose: 'bg-rose-950/80 text-rose-400 border border-rose-500/40',
    purple: 'bg-purple-950/80 text-purple-400 border border-purple-500/40',
    slate: 'bg-space-800 text-slate-300 border border-space-700'
  }[variant];

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs'
  }[size];

  return (
    <span className={`inline-flex items-center font-mono font-medium rounded-full ${variantStyles} ${sizeStyles} ${className}`}>
      {children}
    </span>
  );
};
