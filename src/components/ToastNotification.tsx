import React, { useState, useEffect, useCallback } from 'react';
import { useSound } from '../contexts/SoundContext';

export interface ToastData {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  caseId?: string;
  caseReferenceNumber?: string;
  action?: {
    label: string;
    handler: () => void;
  };
}

interface ToastNotificationProps {
  toast: ToastData;
  onClose: (id: string) => void;
  onCaseClick?: (caseId: string, caseReferenceNumber: string) => void;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ toast, onClose, onCaseClick }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [startX, setStartX] = useState<number | null>(null);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const { playSound } = useSound();

  const handleClose = useCallback(() => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(toast.id);
    }, 300); // Animation duration
  }, [onClose, toast.id]);

  const handleCaseClick = useCallback(() => {
    if (toast.caseId && toast.caseReferenceNumber && onCaseClick) {
      onCaseClick(toast.caseId, toast.caseReferenceNumber);
      handleClose();
    }
  }, [toast.caseId, toast.caseReferenceNumber, onCaseClick, handleClose]);

  // Touch/drag handlers for swipe-to-dismiss
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startX === null || !isDragging) return;
    const touchX = e.touches[0].clientX;
    const diffX = touchX - startX;
    
    // Only allow rightward swipe
    if (diffX > 0) {
      setCurrentX(diffX);
    }
  }, [startX, isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (currentX > 100) { // Swipe threshold
      handleClose();
    } else {
      setCurrentX(0);
    }
    setStartX(null);
    setIsDragging(false);
  }, [currentX, handleClose]);

  // Mouse drag handlers for desktop
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setStartX(e.clientX);
    setIsDragging(true);
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (startX === null || !isDragging) return;
    const diffX = e.clientX - startX;
    
    // Only allow rightward drag
    if (diffX > 0) {
      setCurrentX(diffX);
    }
  }, [startX, isDragging]);

  const handleMouseUp = useCallback(() => {
    if (currentX > 100) { // Drag threshold
      handleClose();
    } else {
      setCurrentX(0);
    }
    setStartX(null);
    setIsDragging(false);
  }, [currentX, handleClose]);

  // Setup mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

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
  }, [toast, playSound, handleClose]);

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

  const isClickableCase = toast.caseId && toast.caseReferenceNumber;

  return (
    <div
      className={`toast-notification toast-${toast.type} ${isVisible ? 'toast-visible' : ''} ${isLeaving ? 'toast-leaving' : ''} ${isClickableCase ? 'toast-clickable' : ''}`}
      style={{
        transform: `translateX(${currentX}px)`,
        opacity: Math.max(0.3, 1 - currentX / 200)
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onClick={isClickableCase ? handleCaseClick : undefined}
    >
      <div className="toast-content">
        <div className="toast-icon">
          {getToastIcon()}
        </div>
        <div className="toast-text">
          <div className="toast-title">{toast.title}</div>
          <div className="toast-message">
            {toast.message}
            {isClickableCase && (
              <div className="toast-case-hint">Click to view case details</div>
            )}
          </div>
        </div>
        {toast.action && (
          <button
            className="toast-action"
            onClick={(e) => {
              e.stopPropagation();
              toast.action!.handler();
              handleClose();
            }}
          >
            {toast.action.label}
          </button>
        )}
        <button
          className="toast-close"
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          title="Close notification"
        >
          ✕
        </button>
        {isClickableCase && (
          <div className="toast-swipe-hint">← Swipe right to dismiss</div>
        )}
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