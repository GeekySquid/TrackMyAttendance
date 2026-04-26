import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Option {
  value: string;
  label: string;
  icon?: LucideIcon;
}

interface CustomDropdownProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  icon?: LucideIcon;
}

export default function CustomDropdown({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select an option",
  className = "",
  label,
  icon: MainIcon
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && <label className="block text-sm font-black text-gray-700 mb-1.5 ml-1 tracking-tight">{label}</label>}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold transition-all duration-300
          ${isOpen ? 'border-blue-400 ring-4 ring-blue-50/50 shadow-md' : 'hover:border-gray-300 shadow-sm'}
          ${!selectedOption ? 'text-gray-400' : 'text-gray-900'}
          group
        `}
      >
        <div className="flex items-center gap-3 truncate">
          {MainIcon && <MainIcon className={`w-4 h-4 transition-colors ${isOpen ? 'text-blue-500' : 'text-gray-400'}`} />}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-500 ${isOpen ? 'rotate-180 text-blue-500' : 'group-hover:text-gray-600'}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 2, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="absolute z-[100] w-full mt-1.5 bg-white border border-gray-100 rounded-2xl shadow-2xl shadow-blue-900/10 overflow-hidden ring-1 ring-black/5"
          >
            <div className="max-h-[300px] overflow-y-auto p-1.5 custom-scrollbar">
              {options.length === 0 ? (
                <div className="px-4 py-6 text-xs text-gray-400 italic text-center">No options found</div>
              ) : (
                options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-200 group
                      ${value === option.value 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                        : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'}
                    `}
                  >
                    <div className="flex items-center gap-3 truncate">
                      {option.icon && (
                        <option.icon className={`w-4 h-4 transition-colors ${value === option.value ? 'text-white' : 'text-gray-400 group-hover:text-blue-500'}`} />
                      )}
                      <span className="truncate">{option.label}</span>
                    </div>
                    {value === option.value && (
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                      >
                        <Check className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
