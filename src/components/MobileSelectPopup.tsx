import React, { useState, useEffect } from 'react';
import './MobileSelectPopup.css';

interface MobileSelectPopupProps {
  isOpen: boolean;
  onClose: () => void;
  options: string[] | { value: string; label: string }[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  title?: string;
  placeholder?: string;
  searchable?: boolean;
}

const MobileSelectPopup: React.FC<MobileSelectPopupProps> = ({
  isOpen,
  onClose,
  options,
  value,
  onChange,
  multiple = false,
  title = 'Select an option',
  placeholder = 'Search...',
  searchable = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedValues, setSelectedValues] = useState<string[]>([]);

  useEffect(() => {
    if (multiple) {
      setSelectedValues(Array.isArray(value) ? value : [value].filter(Boolean));
    } else {
      setSelectedValues(value ? [value as string] : []);
    }
  }, [value, multiple]);

  if (!isOpen) return null;

  const normalizedOptions = options.map(opt => 
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const filteredOptions = normalizedOptions.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (optionValue: string) => {
    if (multiple) {
      const newValues = selectedValues.includes(optionValue)
        ? selectedValues.filter(v => v !== optionValue)
        : [...selectedValues, optionValue];
      setSelectedValues(newValues);
    } else {
      onChange(optionValue);
      onClose();
    }
  };

  const handleDone = () => {
    if (multiple) {
      onChange(selectedValues);
    }
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="mobile-select-backdrop"
        onClick={onClose}
      />
      
      {/* Popup */}
      <div className="mobile-select-popup">
        {/* Header */}
        <div className="mobile-select-header">
          <button 
            className="mobile-select-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
          <h3 className="mobile-select-title">{title}</h3>
          {multiple && (
            <button 
              className="mobile-select-done"
              onClick={handleDone}
            >
              Done
            </button>
          )}
        </div>

        {/* Search bar */}
        {searchable && (
          <div className="mobile-select-search">
            <input
              type="text"
              className="mobile-select-search-input"
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
            {searchTerm && (
              <button
                className="mobile-select-clear-search"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* Options list */}
        <div className="mobile-select-options">
          {filteredOptions.length === 0 ? (
            <div className="mobile-select-empty">
              No options found
            </div>
          ) : (
            filteredOptions.map(option => (
              <button
                key={option.value}
                className={`mobile-select-option ${
                  selectedValues.includes(option.value) ? 'selected' : ''
                }`}
                onClick={() => handleSelect(option.value)}
              >
                <span className="mobile-select-option-label">
                  {option.label}
                </span>
                {multiple && (
                  <span className="mobile-select-checkbox">
                    {selectedValues.includes(option.value) ? '✓' : ''}
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Selection summary for multiple */}
        {multiple && selectedValues.length > 0 && (
          <div className="mobile-select-summary">
            {selectedValues.length} item{selectedValues.length !== 1 ? 's' : ''} selected
          </div>
        )}
      </div>
    </>
  );
};

export default MobileSelectPopup;