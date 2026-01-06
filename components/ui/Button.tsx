import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '',
  ...props 
}) => {
  const baseStyles = "py-4 px-6 rounded-full font-bold text-sm tracking-wide transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 shadow-sm";
  
  const variants = {
    primary: "bg-[#6750A4] text-white hover:bg-[#5a4690] active:bg-[#4f3d7e]",
    secondary: "bg-[#10b981] text-white hover:bg-emerald-600 active:bg-emerald-700",
    danger: "bg-[#b3261e] text-white hover:bg-[#8c1d18]",
    ghost: "bg-transparent text-[#6750A4] dark:text-brand-primary hover:bg-brand-primary/5"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};