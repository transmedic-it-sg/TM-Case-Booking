import React from 'react';
import { AddFormProps } from './types';

const AddForm: React.FC<AddFormProps> = ({
  type,
  show,
  value,
  error,
  onValueChange,
  onSave,
  onCancel
}) => {
  if (!show) return null;

  const placeholder = type === 'surgery' 
    ? 'Enter surgery set name...' 
    : 'Enter implant box name...';

  return (
    <div className="add-form">
      <input
        type="text"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className={`add-input ${error ? 'error' : ''}`}
        maxLength={50}
      />
      {error && (
        <div className="error-message">{error}</div>
      )}
      <div className="add-actions">
        <button onClick={onSave} className="save-button">
          Save
        </button>
        <button onClick={onCancel} className="cancel-button">
          Cancel
        </button>
      </div>
    </div>
  );
};

export default AddForm;