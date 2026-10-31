import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: 'cyan' | 'amber' | 'none';
  variant?: 'default' | 'glass' | 'subtle';
}

export const Card: React.FC<CardProps> = ({
  children,
  glow = 'none',
  variant = 'glass',
  className = '',
  ...props
}) => {
  const glowClass = {
    cyan: 'border-cyan-500/30 shadow-glow-cyan',
    amber: 'border-amber-500/30 shadow-glow-amber',
    none: 'border-space-800'
  }[glow];

  const variantClass = {
    glass: 'bg-space-900/80 backdrop-blur-xl border',
    default: 'bg-space-900 border',
    subtle: 'bg-space-950/60 border border-space-850'
  }[variant];

  return (
    <div className={`rounded-xl p-5 ${variantClass} ${glowClass} ${className}`} {...props}>
      {children}
    </div>
  );
};
