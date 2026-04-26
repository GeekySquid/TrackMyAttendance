import React from 'react';
import { LucideIcon } from 'lucide-react';

interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
  error?: string;
  className?: string;
}

export default function CustomInput({
  label,
  icon: Icon,
  error,
  className = "",
  ...props
}: CustomInputProps) {
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label className="text-sm font-black text-gray-700 ml-1 tracking-tight">
          {label}
        </label>
      )}
      
      <div className="relative group">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300">
            <Icon className="w-4 h-4" />
          </div>
        )}
        
        <input
          {...props}
          className={`
            w-full transition-all duration-300 outline-none
            bg-white border text-sm font-bold rounded-xl
            ${Icon ? 'pl-11 pr-4' : 'px-4'} 
            py-2.5 sm:py-3
            ${error 
              ? 'border-red-200 focus:border-red-400 focus:ring-4 focus:ring-red-50' 
              : 'border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50/50 shadow-sm'}
            placeholder:text-gray-400 placeholder:font-medium
            hover:border-gray-300
          `}
        />
        
        {/* Subtle highlight effect */}
        <div className="absolute inset-0 rounded-xl pointer-events-none border border-transparent group-focus-within:border-blue-200/50 transition-all duration-300" />
      </div>
      
      {error && (
        <span className="text-[11px] font-black text-red-500 ml-1 mt-0.5 animate-in fade-in slide-in-from-top-1">
          {error}
        </span>
      )}
    </div>
  );
}
