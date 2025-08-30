import React, { createContext, useContext, useState, ReactNode } from 'react';
import ToastNotification, { ToastData } from './ToastNotification';

interface ToastContextType {
  showToast: (toast: Omit<ToastData, 'id'>) => void;
  showSuccess: (title: string, message: string, action?: ToastData['action'], caseId?: string, caseReferenceNumber?: string) => void;
  showError: (title: string, message: string, action?: ToastData['action']) => void;
  showWarning: (title: string, message: string, action?: ToastData['action']) => void;
  showInfo: (title: string, message: string, action?: ToastData['action']) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = (toast: Omit<ToastData, 'id'>) => {
    const newToast: ToastData = {
      ...toast,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };

    setToasts(prev => [...prev, newToast]);
  };

  const handleCaseClick = (caseId: string, caseReferenceNumber: string) => {
    // Navigate to cases page and highlight the specific case
    const casesPage = document.querySelector('[data-page="cases"]') as HTMLElement;
    if (casesPage) {
      casesPage.click();
      
      // Wait for page to load, then scroll to case
      setTimeout(() => {
        const caseElement = document.querySelector(`[data-case-id="${caseId}"]`) as HTMLElement;
        if (caseElement) {
          caseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          caseElement.style.animation = 'highlight-case 2s ease-in-out';
        }
      }, 500);
    }
  };

  const showSuccess = (title: string, message: string, action?: ToastData['action'], caseId?: string, caseReferenceNumber?: string) => {
    showToast({ title, message, type: 'success', action, caseId, caseReferenceNumber });
  };

  const showError = (title: string, message: string, action?: ToastData['action']) => {
    showToast({ title, message, type: 'error', action });
  };

  const showWarning = (title: string, message: string, action?: ToastData['action']) => {
    showToast({ title, message, type: 'warning', action });
  };

  const showInfo = (title: string, message: string, action?: ToastData['action']) => {
    showToast({ title, message, type: 'info', action });
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const value: ToastContextType = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <ToastNotification
            key={toast.id}
            toast={toast}
            onClose={removeToast}
            onCaseClick={handleCaseClick}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastProvider;