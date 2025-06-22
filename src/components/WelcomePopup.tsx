import React, { useState, useEffect } from 'react';

interface WelcomePopupProps {
  user: {
    name: string;
    selectedCountry?: string;
  };
  onClose: () => void;
}

const WelcomePopup: React.FC<WelcomePopupProps> = ({ user, onClose }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - (100 / 30); // 30 steps for 3 seconds (100ms intervals)
      });
    }, 100);

    return () => clearInterval(timer);
  }, [onClose]);

  // ESC key support
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Outside click support
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="popup-overlay" onClick={handleOverlayClick}>
      <div className="welcome-popup">
        <div className="popup-icon">
          <div className="success-icon">
            ✓
          </div>
        </div>
        <div className="popup-content">
          <h2>Welcome to Transmedic Case Booking</h2>
          <p>You have successfully logged in to {user.selectedCountry || 'the system'}.</p>
          <div className="progress-container">
            <p>This popup will automatically close in 3 seconds</p>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="btn btn-primary btn-md popup-close-button">
          Ok
        </button>
      </div>
    </div>
  );
};

export default WelcomePopup;