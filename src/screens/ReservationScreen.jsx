import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Check, Minus, Plus, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { SCREENS } from '../constants/screens';

function ReservationScreen({
  reservations,
  addReservation,
  toggleReservationComplete,
  deleteReservation,
  updateReservation,
  setReservations,
  setCurrentScreen,
  getTodayDateString,
  currentTheme
}) {
  // 오늘 날짜 계산
  const getTodayDateStr = () => {
    if (getTodayDateString) return getTodayDateString();
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  const [selectedDate, setSelectedDate] = useState(getTodayDateStr());
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const inputRef = useRef(null);

  const bgColor = currentTheme?.pastel || '#F2F0E6';
  const textColor = currentTheme?.text || '#232323';
  const accentColor = currentTheme?.color || '#C9A27A';

  // 선택된 날짜의 예약 필터링
  const filteredReservations = (reservations || []).filter(res => res && res.date === selectedDate);
  
  // 저장 순서대로 정렬 (order 필드가 있으면 order로, 없으면 id 순서)
  const sortedReservations = [...filteredReservations].sort((a, b) => {
    // order 필드가 둘 다 있으면 order로 정렬
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    
    // order 필드가 하나만 있으면 order가 있는 것이 위로
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    
    // 둘 다 order가 없으면 id(저장 순서)로 정렬 - 먼저 저장한 것이 위에
    const idA = a.id || 0;
    const idB = b.id || 0;
    return idA - idB;
  });

  // 날짜 포맷팅 (YYYY-MM-DD -> MM월 DD일)
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${parseInt(month)}월 ${parseInt(day)}일`;
  };

  // 날짜 문자열을 Date 객체로 변환
  const parseDateStr = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Date 객체를 날짜 문자열로 변환
  const formatDateStr = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 요일 반환
  const getDayName = (dateStr) => {
    const date = parseDateStr(dateStr);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return days[date.getDay()];
  };

  // 날짜 레이블 (오늘, 내일, 모레 등)
  const getDateLabel = (dateStr) => {
    const todayStr = getTodayDateStr();
    if (dateStr === todayStr) return '오늘';
    
    const today = parseDateStr(todayStr);
    const target = parseDateStr(dateStr);
    const diffTime = target - today;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '내일';
    if (diffDays === 2) return '모레';
    if (diffDays === -1) return '어제';
    if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)}일 전`;
    return null;
  };

  // 날짜 변경 함수
  const changeDate = (direction) => {
    const currentDate = parseDateStr(selectedDate);
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + direction);
    setSelectedDate(formatDateStr(newDate));
  };

  // 텍스트 파싱 (시간, 이름, 전화번호 추출)
  const parseReservationText = (text) => {
    // 예: "14:30 김철수 1234" 또는 "2시30분 김철수 1234"
    const timeMatch = text.match(/(\d{1,2}):?(\d{2})/);
    const parts = text.trim().split(/\s+/);
    
    let time = '';
    let name = '';
    let phoneLast4 = '';

    if (timeMatch) {
      const hours = timeMatch[1].padStart(2, '0');
      const minutes = timeMatch[2] || '00';
      time = `${hours}:${minutes}`;
    }

    // 숫자 4자리는 전화번호로 간주
    const phoneMatch = parts.find(p => /^\d{4}$/.test(p));
    if (phoneMatch) {
      phoneLast4 = phoneMatch;
    }

    // 나머지가 이름
    name = parts.filter(p => p !== timeMatch?.[0] && p !== phoneMatch).join(' ');

    return { time, name, phoneLast4 };
  };

  // 새 항목 추가 시작
  const startAddingNew = () => {
    setIsAddingNew(true);
    setEditingText('');
    setEditingIndex(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // 편집 시작
  const startEditing = (reservation, index) => {
    // 기존 내용을 입력칸에 채우기
    const parts = [];
    if (reservation.time) parts.push(reservation.time);
    if (reservation.name) parts.push(reservation.name);
    setEditingText(parts.join(' '));
    setEditingIndex(index);
    setIsAddingNew(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // 완료 처리
  const handleComplete = () => {
    // 삭제 중이면 완료 처리 건너뛰기
    if (isDeleting) {
      return;
    }
    
    if (!editingText.trim()) {
      setIsAddingNew(false);
      setEditingIndex(null);
      return;
    }

    const { time, name, phoneLast4 } = parseReservationText(editingText);

    if (editingIndex !== null) {
      // 수정 모드
      const reservation = sortedReservations[editingIndex];
      const updatedData = {
        time: time || reservation.time || '',
        name: name || reservation.name || '',
        phoneLast4: phoneLast4 || reservation.phoneLast4 || ''
      };

      if (updateReservation) {
        updateReservation(reservation.id, updatedData);
      } else if (setReservations) {
        setReservations(prev => prev.map(res => 
          res.id === reservation.id ? { ...res, ...updatedData } : res
        ));
      }
    } else {
      // 추가 모드
      if (!name) {
        alert('고객 이름을 입력해주세요.');
        return;
      }

      const reservationData = {
        date: selectedDate,
        time: time || '',
        name: name,
        phoneLast4: phoneLast4 || ''
      };

      if (addReservation) {
        addReservation(reservationData);
      } else if (setReservations) {
        const newReservation = {
          id: Date.now(),
          ...reservationData,
          isCompleted: false
        };
        // 새 항목을 맨 아래에 추가
        setReservations(prev => {
          const otherReservations = prev.filter(res => res.date !== selectedDate);
          const sameDateReservations = prev.filter(res => res.date === selectedDate);
          return [...otherReservations, ...sameDateReservations, newReservation];
        });
      }
    }

    setIsAddingNew(false);
    setEditingIndex(null);
    setEditingText('');
  };

  // 삭제 처리 (줄 삭제)
  const handleDelete = (reservationId, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // 삭제 플래그 설정 (blur 이벤트 방지)
    setIsDeleting(true);
    
    // 편집 모드 종료
    setEditingIndex(null);
    setIsAddingNew(false);
    setEditingText('');
    
    // setReservations를 직접 사용하여 삭제
    if (setReservations && typeof setReservations === 'function') {
      setReservations(prev => {
        if (!prev || !Array.isArray(prev)) {
          setIsDeleting(false);
          return [];
        }
        const filtered = prev.filter(res => res && res.id !== reservationId);
        return filtered;
      });
      
      // deleteReservation도 함께 호출
      if (deleteReservation && typeof deleteReservation === 'function') {
        try {
          deleteReservation(reservationId);
        } catch (error) {
          console.error('[삭제 오류]', error);
        }
      }
      
      // 삭제 플래그 해제
      setTimeout(() => {
        setIsDeleting(false);
      }, 100);
    } else {
      setIsDeleting(false);
      if (deleteReservation && typeof deleteReservation === 'function') {
        deleteReservation(reservationId);
      }
    }
  };

  // 엔터 키 처리
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleComplete();
    } else if (e.key === 'Escape') {
      setIsAddingNew(false);
      setEditingIndex(null);
      setEditingText('');
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex === destinationIndex) return;

    // 순서 변경
    const reordered = Array.from(sortedReservations);
    const [removed] = reordered.splice(sourceIndex, 1);
    reordered.splice(destinationIndex, 0, removed);

    // order 필드 업데이트
    const updatedReservations = reordered.map((res, idx) => ({
      ...res,
      order: idx
    }));

    // 전체 reservations 배열에서 업데이트
    if (setReservations) {
      setReservations(prev => {
        const otherReservations = prev.filter(res => res.date !== selectedDate);
        return [...otherReservations, ...updatedReservations];
      });
    }
  };

  // 입력 포커스 관리
  useEffect(() => {
    if ((isAddingNew || editingIndex !== null) && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingNew, editingIndex]);

  return (
    <div className="flex flex-col h-full relative pb-[60px]" style={{ backgroundColor: bgColor }}>
      {/* Header */}
      <header className="bg-white px-8 py-6 sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 shadow-sm h-[80px]">
        <button 
          onClick={() => setCurrentScreen(SCREENS.HOME)}
          className="p-2 hover:bg-gray-100 rounded-2xl transition-colors"
          style={{ color: textColor }}
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex items-center gap-2">
          <Calendar size={20} style={{ color: accentColor }} />
          <h2 className="text-xl font-bold" style={{ color: textColor }}>예약 및 일정</h2>
        </div>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto p-8 space-y-6 pb-20">
        {/* 날짜 선택기 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => changeDate(-1)}
              className="p-2 hover:bg-gray-50 rounded-xl transition-colors flex-shrink-0"
              style={{ color: textColor }}
            >
              <ChevronLeft size={24} />
            </button>

            <button
              onClick={() => setSelectedDate(getTodayDateStr())}
              className="flex-1 flex flex-col items-center justify-center py-3 px-4 rounded-xl transition-colors hover:bg-gray-50"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium" style={{ color: textColor, opacity: 0.6 }}>
                  {getDateLabel(selectedDate) || formatDateDisplay(selectedDate)}
                </span>
                <span className="text-xs font-medium" style={{ color: textColor, opacity: 0.4 }}>
                  {getDayName(selectedDate)}요일
                </span>
              </div>
              <div className="text-3xl font-bold" style={{ color: accentColor }}>
                {parseDateStr(selectedDate).getDate()}
              </div>
            </button>

            <button
              onClick={() => changeDate(1)}
              className="p-2 hover:bg-gray-50 rounded-xl transition-colors flex-shrink-0"
              style={{ color: textColor }}
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* 빠른 날짜 선택 */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
            {[-1, 0, 1, 2, 3].map((offset) => {
              const today = parseDateStr(getTodayDateStr());
              const quickDate = new Date(today);
              quickDate.setDate(today.getDate() + offset);
              const quickDateStr = formatDateStr(quickDate);
              const isSelected = quickDateStr === selectedDate;
              const dayOfMonth = quickDate.getDate();
              const label = offset === -1 ? '어제' : offset === 0 ? '오늘' : offset === 1 ? '내일' : offset === 2 ? '모레' : `${quickDate.getMonth() + 1}/${dayOfMonth}`;

              return (
                <button
                  key={quickDateStr}
                  onClick={() => setSelectedDate(quickDateStr)}
                  className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isSelected ? 'text-white' : ''
                  }`}
                  style={{
                    backgroundColor: isSelected ? accentColor : 'transparent',
                    color: isSelected ? '#FFFFFF' : textColor,
                    opacity: isSelected ? 1 : 0.7
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 예약 리스트 헤더 (날짜 + 완료 버튼) */}
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold" style={{ color: textColor }}>
            {formatDateDisplay(selectedDate)} 예약
          </h3>
          {!isAddingNew && editingIndex === null ? (
            <button
              onClick={startAddingNew}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-90"
              style={{ backgroundColor: accentColor }}
            >
              <Plus size={20} className="text-white" strokeWidth={3} />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-90"
              style={{ backgroundColor: accentColor }}
            >
              <Check size={20} className="text-white" strokeWidth={3} />
            </button>
          )}
        </div>

        {/* 예약 리스트 */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="reservations">
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
              >
                {sortedReservations.map((reservation, index) => {
                  const isEditing = editingIndex === index;
                  const isLast = index === sortedReservations.length - 1;
                  
                  return (
                    <Draggable
                      key={reservation.id}
                      draggableId={String(reservation.id)}
                      index={index}
                      isDragDisabled={isEditing || isAddingNew}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center gap-3 ${!isLast ? 'pb-2 mb-2 border-b border-gray-100' : ''} transition-all ${
                            snapshot.isDragging ? 'opacity-60 shadow-lg' : ''
                          }`}
                          style={{
                            ...provided.draggableProps.style,
                          }}
                        >
                          {/* 드래그 핸들 아이콘 (왼쪽) */}
                          {!isEditing && (
                            <div
                              {...provided.dragHandleProps}
                              className="flex-shrink-0 cursor-grab active:cursor-grabbing p-1"
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <GripVertical size={18} className="text-gray-300" />
                            </div>
                          )}
                          
                          {/* 체크박스 (완료 토글) */}
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (toggleReservationComplete) {
                      toggleReservationComplete(reservation.id);
                    } else if (setReservations) {
                      setReservations(prev => prev.map(res => 
                        res.id === reservation.id ? { ...res, isCompleted: !res.isCompleted } : res
                      ));
                    }
                  }}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                    reservation.isCompleted
                      ? 'bg-[#C9A27A] border-[#C9A27A]'
                      : 'border-gray-300 hover:border-[#C9A27A]'
                  }`}
                >
                  {reservation.isCompleted && (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                {/* 편집 모드일 때: 입력 필드 + 삭제 버튼 (오른쪽) */}
                {isEditing ? (
                  <>
                    {/* 입력 필드 */}
                    <input
                      ref={inputRef}
                      type="text"
                      draggable={false}
                      onMouseDown={(e) => e.stopPropagation()}
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={(e) => {
                        // 삭제 버튼이 blur를 유발한 경우 무시
                        if (!isDeleting) {
                          handleComplete();
                        }
                      }}
                      className="flex-1 px-3 py-2 rounded-lg border-2 focus:outline-none text-base"
                      style={{ 
                        borderColor: accentColor,
                        color: textColor
                      }}
                      placeholder="예: 14:30 김철수"
                    />
                    {/* 삭제 버튼 (빨간 동그라미, 오른쪽) */}
                    <button
                      type="button"
                      draggable={false}
                      onMouseDown={(e) => {
                        e.preventDefault(); // blur 이벤트 방지
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('[삭제 버튼 클릭]', reservation.id);
                        handleDelete(reservation.id, e);
                      }}
                      className="w-6 h-6 rounded-full flex items-center justify-center transition-colors flex-shrink-0 hover:opacity-80"
                      style={{ backgroundColor: '#EF4444', color: '#FFFFFF' }}
                    >
                      <Minus size={16} />
                    </button>
                  </>
                ) : (
                  /* 일반 모드일 때: 텍스트만 (체크박스 바로 옆) */
                  <div
                    draggable={false}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(reservation, index);
                    }}
                    className={`flex-1 px-3 py-2 rounded-lg cursor-text hover:bg-gray-50 transition-colors flex items-center ${
                      reservation.isCompleted ? 'line-through text-gray-400' : ''
                    }`}
                    style={{ color: reservation.isCompleted ? '#9CA3AF' : textColor }}
                  >
                    {[reservation.time, reservation.name].filter(Boolean).join(' ')}
                  </div>
                )}
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

          {sortedReservations.length === 0 && !isAddingNew && (
            <div className="text-center py-8">
              <p className="font-light text-sm" style={{ color: textColor, opacity: 0.6 }}>
                위에 + 버튼을 눌러 예약을 추가하세요
              </p>
            </div>
          )}

          {/* 새 항목 추가 입력 필드 (리스트 맨 아래) */}
          {isAddingNew && (
            <div className="flex items-center gap-3 pb-2 mb-2 border-t border-gray-100 pt-2 mt-2">
              <div className="w-6 h-6 flex-shrink-0"></div>
              <input
                ref={inputRef}
                type="text"
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={(e) => {
                  // 삭제 버튼이 blur를 유발한 경우 무시
                  if (!isDeleting) {
                    handleComplete();
                  }
                }}
                className="flex-1 px-3 py-2 rounded-lg border-2 focus:outline-none text-base"
                style={{ 
                  borderColor: accentColor,
                  color: textColor
                }}
                placeholder="예: 14:30 김철수"
              />
            </div>
          )}

      </main>
    </div>
  );
}

export default ReservationScreen;
