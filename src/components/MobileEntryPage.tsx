import React, { useState } from 'react';
import '../assets/components/MobileEntryPage.css';

interface MobileEntryPageProps {
  onProceedToLogin: () => void;
}

const MobileEntryPage: React.FC<MobileEntryPageProps> = ({ onProceedToLogin }) => {
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleProceedClick = () => {
    setIsTransitioning(true);
    // Wait for transition to complete before calling onProceedToLogin
    setTimeout(() => {
      onProceedToLogin();
    }, 500);
  };
  return (
    <div className={`mobile-entry-page ${isTransitioning ? 'fade-out' : ''}`}>
      <div className="mobile-entry-container">
        <div className="mobile-entry-content">
          {/* Logo/Brand Section */}
          <div className="mobile-entry-logo">
            <div className="brand-logo">
              <img
                src="https://www.transmedicgroup.com/wp-content/themes/transmedic/transmedic_assets/images/logo/logo-v5-transmedic-header-small.svg"
                alt="Transmedic Logo"
                className="logo-image"
              />
            </div>
            <p className="app-subtitle">Case Booking System</p>
            <p className="app-description">Streamline your medical case management with our comprehensive booking platform</p>
          </div>

          {/* Feature Highlights */}
          <div className="feature-highlights">
            <div className="feature-item">
              <span className="feature-icon">📋</span>
              <span>Easy Case Management</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <span>Real-time Updates</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔒</span>
              <span>Secure & Reliable</span>
            </div>
          </div>

          {/* CTA Button */}
          <div className="mobile-entry-actions">
            <button
              className="proceed-button"
              onClick={handleProceedClick}
              disabled={isTransitioning}
            >
              {isTransitioning ? 'Loading...' : 'Proceed to Login'}
            </button>
          </div>

          {/* Footer */}
          <div className="mobile-entry-footer">
            <p>&copy; 2025 Transmedic Case Booking System</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileEntryPage;