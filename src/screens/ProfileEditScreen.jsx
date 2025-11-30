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
      <header className="bg-white px-8 py-6 sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 shadow-sm h-[100px]">
        <button 
          onClick={() => setCurrentScreen(SCREENS.PROFILE)} 
          className="p-2 hover:bg-gray-100 rounded-2xl transition-colors" 
          style={{ color: '#232323' }}
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="font-bold text-base" style={{ color: '#232323' }}>프로필 수정</h2>
        <div className="w-10"></div> {/* 오른쪽 공간 맞추기 */}
      </header>

      {/* 내용 영역 */}
      <main className="flex-1 overflow-y-auto p-8 space-y-6 pb-32">
        {/* 프로필 사진 */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#C9A27A] to-[#B8946A] flex items-center justify-center text-4xl shadow-sm">
              👩‍⚕️
            </div>
            <button
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#C9A27A] flex items-center justify-center text-white shadow-md hover:bg-[#B8946A] transition-colors"
              onClick={() => {
                // TODO: 프로필 사진 변경 기능 구현
                alert('프로필 사진 변경 기능은 준비 중입니다.');
              }}
            >
              <Camera size={16} />
            </button>
          </div>
        </div>

        {/* 이름 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <label className="block text-sm font-bold mb-2" style={{ color: '#232323' }}>이름</label>
          <input
            type="text"
            value={editProfileName}
            onChange={(e) => setEditProfileName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#C9A27A] focus:outline-none transition-colors"
            style={{ color: '#232323' }}
            placeholder="이름을 입력하세요"
          />
        </div>

        {/* 샵 이름 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <label className="block text-sm font-bold mb-2" style={{ color: '#232323' }}>샵 이름</label>
          <input
            type="text"
            value={editProfileShopName}
            onChange={(e) => setEditProfileShopName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#C9A27A] focus:outline-none transition-colors"
            style={{ color: '#232323' }}
            placeholder="샵 이름을 입력하세요"
          />
        </div>

        {/* 연락처 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <label className="block text-sm font-bold mb-2" style={{ color: '#232323' }}>연락처</label>
          <input
            type="tel"
            value={editProfilePhone}
            onChange={(e) => setEditProfilePhone(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#C9A27A] focus:outline-none transition-colors"
            style={{ color: '#232323' }}
            placeholder="010-0000-0000"
          />
        </div>

        {/* 이메일 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <label className="block text-sm font-bold mb-2" style={{ color: '#232323' }}>이메일</label>
          <input
            type="email"
            value={editProfileEmail}
            onChange={(e) => setEditProfileEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#C9A27A] focus:outline-none transition-colors"
            style={{ color: '#232323' }}
            placeholder="email@example.com"
          />
        </div>
      </main>

      {/* 저장 버튼 (하단 고정) */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-200 shadow-lg z-30">
        <button
          onClick={handleSave}
          className="w-full py-4 rounded-xl font-bold text-white shadow-md hover:opacity-90 transition-all"
          style={{ backgroundColor: '#C9A27A' }}
        >
          저장 완료
        </button>
      </div>
    </div>
  );
}

export default ProfileEditScreen;


