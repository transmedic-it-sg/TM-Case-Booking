import React, { useState, useRef, useEffect, useMemo } from 'react';
import '../assets/components/SimpleMultiSelectDropdown.css';

interface SimpleMultiSelectDropdownProps {
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

const SimpleMultiSelectDropdown: React.FC<SimpleMultiSelectDropdownProps> = ({
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
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) {
      return options.slice(0, 100); // Limit initial results
    }

    const termLower = searchTerm.toLowerCase();
    return options
      .filter(option => option.toLowerCase().includes(termLower))
      .slice(0, 50); // Limit filtered results
  }, [options, searchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex(prev =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setFocusedIndex(prev =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
        }
        break;
      case 'Enter':
        if (isOpen) {
          e.preventDefault();
          if (focusedIndex >= 0 && filteredOptions[focusedIndex]) {
            handleToggleOption(filteredOptions[focusedIndex]);
          }
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
        inputRef.current?.blur();
        break;
      case 'Tab':
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
        break;
    }
  };

  const handleToggleOption = (option: string) => {
    const newValue = value.includes(option)
      ? value.filter(v => v !== option)
      : [...value, option];
    onChange(newValue);
    setFocusedIndex(-1);
  };

  const handleInputClick = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm('');
      setFocusedIndex(-1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    setIsOpen(true);
    setFocusedIndex(-1);
  };

  // Display text for selected values
  const displayValue = useMemo(() => {
    if (value.length === 0) return '';
    if (value.length === 1) return value[0];
    return `${value.length} items selected`;
  }, [value]);

  const inputDisplayValue = isOpen ? searchTerm : displayValue;

  return (
    <div className="form-group">
      <label htmlFor={id} className={required ? "required" : ""}>
        {label}
      </label>
      <div
        ref={dropdownRef}
        className={`simple-multi-select-dropdown ${className} ${disabled ? 'disabled' : ''}`}
      >
        <div className="dropdown-input-container">
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={inputDisplayValue}
            onChange={handleInputChange}
            onClick={handleInputClick}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`dropdown-input ${value.length > 0 ? 'has-value' : ''}`}
            disabled={disabled}
            required={required}
            autoComplete="off"
          />
          <button
            type="button"
            className={`dropdown-arrow ${isOpen ? 'open' : ''}`}
            onClick={handleInputClick}
            disabled={disabled}
            tabIndex={-1}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {isOpen && !disabled && (
          <div className="dropdown-options">
            {/* Selected items summary */}
            {value.length > 0 && (
              <div className="selected-summary">
                <span className="selected-count">{value.length} selected</span>
                <button
                  type="button"
                  className="clear-all-btn"
                  onClick={() => onChange([])}
                >
                  Clear all
                </button>
              </div>
            )}

            {filteredOptions.length > 0 ? (
              <>
                {searchTerm && (
                  <div className="search-info">
                    {filteredOptions.length} result{filteredOptions.length !== 1 ? 's' : ''} found
                  </div>
                )}
                {filteredOptions.map((option, index) => {
                  const isSelected = value.includes(option);
                  return (
                    <div
                      key={option}
                      className={`dropdown-option ${index === focusedIndex ? 'focused' : ''} ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleToggleOption(option)}
                      onMouseEnter={() => setFocusedIndex(index)}
                    >
                      <div className="option-content">
                        <div className="option-checkbox">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Handle via onClick
                            tabIndex={-1}
                          />
                          <span className="checkbox-mark">{isSelected ? '✓' : ''}</span>
                        </div>
                        <span className="option-text">
                          {/* Highlight matching characters */}
                          {searchTerm ? (
                            <span dangerouslySetInnerHTML={{
                              __html: option.replace(
                                new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
                                '<mark>$1</mark>'
                              )
                            }} />
                          ) : (
                            option
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="no-results">
                No results found for "{searchTerm}"
              </div>
            )}
          </div>
        )}

        {/* Show selected items below the dropdown */}
        {value.length > 0 && !isOpen && (
          <div className="selected-items-display">
            {value.map((item, index) => (
              <span key={item} className="selected-item-tag">
                {item}
                <button
                  type="button"
                  className="remove-item-btn"
                  onClick={() => handleToggleOption(item)}
                  title={`Remove ${item}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleMultiSelectDropdown;