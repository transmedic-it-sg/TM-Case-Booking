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
            <div className="logo-icon">📋</div>
            <h1 className="app-title">TM Case Booking</h1>
            <p className="app-subtitle">Medical Case Management System</p>
          </div>

          {/* Welcome Content */}
          <div className="mobile-entry-welcome">
            <h2>Welcome</h2>
            <p>Streamline your medical case bookings and management with our comprehensive platform.</p>
            
            <div className="feature-highlights">
              <div className="feature-item">
                <span className="feature-icon">🏥</span>
                <span>Hospital Management</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📅</span>
                <span>Case Scheduling</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📊</span>
                <span>Real-time Tracking</span>
              </div>
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
            <p>&copy; 2024 TM Case Booking System</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileEntryPage;