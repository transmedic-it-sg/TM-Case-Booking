import React, { useState, useRef, useEffect } from 'react';

interface TimePickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  'aria-describedby'?: string;
  required?: boolean;
  step?: number; // in minutes
}

const TimePicker: React.FC<TimePickerProps> = ({
  id,
  value,
  onChange,
  className = '',
  disabled = false,
  placeholder = 'Select time',
  'aria-describedby': ariaDescribedBy,
  required = false,
  step = 15 // 15-minute intervals by default
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Format time for display
  useEffect(() => {
    if (value) {
      const [hours, minutes] = value.split(':').map(Number);
      if (!isNaN(hours) && !isNaN(minutes)) {
        const date = new Date();
        date.setHours(hours, minutes);
        setDisplayValue(date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
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

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    onChange(newValue);
    setIsOpen(false);
  };

  const handleTimeSelect = (timeValue: string) => {
    onChange(timeValue);
    setIsOpen(false);
  };

  const handleClear = (event: React.MouseEvent) => {
    event.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  // Generate time options based on step
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += step) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const date = new Date();
        date.setHours(hour, minute);
        const displayTime = date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        options.push({ value: timeString, display: displayTime });
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  // Common procedure times
  const commonTimes = [
    { value: '08:00', display: '8:00 AM' },
    { value: '09:00', display: '9:00 AM' },
    { value: '10:00', display: '10:00 AM' },
    { value: '11:00', display: '11:00 AM' },
    { value: '13:00', display: '1:00 PM' },
    { value: '14:00', display: '2:00 PM' },
    { value: '15:00', display: '3:00 PM' },
    { value: '16:00', display: '4:00 PM' }
  ];

  return (
    <div className={`time-picker-container ${className}`} ref={containerRef}>
      <div 
        className={`time-picker-input ${disabled ? 'disabled' : ''} ${isOpen ? 'open' : ''}`}
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
          className="time-display-input"
          aria-describedby={ariaDescribedBy}
          required={required}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          role="combobox"
        />
        <div className="time-picker-icons">
          {value && !disabled && (
            <button
              type="button"
              className="time-clear-button"
              onClick={handleClear}
              aria-label="Clear time"
            >
              ✕
            </button>
          )}
          <span className="time-picker-icon">🕐</span>
        </div>
      </div>

      {isOpen && (
        <div className="time-picker-dropdown">
          <div className="time-picker-header">
            <h4>Select Time</h4>
            <button
              type="button"
              className="time-picker-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close time picker"
            >
              ✕
            </button>
          </div>

          {/* Native time input for precise selection */}
          <div className="time-input-section">
            <label htmlFor={`${id}-native`}>Enter specific time:</label>
            <input
              id={`${id}-native`}
              type="time"
              value={value}
              onChange={handleTimeChange}
              className="native-time-input"
            />
          </div>

          {/* Common procedure times */}
          <div className="time-shortcuts-section">
            <h5>Common Procedure Times:</h5>
            <div className="time-shortcuts">
              {commonTimes.map((time) => (
                <button
                  key={time.value}
                  type="button"
                  onClick={() => handleTimeSelect(time.value)}
                  className={`time-shortcut-button ${value === time.value ? 'selected' : ''}`}
                >
                  {time.display}
                </button>
              ))}
            </div>
          </div>

          {/* All time options in a scrollable list */}
          <div className="time-options-section">
            <h5>All Times:</h5>
            <div className="time-options-list">
              {timeOptions.map((time) => (
                <button
                  key={time.value}
                  type="button"
                  onClick={() => handleTimeSelect(time.value)}
                  className={`time-option-button ${value === time.value ? 'selected' : ''}`}
                >
                  {time.display}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimePicker;