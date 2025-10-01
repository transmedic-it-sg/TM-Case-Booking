/**
 * Fuzzy Search Dropdown Component
 * Reusable dropdown with fuzzy search functionality for Edit Sets
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import './FuzzySearchDropdown.css';

interface DropdownOption {
  id: string;
  name: string;
  description?: string;
  [key: string]: any;
}

interface FuzzySearchDropdownProps {
  options: DropdownOption[];
  value?: DropdownOption | null;
  onChange: (option: DropdownOption | null) => void;
  placeholder: string;
  label: string;
  disabled?: boolean;
  clearable?: boolean;
  isLoading?: boolean;
  emptyMessage?: string;
}

// Simple fuzzy search function
const fuzzySearch = (query: string, text: string): number => {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  if (textLower.includes(queryLower)) {
    return textLower.indexOf(queryLower);
  }
  
  // Character-by-character fuzzy matching
  let queryIndex = 0;
  let score = 0;
  
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
      score += (textLower.length - i); // Prefer earlier matches
    }
  }
  
  return queryIndex === queryLower.length ? score : -1;
};

const FuzzySearchDropdown: React.FC<FuzzySearchDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder,
  label,
  disabled = false,
  clearable = true,
  isLoading = false,
  emptyMessage = "No options available"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter and sort options based on fuzzy search
  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    
    const scored = options
      .map(option => ({
        option,
        score: fuzzySearch(searchQuery, option.name + ' ' + (option.description || ''))
      }))
      .filter(item => item.score >= 0)
      .sort((a, b) => b.score - a.score);
    
    return scored.map(item => item.option);
  }, [options, searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlighted index when filtered options change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredOptions]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        setSearchQuery('');
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        break;
    }
  };

  const handleSelect = (option: DropdownOption) => {
    onChange(option);
    setIsOpen(false);
    setSearchQuery('');
    inputRef.current?.blur();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearchQuery('');
  };

  const displayValue = value ? value.name : '';

  return (
    <div className={`fuzzy-dropdown ${disabled ? 'disabled' : ''}`} ref={dropdownRef}>
      <label className="fuzzy-dropdown-label">{label}</label>
      
      <div className={`fuzzy-dropdown-container ${isOpen ? 'open' : ''}`}>
        <div 
          className="fuzzy-dropdown-input-wrapper"
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <input
            ref={inputRef}
            type="text"
            className="fuzzy-dropdown-input"
            value={isOpen ? searchQuery : displayValue}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isOpen ? "Type to search..." : placeholder}
            disabled={disabled}
            readOnly={!isOpen}
          />
          
          <div className="fuzzy-dropdown-icons">
            {clearable && value && !disabled && (
              <button
                type="button"
                className="fuzzy-dropdown-clear"
                onClick={handleClear}
                tabIndex={-1}
              >
                ✕
              </button>
            )}
            <div className={`fuzzy-dropdown-arrow ${isOpen ? 'open' : ''}`}>
              ▼
            </div>
          </div>
        </div>

        {isOpen && (
          <div className="fuzzy-dropdown-menu">
            {isLoading ? (
              <div className="fuzzy-dropdown-loading">
                <div className="spinner-small"></div>
                Loading...
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="fuzzy-dropdown-empty">
                {searchQuery ? `No results for "${searchQuery}"` : emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <div
                  key={option.id}
                  className={`fuzzy-dropdown-option ${
                    index === highlightedIndex ? 'highlighted' : ''
                  } ${value?.id === option.id ? 'selected' : ''}`}
                  onClick={() => handleSelect(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <div className="option-name">{option.name}</div>
                  {option.description && (
                    <div className="option-description">{option.description}</div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FuzzySearchDropdown;