/**
 * Version Update Popup - Informs user of app version update and automatic logout
 */

import React from 'react';

interface VersionUpdatePopupProps {
  currentVersion: string;
  previousVersion: string;
  onConfirm: () => void;
}

const VersionUpdatePopup: React.FC<VersionUpdatePopupProps> = ({
  currentVersion,
  previousVersion,
  onConfirm
}) => {
  return (
    <div className="modal-overlay active">
      <div className="modal-content version-update-popup">
        <div className="modal-header">
          <h3>🚀 App Update Available</h3>
        </div>
        
        <div className="modal-body">
          <div className="version-update-info">
            <div className="version-details">
              <div className="version-item">
                <span className="version-label">Previous Version:</span>
                <span className="version-number">{previousVersion}</span>
              </div>
              <div className="version-item current">
                <span className="version-label">New Version:</span>
                <span className="version-number">{currentVersion}</span>
              </div>
            </div>
            
            <div className="update-message">
              <p>
                <strong>The app has been updated to a new version.</strong>
              </p>
              <p>
                To ensure the best experience and avoid any issues, you will be logged out automatically. 
                Please log in again to access the updated features.
              </p>
              
              <div className="update-benefits">
                <h4>✨ What's New in v{currentVersion}:</h4>
                <ul>
                  <li>🔧 Complete production-ready implementation</li>
                  <li>⚡ Improved performance for 100+ concurrent users</li>
                  <li>🛡️ Enhanced error tracking and user traceability</li>
                  <li>💾 Smart Supabase/LocalStorage hybrid system</li>
                  <li>📊 Optimized logging for better bandwidth usage</li>
                  <li>🎯 Zero TypeScript errors and better code quality</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            className="btn-primary btn-full"
            onClick={onConfirm}
            autoFocus
          >
            Continue to Login
          </button>
        </div>
      </div>
      
      <style>{`
        .version-update-popup {
          max-width: 500px;
          width: 90%;
        }
        
        .version-update-info {
          text-align: center;
        }
        
        .version-details {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
          border: 2px solid #e9ecef;
        }
        
        .version-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
        }
        
        .version-item.current {
          color: #28a745;
          font-weight: bold;
        }
        
        .version-label {
          font-size: 0.9em;
          color: #6c757d;
          margin-bottom: 3px;
        }
        
        .version-number {
          font-size: 1.2em;
          font-weight: bold;
          padding: 8px 12px;
          background: #fff;
          border-radius: 6px;
          border: 1px solid #dee2e6;
          min-width: 80px;
          text-align: center;
        }
        
        .version-item.current .version-number {
          background: #d4edda;
          border-color: #28a745;
          color: #155724;
        }
        
        .update-message {
          text-align: left;
          margin-top: 20px;
        }
        
        .update-message p {
          margin-bottom: 15px;
          line-height: 1.5;
        }
        
        .update-benefits {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          margin-top: 20px;
          text-align: left;
        }
        
        .update-benefits h4 {
          margin: 0 0 10px 0;
          color: #495057;
        }
        
        .update-benefits ul {
          margin: 0;
          padding-left: 20px;
        }
        
        .update-benefits li {
          margin-bottom: 8px;
          color: #495057;
        }
        
        .btn-full {
          width: 100%;
          padding: 12px;
          font-size: 1.1em;
        }
        
        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .version-update-popup {
            width: 95%;
            margin: 10px;
          }
          
          .version-details {
            flex-direction: column;
            gap: 15px;
          }
          
          .version-item {
            width: 100%;
          }
          
          .update-benefits ul {
            padding-left: 15px;
          }
          
          .update-benefits li {
            font-size: 0.9em;
          }
        }
      `}</style>
    </div>
  );
};

export default VersionUpdatePopup;