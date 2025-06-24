import { useState, useCallback } from 'react';

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'alert' | 'confirm' | 'success' | 'error' | 'warning' | 'info';
  onConfirm?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const initialState: ModalState = {
  isOpen: false,
  title: '',
  message: '',
  type: 'alert',
  onConfirm: undefined,
  autoClose: false,
  autoCloseDelay: 3000
};

export const useModal = () => {
  const [modal, setModal] = useState<ModalState>(initialState);

  const closeModal = useCallback(() => {
    setModal(initialState);
  }, []);

  const showAlert = useCallback((title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setModal({
      isOpen: true,
      title,
      message,
      type,
      autoClose: type === 'success',
      autoCloseDelay: 3000
    });
  }, []);

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    setModal({
      isOpen: true,
      title,
      message,
      type: 'confirm',
      onConfirm,
      autoClose: false
    });
  }, []);

  // Convenience methods that match the browser API
  const alert = useCallback((message: string) => {
    showAlert('Alert', message, 'info');
  }, [showAlert]);

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setModal({
        isOpen: true,
        title: 'Confirm',
        message,
        type: 'confirm',
        onConfirm: () => {
          resolve(true);
          closeModal();
        },
        autoClose: false
      });
      
      // Handle cancel/close as false
      const originalClose = closeModal;
      const handleCancel = () => {
        resolve(false);
        originalClose();
      };
      
      // Override the close function temporarily
      setModal(prev => ({ ...prev, onConfirm: () => { resolve(true); originalClose(); } }));
    });
  }, [closeModal]);

  const showSuccess = useCallback((message: string, title: string = 'Success') => {
    showAlert(title, message, 'success');
  }, [showAlert]);

  const showError = useCallback((message: string, title: string = 'Error') => {
    showAlert(title, message, 'error');
  }, [showAlert]);

  const showWarning = useCallback((message: string, title: string = 'Warning') => {
    showAlert(title, message, 'warning');
  }, [showAlert]);

  const showInfo = useCallback((message: string, title: string = 'Information') => {
    showAlert(title, message, 'info');
  }, [showAlert]);

  return {
    modal,
    closeModal,
    showAlert,
    showConfirm,
    alert,
    confirm,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};