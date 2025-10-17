import React, { useState, useEffect } from 'react';
import SearchableDropdown from './SearchableDropdown';
import SimpleMultiSelectDropdown from './SimpleMultiSelectDropdown';
import MobileSelectPopup from './MobileSelectPopup';

interface ResponsiveDropdownProps {
  id: string;
  label: string;
  options: string[] | { value: string; label: string }[];
  value: string | string[];
  onChange: (value: any) => void;
  multiple?: boolean;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  searchable?: boolean;
}

const ResponsiveDropdown: React.FC<ResponsiveDropdownProps> = ({
  id,
  label,
  options,
  value,
  onChange,
  multiple = false,
  placeholder,
  required = false,
  disabled = false,
  className = '',
  searchable = false
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [showMobilePopup, setShowMobilePopup] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      // Check if viewport width is less than iPad mini width (768px)
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // For mobile devices, render a button that opens the popup
  if (isMobile) {
    const displayValue = () => {
      if (multiple) {
        const values = value as string[];
        if (!values || values.length === 0) return placeholder || 'Select...';
        if (values.length === 1) return values[0];
        return `${values.length} selected`;
      } else {
        return value || placeholder || 'Select...';
      }
    };

    return (
      <>
        <div className={`mobile-dropdown-wrapper ${className}`}>
          {label && (
            <label htmlFor={id} className="mobile-dropdown-label">
              {label}
              {required && <span className="required">*</span>}
            </label>
          )}
          <button
            id={id}
            className="mobile-dropdown-trigger"
            onClick={() => setShowMobilePopup(true)}
            disabled={disabled}
            type="button"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ced4da',
              borderRadius: '8px',
              backgroundColor: disabled ? '#e9ecef' : 'white',
              textAlign: 'left',
              fontSize: '16px',
              color: value ? '#495057' : '#6c757d',
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>{displayValue()}</span>
            <span style={{ color: '#6c757d' }}>▼</span>
          </button>
        </div>

        <MobileSelectPopup
          isOpen={showMobilePopup}
          onClose={() => setShowMobilePopup(false)}
          options={options}
          value={value}
          onChange={onChange}
          multiple={multiple}
          title={label || 'Select an option'}
          placeholder={placeholder}
          searchable={searchable || options.length > 10}
        />
      </>
    );
  }

  // For desktop/tablet, use the existing dropdowns
  if (searchable) {
    return (
      <div className={className}>
        {label && (
          <label htmlFor={id}>
            {label}
            {required && <span className="required">*</span>}
          </label>
        )}
        <SearchableDropdown
          id={id}
          options={options as string[]}
          value={value as string}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
        />
      </div>
    );
  }

  if (multiple) {
    return (
      <SimpleMultiSelectDropdown
        id={id}
        label={label}
        options={options as string[]}
        value={value as string[]}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={className}
      />
    );
  }

  // Single select regular dropdown
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id}>
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <select
        id={id}
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        className="form-control"
      >
        <option value="">{placeholder || 'Select...'}</option>
        {(options as string[]).map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ResponsiveDropdown;