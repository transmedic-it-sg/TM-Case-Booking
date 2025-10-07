import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
import '../assets/components/MultiSelectDropdownWithQuantity.css';

interface MultiSelectDropdownWithQuantityProps {
  id: string;
  label: string;
  options: readonly string[] | string[];
  value: string[];
  quantities: Record<string, number>;
  onChange: (selectedValues: string[]) => void;
  onQuantityChange: (item: string, quantity: number) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

const MultiSelectDropdownWithQuantity: React.FC<MultiSelectDropdownWithQuantityProps> = ({
  id,
  label,
  options,
  value,
  quantities,
  onChange,
  onQuantityChange,
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
    
    // Initialize quantity if selecting
    if (!value.includes(option)) {
      onQuantityChange(option, 1);
    }
  };

  const handleQuantityInputChange = (option: string, quantityStr: string) => {
    const quantity = Math.max(1, parseInt(quantityStr) || 1);
    onQuantityChange(option, quantity);
  };

  const handleQuantityIncrement = (option: string) => {
    const current = quantities[option] || 1;
    onQuantityChange(option, current + 1);
  };

  const handleQuantityDecrement = (option: string) => {
    const current = quantities[option] || 1;
    if (current > 1) {
      onQuantityChange(option, current - 1);
    }
  };

  const getFilteredOptions = () => {
    if (!searchTerm.trim()) return [...options];

    const term = searchTerm.toLowerCase();
    return options.filter(option =>
      option.toLowerCase().includes(term)
    );
  };

  const displayText = useMemo(() => {
    if (value.length === 0) return placeholder;
    
    // Show summary with total quantities
    const totalQuantity = value.reduce((sum, item) => sum + (quantities[item] || 1), 0);
    if (value.length === 1) {
      const qty = quantities[value[0]] || 1;
      return `${value[0]} (Qty: ${qty})`;
    }
    return `${value.length} items selected (Total Qty: ${totalQuantity})`;
  }, [value, quantities, placeholder]);

  const handleSelectAll = () => {
    const filteredOptions = getFilteredOptions();
    const allFilteredSelected = filteredOptions.every(option => value.includes(option));

    if (allFilteredSelected) {
      const newValue = value.filter(v => !filteredOptions.includes(v));
      onChange(newValue);
    } else {
      const newValue = Array.from(new Set([...value, ...filteredOptions]));
      onChange(newValue);
      // Initialize quantities for newly selected items
      filteredOptions.forEach(option => {
        if (!value.includes(option)) {
          onQuantityChange(option, 1);
        }
      });
    }
  };

  const filteredOptions = getFilteredOptions();
  const selectedCount = value.length;
  const totalQuantity = value.reduce((sum, item) => sum + (quantities[item] || 1), 0);

  return (
    <div className="form-group">
      <label htmlFor={id} className={required ? "required" : ""}>
        {label}
      </label>
      <div
        ref={dropdownRef}
        className={`custom-multi-select with-quantity ${className} ${disabled ? 'disabled' : ''}`}
      >
        <div
          className={`multi-select-trigger ${disabled ? 'disabled' : ''}`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          tabIndex={disabled ? -1 : 0}
        >
          <span className={value.length === 0 ? "placeholder" : "selected-text"}>
            {displayText}
          </span>
          <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
        </div>

        {isOpen && !disabled && (
          <div className="multi-select-dropdown-content enhanced">
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
                className="select-all-btn"
                onClick={handleSelectAll}
              >
                {filteredOptions.every(option => value.includes(option)) ? 'Clear' : 'Select All'}
              </button>
            </div>
            
            <div className="options-list">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => {
                  const isSelected = value.includes(option);
                  const quantity = quantities[option] || 1;
                  
                  return (
                    <div 
                      key={option} 
                      className={`multi-select-option ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleToggleOption(option)}
                    >
                      <div className="option-content">
                        <div className="checkbox-container">
                          <div className="custom-checkbox"></div>
                          <span className="option-label">{option}</span>
                        </div>
                        
                        {isSelected && (
                          <div className="quantity-control" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="quantity-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuantityDecrement(option);
                              }}
                              disabled={quantity <= 1}
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min="1"
                              className="quantity-input"
                              value={quantity}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleQuantityInputChange(option, e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              type="button"
                              className="quantity-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuantityIncrement(option);
                              }}
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="no-results">
                  No options found for "{searchTerm}"
                </div>
              )}
            </div>
            
            {selectedCount > 0 && (
              <div className="selected-items-summary">
                {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected • 
                Total quantity: {totalQuantity}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(MultiSelectDropdownWithQuantity);