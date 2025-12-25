import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import Popup from '../components/ui/Popup';

type PopupType = 'info' | 'success' | 'warning' | 'error';

interface PopupContextType {
  showPopup: (message: string, type?: PopupType) => void;
  showConfirm: (message: string, onConfirm: () => void, onCancel?: () => void) => void;
}

const PopupContext = createContext<PopupContextType | undefined>(undefined);

export const usePopup = () => {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error('usePopup must be used within a PopupProvider');
  }
  return context;
};

interface PopupProviderProps {
  children: ReactNode;
}

export const PopupProvider: React.FC<PopupProviderProps> = ({ children }) => {
  const [popupState, setPopupState] = useState<{
    isOpen: boolean;
    message: string;
    type: PopupType;
    mode: 'alert' | 'confirm';
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    message: '',
    type: 'info',
    mode: 'alert'
  });

  const showPopup = (message: string, type: PopupType = 'info') => {
    setPopupState({
      isOpen: true,
      message,
      type,
      mode: 'alert'
    });
  };

  const showConfirm = (message: string, onConfirm: () => void, onCancel?: () => void) => {
    setPopupState({
      isOpen: true,
      message,
      type: 'warning',
      mode: 'confirm',
      onConfirm,
      onCancel
    });
  };

  const handleClose = () => {
    setPopupState((prev) => ({
      ...prev,
      isOpen: false
    }));
  };

  const handleConfirm = () => {
    if (popupState.onConfirm) {
      popupState.onConfirm();
    }
    handleClose();
  };

  const handleCancel = () => {
    if (popupState.onCancel) {
      popupState.onCancel();
    }
    handleClose();
  };

  return (
    <PopupContext.Provider value={{ showPopup, showConfirm }}>
      {children}
      {popupState.isOpen && (
        <Popup
          message={popupState.message}
          type={popupState.type}
          mode={popupState.mode}
          onClose={popupState.mode === 'alert' ? handleClose : handleCancel}
          onConfirm={popupState.mode === 'confirm' ? handleConfirm : undefined}
        />
      )}
    </PopupContext.Provider>
  );
};

