import React from 'react';
import { Mic } from 'lucide-react';

function formatTimeLabel(timeString) {
  if (!timeString) return '--:--';
  // timeString 이 "02:03" 형식이거나, ISO일 수도 있으니 둘 다 처리
  if (/^\d{2}:\d{2}$/.test(timeString)) return timeString;

  const date = new Date(timeString);
  if (Number.isNaN(date.getTime())) return '--:--';

  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * 홈 화면 예약 카드 (예전 UI 느낌 복원용)
 *
 * props:
 * - timeLabel: 카드에 보여줄 시간 문자열 (예: "01:02")
 * - name: 고객 이름
 * - phone: 전화번호
 * - memo: 메모 한 줄 (예: "첫 테스")
 * - isFirstVisit: 첫 방문 여부 (true면 작은 뱃지 표시)
 * - onClick: 카드/녹음 버튼 클릭 시 동작
 */
export default function HomeReservationCard({
  timeLabel,
  name,
  phone,
  memo,
  isFirstVisit = false,
  onClick,
}) {

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left"
    >
      <div className="flex items-center justify-between rounded-[18px] bg-white px-4 py-3 mb-2 shadow-[0_2px_4px_rgba(0,0,0,0.04)]">
        {/* 왼쪽: 시간 + 고객 정보 */}
        <div className="flex items-center gap-3">
          {/* 시간 동그라미 */}
          <div className="flex flex-col items-center w-10">
            <div className="w-6 h-6 rounded-full border border-[#E4D9CC] flex items-center justify-center">
              <span
                className="text-[10px] font-semibold"
                style={{ color: '#C9A27A' }}
              >
                {(timeLabel || '--:--').split(':')[0]}
              </span>
            </div>
            <span className="mt-[2px] text-[10px] text-neutral-400">
              {timeLabel || '--:--'}
            </span>
          </div>

          {/* 이름 / 전화번호 / 메모 */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="text-[13px] font-semibold text-neutral-800">
                {name || '이름 없음'}
              </span>
              {isFirstVisit && (
                <span
                  className="px-1.5 py-[1px] rounded-full text-[9px] font-semibold"
                  style={{ backgroundColor: '#F4E6D7', color: '#B1844A' }}
                >
                  신규
                </span>
              )}
            </div>
            {phone && (
              <span className="mt-[1px] text-[11px] text-neutral-400">
                {phone}
              </span>
            )}
            {memo && (
              <span className="mt-[1px] text-[11px]" style={{ color: '#C9A27A' }}>
                {memo}
              </span>
            )}
          </div>
        </div>

        {/* 오른쪽: 녹음 버튼 */}
        <div>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: '#C9A27A',
              boxShadow: '0 4px 8px rgba(0,0,0,0.08)',
            }}
          >
            <Mic className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    </button>
  );
}
