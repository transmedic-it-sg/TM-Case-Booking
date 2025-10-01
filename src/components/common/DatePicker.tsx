import React, { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../../assets/components/FilterDatePicker.css';

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

// Custom input component for common date picker
const CommonInput = forwardRef<HTMLInputElement, any>(({ value, onClick, placeholder, disabled }, ref) => (
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

CommonInput.displayName = 'CommonInput';

const CommonDatePicker: React.FC<DatePickerProps> = ({
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
      customInput={<CommonInput disabled={disabled} />}
      dateFormat="eee, dd/MM/yyyy"
      minDate={minDate}
      maxDate={maxDate}
      disabled={disabled}
      placeholderText={placeholder}
      className={`common-datepicker ${className}`}
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
      // Accessibility
      id={id}
      aria-describedby={ariaDescribedBy}
      required={required}
    />
  );
};

export default CommonDatePicker;