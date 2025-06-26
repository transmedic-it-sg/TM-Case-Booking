// Simple, reliable DatePicker using native HTML5 date input
import React from 'react';
import SimpleDatePicker from './SimpleDatePicker';

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

const DatePicker: React.FC<DatePickerProps> = (props) => {
  return <SimpleDatePicker {...props} />;
};

export default DatePicker;