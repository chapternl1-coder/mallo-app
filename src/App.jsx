/// 파일: src/App.jsx
/// 작업: AuthContext의 user/loading을 올바르게 사용하고, 로그인/로딩 분기 정리

import React from 'react';
import ScreenRouter from './components/ScreenRouter';
import BottomNavigation from './components/BottomNavigation';
import ScrollToTopButton from './components/ScrollToTopButton';
import { SCREENS } from './constants/screens';
import useMalloAppState from './hooks/useMalloAppState';
import { useAuth } from './contexts/AuthContext';
import LoginScreen from './screens/LoginScreen';

export default function MalloApp() {
  // ✅ 항상 컴포넌트 함수 안에서만 user/loading을 꺼내쓴다
  const { user, loading } = useAuth();
  const { screenRouterProps, currentScreen, activeTab, handleTabClick } =
    useMalloAppState();

  // 디버깅용 로그 (여기는 에러 안 남)
  console.log('[MalloApp] user:', user, 'loading:', loading);

  // ✅ 1) 초기 로딩 중일 때
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#F2F0E6' }}
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-[#E4D9CC] bg-white mb-3">
            <span
              className="text-xs font-semibold tracking-widest"
              style={{ color: '#C9A27A' }}
            >
              MALLO
            </span>
          </div>
          <p className="text-xs text-neutral-600">
            계정 정보를 불러오는 중입니다...
          </p>
        </div>
      </div>
    );
  }

  // ✅ 2) 로그인 안 된 상태면 무조건 로그인 화면
  if (!user) {
    return <LoginScreen />;
  }

  // ✅ 3) 로그인 된 상태면 기존 말로 앱 UI
  return (
    <div
      className="h-screen w-full flex items-center justify-center font-sans"
      style={{ backgroundColor: '#F2F0E6' }}
    >
      <div
        className="w-full max-w-md h-full sm:h-[90vh] sm:rounded-[2rem] sm:shadow-md overflow-hidden relative border-0"
        style={{ backgroundColor: '#F2F0E6' }}
      >
        <ScreenRouter {...screenRouterProps} />

        {/* 스크롤이 일정 이상 내려갔을 때 공통으로 보이는 '맨 위로' 버튼 */}
        <ScrollToTopButton />

        {(currentScreen === SCREENS.HOME ||
          currentScreen === SCREENS.RESERVATION ||
          currentScreen === SCREENS.HISTORY ||
          currentScreen === SCREENS.PROFILE) && (
          <BottomNavigation
            activeTab={activeTab}
            onTabChange={handleTabClick}
          />
        )}
      </div>
    </div>
  );
}
