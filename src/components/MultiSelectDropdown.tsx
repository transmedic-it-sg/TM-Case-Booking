import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
import '../assets/components/MultiSelectDropdown.css';

interface MultiSelectDropdownProps {
  id: string;
  label: string;
  options: readonly string[] | string[];
  value: string[];
  onChange: (selectedValues: string[]) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  id,
  label,
  options,
  value,
  onChange,
  placeholder = "Select options...",
  required = false,
  disabled = false,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ESC key support
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleToggleOption = (option: string) => {
    const newValue = value.includes(option)
      ? value.filter(v => v !== option)
      : [...value, option];
    onChange(newValue);
  };

  const handleSelectAll = () => {
    const filteredOptions = getFilteredOptions();
    const allFilteredSelected = filteredOptions.every(option => value.includes(option));

    if (allFilteredSelected) {
      // Deselect all filtered options
      const newValue = value.filter(v => !filteredOptions.includes(v));
      onChange(newValue);
    } else {
      // Select all filtered options
      const newValue = Array.from(new Set([...value, ...filteredOptions]));
      onChange(newValue);
    }
  };

  const getFilteredOptions = () => {
    if (!searchTerm.trim()) return [...options];

    const term = searchTerm.toLowerCase();
    return options.filter(option =>
      option.toLowerCase().includes(term) ||
      // Fuzzy match: check if all characters of search term appear in order
      term.split('').every((char, index) => {
        const remainingTerm = term.slice(index);
        const optionLower = option.toLowerCase();
        return optionLower.includes(remainingTerm.charAt(0));
      })
    );
  };

  const displayText = useMemo(() => {
    if (value.length === 0) return placeholder;
    if (value.length === 1) return value[0];
    return `${value.length} items selected`;
  }, [value, placeholder]);

  return (
    <div className="form-group">
      <label htmlFor={id} className={required ? "required" : ""}>
        {label}
      </label>
      <div
        ref={dropdownRef}
        className={`custom-multi-select ${className}`}
      >
        <div
          className={`multi-select-trigger ${disabled ? 'disabled' : ''}`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              setIsOpen(!isOpen);
            }
          }}
        >
          <span className={value.length === 0 ? "placeholder" : "selected-text"}>
            {displayText}
          </span>
          <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
        </div>

        {isOpen && !disabled && (
          <div className="multi-select-dropdown-content">
            <div className="dropdown-header">
              <input
                ref={searchInputRef}
                type="text"
                className="search-input"
                placeholder="Search options..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm select-all-btn"
                onClick={handleSelectAll}
              >
                {getFilteredOptions().every(option => value.includes(option)) ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="options-container">
              {getFilteredOptions().map((option) => (
                <label key={option} className="multi-select-option">
                  <input
                    type="checkbox"
                    checked={value.includes(option)}
                    onChange={() => handleToggleOption(option)}
                  />
                  <span className="checkmark"></span>
                  <span className="option-text">{option}</span>
                </label>
              ))}
              {getFilteredOptions().length === 0 && (
                <div className="no-options">No options found</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(MultiSelectDropdown);