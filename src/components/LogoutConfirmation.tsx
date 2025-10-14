import React, { useEffect, useState } from 'react';

interface LogoutConfirmationProps {
  isOpen: boolean;
  onConfirm: (forgetMe?: boolean) => void;
  onCancel: () => void;
  userName?: string;
}

const LogoutConfirmation: React.FC<LogoutConfirmationProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  userName
}) => {
  const [forgetMe, setForgetMe] = useState(false);
  
  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setForgetMe(false);
    }
  }, [isOpen]);
  
  // Handle Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  // Handle Enter key for confirm
  useEffect(() => {
    const handleEnter = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && isOpen) {
        onConfirm(forgetMe);
      }
    };

    document.addEventListener('keydown', handleEnter);
    return () => document.removeEventListener('keydown', handleEnter);
  }, [isOpen, onConfirm, forgetMe]);

  if (!isOpen) return null;

  return (
    <div className="logout-confirmation-overlay" onClick={onCancel}>
      <div className="logout-confirmation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="logout-confirmation-header">
          <div className="logout-icon">
            🚪
          </div>
          <h3>Confirm Logout</h3>
        </div>

        <div className="logout-confirmation-content">
          <p>
            Are you sure you want to logout{userName ? `, ${userName}` : ''}?
          </p>
          <div className="logout-warning">
            <div className="warning-icon">⚠️</div>
            <div className="warning-text">
              <strong>Important:</strong> You will need to log in again to access the system.
              Any unsaved work may be lost.
            </div>
          </div>
          
          {/* CRITICAL FIX: Add Remember Me option during logout */}
          <div className="logout-remember-option">
            <label className="remember-checkbox-label">
              <input
                type="checkbox"
                checked={forgetMe}
                onChange={(e) => setForgetMe(e.target.checked)}
                className="remember-checkbox"
              />
              <span className="remember-text">
                🔒 Forget my login credentials (you'll need to re-enter them next time)
              </span>
            </label>
          </div>
        </div>

        <div className="logout-confirmation-actions">
          <button
            className="btn btn-secondary btn-md logout-cancel-button"
            onClick={onCancel}
            autoFocus
          >
            Cancel
          </button>
          <button
            className="btn btn-danger btn-md logout-confirm-button"
            onClick={() => onConfirm(forgetMe)}
          >
            Yes, Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmation;