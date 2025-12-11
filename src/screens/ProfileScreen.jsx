import React, { memo } from 'react';
import { ChevronRight, Pencil } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SCREENS } from '../constants/screens';

function ProfileScreen({ 
  setCurrentScreen, 
  isAutoTaggingEnabled, 
  setIsAutoTaggingEnabled,
  cachedProfile,
  profileLoading
}) {
  const { user, signOut } = useAuth();

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

  return (
    <div className="h-full overflow-y-auto" style={{ backgroundColor: '#F2F0E6' }}>
      <div className="px-5 pt-5 pb-6">
        {/* 상단 프로필 카드 */}
        <UserProfileCard
          profile={cachedProfile}
          loading={profileLoading}
          email={user?.email || ''}
          onEditClick={handleEditProfileClick}
        />

        {/* 시술 태그/알림/AI 추천/테마/고객 데이터 관리 카드들 */}
        <div className="space-y-3">
          <SettingRow
            label="태그/키워드 관리"
            onClick={() => setCurrentScreen && setCurrentScreen(SCREENS.TAG_SETTINGS)}
          />
          <ToggleRow label="알림 설정" />
          <ToggleRow 
            label="AI 태그 자동 추천" 
            enabled={isAutoTaggingEnabled}
            onToggle={setIsAutoTaggingEnabled}
          />
          <SettingRow label="테마 설정" description="현재: 웜톤" />
          <SettingRow
            label="고객 데이터 관리"
            onClick={() => setCurrentScreen && setCurrentScreen(SCREENS.CONTACT_IMPORT)}
          />
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

function ToggleRow({ label, enabled = false, onToggle }) {
  const handleToggle = () => {
    if (onToggle) {
      onToggle(!enabled);
    }
  };

  return (
    <div className="rounded-2xl bg-white border border-[#E4D9CC] px-5 py-4 flex items-center justify-between">
      <p className="text-sm text-neutral-800">{label}</p>
      <button
        type="button"
        onClick={handleToggle}
        className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${
          enabled ? 'bg-[#C9A27A]' : 'bg-neutral-200'
        }`}
      >
        <div
          className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

// 프로필 카드 컴포넌트 (React.memo로 최적화, 깜빡임 제거)
const UserProfileCard = memo(({ profile, loading, email, onEditClick }) => {
  // 기존 데이터가 있으면 로딩 중에도 스켈레톤을 보여주지 않음 (Stale Data First)
  const hasStaleData = profile !== null && profile !== undefined;
  
  // DB 값이 없을 때 보여줄 기본 텍스트 (초기값 확보)
  const ownerName = profile?.owner_name || '원장님 이름을 입력해 주세요';
  const shopName = profile?.shop_name || '샵 이름을 입력해 주세요';
  
  // 로딩 중이지만 기존 데이터가 있으면 스켈레톤을 보여주지 않음
  const showSkeleton = loading && !hasStaleData;

  return (
    <div className="bg-white border border-[#E4D9CC] rounded-2xl px-5 py-4 mb-5 flex items-center justify-between h-[88px]">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-11 h-11 rounded-full bg-[#F2F0E6] flex items-center justify-center text-[11px] font-semibold text-[#C9A27A] flex-shrink-0">
          {ownerName?.[0] || '원'}
        </div>
        <div className="flex-1 min-w-0">
          {showSkeleton ? (
            <>
              <div className="h-4 w-24 bg-neutral-100 rounded mb-1 animate-pulse" />
              <div className="h-3 w-32 bg-neutral-100 rounded mb-1 animate-pulse" />
              <div className="h-3 w-40 bg-neutral-100 rounded animate-pulse" />
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-neutral-900 truncate">
                {ownerName}
              </p>
              <p className="text-[11px] text-neutral-500 truncate">
                {shopName}
              </p>
              <p className="text-[11px] text-neutral-400 truncate">
                {email}
              </p>
            </>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onEditClick}
        className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-[#E4D9CC] bg-white active:bg-neutral-50 flex-shrink-0 ml-2"
      >
        <Pencil className="w-3.5 h-3.5 text-neutral-500" />
      </button>
    </div>
  );
});

UserProfileCard.displayName = 'UserProfileCard';

export default ProfileScreen;
