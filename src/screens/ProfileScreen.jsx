import React from 'react';
import { ArrowLeft, Edit, ChevronRight } from 'lucide-react';
import { SCREENS } from '../constants/screens';

function ProfileScreen({ 
  currentScreen, 
  setCurrentScreen, 
  userProfile, 
  setUserProfile,
  notificationEnabled,
  setNotificationEnabled,
  isAutoTaggingEnabled,
  setIsAutoTaggingEnabled,
  editProfileName,
  setEditProfileName,
  editProfileEmail,
  setEditProfileEmail,
  editProfilePhone,
  setEditProfilePhone
}) {
  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#F2F0E6' }}>
      {/* 헤더 */}
      <header className="bg-white px-8 py-6 sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 shadow-sm h-[100px]">
        <button 
          onClick={() => setCurrentScreen(SCREENS.HOME)} 
          className="p-2 hover:bg-gray-100 rounded-2xl transition-colors" 
          style={{ color: '#232323' }}
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="font-bold text-base" style={{ color: '#232323' }}>프로필</h2>
        <div className="w-10"></div> {/* 오른쪽 공간 맞추기 */}
      </header>

      {/* 내용 영역 */}
      <main className="flex-1 overflow-y-auto p-8 space-y-4 pb-32">
        {/* 프로필 카드 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 relative">
          <button
            onClick={() => {
              setCurrentScreen(SCREENS.PROFILE_EDIT);
            }}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-xl transition-colors"
            style={{ color: '#C9A27A' }}
          >
            <Edit size={20} />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#C9A27A] to-[#B8946A] flex items-center justify-center text-2xl shadow-sm">
              👩‍⚕️
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1" style={{ color: '#232323' }}>
                {userProfile.name}
              </h3>
              {userProfile.shopName && (
                <p className="text-sm font-medium mb-1" style={{ color: '#C9A27A' }}>
                  {userProfile.shopName}
                </p>
              )}
              <p className="text-sm font-light" style={{ color: '#232323', opacity: 0.7 }}>
                {userProfile.email}
              </p>
            </div>
          </div>
        </div>

        {/* 메뉴 리스트 */}
        <div className="space-y-2">
          {/* 시술 태그/키워드 관리 */}
          <button
            onClick={() => {
              setCurrentScreen(SCREENS.TAG_SETTINGS);
            }}
            className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F2F0E6] flex items-center justify-center">
                <span className="text-xl font-bold" style={{ color: '#C9A27A' }}>#</span>
              </div>
              <span className="text-sm font-medium" style={{ color: '#232323' }}>시술 태그/키워드 관리</span>
            </div>
            <ChevronRight size={18} style={{ color: '#A7A196' }} />
          </button>

          {/* 알림 설정 */}
          <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F2F0E6] flex items-center justify-center">
                <span className="text-xl">🔔</span>
              </div>
              <span className="text-sm font-medium" style={{ color: '#232323' }}>알림 설정</span>
            </div>
            <button
              onClick={() => setNotificationEnabled(!notificationEnabled)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                notificationEnabled ? 'bg-[#C9A27A]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  notificationEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* AI 태그 자동 추천 */}
          <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F2F0E6] flex items-center justify-center">
                <span className="text-xl">🏷️</span>
              </div>
              <span className="text-sm font-medium" style={{ color: '#232323' }}>AI 태그 자동 추천</span>
            </div>
            <button
              onClick={() => setIsAutoTaggingEnabled(!isAutoTaggingEnabled)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isAutoTaggingEnabled ? 'bg-[#C9A27A]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  isAutoTaggingEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 테마 설정 */}
          <button
            onClick={() => {
              // TODO: 테마 설정 화면 구현
              alert('준비 중입니다.');
            }}
            className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F2F0E6] flex items-center justify-center">
                <span className="text-xl">🎨</span>
              </div>
              <div className="flex-1 text-left">
                <span className="text-sm font-medium" style={{ color: '#232323' }}>테마 설정</span>
                <p className="text-xs mt-0.5" style={{ color: '#8B8574' }}>현재: 웜톤</p>
              </div>
            </div>
            <ChevronRight size={18} style={{ color: '#A7A196' }} />
          </button>

          {/* 고객 데이터 관리 */}
          <button
            onClick={() => {
              setCurrentScreen(SCREENS.CONTACT_IMPORT);
            }}
            className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F2F0E6] flex items-center justify-center">
                <span className="text-xl">👥</span>
              </div>
              <span className="text-sm font-medium" style={{ color: '#232323' }}>고객 데이터 관리</span>
            </div>
            <ChevronRight size={18} style={{ color: '#A7A196' }} />
          </button>

          {/* 도움말 / 문의하기 */}
          <button
            onClick={() => {
              alert('준비 중입니다.');
            }}
            className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F2F0E6] flex items-center justify-center">
                <span className="text-xl">❓</span>
              </div>
              <span className="text-sm font-medium" style={{ color: '#232323' }}>도움말 / 문의하기</span>
            </div>
            <ChevronRight size={18} style={{ color: '#A7A196' }} />
          </button>

          {/* 로그아웃 */}
          <button
            onClick={() => {
              // TODO: 로그아웃 기능 구현
              alert('준비 중입니다.');
            }}
            className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors mt-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEF2F0] flex items-center justify-center">
                <span className="text-xl">🚪</span>
              </div>
              <span className="text-sm font-medium" style={{ color: '#D25B4B' }}>로그아웃</span>
            </div>
            <ChevronRight size={18} style={{ color: '#A7A196' }} />
          </button>
        </div>
      </main>
    </div>
  );
}

export default ProfileScreen;


