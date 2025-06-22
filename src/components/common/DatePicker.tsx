import React, { useState, useRef, useEffect } from 'react';

interface DatePickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  'aria-describedby'?: string;
  required?: boolean;
  min?: string;
  max?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({
  id,
  value,
  onChange,
  className = '',
  disabled = false,
  placeholder = 'Select date',
  'aria-describedby': ariaDescribedBy,
  required = false,
  min,
  max
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Format date for display
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        setDisplayValue(date.toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }));
      }
    } else {
      setDisplayValue('');
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    onChange(newValue);
    setIsOpen(false);
  };

  const handleClear = (event: React.MouseEvent) => {
    event.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  const getMinDate = () => {
    if (min) return min;
    // Default to today for surgery dates to prevent past dates
    const today = new Date();
    today.setDate(today.getDate() - 1); // Allow yesterday
    return today.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    if (max) return max;
    // Default to 2 years from now
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 2);
    return maxDate.toISOString().split('T')[0];
  };

  return (
    <div className={`date-picker-container ${className}`} ref={containerRef}>
      <div 
        className={`date-picker-input ${disabled ? 'disabled' : ''} ${isOpen ? 'open' : ''}`}
        onClick={handleInputClick}
      >
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={displayValue}
          placeholder={placeholder}
          readOnly
          disabled={disabled}
          className="date-display-input"
          aria-describedby={ariaDescribedBy}
          required={required}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          role="combobox"
        />
        <div className="date-picker-icons">
          {value && !disabled && (
            <button
              type="button"
              className="date-clear-button"
              onClick={handleClear}
              aria-label="Clear date"
            >
              ✕
            </button>
          )}
          <span className="date-picker-icon">📅</span>
        </div>
      </div>

      {isOpen && (
        <div className="date-picker-dropdown">
          <div className="date-picker-header">
            <h4>Select Date</h4>
            <button
              type="button"
              className="date-picker-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close date picker"
            >
              ✕
            </button>
          </div>
          <input
            type="date"
            value={value}
            onChange={handleDateChange}
            className="native-date-input"
            min={getMinDate()}
            max={getMaxDate()}
            autoFocus
          />
          <div className="date-picker-shortcuts">
            <button
              type="button"
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                onChange(today);
                setIsOpen(false);
              }}
              className="date-shortcut-button"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                onChange(tomorrow.toISOString().split('T')[0]);
                setIsOpen(false);
              }}
              className="date-shortcut-button"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => {
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                onChange(nextWeek.toISOString().split('T')[0]);
                setIsOpen(false);
              }}
              className="date-shortcut-button"
            >
              Next Week
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;