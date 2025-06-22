import React, { useState, useEffect } from 'react';
import { useSound } from '../contexts/SoundContext';

export interface ToastData {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    handler: () => void;
  };
}

interface ToastNotificationProps {
  toast: ToastData;
  onClose: (id: string) => void;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ toast, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const { playSound } = useSound();

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 10);

    // Play appropriate sound based on type
    switch (toast.type) {
      case 'success':
        playSound.success();
        break;
      case 'error':
        playSound.error();
        break;
      case 'warning':
      case 'info':
        playSound.notification();
        break;
    }

    // Auto-close after duration
    const duration = toast.duration || 5000;
    const autoCloseTimer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(autoCloseTimer);
  }, [toast, playSound]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(toast.id);
    }, 300); // Animation duration
  };

  const getToastIcon = () => {
    switch (toast.type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  };

  const getProgressBarColor = () => {
    switch (toast.type) {
      case 'success': return '#28a745';
      case 'error': return '#dc3545';
      case 'warning': return '#ffc107';
      case 'info': return '#17a2b8';
      default: return '#17a2b8';
    }
  };

  const duration = toast.duration || 5000;

  return (
    <div
      className={`toast-notification toast-${toast.type} ${isVisible ? 'toast-visible' : ''} ${isLeaving ? 'toast-leaving' : ''}`}
    >
      <div className="toast-content">
        <div className="toast-icon">
          {getToastIcon()}
        </div>
        <div className="toast-text">
          <div className="toast-title">{toast.title}</div>
          <div className="toast-message">{toast.message}</div>
        </div>
        {toast.action && (
          <button
            className="toast-action"
            onClick={() => {
              toast.action!.handler();
              handleClose();
            }}
          >
            {toast.action.label}
          </button>
        )}
        <button
          className="toast-close"
          onClick={handleClose}
          title="Close notification"
        >
          ✕
        </button>
      </div>
      <div 
        className="toast-progress"
        style={{
          backgroundColor: getProgressBarColor(),
          animationDuration: `${duration}ms`
        }}
      />
    </div>
  );
};

export default ToastNotification;