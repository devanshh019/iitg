import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const base = "inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg select-none active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none cursor-pointer";
  
  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-6 py-3 text-base gap-2.5"
  };

  const variantClasses = {
    primary: "bg-cyan-500 hover:bg-cyan-400 text-space-950 font-semibold shadow-glow-cyan",
    secondary: "bg-space-800 hover:bg-space-700 text-slate-100 border border-space-700",
    outline: "bg-transparent hover:bg-space-850 text-cyan-400 border border-cyan-500/50 hover:border-cyan-400",
    danger: "bg-rose-600 hover:bg-rose-500 text-white font-medium",
    ghost: "bg-transparent hover:bg-space-800/60 text-slate-300 hover:text-white"
  };

  return (
    <button
      className={`${base} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};
