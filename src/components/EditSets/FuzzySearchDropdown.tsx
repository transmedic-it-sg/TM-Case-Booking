/**
 * Fuzzy Search Dropdown Component
 * Reusable dropdown with fuzzy search functionality for Edit Sets
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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

// Optimized search function with early returns and better scoring
const optimizedSearch = (query: string, text: string): number => {
  // CRITICAL FIX: Add null safety for query and text
  if (!query || !text) return -1;
  
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // Exact match gets highest priority
  if (textLower === queryLower) return 1000;
  
  // Starts with query gets high priority
  if (textLower.startsWith(queryLower)) return 500 + (100 - queryLower.length);
  
  // Contains query gets medium priority
  const containsIndex = textLower.indexOf(queryLower);
  if (containsIndex !== -1) return 200 - containsIndex;

  // Simple fuzzy match for remaining cases (limited to short queries for performance)
  if (queryLower.length <= 3) {
    let queryIndex = 0;
    let lastMatchIndex = -1;
    
    for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
      if (textLower[i] === queryLower[queryIndex]) {
        queryIndex++;
        lastMatchIndex = i;
      }
    }
    
    if (queryIndex === queryLower.length) {
      return 50 - lastMatchIndex; // Prefer earlier character matches
    }
  }

  return -1; // No match
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
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Debounce search query to reduce computation
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 150);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  // Filter and sort options based on optimized search
  const filteredOptions = useMemo(() => {
    // CRITICAL FIX: Add null safety for options array
    if (!options || !Array.isArray(options)) return [];
    
    if (!debouncedQuery.trim()) return options.slice(0, 100); // Limit initial results for performance

    const scored = options
      .filter(option => option && option.name) // Filter out null/undefined options
      .map(option => ({
        option,
        score: optimizedSearch(debouncedQuery, option.name + ' ' + (option.description || ''))
      }))
      .filter(item => item.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50); // Limit results to prevent lag

    return scored.map(item => item.option);
  }, [options, debouncedQuery]);

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

  const handleSelect = useCallback((option: DropdownOption) => {
    onChange(option);
    setIsOpen(false);
    setSearchQuery('');
    setDebouncedQuery('');
    inputRef.current?.blur();
  }, [onChange]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearchQuery('');
    setDebouncedQuery('');
  }, [onChange]);

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