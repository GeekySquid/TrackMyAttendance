import React, { useRef } from 'react';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';

interface CustomDateInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  placeholder?: string;
}

export default function CustomDateInput({
  value,
  onChange,
  label,
  className = "",
  placeholder = "Select date"
}: CustomDateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Format the date for display: e.g., "2026-04-26" -> "26 Apr 2026"
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return placeholder;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const handleClick = () => {
    // Trigger the hidden date input
    if (inputRef.current) {
      if ('showPicker' in HTMLInputElement.prototype) {
        try {
          (inputRef.current as any).showPicker();
        } catch (e) {
          inputRef.current.click();
        }
      } else {
        inputRef.current.click();
      }
    }
  };

  return (
    <div className={`group ${className}`}>
      {label && <label className="block text-sm font-black text-gray-700 mb-1.5 ml-1 tracking-tight">{label}</label>}
      
      <div className="relative">
        {/* Hidden Native Input - Overlaying the entire area but invisible */}
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-20 appearance-none bg-transparent"
          style={{ 
            color: 'transparent',
            backgroundColor: 'transparent'
          }}
        />

        {/* Premium Display Button */}
        <button
          type="button"
          tabIndex={-1}
          className="w-full flex items-center justify-between px-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold transition-all duration-300 hover:border-blue-400 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-50/50 group-active:scale-[0.98] z-10 relative"
        >
          <div className="flex items-center gap-3 truncate">
            <div className={`p-1.5 rounded-lg transition-colors ${value ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500'}`}>
              <CalendarIcon className="w-4 h-4" />
            </div>
            <span className={!value ? 'text-gray-400 font-medium' : 'text-gray-900'}>
              {formatDateDisplay(value)}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors duration-300" />
        </button>

        {/* Mobile Highlight Overlay */}
        <div className="absolute inset-0 rounded-xl pointer-events-none border border-transparent group-active:border-blue-200 group-active:bg-blue-50/10 transition-all duration-200" />
      </div>
      
      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
          cursor: pointer;
          opacity: 0;
        }
        input[type="date"]::-webkit-inner-spin-button,
        input[type="date"]::-webkit-clear-button {
          display: none;
          -webkit-appearance: none;
        }
      `}</style>
    </div>
  );
}
