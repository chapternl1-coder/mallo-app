import React from 'react';
import { ArrowLeft, Camera } from 'lucide-react';
import { SCREENS } from '../constants/screens';

function ProfileEditScreen({
  editProfileName,
  setEditProfileName,
  editProfileShopName,
  setEditProfileShopName,
  editProfileEmail,
  setEditProfileEmail,
  editProfilePhone,
  setEditProfilePhone,
  setUserProfile,
  setCurrentScreen
}) {
  const handleSave = () => {
    setUserProfile(prev => ({
      ...prev,
      name: editProfileName.trim(),
      shopName: editProfileShopName.trim(),
      email: editProfileEmail.trim(),
      phone: editProfilePhone.trim()
    }));
    setCurrentScreen(SCREENS.PROFILE);
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#F2F0E6' }}>
      {/* 헤더 */}
      <header className="bg-[#F2F0E6] px-5 pt-4 pb-2 sticky top-0 z-20 flex items-center justify-between">
        <button 
          onClick={() => setCurrentScreen(SCREENS.PROFILE)} 
          className="p-2 hover:bg-gray-100 rounded-2xl transition-colors" 
          style={{ color: '#232323' }}
        >
          <span className="text-[24px]">&#x2039;</span>
        </button>
        <h2 className="font-bold text-base" style={{ color: '#232323' }}>프로필 수정</h2>
        <button
          onClick={handleSave}
          className="px-4 h-8 rounded-lg font-semibold text-white text-xs transition-all hover:opacity-90"
          style={{ backgroundColor: '#C9A27A' }}
        >
          저장
        </button>
      </header>

      {/* 내용 영역 */}
      <main className="flex-1 overflow-y-auto p-8 space-y-4 pb-32">
        {/* 프로필 사진 */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#C9A27A] to-[#B8946A] flex items-center justify-center text-4xl shadow-sm">
              👩‍⚕️
            </div>
            <button
              className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-[#C9A27A] flex items-center justify-center text-white shadow-md hover:bg-[#B8946A] transition-colors"
              onClick={() => {
                alert('프로필 사진 변경 기능은 준비 중입니다.');
              }}
            >
              <Camera size={18} />
            </button>
          </div>
        </div>

        {/* 프로필 정보 카드 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#232323' }}>이름</label>
              <input
                type="text"
                value={editProfileName}
                onChange={(e) => setEditProfileName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#C9A27A] focus:outline-none transition-colors"
                style={{ color: '#232323', backgroundColor: '#FFFFFF' }}
                placeholder="이름을 입력하세요"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#232323' }}>연락처</label>
              <input
                type="tel"
                value={editProfilePhone}
                onChange={(e) => setEditProfilePhone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#C9A27A] focus:outline-none transition-colors"
                style={{ color: '#232323', backgroundColor: '#FFFFFF' }}
                placeholder="010-0000-0000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#232323' }}>샵 이름</label>
              <input
                type="text"
                value={editProfileShopName}
                onChange={(e) => setEditProfileShopName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#C9A27A] focus:outline-none transition-colors"
                style={{ color: '#232323', backgroundColor: '#FFFFFF' }}
                placeholder="샵 이름을 입력하세요"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#232323' }}>이메일</label>
              <input
                type="email"
                value={editProfileEmail}
                onChange={(e) => setEditProfileEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#C9A27A] focus:outline-none transition-colors"
                style={{ color: '#232323', backgroundColor: '#FFFFFF' }}
                placeholder="email@example.com"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ProfileEditScreen;


