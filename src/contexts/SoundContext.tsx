import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { soundManager } from '../utils/sounds';

interface SoundContextType {
  isEnabled: boolean;
  volume: number;
  toggleSound: () => void;
  setVolume: (volume: number) => void;
  playSound: {
    success: () => void;
    error: () => void;
    click: () => void;
    notification: () => void;
    statusChange: () => void;
    delete: () => void;
    submit: () => void;
  };
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

interface SoundProviderProps {
  children: ReactNode;
}

export const SoundProvider: React.FC<SoundProviderProps> = ({ children }) => {
  const [isEnabled, setIsEnabled] = useState(() => soundManager.isEnabled());
  const [volume, setVolumeState] = useState(() => soundManager.getVolume());

  const toggleSound = () => {
    const newState = soundManager.toggle();
    setIsEnabled(newState);
  };

  const setVolume = (newVolume: number) => {
    soundManager.setVolume(newVolume);
    setVolumeState(newVolume);
  };

  const playSound = {
    success: () => soundManager.playSuccess(),
    error: () => soundManager.playError(),
    click: () => soundManager.playClick(),
    notification: () => soundManager.playNotification(),
    statusChange: () => soundManager.playStatusChange(),
    delete: () => soundManager.playDelete(),
    submit: () => soundManager.playSubmit(),
  };

  useEffect(() => {
    // Sync state with sound manager on mount
    setIsEnabled(soundManager.isEnabled());
    setVolumeState(soundManager.getVolume());
  }, []);

  const value: SoundContextType = {
    isEnabled,
    volume,
    toggleSound,
    setVolume,
    playSound,
  };

  return (
    <SoundContext.Provider value={value}>
      {children}
    </SoundContext.Provider>
  );
};

export const useSound = (): SoundContextType => {
  const context = useContext(SoundContext);
  if (context === undefined) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
};

export default SoundContext;