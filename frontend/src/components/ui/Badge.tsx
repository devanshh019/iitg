import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'black' | 'neutral' | 'emerald' | 'amber' | 'rose' | 'maroon' | 'cyan' | 'slate';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'black',
  size = 'md',
  className = ''
}) => {
  const variantStyles = {
    black: 'bg-black text-white',
    neutral: 'bg-neutral-100 text-neutral-900 border border-neutral-200/80',
    maroon: 'bg-black text-white',
    cyan: 'bg-black text-white',
    slate: 'bg-neutral-100 text-neutral-800 border border-neutral-200',
    emerald: 'bg-neutral-50 text-emerald-900 border border-emerald-200',
    amber: 'bg-neutral-50 text-amber-900 border border-amber-200',
    rose: 'bg-neutral-50 text-rose-900 border border-rose-200'
  }[variant] || 'bg-black text-white';

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px] font-semibold tracking-wide',
    md: 'px-2.5 py-1 text-xs font-semibold tracking-wide'
  }[size];

  return (
    <span className={`inline-flex items-center rounded-full font-sans uppercase ${variantStyles} ${sizeStyles} ${className}`}>
      {children}
    </span>
  );
};
