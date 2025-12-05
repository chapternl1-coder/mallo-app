import React, { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import useUserProfile from '../hooks/useUserProfile';
import { useAuth } from '../contexts/AuthContext';
import { SCREENS } from '../constants/screens';

export default function ProfileEditScreen({ setCurrentScreen }) {
  const { user } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useUserProfile();

  const [ownerName, setOwnerName] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopEmail, setShopEmail] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // 프로필 로딩이 끝나면 폼에 기본값 채우기
  useEffect(() => {
    if (!profileLoading && profile) {
      setOwnerName(profile.owner_name || '');
      setShopName(profile.shop_name || '');
      setShopEmail(profile.shop_email || user?.email || '');
      setShopPhone(profile.shop_phone || '');
      setShopAddress(profile.shop_address || '');
      setNote(profile.note || '');
    }
  }, [profileLoading, profile, user]);

  const handleBack = () => {
    if (setCurrentScreen) {
      setCurrentScreen(SCREENS.PROFILE);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    try {
      setSaving(true);

      await updateProfile({
        owner_name: ownerName || null,
        shop_name: shopName || null,
        shop_email: shopEmail || null,
        shop_phone: shopPhone || null,
        shop_address: shopAddress || null,
        note: note || null,
        updated_at: new Date().toISOString(),
      });

      alert('프로필이 저장되었습니다.');
      if (setCurrentScreen) {
        setCurrentScreen(SCREENS.PROFILE);
      }
    } catch (error) {
      console.error('프로필 저장 중 오류', error);
      alert('프로필 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  const disabled = saving || profileLoading;

  return (
    <div
      className="h-full flex flex-col"
      style={{ backgroundColor: '#F2F0E6' }}
    >
      {/* 상단바 */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="w-8 h-8 flex items-center justify-center rounded-full active:bg-neutral-200/40"
        >
          <ChevronLeft className="w-5 h-5 text-neutral-700" />
        </button>
        <p className="text-sm font-semibold text-neutral-900">
          프로필 수정
        </p>
        {/* 오른쪽은 자리 맞추기용 빈 박스 */}
        <div className="w-8 h-8" />
      </div>

      {/* 내용 영역 */}
      <div className="flex-1 overflow-y-auto px-5 pb-28">
        <div className="bg-white border border-[#E4D9CC] rounded-2xl px-5 py-4 mb-4">
          <p className="text-xs font-semibold text-neutral-900 mb-3">
            원장 정보
          </p>

          <LabelInput
            label="원장님 이름"
            placeholder="예: 김말로"
            value={ownerName}
            onChange={setOwnerName}
            disabled={disabled}
          />

          <LabelInput
            label="샵 이름"
            placeholder="예: 말로 뷰티 스튜디오"
            value={shopName}
            onChange={setShopName}
            disabled={disabled}
          />
        </div>

        <div className="bg-white border border-[#E4D9CC] rounded-2xl px-5 py-4 mb-4">
          <p className="text-xs font-semibold text-neutral-900 mb-3">
            샵 연락처 / 정보
          </p>

          <LabelInput
            label="이메일"
            placeholder="샵에서 사용하는 이메일"
            value={shopEmail}
            onChange={setShopEmail}
            disabled={disabled}
          />

          <LabelInput
            label="전화번호"
            placeholder="예: 010-0000-0000"
            value={shopPhone}
            onChange={setShopPhone}
            disabled={disabled}
          />

          <LabelInput
            label="주소"
            placeholder="예: 서울시 ○○구 ○○동 ○○빌딩 3층"
            value={shopAddress}
            onChange={setShopAddress}
            disabled={disabled}
          />
        </div>

        <div className="bg-white border border-[#E4D9CC] rounded-2xl px-5 py-4 mb-4">
          <p className="text-xs font-semibold text-neutral-900 mb-2">
            메모
          </p>
          <textarea
            className="w-full text-xs rounded-xl border border-[#E4D9CC] px-3 py-2 outline-none resize-none focus:ring-1 focus:ring-[#C9A27A]"
            rows={3}
            placeholder="내 계정 / 샵에 대한 메모가 있다면 적어두세요."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      {/* 하단 저장 버튼 */}
      <div className="px-5 pb-6 pt-3 border-t border-[#E4D9CC]/60 bg-[#F2F0E6]">
        <button
          type="button"
          onClick={handleSave}
          disabled={disabled}
          className="w-full rounded-full py-3 text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#C9A27A' }}
        >
          {saving ? '저장 중...' : '저장 완료'}
        </button>
      </div>
    </div>
  );
}

function LabelInput({ label, value, onChange, placeholder, disabled }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="text-[11px] text-neutral-500 mb-1.5">{label}</p>
      <input
        type="text"
        className="w-full text-xs rounded-xl border border-[#E4D9CC] px-3 py-2 outline-none focus:ring-1 focus:ring-[#C9A27A]"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}
