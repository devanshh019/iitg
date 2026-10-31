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
  // Apple HIG physics: direct response on press with scale-[0.97]
  const base = "inline-flex items-center justify-center font-medium transition-all duration-120 rounded-xl select-none active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none cursor-pointer";
  
  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-5 py-2.5 text-base gap-2"
  };

  const variantClasses = {
    // Solid deep black with white text - high contrast, never washed out
    primary: "bg-black hover:bg-neutral-800 text-white font-medium shadow-sm active:bg-neutral-900 border border-black",
    // Apple light neutral surface
    secondary: "bg-neutral-100 hover:bg-neutral-200 text-black font-medium border border-neutral-200 shadow-apple-sm",
    // Crisp white button with clean black hairline border
    outline: "bg-white hover:bg-neutral-50 text-black font-medium border border-black/20 hover:border-black/40 shadow-apple-sm",
    danger: "bg-red-600 hover:bg-red-700 text-white font-medium shadow-apple-sm",
    ghost: "bg-transparent hover:bg-black/5 text-neutral-700 hover:text-black"
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
