import React, { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../assets/components/FilterDatePicker.css';

interface SimpleDatePickerProps {
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

// Custom input component for simple date picker
const SimpleInput = forwardRef<HTMLInputElement, any>(({ value, onClick, placeholder, disabled }, ref) => (
  <input
    ref={ref}
    value={value}
    onClick={onClick}
    placeholder={placeholder}
    readOnly
    disabled={disabled}
    className="filter-datepicker-input"
  />
));

SimpleInput.displayName = 'SimpleInput';

const SimpleDatePicker: React.FC<SimpleDatePickerProps> = ({
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
  // Convert string value to Date object
  const selectedDate = value ? new Date(value) : null;
  
  // Convert min/max strings to Date objects
  const minDate = min ? new Date(min) : undefined;
  const maxDate = max ? new Date(max) : undefined;

  const handleDateChange = (date: Date | null) => {
    if (date) {
      // Convert back to ISO string format for consistency
      const isoString = date.toISOString().split('T')[0];
      onChange(isoString);
    } else {
      onChange('');
    }
  };

  return (
    <div className={`date-picker-wrapper ${className}`}>
      {label && (
        <label htmlFor={id} className={`date-picker-label ${required ? 'required' : ''}`}>
          {label}
        </label>
      )}
      <DatePicker
        selected={selectedDate}
        onChange={handleDateChange}
        customInput={<SimpleInput disabled={disabled} />}
        dateFormat="eee, dd/MM/yyyy"
        minDate={minDate}
        maxDate={maxDate}
        disabled={disabled}
        placeholderText={placeholder}
        className={`simple-datepicker ${className}`}
        calendarClassName="filter-calendar"
        popperClassName="filter-popper"
        showPopperArrow={false}
        fixedHeight
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        isClearable
        todayButton="Today"
        // Mobile friendly
        withPortal={window.innerWidth <= 768}
        // Keyboard navigation
        enableTabLoop={false}
      />
      {error && <span className="date-picker-error">{error}</span>}
    </div>
  );
};

export default SimpleDatePicker;