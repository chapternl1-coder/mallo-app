import React from 'react';
import { ChevronRight, Pencil } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import useUserProfile from '../hooks/useUserProfile';
import { SCREENS } from '../constants/screens';

function ProfileScreen({ setCurrentScreen }) {
  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();

  const handleSignOutClick = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('로그아웃 중 오류', error);
      alert('로그아웃 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const handleEditProfileClick = () => {
    if (setCurrentScreen) {
      setCurrentScreen(SCREENS.PROFILE_EDIT);
    }
  };

  // DB 값이 없을 때 보여줄 기본 텍스트
  const displayOwnerName = profile?.owner_name || '김말로 원장님';
  const displayShopName = profile?.shop_name || '말로 뷰티 스튜디오';
  const displayEmail = profile?.shop_email || user?.email || 'mallo@beauty.com';

  return (
    <div className="h-full overflow-y-auto" style={{ backgroundColor: '#F2F0E6' }}>
      <div className="px-5 pt-5 pb-6">
        {/* 상단 프로필 카드 */}
        <div className="bg-white border border-[#E4D9CC] rounded-2xl px-5 py-4 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#F2F0E6] flex items-center justify-center text-[11px] font-semibold text-[#C9A27A]">
              {displayOwnerName?.[0] || '원'}
            </div>
            <div>
              {profileLoading ? (
                <>
                  <div className="h-4 w-24 bg-neutral-100 rounded mb-1" />
                  <div className="h-3 w-32 bg-neutral-100 rounded mb-1" />
                  <div className="h-3 w-40 bg-neutral-100 rounded" />
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-neutral-900">
                    {displayOwnerName}
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    {displayShopName}
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    {displayEmail}
                  </p>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleEditProfileClick}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-[#E4D9CC] bg-white active:bg-neutral-50"
          >
            <Pencil className="w-3.5 h-3.5 text-neutral-500" />
          </button>
        </div>

        {/* 시술 태그/알림/AI 추천/테마/고객 데이터 관리 카드들 */}
        <div className="space-y-3">
          <SettingRow
            label="시술 태그/키워드 관리"
            onClick={() => setCurrentScreen && setCurrentScreen(SCREENS.TAG_SETTINGS)}
          />
          <ToggleRow label="알림 설정" />
          <ToggleRow label="AI 태그 자동 추천" />
          <SettingRow label="테마 설정" description="현재: 웜톤" />
          <SettingRow
            label="고객 데이터 관리"
            onClick={() => setCurrentScreen && setCurrentScreen(SCREENS.CONTACT_IMPORT)}
          />
        </div>

        {/* 데모 모드 카드 */}
        <div className="mt-5 bg-white border border-[#E4D9CC] rounded-2xl px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-neutral-900">데모 모드</p>
            <span className="text-[10px] text-neutral-400 border border-[#E4D9CC] rounded-full px-2 py-0.5">
              개발 사용용
            </span>
          </div>
          <p className="text-[11px] text-neutral-500 leading-relaxed mb-3">
            데모/테스트 사용용으로 샘플 고객·예약·운영 데이터를 한 번에 채우거나, 모든 데이터를 초기 상태로 되돌릴 수 있어요.
          </p>
          <button
            type="button"
            className="w-full rounded-full py-2 text-xs font-medium text-white mb-2"
            style={{ backgroundColor: '#C9A27A' }}
          >
            데모 데이터 채우기
          </button>
          <button
            type="button"
            className="w-full rounded-full py-2 text-xs font-medium text-neutral-500 bg-neutral-50 border border-[#E4D9CC]"
          >
            데이터 초기화하기
          </button>
        </div>

        {/* 도움말 / 로그아웃 카드 */}
        <div className="mt-5 space-y-3 mb-8">
          <SettingRow label="도움말 / 문의하기" />
          <div className="rounded-2xl bg-white border border-[#E4D9CC]">
            <button
              type="button"
              onClick={handleSignOutClick}
              className="w-full flex items-center justify-between px-5 py-4 text-left active:bg-neutral-50 transition"
            >
              <span className="text-sm text-neutral-800">로그아웃</span>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>
          </div>
          {user?.email && (
            <p className="text-[10px] text-neutral-400 text-center">
              현재 로그인 계정: {user.email}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingRow({ label, description, onClick }) {
  return (
    <div className="rounded-2xl bg-white border border-[#E4D9CC]">
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center justify-between px-5 py-4 text-left active:bg-neutral-50 transition"
      >
        <div>
          <p className="text-sm text-neutral-800">{label}</p>
          {description && (
            <p className="text-[11px] text-neutral-400 mt-0.5">
              {description}
            </p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-neutral-400" />
      </button>
    </div>
  );
}

function ToggleRow({ label }) {
  return (
    <div className="rounded-2xl bg-white border border-[#E4D9CC] px-5 py-4 flex items-center justify-between">
      <p className="text-sm text-neutral-800">{label}</p>
      {/* 토글은 아직 더미 UI (나중에 진짜 설정이랑 연결) */}
      <div className="w-10 h-5 rounded-full bg-neutral-200 flex items-center px-0.5">
        <div className="w-4 h-4 rounded-full bg-white shadow-sm translate-x-0" />
      </div>
    </div>
  );
}

export default ProfileScreen;
