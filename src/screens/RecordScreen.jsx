// 음성 녹음 → 처리 → 결과 미리보기까지 담당하는 화면
import React, { useEffect, useState, useRef } from 'react';
import { Square, ArrowLeft, MoreHorizontal, Phone, Edit, ChevronRight, X, Pause, Play } from 'lucide-react';
import { SCREENS } from '../constants/screens';
import {
  formatRecordingDateTime,
  createDateTimeStrings,
  cleanTitle,
  createVisitRecord,
  updateCustomerTags,
  createNewCustomer
} from '../utils/recordUtils';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

// UUID 검증 헬퍼 함수
const isValidUuid = (value) => {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
};

// visit_logs 저장 helper 함수
async function saveVisitLogToSupabase({
  ownerId,
  customerId,
  reservationId,
  serviceDate,   // 'YYYY-MM-DD'
  serviceTime,   // 'HH:MM' 또는 null
  title,
  summarySections, // AI 요약 전체 객체
  rawText,         // 원문 텍스트
  tags,            // 문자열 배열 (예: ['리터치', '주의사항'] )
}) {
  if (!ownerId) return null;

  try {
    // UUID 검증: 유효한 UUID가 아니면 null로 처리
    const safeCustomerId =
      customerId && isValidUuid(customerId) ? customerId : null;
    const safeReservationId =
      reservationId && isValidUuid(reservationId) ? reservationId : null;

    const insertPayload = {
      owner_id: ownerId,
      customer_id: safeCustomerId,
      reservation_id: safeReservationId,
      recorded_at: new Date().toISOString(),
      service_date: serviceDate || null,
      service_time: serviceTime || null,
      title: title || null,
      summary_json: summarySections ?? null,
      raw_text: rawText || '',
      tags: tags && tags.length ? tags : [],   // text[] 컬럼
    };

    const { data, error } = await supabase
      .from('visit_logs')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('[Supabase] visit_logs insert 에러', error);
      return null;
    }

    console.log('[Supabase] visit_logs insert 성공', data);
    return data.id;
  } catch (e) {
    console.error('[Supabase] visit_logs insert 예외', e);
    return null;
  }
}

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

function RecordScreen({
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
  TagPickerModal,
  CustomerTagPickerModal,
  refreshVisitLogs,
  refreshCustomers  // ✅ Supabase에서 고객 목록 새로고침
}) {
  const { user } = useAuth();
  
  // 날짜 입력 state 추가
  const [tempServiceDate, setTempServiceDate] = useState(() => {
    // recordingDate가 있으면 초기값으로 설정
    if (recordingDate) {
      const year = recordingDate.getFullYear();
      const month = String(recordingDate.getMonth() + 1).padStart(2, '0');
      const day = String(recordingDate.getDate()).padStart(2, '0');
      const hours = String(recordingDate.getHours()).padStart(2, '0');
      const minutes = String(recordingDate.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    return '';
  });
  const serviceDateInputRef = useRef(null);

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
    if (recordState === 'recording' || (recordState === 'idle' && recordingTime > 0)) {
      window.scrollTo(0, 0);
    }
  }, [recordState, recordingTime]);

  // recordState에 따라 다른 화면 렌더링
  // idle 상태에서도 초기 녹음 UI를 즉시 표시
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
                    ? '⚠️ 곧 최대 녹음 시간에 도달합니다!'
                    : '💡 한 고객님 정보만 말씀해 주세요'}
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
                  if (window.confirm('지금 나가면 현재 녹음은 저장되지 않습니다. 정말 취소하시겠습니까?')) {
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
            src="/logo.png" 
            alt="Mallo 로고" 
            className="w-28 h-28 object-contain mx-auto mb-6 animate-bounce"
          />
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#232323' }}>시술 기록 정리 중</h2>
          <p className="font-light" style={{ color: '#232323' }}>AI가 내용을 분석하고 서식을 적용하고 있습니다.</p>
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

  // recordState === 'result'인 경우에만 결과 화면/없음 분기
  if (recordState === 'result' && !resultData) {
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

  // 예약 날짜+시간 라벨 생성 (예: "12월 6일 (토요일) 11:00")
  const reservationDateTimeLabel = (() => {
    // 예약 정보에서 날짜와 시간 가져오기
    let reservationDate = null;
    let reservationTime = null;
    
    // reservations 배열에서 예약 찾기
    if (selectedCustomerForRecord?.reservationId && reservations) {
      const matchedReservation = reservations.find(r => r.id === selectedCustomerForRecord.reservationId);
      if (matchedReservation) {
        reservationTime = matchedReservation.time;
        if (matchedReservation.date) {
          // YYYY-MM-DD 형식의 날짜를 Date 객체로 변환
          const [year, month, day] = matchedReservation.date.split('-').map(Number);
          reservationDate = new Date(year, month - 1, day);
        }
      }
    }
    
    // selectedCustomerForRecord에서 직접 가져오기
    if (!reservationTime && selectedCustomerForRecord?.time) {
      reservationTime = selectedCustomerForRecord.time;
    }
    if (!reservationDate && selectedCustomerForRecord?.date) {
      const dateStr = selectedCustomerForRecord.date;
      if (typeof dateStr === 'string' && dateStr.includes('-')) {
        const [year, month, day] = dateStr.split('-').map(Number);
        reservationDate = new Date(year, month - 1, day);
      }
    }
    
    // 예약 정보가 없으면 녹음 날짜/시간 사용
    if (!reservationDate) {
      reservationDate = recordingDate || new Date();
    }
    if (!reservationTime) {
      const hours = String(reservationDate.getHours()).padStart(2, '0');
      const minutes = String(reservationDate.getMinutes()).padStart(2, '0');
      reservationTime = `${hours}:${minutes}`;
    }
    
    // 날짜 포맷팅 (12월 6일 (토))
    const month = reservationDate.getMonth() + 1;
    const day = reservationDate.getDate();
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[reservationDate.getDay()];
    
    return `${month}월 ${day}일 (${weekday}) ${reservationTime}`;
  })();

  // 텍스트에서 성별(여자/남자) 추정
  const inferGender = (text) => {
    if (!text || typeof text !== 'string') return null;
    const lower = text.toLowerCase();
    if (lower.includes('여성') || lower.includes('여자')) return '여';
    if (lower.includes('남성') || lower.includes('남자')) return '남';
    return null;
  };

  // 고객 정보
  // selectedCustomerForRecord에 예전 번호가 들어가 있을 수 있으므로,
  // customers 배열에서 현재 고객을 찾아서 최신 정보를 사용
  let currentCustomer = null;
  if (selectedCustomerForRecord?.id && customers && customers.length > 0) {
    // UUID와 숫자 ID 모두 처리
    const searchId = selectedCustomerForRecord.id;
    currentCustomer = customers.find(c => {
      // 정확히 일치하는 경우
      if (c.id === searchId) return true;
      // 문자열로 변환해서 비교
      if (String(c.id) === String(searchId)) return true;
      // 소문자로 변환해서 비교 (UUID 대소문자 차이)
      if (String(c.id).toLowerCase() === String(searchId).toLowerCase()) return true;
      return false;
    });
    
    // 이름과 전화번호로 찾기 시도 (ID가 숫자인 경우)
    if (!currentCustomer && selectedCustomerForRecord.name) {
      // 1순위: 이름 + 전화번호 모두 일치
      if (selectedCustomerForRecord.phone) {
        currentCustomer = customers.find(c => {
          const nameMatch = c.name?.trim() === selectedCustomerForRecord.name?.trim();
          const phoneMatch = c.phone?.trim() === selectedCustomerForRecord.phone?.trim() ||
                            c.phone?.replace(/[^0-9]/g, '') === selectedCustomerForRecord.phone?.replace(/[^0-9]/g, '');
          return nameMatch && phoneMatch;
        });
      }
      
      // 2순위: 이름만 일치 (전화번호가 다를 수 있으므로)
      if (!currentCustomer) {
        currentCustomer = customers.find(c => {
          return c.name?.trim() === selectedCustomerForRecord.name?.trim();
        });
        if (currentCustomer) {
          console.log('⚠️ [이름만으로 매칭] 전화번호가 다르지만 이름으로 찾았습니다.');
          console.log('   selectedCustomerForRecord.phone:', selectedCustomerForRecord.phone);
          console.log('   currentCustomer.phone:', currentCustomer.phone);
        }
      }
    }
  }
  
  // 현재 고객의 최신 정보를 우선 사용 (selectedCustomerForRecord의 예전 정보 무시)
  const customerNameHeader = currentCustomer?.name || selectedCustomerForRecord?.name || tempName || '';
  const customerPhoneHeader = currentCustomer?.phone || selectedCustomerForRecord?.phone || tempPhone || '';
  
  // 디버깅: 어떤 정보가 사용되는지 확인
  if (selectedCustomerForRecord?.id) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📞 [RecordScreen 헤더] 전화번호 디버깅');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1️⃣ selectedCustomerForRecord의 정보:');
    console.log('   id:', selectedCustomerForRecord.id, '(타입:', typeof selectedCustomerForRecord.id, ')');
    console.log('   name:', selectedCustomerForRecord.name);
    console.log('   phone:', selectedCustomerForRecord.phone);
    console.log('');
    console.log('2️⃣ customers 배열 정보:');
    console.log('   customers 배열 길이:', customers?.length || 0);
    if (customers && customers.length > 0) {
      console.log('   customers 배열의 첫 3개 고객:');
      customers.slice(0, 3).forEach((c, idx) => {
        console.log(`     [${idx}] id: ${c.id} (타입: ${typeof c.id}), name: ${c.name}, phone: ${c.phone}`);
      });
    }
    console.log('');
    console.log('3️⃣ currentCustomer의 최신 정보 (customers 배열에서 찾은 것):');
    if (currentCustomer) {
      console.log('   ✅ 찾음! id:', currentCustomer.id, 'name:', currentCustomer.name, 'phone:', currentCustomer.phone);
    } else {
      console.log('   ❌ customers 배열에서 찾지 못함');
      console.log('   검색 시도한 ID:', selectedCustomerForRecord.id);
      console.log('   검색 시도한 이름:', selectedCustomerForRecord.name);
      console.log('   검색 시도한 전화번호:', selectedCustomerForRecord.phone);
    }
    console.log('');
    console.log('4️⃣ 최종 사용되는 값:');
    console.log('   customerName:', customerNameHeader);
    console.log('   customerPhone:', customerPhoneHeader);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  return (
    <div className="flex flex-col h-full relative" style={{ backgroundColor: '#F2F0E6' }}>
      {/* Header */}
      <header className="px-5 pt-4 pb-3 bg-[#F2F0E6] sticky top-0 z-20 flex items-center justify-between">
        <button onClick={resetFlow} className="p-2 hover:bg-gray-100 rounded-2xl transition-colors" style={{ color: '#232323' }}>
          <span className="text-[32px]">&#x2039;</span>
        </button>
        <div className="flex flex-col items-center">
          {/* 예약 날짜+시간: 예) 12월 6일 (토요일) 11:00 */}
          <p className="text-[14px] font-semibold text-[#232323]">
            {reservationDateTimeLabel}
          </p>
          {/* 이름 / 번호 */}
          <p className="mt-1 text-[14px] font-semibold text-[#232323]">
            {customerNameHeader}
            {customerPhoneHeader && (
              <span className="ml-1 text-[14px] font-semibold text-[#232323]">
                / {customerPhoneHeader}
              </span>
            )}
          </p>
        </div>
        <div className="w-8" /> {/* 오른쪽 균형 맞추기용 */}
      </header>

      <main className="flex-1 overflow-y-auto p-8 space-y-5 pb-32" style={{ backgroundColor: '#F2F0E6' }}>
         {!selectedCustomerForRecord && (
           <div className="bg-white rounded-xl shadow-sm border border-[#E8DFD3]" style={{ padding: '12px 16px' }}>
             <div className="flex flex-col gap-2">
               <label className="block text-sm font-medium mb-2" style={{ color: '#232323' }}>신규 고객 정보</label>
               
               {/* 이름 입력 */}
               <div className="mb-3">
                 <label className="block text-xs font-medium mb-1.5" style={{ color: '#232323', opacity: 0.7 }}>이름</label>
                 <input
                   ref={nameInputRef}
                   type="text"
                   value={tempName || ''}
                   onChange={(e) => setTempName(e.target.value)}
                   placeholder={!tempName ? "이름 입력" : ""}
                   className={`w-full px-3 py-2 rounded-xl border focus:ring-1 outline-none transition-all text-sm ${
                     !tempName ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 focus:border-[#C9A27A] focus:ring-[#C9A27A]'
                   }`}
                   style={{ color: '#232323', backgroundColor: '#FFFFFF' }}
                 />
                 {!tempName && (
                   <p className="text-xs mt-1.5" style={{ color: '#EF4444' }}>* 이름은 필수입니다</p>
                 )}
               </div>
               
               {/* 전화번호 입력 */}
               <div className="mb-3">
                 <label className="block text-xs font-medium mb-1.5" style={{ color: '#232323', opacity: 0.7 }}>전화번호</label>
                 <input
                   ref={phoneInputRef}
                   type="tel"
                   value={tempPhone || ''}
                   onChange={handlePhoneChange}
                   placeholder={!tempPhone ? "010-1234-5678" : ""}
                   className={`w-full px-3 py-2 rounded-xl border focus:ring-1 outline-none transition-all text-sm ${
                     !tempPhone ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 focus:border-[#C9A27A] focus:ring-[#C9A27A]'
                   }`}
                   style={{ color: '#232323', backgroundColor: '#FFFFFF' }}
                 />
                 {!tempPhone && (
                   <p className="text-xs mt-1.5" style={{ color: '#EF4444' }}>* 전화번호는 필수입니다</p>
                 )}
               </div>
               
               {/* 날짜/시간 입력 */}
               <div className="mb-3">
                 <label className="block text-xs font-medium mb-1.5" style={{ color: '#232323', opacity: 0.7 }}>시술 날짜 및 시간</label>
                 <input
                   ref={serviceDateInputRef}
                   type="datetime-local"
                   value={tempServiceDate || ''}
                   onChange={(e) => setTempServiceDate(e.target.value)}
                   className={`w-full px-3 py-2 rounded-xl border focus:ring-1 outline-none transition-all text-sm ${
                     !tempServiceDate ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 focus:border-[#C9A27A] focus:ring-[#C9A27A]'
                   }`}
                   style={{ color: '#232323', backgroundColor: '#FFFFFF' }}
                 />
                 {!tempServiceDate && (
                   <p className="text-xs mt-1.5" style={{ color: '#EF4444' }}>* 시술 날짜 및 시간은 필수입니다</p>
                 )}
               </div>
             </div>
           </div>
         )}

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
              
              // [고객 기본 정보] 섹션인지 확인
              const isCustomerInfoSection = safeSectionTitle.includes('고객 기본 정보') || 
                                           safeSectionTitle.includes('고객 정보') ||
                                           safeSectionTitle.toLowerCase().includes('customer');
              
              // 고객 기본 정보 섹션인 경우 content를 특정 형식으로 변환
              let formattedContent = section.content;
              if (isCustomerInfoSection && resultData.customerInfo) {
                // 성별 추출을 위해 원본 content를 먼저 저장 (특징줄 처리 전)
                const originalContentForGender = JSON.stringify(section.content || []);
                
                const shouldHideLine = (line) => {
                  if (!line) return false;
                  const str = typeof line === 'string' ? line : String(line);
                  if (/^\s*구분\s*[:：]/.test(str)) return true;
                  if (str.includes('(성별삭제됨)')) return true;
                  if (/^\s*성별\s*:/.test(str)) return true;
                  return false;
                };

                // 우선순위: 선택된 프로필 > 사용자가 입력한 값 > AI 추출값
                const customerName =
                  selectedCustomerForRecord?.name ||
                  tempName ||
                  resultData.customerInfo.name ||
                  '';
                const customerPhone =
                  selectedCustomerForRecord?.phone ||
                  tempPhone ||
                  resultData.customerInfo.phone ||
                  '';

                formattedContent = [];
                if (customerName) {
                  formattedContent.push(`이름: ${customerName}`);
                }
                if (customerPhone) {
                  formattedContent.push(`전화번호: ${customerPhone}`);
                }
                const genderDeleted = Array.isArray(section.content)
                  ? section.content.some((line) => typeof line === 'string' && line.includes('(성별삭제됨)'))
                  : false;
                if (!genderDeleted) {
                  // 원본 content를 사용하여 성별 추출 (특징줄 처리 전)
                  const genderGuess = inferGender(
                    `${originalContentForGender} ${resultData?.title || ''} ${rawTranscript || transcript || ''}`
                  );
                  const genderLabel = genderGuess
                    ? (genderGuess.startsWith('여') ? '여' : genderGuess.startsWith('남') ? '남' : '미기재')
                    : '미기재';
                  formattedContent.push(`성별: ${genderLabel}`);
                  
                  // 추출된 성별을 customerInfo에 저장 (기록히스토리/고객상세에서 사용)
                  if (genderGuess) {
                    if (!resultData.customerInfo) {
                      resultData.customerInfo = {};
                    }
                    resultData.customerInfo.gender = genderLabel;
                    
                    // section.content에도 성별 정보 추가 (저장용)
                    // 기존에 성별 줄이 없으면 추가
                    const hasGenderLine = section.content.some(line =>
                      typeof line === 'string' && /^\s*성별\s*:/.test(line)
                    );
                    if (!hasGenderLine) {
                      section.content.push(`성별: ${genderLabel}`);
                    }
                  }
                }

                // 기존 content가 있으면 추가 (이름/전화번호/성별/구분이 아닌 다른 정보)
                section.content.forEach(item => {
                  const itemStr = typeof item === 'string' ? item : String(item || '');
                  if (itemStr &&
                      !itemStr.includes('이름:') &&
                      !itemStr.includes('전화번호:') &&
                      !itemStr.includes('성별:') &&  // 성별 줄 제외
                      !itemStr.includes('name:') &&
                      !itemStr.includes('phone:')) {
                    // 고객 특징 줄에서 성별 관련 내용 제거
                    let processedItem = itemStr;
                    if (itemStr.includes('고객 특징:')) {
                      // 성별 관련 키워드 제거 (여성, 남성, 여, 남, 여자, 남자, 손님 등)
                      processedItem = itemStr
                        .replace(/,\s*여성분?/g, '')
                        .replace(/,\s*남성분?/g, '')
                        .replace(/여성분?\s*,/g, '')
                        .replace(/남성분?\s*,/g, '')
                        .replace(/,\s*여자?손님/g, '')
                        .replace(/,\s*남자?손님/g, '')
                        .replace(/여자?손님\s*,/g, '')
                        .replace(/남자?손님\s*,/g, '')
                        .replace(/,\s*여자?/g, '')
                        .replace(/,\s*남자?/g, '')
                        .replace(/여자?\s*,/g, '')
                        .replace(/남자?\s*,/g, '')
                        .replace(/,\s*여\b/g, '')
                        .replace(/,\s*남\b/g, '')
                        .replace(/여\s*,/g, '')
                        .replace(/남\s*,/g, '')
                        .replace(/^\s*고객 특징:\s*,/, '고객 특징:')
                        .replace(/,\s*$/, '')
                        .trim();
                    }
                    formattedContent.push(processedItem);
                  }
                });

                // 최종적으로 구분/성별삭제/중복성별 제거
                let seenGender = false;
                formattedContent = formattedContent.filter(line => {
                  const str = typeof line === 'string' ? line : String(line);
                  if (/^\s*구분\s*[:：]/.test(str)) return false;
                  if (str.includes('(성별삭제됨)')) return false;
                  if (/^\s*성별\s*:/.test(str)) {
                    if (seenGender) return false;
                    seenGender = true;
                  }
                  return true;
                });
              }
              
              return (
                <div key={idx} className="animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 100}ms` }}>
                  <h4 className="text-base font-bold mb-4" style={{ color: '#232323' }}>
                    {safeSectionTitle}
                  </h4>
                  <ul className="space-y-3">
                    {formattedContent.map((item, i) => {
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
              기록 일시 {formatRecordingDate(recordingDate)}
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
                const dataCopy = JSON.parse(JSON.stringify(resultData));

                // 고객 기본 정보 섹션 정리: 구분 제거, 성별 라인 보강, 순서 (이름 → 전화번호 → 성별)
                dataCopy.sections = (dataCopy.sections || []).map((sec) => {
                  if (
                    !sec ||
                    !sec.title ||
                    !(
                      sec.title.includes('고객 기본 정보') ||
                      sec.title.includes('고객 정보')
                    )
                  ) {
                    return sec;
                  }

                  const items = Array.isArray(sec.content) ? sec.content : [];
                  const cleaned = items
                    .filter((line) => line != null && line !== '')
                    .map((line) => (typeof line === 'string' ? line : String(line)));

                  const genderDeleted = cleaned.some((str) => str.includes('(성별삭제됨)'));

                  // 라인 필터: 구분 제거, 기존 성별 제거 (성별삭제 플래그는 유지)
                  const isHide = (str) => /^\s*구분\s*[:：]/.test(str);
                  const withoutHidden = cleaned.filter(
                    (str) => !isHide(str) && !/^\s*성별\s*:/.test(str)
                  );

                  // 이름/전화번호 기존 라인 추출
                  const nameLine = withoutHidden.find((s) => s.includes('이름:'));
                  const phoneLine = withoutHidden.find((s) => s.includes('전화번호:'));

                  // 이름/전화번호/성별 구성
                  const header = [];
                  const nameValue =
                    nameLine ||
                    (resultData.customerInfo?.name
                      ? `이름: ${resultData.customerInfo.name}`
                      : null);
                  const phoneValue =
                    phoneLine ||
                    (resultData.customerInfo?.phone
                      ? `전화번호: ${resultData.customerInfo.phone}`
                      : null);

                  if (nameValue) header.push(nameValue);
                  if (phoneValue) header.push(phoneValue);

                  if (!genderDeleted) {
                    const genderGuess = inferGender(
                      `${JSON.stringify(items)} ${resultData?.title || ''} ${rawTranscript || transcript || ''}`
                    );
                    const genderLabel = genderGuess ? genderGuess : '미기재';
                    header.push(`성별: ${genderLabel}`);
                  }

                  // 나머지 라인 (이름/전화번호/성별 제거 후)
                  const body = withoutHidden.filter(
                    (s) =>
                      s !== nameLine &&
                      s !== phoneLine &&
                      !/^\s*성별\s*:/.test(s)
                  );

                  // 성별 삭제 플래그는 남겨서 재편집 시 유지
                  if (genderDeleted && !body.includes('(성별삭제됨)')) {
                    body.unshift('(성별삭제됨)');
                  }

                  return {
                    ...sec,
                    content: [...header, ...body],
                  };
                });

                setTempResultData(dataCopy);
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
            onClick={async () => {
              // ✅ 여기가 통째로 교체되는 부분입니다.
              try {
                // 전화번호에서 숫자만 남기는 헬퍼
                const normalizePhone = (phone) => {
                  if (!phone) return '';
                  return phone.replace(/[^0-9]/g, '');
                };

                // 기본 날짜/시간 (지금 시점 기준)
                const { dateStr, timeStr, recordedAt } = createDateTimeStrings();

                let finalCustomerId = null;
                let customerName = '';
                let customerPhone = '';
                let reservationId = null;
                let serviceDate = dateStr;
                let serviceTime = timeStr;

                // ----------------------------
                // 1) 예약에서 들어온 경우
                // ----------------------------
                if (selectedCustomerForRecord) {
                  reservationId = selectedCustomerForRecord.reservationId || null;

                  // 예약 찾기
                  let targetReservation = null;
                  if (reservationId && reservations && reservations.length > 0) {
                    targetReservation =
                      reservations.find((r) => r.id === reservationId) || null;
                  }

                  // 고객 ID: 예약의 customerId 우선, 없으면 selectedCustomerForRecord.id 사용
                  if (targetReservation?.customerId) {
                    finalCustomerId = targetReservation.customerId;
                  } else if (
                    selectedCustomerForRecord.id &&
                    isValidUuid(String(selectedCustomerForRecord.id))
                  ) {
                    finalCustomerId = String(selectedCustomerForRecord.id);
                  }

                  // 고객 이름/전화번호: customers 배열에서 최신 정보 우선
                  const matchedCustomer =
                    finalCustomerId && customers
                      ? customers.find((c) => {
                          const cId = String(c.id);
                          const tId = String(finalCustomerId);
                          return (
                            cId === tId || cId.toLowerCase() === tId.toLowerCase()
                          );
                        })
                      : null;

                  customerName =
                    matchedCustomer?.name ||
                    selectedCustomerForRecord.name ||
                    tempName ||
                    '';
                  customerPhone =
                    matchedCustomer?.phone ||
                    selectedCustomerForRecord.phone ||
                    tempPhone ||
                    '';

                  // 서비스 날짜: 예약 날짜 > 입력 값 > 요약에서 추출 > 기본값
                  if (targetReservation?.date) {
                    serviceDate = targetReservation.date;
                  } else if (tempServiceDate) {
                    const d = new Date(tempServiceDate);
                    if (!isNaN(d.getTime())) {
                      const y = d.getFullYear();
                      const m = String(d.getMonth() + 1).padStart(2, '0');
                      const da = String(d.getDate()).padStart(2, '0');
                      serviceDate = `${y}-${m}-${da}`;
                    }
                  } else {
                    const parsed = extractServiceDateFromSummary(resultData);
                    if (parsed) serviceDate = parsed;
                  }

                  // 서비스 시간: 예약 시간 > 입력 값에서 추출 > 기본값
                  if (targetReservation?.time) {
                    serviceTime = String(targetReservation.time).trim();
                  } else if (tempServiceDate) {
                    const d = new Date(tempServiceDate);
                    if (!isNaN(d.getTime())) {
                      const hh = String(d.getHours()).padStart(2, '0');
                      const mm = String(d.getMinutes()).padStart(2, '0');
                      serviceTime = `${hh}:${mm}`;
                    }
                  }

                // ----------------------------
                // 2) 예약 없이 바로 녹음한 신규 고객
                // ----------------------------
                } else {
                  // 이름/전화번호 필수 입력
                  if (!tempName || !tempName.trim()) {
                    alert('고객님의 이름을 입력해주세요!');
                    if (nameInputRef.current) {
                      nameInputRef.current.focus();
                    }
                    return;
                  }
                  if (!tempPhone || !tempPhone.trim()) {
                    alert('고객님의 전화번호를 입력해주세요!');
                    if (phoneInputRef.current) {
                      phoneInputRef.current.focus();
                    }
                    return;
                  }

                  customerName = tempName.trim();
                  customerPhone = tempPhone.trim();

                  // 서비스 날짜/시간: 입력 값 우선
                  if (tempServiceDate) {
                    const d = new Date(tempServiceDate);
                    if (!isNaN(d.getTime())) {
                      const y = d.getFullYear();
                      const m = String(d.getMonth() + 1).padStart(2, '0');
                      const da = String(d.getDate()).padStart(2, '0');
                      serviceDate = `${y}-${m}-${da}`;

                      const hh = String(d.getHours()).padStart(2, '0');
                      const mm = String(d.getMinutes()).padStart(2, '0');
                      serviceTime = `${hh}:${mm}`;
                    }
                  } else {
                    const parsed = extractServiceDateFromSummary(resultData);
                    if (parsed) serviceDate = parsed;
                  }

                  // Supabase에서 전화번호(숫자만) 기준으로 고객 찾기 → 없으면 새로 생성
                  if (user) {
                    const normalizedTarget = normalizePhone(customerPhone);
                    let existingCustomer = null;

                    const { data: customerRows, error: customerQueryError } =
                      await supabase
                        .from('customers')
                        .select('id, name, phone')
                        .eq('owner_id', user.id);

                    if (!customerQueryError && customerRows) {
                      existingCustomer =
                        customerRows.find(
                          (row) => normalizePhone(row.phone) === normalizedTarget
                        ) || null;
                    }

                    if (existingCustomer) {
                      finalCustomerId = existingCustomer.id;
                      if (!customerName) customerName = existingCustomer.name || '';
                      if (!customerPhone)
                        customerPhone = existingCustomer.phone || customerPhone;
                    } else {
                      const { data: insertedCustomer, error: insertCustomerError } =
                        await supabase
                          .from('customers')
                          .insert({
                            owner_id: user.id,
                            name: customerName,
                            phone: customerPhone,
                            memo: '',
                          })
                          .select()
                          .single();

                      if (insertCustomerError) {
                        console.error(
                          '[RecordScreen] 신규 고객 생성 에러:',
                          insertCustomerError
                        );
                        alert('고객 정보를 저장하는 중 오류가 발생했습니다.');
                        return;
                      }

                      finalCustomerId = insertedCustomer.id;
                      // 로컬 customers 상태에도 추가
                      setCustomers((prev) => [...prev, insertedCustomer]);
                      
                      // 🔄 Supabase에서 최신 고객 목록 가져오기 (홈 화면 검색에서 즉시 표시)
                      if (refreshCustomers) {
                        console.log('[RecordScreen] 새 고객 추가 후 Supabase 데이터 새로고침');
                        refreshCustomers();
                      }
                    }
                  }
                }

                // ----------------------------
                // 3) 방문 기록 공통 생성
                // ----------------------------
                // 예약/입력/파싱 어디서도 못 얻었을 때 기본값으로 보정
                if (!serviceDate) serviceDate = dateStr;
                if (!serviceTime) serviceTime = timeStr;

                const cleanedTitle = cleanTitle(resultData.title, customerName);

                const newVisit = createVisitRecord({
                  customerId: finalCustomerId || null,
                  customerName,
                  dateStr,
                  timeStr,
                  recordedAt,
                  serviceDate,
                  title: cleanedTitle,
                  summary:
                    resultData.sections[0]?.content?.[0] || cleanedTitle,
                  rawTranscript: rawTranscript || transcript,
                  sections: resultData.sections,
                  selectedTagIds,
                  allVisitTags,
                  serviceTags,
                });

                // 태그 라벨 배열
                const tagLabels = selectedTagIds
                  .map((tagId) => {
                    const tag = allVisitTags.find((t) => t.id === tagId);
                    if (!tag) return null;
                    if (typeof tag === 'object' && tag !== null) {
                      return typeof tag.label === 'string'
                        ? tag.label
                        : String(tag.label || '');
                    }
                    return String(tag);
                  })
                  .filter(Boolean);

                // 요약 결과에서 성별 추출 헬퍼 함수
                const extractGenderFromSummary = (summaryData) => {
                  if (!summaryData) return null;

                  // customerInfo에서 성별 찾기
                  if (summaryData.customerInfo?.gender) {
                    return summaryData.customerInfo.gender;
                  }

                  // sections에서 고객 기본 정보 섹션 찾기
                  const customerSection = summaryData.sections?.find(section =>
                    section.title?.includes('고객 기본 정보') ||
                    section.title?.includes('고객 정보') ||
                    section.title?.toLowerCase().includes('customer')
                  );

                  if (customerSection?.content) {
                    const genderLine = customerSection.content.find(line =>
                      typeof line === 'string' && /^\s*성별\s*:/.test(line)
                    );
                    if (genderLine) {
                      const genderValue = genderLine.split(':')[1]?.trim();
                      if (genderValue && genderValue !== '미기재') {
                        return genderValue;
                      }
                    }
                  }

                  // 전체 텍스트에서 추정
                  const fullText = JSON.stringify(summaryData);
                  return inferGender(fullText);
                };

                // summary_json에 명시적으로 고객 정보 넣기
                const extractedGender = extractGenderFromSummary(resultData);
                const finalSummaryJson = resultData
                  ? {
                      ...resultData,
                      customerInfo: {
                        name: customerName || null,
                        phone: customerPhone || null,
                        gender: extractedGender,
                        ...(resultData.customerInfo
                          ? Object.fromEntries(
                              Object.entries(resultData.customerInfo).filter(
                                ([key]) => key !== 'name' && key !== 'phone' && key !== 'gender'
                              )
                            )
                          : {}),
                      },
                    }
                  : {
                      customerInfo: {
                        name: customerName || null,
                        phone: customerPhone || null,
                        gender: extractedGender,
                      },
                      sections: [],
                    };

                const finalRawText = rawTranscript || transcript || '';

                // ----------------------------
                // 4) Supabase visit_logs 저장
                // ----------------------------
                let supabaseVisitId = null;
                if (user) {
                  const visitPayload = {
                    owner_id: user.id,
                    customer_id: finalCustomerId || null,
                    reservation_id: reservationId,
                    recorded_at: new Date().toISOString(),
                    service_date: serviceDate,
                    service_time: serviceTime,
                    title: cleanedTitle || '',
                    summary_json: finalSummaryJson,
                    raw_text: finalRawText,
                    tags: tagLabels.length ? tagLabels : null,
                  };

                  console.log(
                    '[RecordScreen] visit_logs INSERT payload:',
                    visitPayload
                  );

                  const {
                    data: insertedVisit,
                    error: insertVisitError,
                  } = await supabase
                    .from('visit_logs')
                    .insert(visitPayload)
                    .select()
                    .single();

                  if (insertVisitError) {
                    console.error(
                      '[RecordScreen] visit_logs INSERT 에러:',
                      insertVisitError
                    );
                    alert('시술 기록을 저장하는 중 오류가 발생했습니다.');
                  } else if (insertedVisit) {
                    supabaseVisitId = insertedVisit.id;
                    if (refreshVisitLogs) {
                      refreshVisitLogs();
                    }
                  }
                }

                // ----------------------------
                // 5) 로컬 visits 상태 업데이트
                // ----------------------------
                const finalVisit = {
                  ...newVisit,
                  id: supabaseVisitId || newVisit.id,
                  customerId: finalCustomerId || null,
                };

                const visitKey = finalCustomerId || 'unlinked';
                setVisits((prev) => ({
                  ...prev,
                  [visitKey]: [finalVisit, ...(prev[visitKey] || [])],
                }));

                // ----------------------------
                // 6) 고객 visitCount, lastVisit, customerTags 업데이트
                // ----------------------------
                if (finalCustomerId && customers && customers.length > 0) {
                  const targetCustomer = customers.find(
                    (c) => c.id === finalCustomerId
                  );
                  const currentVisitCount = targetCustomer?.visitCount || 0;
                  const nextVisitCount = currentVisitCount + 1;

                  const updatedCustomerTags = updateCustomerTags({
                    existingCustomerTags:
                      targetCustomer?.customerTags || {
                        feature: [],
                        caution: [],
                        trait: [],
                        payment: [],
                        pattern: [],
                      },
                    selectedCustomerTagIds,
                    allCustomerTags,
                    visitCount: nextVisitCount,
                    resultTitle: resultData.title,
                    resultSections: resultData.sections,
                  });

                  setCustomers((prev) =>
                    prev.map((c) =>
                      c.id === finalCustomerId
                        ? {
                            ...c,
                            visitCount: nextVisitCount,
                            lastVisit: serviceDate,
                            customerTags: updatedCustomerTags,
                          }
                        : c
                    )
                  );

                  // Supabase customers 테이블에 customerTags 업데이트
                  if (finalCustomerId && isValidUuid(String(finalCustomerId)) && user) {
                    // visit_count 업데이트
                    try {
                      const { error: basicUpdateError } = await supabase
                        .from('customers')
                        .update({
                          visit_count: nextVisitCount,
                        })
                        .eq('id', finalCustomerId)
                        .eq('owner_id', user.id);

                      if (basicUpdateError) {
                        console.warn('[RecordScreen] visit_count 업데이트 실패:', basicUpdateError.message);
                      }
                    } catch (basicErr) {
                      console.warn('[RecordScreen] visit_count 업데이트 중 예외:', basicErr);
                    }

                    // customer_tags는 별도로 업데이트 (컬럼이 없을 수 있음)
                    try {
                      const { error: tagsError } = await supabase
                        .from('customers')
                        .update({
                          customer_tags: updatedCustomerTags,
                        })
                        .eq('id', finalCustomerId)
                        .eq('owner_id', user.id);

                      if (tagsError) {
                        console.warn('[RecordScreen] customer_tags 컬럼이 없거나 업데이트 실패:', tagsError.message);
                      } else {
                        console.log('[RecordScreen] customers 테이블 업데이트 성공:', {
                          customerId: finalCustomerId,
                          customerTags: updatedCustomerTags,
                        });
                      }
                    } catch (tagsErr) {
                      console.warn('[RecordScreen] customer_tags 업데이트 중 예외 (무시):', tagsErr);
                    }
                  }
                }

                // ----------------------------
                // 7) 예약과 고객 연결 (예약에서 온 경우)
                // ----------------------------
                if (reservationId && finalCustomerId && setReservations) {
                  setReservations((prev) =>
                    prev.map((r) =>
                      r.id === reservationId && !r.customerId
                        ? { ...r, customerId: finalCustomerId }
                        : r
                    )
                  );
                }

                // ========================================
                // 5단계: 화면 전환
                // ========================================

                // safeCustomerId(ensureCustomerForVisit 결과) > finalCustomerId > selectedCustomerForRecord.id
                const targetCustomerId =
                  (typeof safeCustomerId !== 'undefined' && safeCustomerId) ||
                  finalCustomerId ||
                  selectedCustomerForRecord?.id ||
                  null;

                // 선택된 고객 ID는 상태에만 저장해 놓고
                // 실제 화면은 항상 "기록"으로 이동
                if (targetCustomerId) {
                  setSelectedCustomerId(targetCustomerId);
                  console.log('[화면 전환] 선택된 customerId 저장:', targetCustomerId);
                }

                setTimeout(() => {
                  console.log('[화면 전환] HISTORY로 이동 (요약 저장 후 기본 화면)');
                  setCurrentScreen(SCREENS.HISTORY);
                }, 100);
              } catch (e) {
                console.error('[RecordScreen] 저장 중 예외:', e);
                alert('시술 기록을 저장하는 중 알 수 없는 오류가 발생했습니다.');
              }
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

export default RecordScreen;
