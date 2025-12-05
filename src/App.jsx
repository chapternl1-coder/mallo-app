import React from 'react';
import ScreenRouter from './components/ScreenRouter';
import BottomNavigation from './components/BottomNavigation';
import ScrollToTopButton from './components/ScrollToTopButton';
import { SCREENS } from './constants/screens';
import useMalloAppState from './hooks/useMalloAppState';
import { useAuth } from './contexts/AuthContext';
import LoginScreen from './screens/LoginScreen';

export default function MalloApp() {
  const { user, loading } = useAuth();
  const { screenRouterProps, currentScreen, activeTab, handleTabClick } = useMalloAppState();

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#F2F0E6' }}
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-[#E4D9CC] bg-white mb-3">
            <span className="text-xs font-semibold tracking-widest" style={{ color: '#C9A27A' }}>
              MALLO
            </span>
          </div>
          <p className="text-xs text-neutral-600">계정 정보를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="h-screen w-full flex items-center justify-center font-sans" style={{ backgroundColor: '#F2F0E6' }}>
      <div className="w-full max-w-md h-full sm:h-[90vh] sm:rounded-[2rem] sm:shadow-md overflow-hidden relative border-0" style={{ backgroundColor: '#F2F0E6' }}>
        <ScreenRouter {...screenRouterProps} />
        
        {/* 스크롤이 일정 이상 내려갔을 때 공통으로 보이는 '맨 위로' 버튼 */}
        <ScrollToTopButton />
        
        {(currentScreen === SCREENS.HOME || 
          currentScreen === SCREENS.RESERVATION ||
          currentScreen === SCREENS.HISTORY ||
          currentScreen === SCREENS.PROFILE) && (
          <BottomNavigation activeTab={activeTab} onTabChange={handleTabClick} />
        )}
      </div>
    </div>
  );
}
