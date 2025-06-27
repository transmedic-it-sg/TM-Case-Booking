import React, { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './FilterDatePicker.css';

interface FilterDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
}

// Custom input component for filter date picker
const FilterInput = forwardRef<HTMLInputElement, any>(({ value, onClick, placeholder, disabled }, ref) => (
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

FilterInput.displayName = 'FilterInput';

const FilterDatePicker: React.FC<FilterDatePickerProps> = ({
  value,
  onChange,
  placeholder = "Select date",
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
    <DatePicker
      selected={selectedDate}
      onChange={handleDateChange}
      customInput={<FilterInput disabled={disabled} />}
      dateFormat="eee, dd/MM/yyyy"
      minDate={minDate}
      maxDate={maxDate}
      disabled={disabled}
      placeholderText={placeholder}
      className={`filter-datepicker ${className}`}
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
  );
};

export default FilterDatePicker;