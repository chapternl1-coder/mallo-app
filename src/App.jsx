import React from 'react';
import ScreenRouter from './components/ScreenRouter';
import BottomNavigation from './components/BottomNavigation';
import { SCREENS } from './constants/screens';
import useMalloAppState from './hooks/useMalloAppState';

export default function MalloApp() {
  const { screenRouterProps, currentScreen, activeTab, handleTabClick } = useMalloAppState();

  return (
    <div className="h-screen w-full flex items-center justify-center font-sans" style={{ backgroundColor: '#F2F0E6' }}>
      <div className="w-full max-w-md h-full sm:h-[90vh] sm:rounded-[2rem] sm:shadow-md overflow-hidden relative border-0" style={{ backgroundColor: '#F2F0E6' }}>
        <ScreenRouter {...screenRouterProps} />
        {(currentScreen === SCREENS.HOME || 
          currentScreen === SCREENS.HISTORY || 
          currentScreen === SCREENS.RESERVATION ||
          currentScreen === SCREENS.PROFILE) && (
          <BottomNavigation activeTab={activeTab} onTabChange={handleTabClick} />
        )}
      </div>
    </div>
  );
}
