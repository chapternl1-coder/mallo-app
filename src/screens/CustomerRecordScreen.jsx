// 음성 녹음 → 처리 → 결과 미리보기까지 담당하는 화면
import React, { useEffect, useState, useRef } from 'react';
import { Square, ArrowLeft, MoreHorizontal, Phone, Edit, ChevronRight, X, Pause, Play } from 'lucide-react';
import { SCREENS } from '../constants/screens';
import logo from '../assets/logo.png';
import {
  formatRecordingDateTime,
  createDateTimeStrings,
  cleanTitle,
  createVisitRecord,
  updateCustomerTags,
  createNewCustomer
} from '../utils/recordUtils';

// WaveBars 컴포넌트
const WaveBars = () => (
  <div className="flex items-center justify-center gap-1 h-12">
    {[...Array(5)].map((_, i) => (
      <div 
        key={i} 
        className="w-1.5 rounded-full animate-pulse"
        style={{ 
          backgroundColor: '#C9A27A',
          opacity: 0.6,
          animationDelay: `${i * 0.15}s`, 
          animationDuration: '0.6s' 
        }}
      ></div>
    ))}
  </div>
);

// SkeletonLoader 컴포넌트
const SkeletonLoader = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-[#E8DFD3] p-6 space-y-5 w-full animate-pulse">
    <div className="h-6 bg-gray-200 rounded-2xl w-3/4 mb-6"></div>
    {[...Array(3)].map((_, i) => (
      <div key={i} className="space-y-3">
        <div className="h-4 bg-gray-200 rounded-2xl w-1/3"></div>
        <div className="h-3 bg-gray-100 rounded-2xl w-full"></div>
        <div className="h-3 bg-gray-100 rounded-2xl w-5/6"></div>
      </div>
    ))}
  </div>
);

function CustomerRecordScreen({
  recordState,
  recordingTime,
  formatTime,
  stopRecording,
  cancelRecording,
  pauseRecording,
  resumeRecording,
  isPaused,
  resultData,
  resetFlow,
  getTodayDate,
  selectedCustomerForRecord,
  tempName,
  setTempName,
  tempPhone,
  setTempPhone,
  nameInputRef,
  phoneInputRef,
  handlePhoneChange,
  currentSector,
  userProfile,
  DEV_MODE,
  testSummaryInput,
  setTestSummaryInput,
  isTestingSummary,
  handleTestSummarize,
  recommendedTagIds,
  setRecommendedTagIds,
  selectedTagIds,
  setSelectedTagIds,
  allVisitTags,
  isAutoTaggingEnabled,
  setIsTagPickerOpen,
  isTagPickerOpen,
  selectedCustomerTagIds,
  setSelectedCustomerTagIds,
  newCustomerTagIds,
  setNewCustomerTagIds,
  allCustomerTags,
  setIsCustomerTagPickerOpen,
  isCustomerTagPickerOpen,
  transcript,
  recordingDate,
  formatRecordingDate,
  setTempResultData,
  setCurrentScreen,
  extractServiceDateFromSummary,
  customers,
  setCustomers,
  visits,
  setVisits,
  setSelectedCustomerId,
  serviceTags,
  setServiceTags,
  rawTranscript,
  setResultData,
  setTranscript,
  setRawTranscript,
  setRecordingDate,
  setSelectedCustomerForRecord,
  setNewServiceTag,
  reservations,
  setReservations,
  addReservationFromVisit,
  TagPickerModal,
  CustomerTagPickerModal
}) {
  // 날짜 입력 state 추가 (고객 상세 전용: 초기값 null)
  const [tempServiceDate, setTempServiceDate] = useState(null);
  const serviceDateInputRef = useRef(null);

  // 날짜 변경 핸들러
  const handleVisitDateChange = (e) => {
    if (!e.target.value) {
      setTempServiceDate(null);
      return;
    }
    setTempServiceDate(e.target.value);
  };

  // 녹음/텍스트에서 날짜/시간을 자동으로 추출하지 않음
  // 사용자가 직접 입력창에서 날짜/시간을 선택하도록 함

  // 방문 날짜 포맷팅 (tempServiceDate가 있을 때만 표시)
  const formatVisitDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    const date = new Date(dateTimeStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[date.getDay()];
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}월 ${day}일 (${weekday}) ${hours}:${minutes}`;
  };

  // 녹음 시간 제한 상수
  const MAX_SECONDS = 120; // 2분
  const NEAR_LIMIT_SECONDS = 100; // 1분 40초
  
  // 녹음 시간(초)을 elapsedSeconds로 사용
  const elapsedSeconds = recordingTime;
  
  // 1분 40초가 넘어갔는지 여부 확인
  const isNearLimit = elapsedSeconds >= NEAR_LIMIT_SECONDS;

  // 녹음 상태 플래그 (작업 1)
  const isRecording = recordState === 'recording' && !isPaused;
  const isCurrentlyPaused = isPaused === true;

  // 녹음 화면 진입 시 스크롤을 맨 위로
  useEffect(() => {
    if (recordState === 'recording' || recordState === 'idle') {
      window.scrollTo(0, 0);
    }
  }, [recordState]);

  // recordState에 따라 다른 화면 렌더링
  if (recordState === 'recording' || recordState === 'idle') {
    return (
      <div
        className="flex flex-col min-h-screen"
        style={{ 
          background: 'linear-gradient(to bottom, #FDFBF7 0%, #F2F0E6 100%)'
        }}
      >
        <main className="relative flex-1 flex flex-col items-center justify-start px-6 pt-12 pb-8 overflow-hidden gap-1">
          {/* 배경 효과 - 부드러운 펄스 (일시정지 시 멈춤) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className={`absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full blur-3xl opacity-10 ${isCurrentlyPaused ? '' : 'animate-pulse'}`}
              style={{ 
                backgroundColor: '#C9A27A', 
                animationDuration: '3s',
                animationTimingFunction: 'ease-in-out'
              }}
            ></div>
          </div>


          {/* 상단: 고객 정보 카드 */}
          {selectedCustomerForRecord && (
            <div className="w-full max-w-sm z-10 animate-in fade-in slide-in-from-top duration-500">
              <div 
                className="bg-white/90 backdrop-blur-sm rounded-3xl px-6 py-5 shadow-lg border border-white/50 relative"
                style={{ boxShadow: '0 8px 32px rgba(201, 162, 122, 0.15)' }}
              >
                {/* 녹음 상태 점 - 오른쪽 상단 */}
                <div 
                  className={`absolute top-5 right-6 w-3 h-3 rounded-full ${isCurrentlyPaused ? '' : 'animate-pulse'}`}
                  style={{ 
                    backgroundColor: isCurrentlyPaused ? '#FFA500' : '#EF4444', 
                    boxShadow: isCurrentlyPaused ? '0 0 12px rgba(255, 165, 0, 0.6)' : '0 0 12px rgba(239, 68, 68, 0.6)' 
                  }}
                ></div>
                
                {/* 이름과 번호 - 중앙 정렬 */}
                <div className="flex flex-col gap-1 items-center justify-center pr-8">
                  <h3 className="text-lg font-bold" style={{ color: '#232323' }}>
                    {selectedCustomerForRecord.name}
                  </h3>
                  <p className="text-sm" style={{ color: '#8C7A68' }}>
                    {selectedCustomerForRecord.phone || '전화번호 미등록'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 중앙: 타이머 영역 */}
          <div className="z-10 flex flex-col items-center justify-center flex-1 -mt-12">
            {/* 안내 메시지 */}
            <div className="mb-4 w-full max-w-xs px-4">
              <div 
                className={`bg-white/70 backdrop-blur-sm rounded-xl px-4 py-2 shadow-sm transition-all duration-300 ${
                  isNearLimit ? 'ring-2 ring-red-400 bg-red-50/70' : ''
                }`}
              >
                <p
                  className={`text-xs text-center leading-relaxed ${
                    isNearLimit ? 'text-red-600 font-medium' : 'text-[#8C7A68]'
                  }`}
                >
                  {isNearLimit 
                    ? '⚠️ 최대 녹음 시간에 도달했습니다.'
                    : selectedCustomerForRecord 
                    ? `${selectedCustomerForRecord.name || '고객'}님의 시술 내용을 말씀해주세요.`
                    : '지금 고객의 정보를 말해주세요.'}
                </p>
              </div>
            </div>

            {/* 녹음 상태 텍스트 */}
            <div className="mb-4 text-center animate-in fade-in duration-700">
              <div className="inline-flex items-center gap-2">
                <div 
                  className={`w-2 h-2 rounded-full ${isCurrentlyPaused ? '' : 'animate-pulse'}`}
                  style={{ backgroundColor: isCurrentlyPaused ? '#FFA500' : '#EF4444' }}
                ></div>
                <span 
                  className="text-sm font-medium tracking-wide"
                  style={{ color: '#C9A27A' }}
                >
                  {isCurrentlyPaused ? 'Paused' : 'Recording'}
                </span>
              </div>
            </div>

            {/* 타이머 - 큰 숫자 */}
            <div className="mb-6 animate-in zoom-in duration-500">
              <p
                className="text-[72px] font-light tracking-tight tabular-nums leading-none"
                style={{
                  color: '#232323',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  textShadow: '0 4px 24px rgba(201, 162, 122, 0.15)',
                }}
              >
                {formatTime(recordingTime)}
              </p>
            </div>

            {/* 진행 바 시각화 */}
            <div className="w-64 mb-4">
              <div className="relative h-1 bg-white/40 rounded-full overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: isNearLimit ? '#EF4444' : '#C9A27A',
                    width: `${Math.min((elapsedSeconds / MAX_SECONDS) * 100, 100)}%`,
                    boxShadow: isNearLimit 
                      ? '0 0 12px rgba(239, 68, 68, 0.6)' 
                      : '0 0 8px rgba(201, 162, 122, 0.4)'
                  }}
                ></div>
              </div>
              <div className="flex justify-between mt-2 text-xs" style={{ color: '#A79A8E' }}>
                <span>0:00</span>
                <span className={isNearLimit ? 'text-red-500 font-medium' : ''}>
                  {Math.floor(MAX_SECONDS / 60)}:{String(MAX_SECONDS % 60).padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* 파형 비주얼라이저 */}
            <div className="mb-6">
              <WaveBars />
            </div>

            {/* 컨트롤 버튼들 - 일시정지/재개 & 정지 & 취소 */}
            <div className="flex items-center justify-center gap-10 animate-in zoom-in duration-700 delay-300">
              {/* 왼쪽: 일시정지/이어 말하기 버튼 */}
              <button
                onClick={() => {
                  if (isCurrentlyPaused && resumeRecording) {
                    resumeRecording();
                  } else if (!isCurrentlyPaused && pauseRecording) {
                    pauseRecording();
                  }
                }}
                className="w-12 h-12 rounded-full bg-white border border-[#E3D7C7] flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all duration-200"
              >
                {isCurrentlyPaused ? (
                  <Play size={18} fill="#A07B4F" style={{ color: '#A07B4F' }} />
                ) : (
                  <Pause size={18} style={{ color: '#A07B4F' }} />
                )}
              </button>

              {/* 가운데: 녹음 끝내기 버튼 */}
              <button
                onClick={stopRecording}
                className="group relative flex items-center justify-center"
                style={{ width: '64px', height: '64px' }}
              >
                {/* 물결 효과 - 일시정지 시 멈춤 */}
                {!isCurrentlyPaused && [...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                      width: '64px',
                      height: '64px',
                      border: '2px solid rgba(201, 162, 122, 0.3)',
                      animation: `ping ${2 + i * 0.5}s cubic-bezier(0, 0, 0.2, 1) infinite`,
                      animationDelay: `${i * 0.3}s`,
                    }}
                  ></div>
                ))}

                {/* 버튼 본체 */}
                <div
                  className="relative w-16 h-16 rounded-full bg-[#C9A27A] flex items-center justify-center shadow-md group-hover:scale-110 group-active:scale-95 transition-all duration-200"
                  style={{
                    boxShadow: '0 8px 24px rgba(201, 162, 122, 0.4)',
                  }}
                >
                  <Square size={24} fill="white" stroke="white" />
                </div>
              </button>

              {/* 오른쪽: 취소 버튼 */}
              <button
                onClick={() => {
                  if (window.confirm('지금까지의 현재 녹음이 저장되지 않습니다. 정말 취소하시겠습니까?')) {
                    cancelRecording();
                  }
                }}
                className="w-12 h-12 rounded-full bg-white border border-[#E3D7C7] flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all duration-200"
                style={{ color: '#8C7A68' }}
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }


  if (recordState === 'processing') {
    return (
      <div className="flex flex-col h-full px-8 pt-24 pb-12" style={{ backgroundColor: '#F2F0E6' }}>
        <div className="text-center mb-12">
          <img 
            src={logo} 
            alt="Mallo 로고" 
            className="w-28 h-28 object-contain mx-auto mb-6 animate-bounce"
          />
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#232323' }}>시술 기록 정리 중</h2>
          <p className="font-light" style={{ color: '#232323' }}>AI가 내용을 분석하고 형식에 맞게 정리하고 있습니다.</p>
        </div>
        
        <div className="flex-1 w-full max-w-sm mx-auto space-y-5 opacity-50">
          <SkeletonLoader />
        </div>

        <div className="text-sm text-center font-light mt-auto" style={{ color: '#232323', opacity: 0.6 }}>
          Processing transcript...<br/>
          Applying beauty salon template...
        </div>
      </div>
    );
  }

  // recordState === 'result'인 경우
  if (!resultData) {
    return (
      <div className="flex flex-col h-full items-center justify-center" style={{ backgroundColor: '#F2F0E6' }}>
        <p style={{ color: '#232323' }}>결과 데이터가 없습니다.</p>
        <button onClick={resetFlow} className="mt-4 font-medium" style={{ color: '#232323' }}>홈으로 돌아가기</button>
      </div>
    );
  }

  // 날짜 포맷팅 헬퍼 함수 (연도 제외, 요일 포함)
  const formatDateWithoutYear = (date) => {
    if (!date) {
      const now = new Date();
      date = now;
    }
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[date.getDay()];
    return `${month}월 ${day}일 (${weekday})`;
  };

  // 시간 포맷팅 헬퍼 함수 (props의 formatTime과 충돌 방지)
  const formatTimeFromDate = (date) => {
    if (!date) {
      const now = new Date();
      date = now;
    }
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // 고객 정보 (고객 상세에서는 항상 selectedCustomerForRecord 사용)
  const customerName = selectedCustomerForRecord?.name || '';
  const customerPhone = selectedCustomerForRecord?.phone || '';

  return (
    <div className="flex flex-col h-full relative" style={{ backgroundColor: '#F2F0E6' }}>
      {/* Header */}
      <header className="px-5 pt-4 pb-3 bg-[#F2F0E6] sticky top-0 z-20 flex items-center justify-between">
        <button onClick={resetFlow} className="p-2 hover:bg-gray-100 rounded-2xl transition-colors" style={{ color: '#232323' }}>
          <span className="text-[32px]">&#x2039;</span>
        </button>
        <div className="flex flex-col items-center">
          {/* 방문 날짜: 텍스트/녹음에서 추출한 날짜 우선, 없으면 선택한 날짜 표시 */}
          {(() => {
            // 1순위: 텍스트/녹음에서 추출한 날짜/시간
            let displayDate = null;
            if (resultData && resultData.sections) {
              const extractedDate = extractServiceDateFromSummary(resultData);
              if (extractedDate) {
                // 시간도 함께 추출
                const visitSection = resultData.sections.find(
                  section => section.title && section.title.includes('방문·예약 정보')
                );
                if (visitSection && visitSection.content && Array.isArray(visitSection.content)) {
                  for (const line of visitSection.content) {
                    if (!line || typeof line !== 'string') continue;
                    const timeMatch = line.match(/(\d{1,2}):(\d{2})/);
                    if (timeMatch) {
                      const [, hour, minute] = timeMatch;
                      const hh = String(parseInt(hour, 10)).padStart(2, '0');
                      const mm = String(parseInt(minute, 10)).padStart(2, '0');
                      displayDate = `${extractedDate}T${hh}:${mm}`;
                      break;
                    }
                  }
                }
                // 시간이 없으면 날짜만 사용
                if (!displayDate) {
                  displayDate = `${extractedDate}T00:00`;
                }
              }
            }
            
            // 2순위: 사용자가 선택한 날짜
            if (!displayDate && tempServiceDate) {
              displayDate = tempServiceDate;
            }
            
            return displayDate ? (
              <p className="text-[11px] text-[#A28E7A]">
                {formatVisitDateTime(displayDate)}
              </p>
            ) : null;
          })()}
          {/* 이름 / 번호 */}
          {selectedCustomerForRecord && (
            <p className={`text-[12px] font-medium text-[#413428] ${(() => {
              // 날짜가 표시되는지 확인 (텍스트/녹음에서 추출한 날짜 또는 선택한 날짜)
              if (resultData && resultData.sections) {
                const extractedDate = extractServiceDateFromSummary(resultData);
                if (extractedDate) return 'mt-[2px]';
              }
              return tempServiceDate ? 'mt-[2px]' : '';
            })()}`}>
              {customerName}
              {customerPhone && (
                <span className="ml-1 text-[12px] font-medium text-[#413428]">
                  / {customerPhone}
                </span>
              )}
            </p>
          )}
        </div>
        <div className="w-8" /> {/* 오른쪽 균형 맞추기용 */}
      </header>

      <main className="flex-1 overflow-y-auto p-8 space-y-5 pb-32" style={{ backgroundColor: '#F2F0E6' }}>
         {/* 고객 정보 카드 (고객 상세에서는 항상 표시, readOnly) */}
         {selectedCustomerForRecord && (
           <div className="rounded-2xl bg-[#F3EBE1] px-3 py-3 border border-[#E1D6C8]">
             <p className="text-[11px] text-[#A28E7A] mb-2">고객 정보</p>
             <div className="space-y-2">
               <div>
                 <label className="block text-[11px] text-[#7A6A58] mb-1">이름</label>
                 <input
                   type="text"
                   value={customerName}
                   readOnly
                   onFocus={(e) => e.target.blur()}
                   className="w-full text-[12px] px-3 py-2 rounded-xl border border-[#E1D6C8] bg-[#F8F4EE] text-[#413428] cursor-default"
                 />
               </div>
               <div>
                 <label className="block text-[11px] text-[#7A6A58] mb-1">전화번호</label>
                 <input
                   type="text"
                   value={customerPhone}
                   readOnly
                   onFocus={(e) => e.target.blur()}
                   className="w-full text-[12px] px-3 py-2 rounded-xl border border-[#E1D6C8] bg-[#F8F4EE] text-[#413428] cursor-default"
                 />
               </div>
             </div>
           </div>
         )}

         {/* 방문 날짜 선택 */}
         <div className="bg-white rounded-xl shadow-sm border border-[#E8DFD3]" style={{ padding: '12px 16px' }}>
           <label className="block text-xs font-medium mb-1.5" style={{ color: '#232323', opacity: 0.7 }}>방문 날짜 및 시간</label>
           <input
             ref={serviceDateInputRef}
             type="datetime-local"
             value={tempServiceDate || ''}
             onChange={handleVisitDateChange}
             placeholder="방문 날짜를 선택해 주세요"
             className={`w-full px-3 py-2 rounded-xl border focus:ring-1 outline-none transition-all text-sm ${
               !tempServiceDate ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 focus:border-[#C9A27A] focus:ring-[#C9A27A]'
             }`}
             style={{ color: '#232323', backgroundColor: '#FFFFFF' }}
           />
           {!tempServiceDate && (
             <p className="text-xs mt-1.5" style={{ color: '#EF4444' }}>* 방문 날짜 및 시간은 필수입니다</p>
           )}
         </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-[#E8DFD3]">
          <div className="px-8 py-6 relative overflow-hidden" style={{ backgroundColor: '#C9A27A' }}>
            <div className="relative z-10">
              <span className="inline-flex items-center px-3 py-1.5 rounded-2xl text-xs font-medium text-white mb-3 shadow-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}>
                <span>{userProfile.name}</span>
              </span>
              <h3 className="font-bold text-white text-lg mb-2">
                📝 {selectedCustomerForRecord?.name || tempName || '고객'}님 시술 요약
              </h3>
              <p className="text-base font-medium text-white/90 leading-relaxed">
                {(() => {
                  const safeTitle = typeof resultData.title === 'string' 
                    ? resultData.title 
                    : (typeof resultData.title === 'object' && resultData.title !== null 
                      ? JSON.stringify(resultData.title, null, 2) 
                      : String(resultData.title || ''));
                  return safeTitle;
                })()}
              </p>
            </div>
          </div>

          <div className="p-8 space-y-7">
            {resultData.sections.filter(section => section.content && section.content.length > 0).map((section, idx) => {
              // section.title 안전하게 변환
              const safeSectionTitle = typeof section.title === 'string' 
                ? section.title 
                : (typeof section.title === 'object' && section.title !== null 
                  ? JSON.stringify(section.title, null, 2) 
                  : String(section.title || ''));
              
              return (
                <div key={idx} className="animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 100}ms` }}>
                  <h4 className="text-base font-bold mb-4" style={{ color: '#232323' }}>
                    {safeSectionTitle}
                  </h4>
                  <ul className="space-y-3">
                    {section.content.map((item, i) => {
                      // null 값을 확인하는 헬퍼 함수
                      const isNullValue = (value) => {
                        if (value === null || value === undefined) return true;
                        if (typeof value === 'string') {
                          const trimmed = value.trim().toLowerCase();
                          return trimmed === '' || trimmed === 'null' || trimmed === 'undefined';
                        }
                        return false;
                      };
                      
                      // item을 안전하게 문자열로 변환
                      let safeItem = '';
                      
                      if (typeof item === 'string') {
                        safeItem = item;
                      } else if (typeof item === 'object' && item !== null) {
                        // 객체인 경우 키-값 형태로 읽기 쉽게 변환
                        try {
                          if (Array.isArray(item)) {
                            safeItem = item
                              .filter(i => !isNullValue(i))
                              .map(i => typeof i === 'object' ? JSON.stringify(i) : String(i))
                              .join(', ');
                          } else {
                            // 객체를 키: 값 형태로 변환하되, null 값을 필터링
                            safeItem = Object.entries(item)
                              .map(([key, value]) => {
                                // null, undefined, 빈 문자열 필터링
                                if (isNullValue(value)) {
                                  return null;
                                }
                                const valStr = typeof value === 'object' && value !== null 
                                  ? JSON.stringify(value) 
                                  : String(value);
                                return `${key}: ${valStr}`;
                              })
                              .filter(entry => entry !== null)
                              .join(', ');
                          }
                        } catch (e) {
                          safeItem = String(item);
                        }
                      } else {
                        safeItem = String(item || '');
                      }
                      
                      // null이나 빈 문자열인 경우 해당 항목을 렌더링하지 않음
                      if (isNullValue(safeItem)) {
                        return null;
                      }
                      
                      return (
                        <li key={i} className="text-base leading-relaxed pl-4 font-light" style={{ color: '#232323', borderLeft: '2px solid #E5E7EB' }}>
                          {safeItem}
                        </li>
                      );
                    }).filter(item => item !== null)}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>


        {/* Section 1: 이번 방문 태그 */}
        <section className="bg-white rounded-2xl border border-[#E8DFD3] shadow-sm p-5">
          <div className="mb-4">
            <h3 className="text-base font-bold mb-2 flex items-center gap-2" style={{ color: '#232323' }}>
              <span>🧴</span>
              <span>이번 방문 태그</span>
            </h3>
            <p className="text-sm" style={{ color: '#232323', opacity: 0.7 }}>
              이번 시술 기록에 저장됩니다.
            </p>
          </div>

          {/* 추천 태그 칩들 */}
          <div className="flex flex-wrap gap-2 mb-4">
            {(recommendedTagIds.length === 0 && selectedTagIds.length === 0) ? (
              <p className="text-sm" style={{ color: '#232323', opacity: 0.5 }}>
                추천 태그가 없어요. 필요한 경우 아래에서 직접 추가할 수 있어요.
              </p>
            ) : (
              [...new Set([...recommendedTagIds, ...selectedTagIds])].map((tagId) => {
                const tag = allVisitTags.find((t) => t.id === tagId);
                if (!tag) return null;

                const isSelected = selectedTagIds.includes(tag.id);

                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      setSelectedTagIds((prev) => prev.filter((id) => id !== tag.id));
                      if (!isAutoTaggingEnabled) {
                        setRecommendedTagIds((prev) => prev.filter((id) => id !== tag.id));
                      }
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      isSelected 
                        ? 'bg-[#C9A27A] text-white shadow-sm' 
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}
                  >
                    {typeof tag === 'object' && tag !== null ? (typeof tag.label === 'string' ? tag.label : String(tag.label || '')) : String(tag || '')}
                  </button>
                );
              })
            )}
          </div>

          {/* 태그 더 추가하기 버튼 */}
          <button
            type="button"
            onClick={() => setIsTagPickerOpen(true)}
            className="w-full py-2.5 rounded-xl text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            + 태그 더 추가하기
          </button>
        </section>

        {/* Section 2: 고객 프로필 업데이트 */}
        <section className="bg-white rounded-2xl border border-[#E8DFD3] shadow-sm p-5">
          <div className="mb-4">
            <h3 className="text-base font-bold mb-2 flex items-center gap-2" style={{ color: '#232323' }}>
              <span>👤</span>
              <span>고객 프로필 업데이트</span>
            </h3>
            <p className="text-sm" style={{ color: '#232323', opacity: 0.7 }}>
              {selectedCustomerForRecord 
                ? '고객 정보에 영구적으로 저장됩니다.'
                : '신규 고객으로 저장 시 고객 정보에 영구적으로 저장됩니다.'}
            </p>
          </div>

          {/* 고객 태그 칩들 */}
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedCustomerTagIds.length === 0 ? (
              <p className="text-sm" style={{ color: '#232323', opacity: 0.5 }}>
                고객 특징 태그가 없어요. 필요한 경우 아래에서 직접 추가할 수 있어요.
              </p>
            ) : (
              selectedCustomerTagIds.map((tagId) => {
                const tag = allCustomerTags.find((t) => t.id === tagId);
                if (!tag) return null;

                const isNew = selectedCustomerForRecord 
                  ? newCustomerTagIds.includes(tag.id)
                  : true;

                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      setSelectedCustomerTagIds((prev) =>
                        prev.includes(tag.id)
                          ? prev.filter((id) => id !== tag.id)
                          : [...prev, tag.id]
                      );
                      if (isNew) {
                        setNewCustomerTagIds((prev) => prev.filter((id) => id !== tag.id));
                      }
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${
                      isNew
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}
                  >
                    {typeof tag === 'object' && tag !== null ? (typeof tag.label === 'string' ? tag.label : String(tag.label || '')) : String(tag || '')}
                    {isNew && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-200 text-green-800 font-bold">
                        New
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* 고객 태그 더 추가하기 버튼 */}
          <button
            type="button"
            onClick={() => setIsCustomerTagPickerOpen(true)}
            className="w-full py-2.5 rounded-xl text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            + 태그 더 추가하기
          </button>
        </section>

        {/* 방문 태그 선택 모달 */}
        {isTagPickerOpen && (
          <TagPickerModal
            allVisitTags={allVisitTags}
            selectedTagIds={selectedTagIds}
            onClose={() => setIsTagPickerOpen(false)}
            onChangeSelected={(nextSelected) => {
              setSelectedTagIds(nextSelected);
              if (!isAutoTaggingEnabled) {
                setRecommendedTagIds((prev) => {
                  const newRecommended = [...new Set([...prev, ...nextSelected])];
                  return newRecommended;
                });
              }
            }}
          />
        )}

        {/* 고객 태그 선택 모달 */}
        {isCustomerTagPickerOpen && (
          <CustomerTagPickerModal
            allCustomerTags={allCustomerTags}
            selectedTagIds={selectedCustomerTagIds}
            onClose={() => setIsCustomerTagPickerOpen(false)}
            onChangeSelected={(nextSelected) => {
              setSelectedCustomerTagIds(nextSelected);
              if (selectedCustomerForRecord) {
                const existingCustomerTags = selectedCustomerForRecord.customerTags || {};
                const existingTagLabels = [];
                Object.values(existingCustomerTags).forEach(categoryTags => {
                  if (Array.isArray(categoryTags)) {
                    categoryTags.forEach(tag => {
                      const label = typeof tag === 'string' ? tag : tag.label || tag;
                      existingTagLabels.push(label);
                    });
                  }
                });
                
                const existingTagIds = allCustomerTags
                  .filter(tag => existingTagLabels.includes(tag.label))
                  .map(tag => tag.id);
                
                const newTagIds = nextSelected.filter(id => !existingTagIds.includes(id));
                setNewCustomerTagIds(newTagIds);
              }
            }}
          />
        )}

        {/* Transcript Toggle */}
        <details className="group bg-white rounded-2xl border border-[#E8DFD3] shadow-sm overflow-hidden">
          <summary className="font-medium text-base cursor-pointer p-5 flex justify-between items-center hover:bg-gray-50 transition-colors select-none" style={{ color: '#232323' }}>
            <span>원본 녹음 내용 보기</span>
            <ChevronRight size={18} style={{ color: '#C9A27A' }} className="group-open:rotate-90 transition-transform duration-200" />
          </summary>
          <div className="p-5 pt-0 text-base leading-relaxed border-t border-gray-200 bg-gray-50" style={{ color: '#232323', opacity: 0.8 }}>
            <div className="pt-4">"{transcript}"</div>
          </div>
        </details>
        
        {/* 녹음 일시 표시 */}
        {recordingDate && (
          <div className="p-8 pt-0 text-center">
            <p className="text-sm font-light" style={{ color: '#232323', opacity: 0.6 }}>
              {formatRecordingDate(recordingDate)}
            </p>
          </div>
        )}
      </main>

      {/* Fixed Action Bar - 2개 버튼 나란히 배치 (화면 하단 고정) */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 px-8 py-4 shadow-lg" style={{ backgroundColor: '#F2F0E6' }}>
        <div className="flex gap-3">
          {/* 편집 버튼 */}
          <button 
            onClick={() => {
              if (resultData) {
                setTempResultData(JSON.parse(JSON.stringify(resultData)));
                setCurrentScreen(SCREENS.EDIT);
              }
            }}
            className="flex items-center justify-center gap-2 py-4 rounded-2xl font-medium bg-white border border-[#E8DFD3] shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
            style={{ color: '#232323', width: '40%' }}
          >
            <Edit size={18} style={{ color: '#C9A27A' }} />
            <span>편집</span>
          </button>
          
          {/* 저장하기 버튼 */}
          <button 
            onClick={() => {
              // ========================================
              // 1단계: customerId 확보 (기존/신규/자동생성)
              // ========================================
              let finalCustomerId = selectedCustomerForRecord?.id ?? null;
              let customerName = selectedCustomerForRecord?.name ?? tempName;
              let customerPhone = selectedCustomerForRecord?.phone ?? tempPhone;
              
              console.log('[저장 시작] selectedCustomerForRecord:', selectedCustomerForRecord);
              console.log('[저장 시작] tempName:', tempName, 'tempPhone:', tempPhone);
              console.log('[저장 시작] 초기 customerId:', finalCustomerId);
              
              // 날짜 검증 (모든 경우에 필수)
              if (!tempServiceDate || !tempServiceDate.trim()) {
                alert('방문 날짜와 시간을 선택해 주세요.');
                if (serviceDateInputRef.current) {
                  serviceDateInputRef.current.focus();
                }
                return;
              }

              // 고객 정보 검증 (고객 상세에서는 항상 있어야 함)
              if (!selectedCustomerForRecord) {
                alert('고객 정보가 없습니다. 다시 시도해 주세요.');
                return;
              }

              // 고객 상세에서는 항상 selectedCustomerForRecord 사용
              finalCustomerId = selectedCustomerForRecord.id;
              customerName = selectedCustomerForRecord.name;
              customerPhone = selectedCustomerForRecord.phone;
              
              // ========================================
              // 2단계: finalCustomerId 검증
              // ========================================
              if (finalCustomerId == null) {
                console.error('[저장 오류] finalCustomerId가 null입니다!');
                alert('고객 정보를 확인할 수 없습니다. 다시 시도해주세요.');
                return;
              }
              
              console.log('[저장 계속] 최종 customerId:', finalCustomerId);
              console.log('[저장 계속] 고객 이름:', customerName);
              
              // ========================================
              // 3단계: 방문 기록 생성 및 저장
              // ========================================
              // 고객 상세 요약 페이지에서는 사용자가 선택한 날짜만 사용 (녹음/텍스트에서 추출한 날짜 무시)
              // tempServiceDate가 필수이므로 이미 검증됨
              const dateObj = new Date(tempServiceDate);
              if (isNaN(dateObj.getTime())) {
                alert('유효하지 않은 날짜입니다. 다시 선택해 주세요.');
                return;
              }
              
              const year = dateObj.getFullYear();
              const month = String(dateObj.getMonth() + 1).padStart(2, '0');
              const day = String(dateObj.getDate()).padStart(2, '0');
              const serviceDate = `${year}-${month}-${day}`;
              
              // 시간도 사용자가 선택한 날짜/시간에서 추출
              const hours = String(dateObj.getHours()).padStart(2, '0');
              const minutes = String(dateObj.getMinutes()).padStart(2, '0');
              const serviceTime = `${hours}:${minutes}`;
              
              // recordedAt은 현재 시각 사용 (기록 생성 시점)
              const { recordedAt } = createDateTimeStrings();
              
              const cleanedTitle = cleanTitle(resultData.title, customerName);
              
              const newVisit = createVisitRecord({
                customerId: finalCustomerId,
                customerName: customerName, // 항상 selectedCustomerForRecord 기준
                customerPhone: customerPhone, // 항상 selectedCustomerForRecord 기준
                dateStr: serviceDate, // 사용자가 선택한 날짜 사용 (텍스트에서 추출한 날짜 무시)
                timeStr: serviceTime, // 사용자가 선택한 시간 사용 (텍스트에서 추출한 시간 무시)
                recordedAt,
                serviceDate, // 사용자가 선택한 날짜 사용 (텍스트에서 추출한 날짜 무시)
                title: cleanedTitle,
                summary: resultData.sections[0]?.content[0] || cleanedTitle,
                rawTranscript: rawTranscript || transcript,
                sections: resultData.sections,
                selectedTagIds,
                allVisitTags,
                serviceTags
              });
              
              console.log('[방문 기록 생성] customerId:', finalCustomerId);
              console.log('[방문 기록 생성] newVisit:', newVisit);
              
              // visits 상태에 방문 기록 추가 (customerId를 키로 사용)
              setVisits(prev => ({
                ...prev,
                [finalCustomerId]: [newVisit, ...(prev[finalCustomerId] || [])]
              }));
              
              // ========================================
              // 4단계: 고객 정보 업데이트 (visitCount, lastVisit, customerTags)
              // ========================================
              const targetCustomer = customers.find(c => c.id === finalCustomerId);
              const currentVisitCount = targetCustomer?.visitCount || 0;
              const nextVisitCount = currentVisitCount + 1;
              
              const updatedCustomerTags = updateCustomerTags({
                existingCustomerTags: targetCustomer?.customerTags || {
                  caution: [],
                  trait: [],
                  payment: [],
                  pattern: []
                },
                selectedCustomerTagIds,
                allCustomerTags,
                visitCount: nextVisitCount,
                resultTitle: resultData.title,
                resultSections: resultData.sections
              });
              
              setCustomers(prev => prev.map(c => {
                if (c.id === finalCustomerId) {
                  return { 
                    ...c, 
                    visitCount: nextVisitCount,
                    lastVisit: serviceDate, // 사용자가 선택한 날짜 사용
                    customerTags: updatedCustomerTags
                  };
                }
                return c;
              }));
              
              console.log('[고객 정보 업데이트] visitCount:', nextVisitCount);
              console.log('[고객 정보 업데이트] customerTags:', updatedCustomerTags);
              
              // ========================================
              // 4.5단계: 방문 기록 저장 시 예약 자동 생성
              // ========================================
              // 사용자가 선택한 날짜/시간으로 예약 생성 (이미 dateObj가 검증됨)
              if (addReservationFromVisit) {
                console.log('[예약 자동 생성] 사용자가 선택한 방문 날짜/시간으로 예약 생성:', dateObj);
                addReservationFromVisit({
                  customerId: finalCustomerId,
                  visitDateTime: dateObj // 사용자가 선택한 날짜/시간 사용
                });
              }
              
              // ========================================
              // 5단계: 화면 전환
              // ========================================
              setSelectedCustomerId(finalCustomerId);
              
              setTimeout(() => {
                console.log('[화면 전환] CUSTOMER_DETAIL로 이동, customerId:', finalCustomerId);
                setCurrentScreen(SCREENS.CUSTOMER_DETAIL);
              }, 100);
            }}
            className="flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl font-medium text-white shadow-md hover:shadow-lg hover:opacity-90 transition-all"
            style={{ backgroundColor: '#C9A27A' }}
          >
            저장하기
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomerRecordScreen;

