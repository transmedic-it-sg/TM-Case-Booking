import React from 'react';

interface CheckboxListProps {
  id: string;
  label: string;
  options: readonly string[] | string[];
  value: string[];
  onChange: (selectedValues: string[]) => void;
  required?: boolean;
  className?: string;
}

const CheckboxList: React.FC<CheckboxListProps> = ({
  id,
  label,
  options,
  value,
  onChange,
  required = false,
  className = ""
}) => {
  const handleToggleOption = (option: string) => {
    const newValue = value.includes(option)
      ? value.filter(v => v !== option)
      : [...value, option];
    onChange(newValue);
  };

  return (
    <div className={`form-group checkbox-list-container ${className}`}>
      <label className={`checkbox-list-label ${required ? "required" : ""}`}>
        {label}
      </label>
      <div className="checkbox-list" id={id}>
        {options.map((option) => (
          <label key={option} className="checkbox-list-item">
            <input
              type="checkbox"
              checked={value.includes(option)}
              onChange={() => handleToggleOption(option)}
              className="checkbox-list-input"
            />
            <span className="checkbox-list-checkmark"></span>
            <span className="checkbox-list-text">{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default CheckboxList;