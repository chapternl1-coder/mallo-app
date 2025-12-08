import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import useProfile from '../hooks/useProfile';
import { SCREENS } from '../constants/screens';

export default function ProfileEditScreen({ setCurrentScreen }) {
  const { user } = useAuth();
  const { profile, loading, saving, updateProfile } = useProfile();

  const DRAFT_KEY = 'mallo_profile_edit_draft';
  const loadDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (!saved) return {};
      return JSON.parse(saved) || {};
    } catch (e) {
      console.warn('[ProfileEdit] 드래프트 초기 로드 실패', e);
      return {};
    }
  };

  const draft = loadDraft();
  const [initialized, setInitialized] = useState(false);
  const lastProfileIdRef = useRef(null);
  const [ownerName, setOwnerName] = useState(draft.ownerName || '');
  const [shopName, setShopName] = useState(draft.shopName || '말로뷰티스튜디오');
  const [phone, setPhone] = useState(draft.phone || '');
  const [address, setAddress] = useState(draft.address || '');
  const [memo, setMemo] = useState(draft.memo || '');
  const [errorMessage, setErrorMessage] = useState('');

  // Supabase에서 가져온 프로필을 폼에 채워 넣기 (초기 1회, 프로필 변경 시만)
  useEffect(() => {
    if (profile) {
      const profileId = profile.id || 'no-id';
      if (!initialized || lastProfileIdRef.current !== profileId) {
        setOwnerName((prev) => prev || profile.owner_name || '');
        setShopName((prev) => {
          if (prev) return prev;
          const currentShopName = profile.shop_name || '';
          if (currentShopName === '강민샵' || currentShopName.trim() === '') {
            return '말로뷰티스튜디오';
          }
          return currentShopName;
        });
        // phone/address/memo는 프로필에서 내려오는 값이 없으므로 덮어쓰지 않음
        lastProfileIdRef.current = profileId;
        setInitialized(true);
      }
    }
  }, [profile, initialized]);

  // 로컬 드래프트 로드 (전화/주소/메모 포함)
  // 드래프트 저장 (사용자 입력 유지용)
  useEffect(() => {
    try {
      const nextDraft = { ownerName, shopName, phone, address, memo };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(nextDraft));
    } catch (e) {
      console.warn('[ProfileEdit] 드래프트 저장 실패', e);
    }
  }, [ownerName, shopName, phone, address, memo]);

  const handleBack = () => {
    if (setCurrentScreen) {
      setCurrentScreen(SCREENS.PROFILE);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    try {
      await updateProfile({
        owner_name: ownerName.trim(),
        shop_name: shopName.trim(),
        // 나중에 profiles 테이블에 phone/address/memo 컬럼 추가하면
        // phone, address, memo도 같이 넘기면 됨
      });

      // phone/address/memo는 아직 서버에 저장하지 않으므로 드래프트를 지우지 않아 입력값을 유지

      if (setCurrentScreen) {
        setCurrentScreen(SCREENS.PROFILE);
      }
    } catch (err) {
      console.error('프로필 저장 중 오류:', err);
      setErrorMessage('프로필 저장 중 문제가 발생했어요. 다시 시도해 주세요.');
    }
  };

  const email = user?.email || '';

  return (
    <div
      className="h-full w-full flex items-center justify-center"
      style={{ backgroundColor: '#F2F0E6' }}
    >
      <div className="w-full max-w-md h-full sm:h-[90vh] sm:rounded-[2rem] sm:shadow-md overflow-hidden border-0 bg-[#F2F0E6] flex flex-col">
        {/* 상단 헤더 */}
        <div className="px-6 pt-6 pb-3 flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#E7DFD4]"
          >
            <ChevronLeft className="w-4 h-4 text-neutral-700" />
          </button>
          <div>
            <h1 className="text-sm font-semibold text-neutral-900">프로필 수정</h1>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              원장님 이름과 샵 정보를 입력해 주세요.
            </p>
          </div>
        </div>

        {/* 폼 영역 */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 pb-28 pt-2 space-y-5"
        >
          {/* 원장 정보 */}
          <section className="bg-white rounded-3xl px-5 py-5 shadow-sm">
            <h2 className="text-xs font-semibold text-neutral-900 mb-3">
              원장 정보
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-neutral-500 mb-1">
                  원장님 이름
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-[#E5D9CC] bg-[#FAF7F1] px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#C9A27A]"
                  placeholder="예: 김말로"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-500 mb-1">
                  샵 이름
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-[#E5D9CC] bg-[#FAF7F1] px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#C9A27A]"
                  placeholder="예: 말로뷰티스튜디오"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* 샵 연락처/정보 (아직 DB 저장 X, UI만 유지) */}
          <section className="bg-white rounded-3xl px-5 py-5 shadow-sm">
            <h2 className="text-xs font-semibold text-neutral-900 mb-3">
              샵 연락처 / 정보
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-neutral-500 mb-1">
                  이메일
                </label>
                <input
                  type="email"
                  className="w-full rounded-xl border border-[#E5D9CC] bg-[#F5F0E6] px-3 py-2 text-xs text-neutral-500 outline-none"
                  value={email}
                  readOnly
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-500 mb-1">
                  전화번호
                </label>
                <input
                  type="tel"
                  className="w-full rounded-xl border border-[#E5D9CC] bg-[#FAF7F1] px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#C9A27A]"
                  placeholder="예: 010-0000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-500 mb-1">
                  주소
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-[#E5D9CC] bg-[#FAF7F1] px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#C9A27A]"
                  placeholder="예: 서울시 ○○구 ○○동 ○○빌딩 3층"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* 메모 (UI만) */}
          <section className="bg-white rounded-3xl px-5 py-5 shadow-sm">
            <h2 className="text-xs font-semibold text-neutral-900 mb-3">
              메모
            </h2>
            <textarea
              className="w-full min-h-[72px] rounded-xl border border-[#E5D9CC] bg-[#FAF7F1] px-3 py-2 text-xs outline-none resize-none focus:ring-1 focus:ring-[#C9A27A]"
              placeholder="내 계정 / 샵에 대한 메모가 있다면 적어주세요."
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </section>

          {errorMessage && (
            <p className="text-[11px] text-red-500">{errorMessage}</p>
          )}
        </form>

        {/* 하단 고정 버튼 */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 pt-3 bg-gradient-to-t from-[#F2F0E6] to-transparent">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="w-full rounded-2xl bg-[#C9A27A] text-white text-sm font-medium py-3 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? '저장 중…' : '저장 완료'}
          </button>
        </div>
      </div>
    </div>
  );
}
