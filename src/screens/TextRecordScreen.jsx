import React, { useState } from 'react';

function TextRecordScreen({
  reservation,       // { id, name, phone, timeLabel, dateLabel } 같은 예약 정보
  onBack,            // 뒤로가기 (홈으로)
  onSubmitTextLog,   // 텍스트 기록 제출 (요약 API 호출 or VisitLog 생성)
  isSummarizing = false,   // 요약 중 여부 prop
}) {
  const [text, setText] = useState('');
  const maxLength = 1000;

  const handleChange = (e) => {
    setText(e.target.value);
  };

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (isSummarizing) return; // 이미 정리 중이면 추가 클릭 무시

    await onSubmitTextLog({
      reservationId: reservation?.id ?? null,
      customerName: reservation?.name ?? '',
      customerPhone: reservation?.phone ?? '',
      rawText: trimmed,
    });
  };

  const isTooShort = text.trim().length < 5;
  const isDisabled = isTooShort || isSummarizing; // 둘 중 하나라도 true면 버튼 비활성

  return (
    <div className="flex flex-col h-dvh bg-[#F2F0E6]">
      {/* Safe Area Top */}
      <div className="pt-[env(safe-area-inset-top)]" />

      {/* 상단 헤더 */}
      <header className="flex items-center justify-between px-5 pt-4 pb-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm"
        >
          <span className="text-[24px] text-[#8E8377]">&#x2039;</span>
        </button>

        <div className="flex flex-col items-center">
          <h1 className="text-base font-bold text-[#232323]">
            글로 기록하기
          </h1>
        </div>

        <div className="w-8" /> {/* 오른쪽 균형 맞추기용 */}
      </header>

      {/* 고객 정보 카드 */}
      {reservation && (
        <section className="px-5">
          <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-[#E6DFD6]">
            {/* 날짜 + 시간 (예: 2025년 12월 5일 (금) 02:03) */}
            <p className="text-[14px] text-gray-500 mb-2">
              {reservation.dateLabel || ''} {reservation.timeLabel || ''}
            </p>

            {/* 이름 / 전화번호 (예: 박사요 / 010-1234-5678) */}
            <p className="text-[14px] font-semibold text-gray-900">
              {reservation.name || '이름 미입력'}
              {reservation.phone && (
                <span className="ml-1 text-[13px] font-normal text-gray-700">
                  / {reservation.phone}
                </span>
              )}
            </p>
          </div>
        </section>
      )}

      {/* 안내 문구 */}
      <section className="px-5 mt-3">
        <div className="rounded-xl bg-[#EDE3D5] px-3 py-2">
          <p className="text-[11px] text-[#6F6254] leading-relaxed">
            말하기 어려운 날엔 이렇게 남겨주세요.
            <br />
            <span className="font-semibold">
              오늘 시술 내용 · 사용 제품 · 주의사항 · 다음 방문 추천
            </span>
            {' '}같이 떠오르는 대로 적어주시면,
            음성 기록과 똑같이 자동으로 시술 일지로 정리해 드릴게요.
          </p>
        </div>
      </section>

      {/* 텍스트 입력 영역 */}
      <main className="flex-1 px-5 mt-3 pb-24 overflow-y-auto">
        <div className="rounded-2xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] px-4 pt-3 pb-2 flex flex-col h-full">
          <label className="text-[11px] text-[#A59B90] mb-2">
            오늘 시술 내용을 자유롭게 적어주세요
          </label>
          <textarea
            value={text}
            onChange={handleChange}
            maxLength={maxLength}
            placeholder={
              '예) 3시 김민지 언니 리터치.\n저번 C컬이 살짝 처져서 오늘은 D컬 11·12mm 섞어서 진행.\n눈물 많아서 순한 글루 사용, 오른쪽 눈 테이핑 특히 주의.\n기존 회원권에서 5만 원 차감.'
            }
            className="flex-1 w-full resize-none border border-[#E3DDD3] rounded-xl px-3 py-2 text-[12px] text-[#3E2E20] leading-[1.6] bg-[#FBF8F2] placeholder:text-[#C0B7AB] focus:outline-none focus:border-[#C9A27A]"
          />
          <div className="mt-2 flex items-center justify-between text-[10px] text-[#A59B90]">
            <span>최소 5자 이상 입력하면 시술일지로 정리할 수 있어요.</span>
            <span>
              {text.length} / {maxLength}
            </span>
          </div>
        </div>
      </main>

      {/* 하단 고정 버튼 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] px-5 pb-6 pt-3 bg-gradient-to-t from-[#F2F0E6] to-transparent pointer-events-none">
        <button
          type="button"
          disabled={isDisabled}
          onClick={handleSubmit}
          className={[
            'w-full h-11 rounded-full text-[13px] font-semibold pointer-events-auto',
            isDisabled
              ? 'bg-[#D7CFC4] text-white cursor-not-allowed'
              : 'bg-[#C9A27A] text-white shadow-md active:scale-[0.99] transition-transform'
          ].join(' ')}
        >
          {isSummarizing ? '정리 중…' : '시술일지로 정리하기'}
        </button>
      </div>
    </div>
  );
}

export default TextRecordScreen;

