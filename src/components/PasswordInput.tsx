import React, { useState, useEffect } from 'react';
import { validatePassword, getPasswordRequirementsSync, getPasswordRequirementsText, generateSecurePassword, type PasswordValidationResult, type PasswordRequirements } from '../utils/passwordValidation';
import { getSystemConfig } from '../utils/systemSettingsService';
import '../assets/components/PasswordInput.css';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  showStrength?: boolean;
  showRequirements?: boolean;
  showGenerateButton?: boolean;
  id?: string;
  className?: string;
  disabled?: boolean;
}

const PasswordInput: React.FC<PasswordInputProps> = ({
  value,
  onChange,
  label = 'Password',
  placeholder = 'Enter password',
  required = false,
  showStrength = true,
  showRequirements = true,
  showGenerateButton = true,
  id = 'password',
  className = '',
  disabled = false
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [validation, setValidation] = useState<PasswordValidationResult | null>(null);
  const [requirements, setRequirements] = useState<PasswordRequirements | null>(null);
  const [complexityEnabled, setComplexityEnabled] = useState(true);

  // Load system configuration to determine complexity requirements
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await getSystemConfig();
        setComplexityEnabled(config.passwordComplexity);
        const req = getPasswordRequirementsSync(config.passwordComplexity);
        setRequirements(req);
      } catch (error) {
        // Use default complex requirements on error
        const req = getPasswordRequirementsSync(true);
        setRequirements(req);
      }
    };

    loadConfig();
  }, []);

  // Validate password whenever it changes
  useEffect(() => {
    if (value && requirements) {
      const result = validatePassword(value, requirements);
      setValidation(result);
    } else {
      setValidation(null);
    }
  }, [value, requirements]);

  const handleGeneratePassword = () => {
    if (requirements) {
      const generatedPassword = generateSecurePassword(requirements);
      onChange(generatedPassword);
    }
  };

  const getStrengthColor = (strengthText: string): string => {
    switch (strengthText) {
      case 'Very Weak': return '#ff4444';
      case 'Weak': return '#ff8800';
      case 'Fair': return '#ffaa00';
      case 'Good': return '#88cc00';
      case 'Strong': return '#00cc44';
      default: return '#ccc';
    }
  };

  const getStrengthBarWidth = (score: number): string => {
    return `${Math.max(10, score)}%`;
  };

  if (!requirements) {
    return (
      <div className="form-group">
        <label htmlFor={id}>Loading password requirements...</label>
        <input type="password" disabled />
      </div>
    );
  }

  const requirementTexts = getPasswordRequirementsText(requirements);

  return (
    <div className={`password-input-container ${className}`}>
      <div className="form-group">
        <label htmlFor={id} className={required ? 'required' : ''}>
          {label}
        </label>

        <div className="password-input-wrapper">
          <input
            type={showPassword ? 'text' : 'password'}
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            className={`modern-input ${validation && !validation.isValid ? 'error' : ''} ${
              validation && validation.isValid ? 'valid' : ''
            }`}
          />

          <div className="password-controls">
            {showGenerateButton && !disabled && (
              <button
                type="button"
                className="password-generate-btn"
                onClick={handleGeneratePassword}
                title="Generate secure password"
              >
                🎲
              </button>
            )}

            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        {/* Validation Errors */}
        {validation && validation.errors.length > 0 && (
          <div className="password-errors">
            {validation.errors.map((error, index) => (
              <div key={index} className="error-text">
                ❌ {error}
              </div>
            ))}
          </div>
        )}

        {/* Password Strength Indicator */}
        {showStrength && value && validation && (
          <div className="password-strength">
            <div className="strength-label">
              Password Strength:
              <span
                className="strength-text"
                style={{ color: getStrengthColor(validation.strengthText) }}
              >
                {validation.strengthText}
              </span>
              <span className="strength-score">({validation.score}/100)</span>
            </div>
            <div className="strength-bar-container">
              <div
                className="strength-bar"
                style={{
                  width: getStrengthBarWidth(validation.score),
                  backgroundColor: getStrengthColor(validation.strengthText)
                }}
              />
            </div>
          </div>
        )}

        {/* Requirements List */}
        {showRequirements && complexityEnabled && (
          <div className="password-requirements">
            <div className="requirements-title">Password Requirements:</div>
            <ul className="requirements-list">
              {requirementTexts.map((text, index) => {
                // Check if this requirement is met
                let isMet = false;
                if (value && validation) {
                  if (index === 0) isMet = value.length >= requirements.minLength;
                  else if (text.includes('uppercase')) isMet = /[A-Z]/.test(value);
                  else if (text.includes('lowercase')) isMet = /[a-z]/.test(value);
                  else if (text.includes('number')) isMet = /\d/.test(value);
                  else if (text.includes('special')) isMet = /[^a-zA-Z0-9]/.test(value);
                }

                return (
                  <li
                    key={index}
                    className={`requirement-item ${isMet ? 'met' : 'unmet'}`}
                  >
                    <span className="requirement-icon">
                      {isMet ? '✅' : '⭕'}
                    </span>
                    {text}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Simplified requirements for non-complex mode */}
        {showRequirements && !complexityEnabled && (
          <div className="password-requirements simple">
            <div className="requirements-title">Password Requirements:</div>
            <div className="simple-requirement">
              <span className={value.length >= requirements.minLength ? 'met' : 'unmet'}>
                {value.length >= requirements.minLength ? '✅' : '⭕'}
                Minimum {requirements.minLength} characters
              </span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default PasswordInput;