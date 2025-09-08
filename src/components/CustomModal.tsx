import React from 'react';
import '../assets/components/CustomModal.css';

interface ModalAction {
  label: string;
  onClick: () => void;
  style?: 'primary' | 'secondary' | 'danger' | 'success';
  disabled?: boolean;
}

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'alert' | 'confirm' | 'success' | 'error' | 'warning' | 'info';
  actions?: ModalAction[];
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const CustomModal: React.FC<CustomModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'alert',
  actions,
  autoClose = false,
  autoCloseDelay = 3000
}) => {
  React.useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'confirm':
        return '❓';
      case 'info':
        return 'ℹ️';
      default:
        return '💬';
    }
  };

  const getDefaultActions = (): ModalAction[] => {
    if (type === 'confirm') {
      return [
        {
          label: 'Cancel',
          onClick: onClose,
          style: 'secondary'
        },
        {
          label: 'Confirm',
          onClick: () => {
            // This will be overridden by the parent component
            onClose();
          },
          style: 'danger'
        }
      ];
    }
    
    return [
      {
        label: 'OK',
        onClick: onClose,
        style: 'primary'
      }
    ];
  };

  const modalActions = actions || getDefaultActions();

  return (
    <div className="custom-modal-overlay" onClick={onClose}>
      <div 
        className={`custom-modal custom-modal-${type}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="custom-modal-header">
          <div className="custom-modal-icon">
            {getIcon()}
          </div>
          <h3 className="custom-modal-title">{title}</h3>
          <button 
            className="custom-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        
        <div className="custom-modal-body">
          <p className="custom-modal-message">{message}</p>
        </div>
        
        <div className="custom-modal-footer">
          {modalActions.map((action, index) => (
            <button
              key={index}
              className={`custom-modal-btn custom-modal-btn-${action.style || 'primary'}`}
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CustomModal;