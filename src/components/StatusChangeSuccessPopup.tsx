import React, { useEffect } from 'react';
import '../assets/components/StatusChangeSuccessPopup.css';

interface StatusChangeSuccessPopupProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
}

const StatusChangeSuccessPopup: React.FC<StatusChangeSuccessPopupProps> = ({
  message,
  isVisible,
  onClose
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  // ESC key support
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isVisible) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="status-success-overlay" onClick={onClose}>
      <div className="status-success-popup" onClick={(e) => e.stopPropagation()}>
        <div className="success-icon">
          <div className="success-checkmark">
            <svg 
              className="checkmark-svg" 
              viewBox="0 0 52 52"
              width="80" 
              height="80"
            >
              <circle 
                className="checkmark-circle" 
                cx="26" 
                cy="26" 
                r="25" 
                fill="none"
              />
              <path 
                className="checkmark-check" 
                fill="none" 
                d="m14.1 27.2l7.1 7.2 16.7-16.8"
              />
            </svg>
          </div>
        </div>
        <div className="success-content">
          <h3>Success!</h3>
          <p>{message}</p>
        </div>
        <button className="close-button" onClick={onClose}>
          ×
        </button>
        <div className="auto-close-indicator">
          <div className="auto-close-bar"></div>
        </div>
      </div>
    </div>
  );
};

export default StatusChangeSuccessPopup;