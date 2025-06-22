import React, { useEffect } from 'react';

interface LogoutConfirmationProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  userName?: string;
}

const LogoutConfirmation: React.FC<LogoutConfirmationProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  userName
}) => {
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
        onConfirm();
      }
    };

    document.addEventListener('keydown', handleEnter);
    return () => document.removeEventListener('keydown', handleEnter);
  }, [isOpen, onConfirm]);

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
            onClick={onConfirm}
          >
            Yes, Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmation;