import React from 'react';
import { motion } from 'framer-motion';

interface CustomToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
}

export default function CustomToggle({ checked, onChange, disabled, label, description }: CustomToggleProps) {
  return (
    <div className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl hover:bg-gray-50/50 transition-colors group">
      <div className="flex-1 pr-4">
        {label && <h4 className="text-sm font-black text-gray-800 tracking-tight">{label}</h4>}
        {description && <p className="text-[11px] font-bold text-gray-500 mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          checked ? 'bg-blue-600' : 'bg-gray-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
