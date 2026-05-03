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
    <div className={className}>
      {label && <label className="block text-sm font-black text-gray-700 mb-2.5 ml-1 tracking-tight">{label}</label>}
      
      <div className="relative isolate" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold transition-all duration-300 relative z-20
            ${isOpen ? 'border-blue-400 ring-4 ring-blue-50/50 shadow-md' : 'hover:border-gray-300 shadow-sm'}
            ${!selectedOption ? 'text-gray-400' : 'text-gray-900'}
            group
          `}
        >
          <div className="flex items-center gap-3 truncate">
            {MainIcon && <MainIcon className={`w-4 h-4 transition-colors ${isOpen ? 'text-blue-500' : 'text-gray-400'}`} />}
            <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3, ease: "anticipate" }}
          >
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-colors ${isOpen ? 'text-blue-500' : 'group-hover:text-gray-600'}`} />
          </motion.div>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute z-10 top-[calc(100%+6px)] left-0 w-full bg-white/95 backdrop-blur-xl border border-gray-100 rounded-2xl shadow-2xl shadow-blue-900/15 overflow-hidden ring-1 ring-black/5"
            >
              <div className="max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
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
                        mb-1 last:mb-0
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
    </div>
  );
}
