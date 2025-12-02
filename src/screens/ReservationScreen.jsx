import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowLeft, Plus, Clock, X } from 'lucide-react';
import { SCREENS } from '../constants/screens';

/**
 * 고객 예약 페이지
 * - 시간과 이름을 간단하게 추가
 * - 시간 빠른순으로 정렬
 * - 말로 앱에 어울리는 디자인
 */
function ReservationScreen({
  reservations = [],
  addReservation,
  setReservations,
  deleteReservation,
  setCurrentScreen,
  getTodayDateString,
}) {
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const timeInputRef = useRef(null);
  const nameInputRef = useRef(null);

  // 오늘 날짜 문자열 가져오기
  const todayDateStr = useMemo(() => {
    if (getTodayDateString) return getTodayDateString();
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [getTodayDateString]);

  // 오늘 예약만 필터링하고 시간순으로 정렬
  const todaysReservations = useMemo(() => {
    const filtered = (reservations || []).filter(
      (res) => res && res.date === todayDateStr && !res.isCompleted
    );
    
    // 시간순으로 정렬 (시간이 없는 것은 맨 아래)
    return filtered.sort((a, b) => {
      const timeA = a.time || '99:99'; // 시간이 없으면 맨 아래
      const timeB = b.time || '99:99';
      return timeA.localeCompare(timeB);
    });
  }, [reservations, todayDateStr]);

  // 추가 모드 시작
  const startAdding = () => {
    setIsAdding(true);
    setTime('');
    setName('');
    setTimeout(() => timeInputRef.current?.focus(), 100);
  };

  // 추가 취소
  const cancelAdding = () => {
    setIsAdding(false);
    setTime('');
    setName('');
  };

  // 예약 추가
  const handleAdd = () => {
    if (!name.trim()) {
      alert('고객 이름을 입력해주세요.');
      nameInputRef.current?.focus();
      return;
    }

    const reservationData = {
      date: todayDateStr,
      time: time.trim() || '',
      name: name.trim(),
      phoneLast4: '',
      isCompleted: false,
    };

    if (addReservation) {
      addReservation(reservationData);
    } else if (setReservations) {
      const newReservation = {
        id: Date.now(),
        ...reservationData,
      };
      setReservations((prev) => [...prev, newReservation]);
    }

    setIsAdding(false);
    setTime('');
    setName('');
  };

  // 예약 삭제
  const handleDelete = (id) => {
    if (window.confirm('이 예약을 삭제하시겠습니까?')) {
      if (deleteReservation) {
        deleteReservation(id);
      } else if (setReservations) {
        setReservations((prev) => prev.filter((res) => res.id !== id));
      }
    }
  };

  // 엔터 키 처리
  const handleTimeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      nameInputRef.current?.focus();
    }
  };

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Escape') {
      cancelAdding();
    }
  };

  // 오늘 날짜 표시
  const todayDisplay = useMemo(() => {
    const today = new Date();
    return `${today.getMonth() + 1}월 ${today.getDate()}일`;
  }, []);

  return (
    <div
      className="flex flex-col h-dvh bg-[#F2F0E6] font-sans"
      style={{ fontFamily: 'Pretendard, -apple-system, sans-serif' }}
    >
      {/* Safe Area Top */}
      <div className="pt-[env(safe-area-inset-top)]" />

      {/* 헤더 */}
      <header className="px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentScreen(SCREENS.HOME)}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-800" />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800">오늘 예약</h2>
            <p className="text-sm text-gray-600 mt-0.5">{todayDisplay}</p>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 overflow-y-auto px-4 py-6 pb-28">
        {/* 예약 추가 폼 */}
        {isAdding ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">시간</label>
                <input
                  ref={timeInputRef}
                  type="text"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  onKeyDown={handleTimeKeyDown}
                  placeholder="예: 14:30"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-[#C9A27A] focus:ring-2 focus:ring-[#C9A27A] focus:outline-none text-gray-800"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">이름</label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={handleNameKeyDown}
                  placeholder="고객 이름"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-[#C9A27A] focus:ring-2 focus:ring-[#C9A27A] focus:outline-none text-gray-800"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                className="flex-1 px-4 py-2 bg-[#C9A27A] text-white rounded-lg font-medium hover:bg-[#B8926A] active:scale-95 transition-all"
              >
                추가
              </button>
              <button
                onClick={cancelAdding}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 active:scale-95 transition-all"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={startAdding}
            className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-4 flex items-center justify-center gap-2 hover:border-[#C9A27A] transition-all"
          >
            <Plus size={20} className="text-[#C9A27A]" />
            <span className="text-gray-800 font-medium">예약 추가</span>
          </button>
        )}

        {/* 예약 리스트 */}
        <div className="space-y-3">
          {todaysReservations.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
              <Clock size={32} className="mx-auto mb-3 text-gray-400" />
              <p className="text-sm text-gray-500 mb-1">오늘 등록된 예약이 없습니다</p>
              <p className="text-xs text-gray-400">위 버튼을 눌러 예약을 추가하세요</p>
            </div>
          ) : (
            todaysReservations.map((reservation) => (
              <div
                key={reservation.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex items-center justify-between hover:border-[#C9A27A] transition-all"
              >
                <div className="flex items-center gap-4 flex-1">
                  {reservation.time ? (
                    <div className="flex items-center gap-2 text-[#C9A27A]">
                      <Clock size={16} />
                      <span className="text-sm font-semibold">{reservation.time}</span>
                    </div>
                  ) : (
                    <div className="w-16"></div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold text-base text-gray-800">
                      {reservation.name || '이름 미입력'}
                    </h4>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(reservation.id)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X size={18} className="text-gray-400 hover:text-red-500" />
                </button>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Safe Area Bottom */}
      <div className="pb-[env(safe-area-inset-bottom)]" />
    </div>
  );
}

export default ReservationScreen;
