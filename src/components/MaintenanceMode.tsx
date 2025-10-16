import React, { useEffect, useState } from 'react';
import { getCurrentUserSync } from '../utils/auth';
import '../assets/components/MaintenanceMode.css';

interface MaintenanceModeProps {
  isActive: boolean;
  onForceLogout?: () => void;
}

const MaintenanceMode: React.FC<MaintenanceModeProps> = ({ isActive, onForceLogout }) => {
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const currentUser = getCurrentUserSync();
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    // Admin users bypass maintenance mode
    if (isActive && !isAdmin) {
      setShowModal(true);

      // Start countdown for auto-logout
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            if (onForceLogout) {
              onForceLogout();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else {
      setShowModal(false);
      setCountdown(30);
    }
  }, [isActive, isAdmin, onForceLogout]);

  // Don't show modal for admins or if not active
  if (!isActive || !showModal || isAdmin) {
    return null;
  }

  return (
    <>
      {/* Overlay */}
      <div className="maintenance-overlay">
        <div className="maintenance-modal">
          <div className="maintenance-header">
            <div className="maintenance-icon">🔧</div>
            <h2>System Maintenance</h2>
          </div>

          <div className="maintenance-body">
            <p>
              The system is currently under maintenance. All users will be automatically
              logged out to ensure data integrity during the maintenance period.
            </p>

            <div className="maintenance-details">
              <div className="maintenance-info">
                <strong>What's happening:</strong>
                <ul>
                  <li>System updates and improvements</li>
                  <li>Database maintenance tasks</li>
                  <li>Performance optimizations</li>
                </ul>
              </div>

              <div className="maintenance-timeline">
                <strong>Expected duration:</strong> Please check back in 30-60 minutes
              </div>
            </div>

            <div className="maintenance-countdown">
              <div className="countdown-text">
                Automatic logout in: <span className="countdown-number">{countdown}</span> seconds
              </div>
              <div className="countdown-bar">
                <div
                  className="countdown-progress"
                  style={{ width: `${(countdown / 30) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="maintenance-footer">
            <button
              className="btn btn-primary"
              onClick={() => onForceLogout && onForceLogout()}
            >
              Logout Now
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MaintenanceMode;