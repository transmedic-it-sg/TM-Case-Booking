import React, { useState } from 'react';

interface DatePickerProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder = "Select date",
  required = false,
  error,
  min,
  max,
  disabled = false,
  className = ""
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.target as HTMLInputElement;
    if (input.showPicker) {
      input.showPicker();
    }
  };

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className={`date-picker-wrapper ${className}`}>
      {label && (
        <label htmlFor={id} className={`date-picker-label ${required ? 'required' : ''}`}>
          {label}
        </label>
      )}
      <div 
        className={`date-picker-input-wrapper ${isFocused ? 'focused' : ''} ${error ? 'error' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && document.getElementById(id || '')?.focus()}
      >
        <input
          id={id}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onClick={handleInputClick}
          placeholder={placeholder}
          required={required}
          min={min}
          max={max}
          disabled={disabled}
          className="date-picker-input"
        />
        <div className="date-display">
          {value ? formatDisplayDate(value) : (
            <span className="date-placeholder">{placeholder}</span>
          )}
        </div>
        <span className="date-picker-icon">📅</span>
      </div>
      {error && <span className="date-picker-error">{error}</span>}
    </div>
  );
};

export default DatePicker;