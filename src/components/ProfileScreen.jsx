import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

const ProfileScreen = ({ onBack, customers }) => {
  // 토글 상태 관리
  const [refillNotification, setRefillNotification] = useState(true);
  const [tipNotification, setTipNotification] = useState(false);

  // 첫 번째 고객을 원장으로 임시 사용 (더미 데이터)
  const ownerName = customers && customers.length > 0 ? customers[0].name : '김민지';
  const shopName = '민지네 속눈썹샵';

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#F2F0E6' }}>
      {/* 상단 헤더 */}
      <header className="bg-white px-8 py-6 sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 shadow-sm">
        <button 
          onClick={onBack} 
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
        {/* (1) 원장 프로필 요약 카드 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-6xl">👩‍⚕️</div>
            <div className="flex-1">
              <h3 className="font-bold text-xl mb-1" style={{ color: '#232323' }}>
                {ownerName} 원장
              </h3>
              <p className="text-sm font-light" style={{ color: '#232323', opacity: 0.7 }}>
                {shopName}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100" style={{ color: '#232323' }}>
              #Mallo 베타 사용자
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100" style={{ color: '#232323' }}>
              #뷰티샵
            </span>
          </div>
        </div>

        {/* (2) 내 계정 카드 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h4 className="font-bold text-base mb-4" style={{ color: '#232323' }}>내 계정</h4>
          <div className="space-y-2">
            <p className="text-sm font-light" style={{ color: '#232323', opacity: 0.8 }}>
              로그인 아이디: example@mallolog.app
            </p>
            <p className="text-sm font-light" style={{ color: '#232323', opacity: 0.8 }}>
              연락처: 010-0000-0000
            </p>
          </div>
          <button
            onClick={() => {
              // TODO: 프로필 편집 기능 구현
              alert('준비 중입니다.');
            }}
            className="mt-4 text-xs text-[#C9A27A] hover:underline"
          >
            프로필 편집
          </button>
        </div>

        {/* (3) 매장 정보 카드 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h4 className="font-bold text-base mb-4" style={{ color: '#232323' }}>매장 정보</h4>
          <div className="space-y-2">
            {/* TODO: 실제 샵 정보와 연결 */}
            <p className="text-sm font-light" style={{ color: '#232323', opacity: 0.8 }}>
              샵 이름: {shopName}
            </p>
            <p className="text-sm font-light" style={{ color: '#232323', opacity: 0.8 }}>
              업종: 속눈썹 / 왁싱
            </p>
            <p className="text-sm font-light" style={{ color: '#232323', opacity: 0.8 }}>
              위치: 서울 ○○동
            </p>
            <p className="text-sm font-light" style={{ color: '#232323', opacity: 0.8 }}>
              메모: 1인샵 · 완전 예약제
            </p>
          </div>
        </div>

        {/* (4) 구독 / 요금제 카드 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h4 className="font-bold text-base mb-4" style={{ color: '#232323' }}>구독 / 요금제</h4>
          <div className="space-y-2 mb-4">
            <p className="text-sm font-light" style={{ color: '#232323', opacity: 0.8 }}>
              현재 플랜: 무료 플랜
            </p>
            <p className="text-sm font-light" style={{ color: '#232323', opacity: 0.8 }}>
              포함 기능: 음성 업무일지 요약, 고객 히스토리 검색
            </p>
          </div>
          <div className="flex flex-col gap-2 mt-4">
            <button
              onClick={() => alert('준비 중입니다.')}
              className="px-4 py-2 rounded-xl text-sm font-medium text-[#C9A27A] border border-[#C9A27A] hover:bg-[#C9A27A] hover:text-white transition-colors"
            >
              플랜 변경
            </button>
            <button
              onClick={() => alert('준비 중입니다.')}
              className="px-4 py-2 rounded-xl text-sm font-medium text-[#C9A27A] border border-[#C9A27A] hover:bg-[#C9A27A] hover:text-white transition-colors"
            >
              결제 내역 보기
            </button>
          </div>
        </div>

        {/* (5) 앱 설정 카드 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h4 className="font-bold text-base mb-4" style={{ color: '#232323' }}>앱 설정</h4>
          <div className="space-y-4">
            {/* 시술 리필 주기 알림 토글 */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-light" style={{ color: '#232323', opacity: 0.8 }}>
                시술 리필 주기 알림 받기
              </span>
              <button
                onClick={() => setRefillNotification(!refillNotification)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  refillNotification ? 'bg-[#C9A27A]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    refillNotification ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 앱 사용 팁 알림 토글 */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-light" style={{ color: '#232323', opacity: 0.8 }}>
                앱 사용 팁 알림 받기
              </span>
              <button
                onClick={() => setTipNotification(!tipNotification)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  tipNotification ? 'bg-[#C9A27A]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    tipNotification ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* (6) 도움말 & 기타 카드 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h4 className="font-bold text-base mb-4" style={{ color: '#232323' }}>도움말 & 기타</h4>
          <div className="space-y-3">
            <button
              onClick={() => alert('준비 중입니다.')}
              className="w-full text-left text-sm font-light hover:text-[#C9A27A] transition-colors"
              style={{ color: '#232323', opacity: 0.8 }}
            >
              자주 묻는 질문(FAQ)
            </button>
            <button
              onClick={() => alert('support@mallolog.app 로 메일 보내주세요')}
              className="w-full text-left text-sm font-light hover:text-[#C9A27A] transition-colors"
              style={{ color: '#232323', opacity: 0.8 }}
            >
              피드백 보내기
            </button>
            <button
              onClick={() => alert('준비 중입니다.')}
              className="w-full text-left text-sm font-light hover:text-[#D25B4B] transition-colors mt-2"
              style={{ color: '#D25B4B' }}
            >
              로그아웃
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfileScreen;



