/**
 * Password Change Modal - For users with temporary passwords
 * Shown during login when user has temporary password that must be changed
 */

import React, { useState } from 'react';
import { User } from '../types';
import PasswordInput from './PasswordInput';
import { validatePassword, getPasswordRequirementsSync } from '../utils/passwordValidation';
import { validatePasswordStrength } from '../utils/passwordSecurity';
import { updateSupabaseUserPassword } from '../utils/supabaseUserService';

interface PasswordChangeModalProps {
  user: User;
  onPasswordChanged: (user: User) => void;
  onCancel: () => void;
}

const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({
  user,
  onPasswordChanged,
  onCancel
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    // Validate password complexity
    const requirements = getPasswordRequirementsSync(true);
    const validation = validatePassword(newPassword, requirements);

    if (!validation.isValid) {
      setError(`Password validation failed: ${validation.errors.join(', ')}`);
      setIsLoading(false);
      return;
    }

    // Additional password strength validation
    const strengthValidation = validatePasswordStrength(newPassword);
    if (!strengthValidation.isValid) {
      setError(`Password not strong enough: ${strengthValidation.message}`);
      setIsLoading(false);
      return;
    }

    try {
      // Update password and clear temporary flag
      const success = await updateSupabaseUserPassword(user.id, newPassword);
      
      if (success) {
        // Create updated user object with temporary flag cleared
        const updatedUser: User = {
          ...user,
          isTemporaryPassword: false
        };
        
        onPasswordChanged(updatedUser);
      } else {
        setError('Failed to update password. Please try again.');
      }
    } catch (error) {
      setError('Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content password-change-modal">
        <div className="modal-header">
          <h2 className="modal-title">🔑 Password Change Required</h2>
        </div>
        
        <div className="modal-body">
          <div className="password-change-info">
            <p><strong>Welcome, {user.name}!</strong></p>
            <div className="warning-banner">
              <span className="warning-icon">⚠️</span>
              <span className="warning-text">
                Your administrator has reset your password. You must create a new password to continue.
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <PasswordInput
              id="newPassword"
              value={newPassword}
              onChange={setNewPassword}
              label="New Password"
              placeholder="Enter your new password"
              required={true}
              showStrength={true}
              showRequirements={true}
              showGenerateButton={true}
            />

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">Confirm New Password</label>
              <input
                type="password"
                id="confirmPassword"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                required
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="form-actions" style={{marginTop: '2rem'}}>
              <button
                type="button"
                onClick={onCancel}
                className="btn btn-secondary btn-md"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-md"
                disabled={isLoading || !newPassword || !confirmPassword}
              >
                {isLoading ? '🔄 Updating...' : '✅ Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PasswordChangeModal;