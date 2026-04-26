import React from 'react';
import { LucideIcon } from 'lucide-react';

interface CustomTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  icon?: LucideIcon;
}

export default function CustomTextarea({ label, icon: Icon, ...props }: CustomTextareaProps) {
  return (
    <div className="space-y-1.5 group">
      {label && <label className="block text-sm font-black text-gray-700 ml-1 tracking-tight">{label}</label>}
      <div className="relative">
        {Icon && (
          <div className="absolute left-4 top-4 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <textarea 
          {...props}
          className={`w-full border border-gray-200 rounded-2xl ${Icon ? 'pl-12' : 'px-5'} pr-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-50/50 focus:border-blue-400 transition-all shadow-sm placeholder:text-gray-400 placeholder:font-medium hover:border-gray-300 min-h-[120px] resize-none ${props.className || ''}`}
        />
      </div>
    </div>
  );
}
