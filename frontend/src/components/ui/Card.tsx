import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'subtle';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  const variantClass = {
    glass: 'bg-white/95 backdrop-blur-md border border-black/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.03)]',
    default: 'bg-white border border-black/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.04)]',
    subtle: 'bg-neutral-50/80 border border-black/[0.06]'
  }[variant];

  return (
    <div className={`rounded-2xl p-5 text-black transition-all ${variantClass} ${className}`} {...props}>
      {children}
    </div>
  );
};
