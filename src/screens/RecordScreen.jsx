// 음성 녹음 → 처리 → 결과 미리보기까지 담당하는 화면
import React, { useEffect } from 'react';
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
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5 w-full animate-pulse">
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
  TagPickerModal,
  CustomerTagPickerModal
}) {
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
                className="bg-white/90 backdrop-blur-sm rounded-3xl p-5 shadow-lg border border-white/50"
                style={{ boxShadow: '0 8px 32px rgba(201, 162, 122, 0.15)' }}
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1 flex items-center gap-2">
                    <h3 className="text-lg font-bold" style={{ color: '#232323' }}>
                      {selectedCustomerForRecord.name}
                    </h3>
                    <p className="text-sm" style={{ color: '#8C7A68' }}>
                      {selectedCustomerForRecord.phone || '전화번호 미등록'}
                    </p>
                  </div>
                  <div 
                    className={`w-3 h-3 rounded-full ${isCurrentlyPaused ? '' : 'animate-pulse'}`}
                    style={{ 
                      backgroundColor: isCurrentlyPaused ? '#FFA500' : '#EF4444', 
                      boxShadow: isCurrentlyPaused ? '0 0 12px rgba(255, 165, 0, 0.6)' : '0 0 12px rgba(239, 68, 68, 0.6)' 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {/* 중앙: 타이머 영역 */}
          <div className="z-10 flex flex-col items-center justify-center flex-1">
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
            src={logo} 
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

  // recordState === 'result'인 경우
  if (!resultData) {
    return (
      <div className="flex flex-col h-full items-center justify-center" style={{ backgroundColor: '#F2F0E6' }}>
        <p style={{ color: '#232323' }}>결과 데이터가 없습니다.</p>
        <button onClick={resetFlow} className="mt-4 font-medium" style={{ color: '#232323' }}>홈으로 돌아가기</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative" style={{ backgroundColor: '#F2F0E6' }}>
      {/* Header */}
      <header className="bg-white px-8 py-6 sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 shadow-sm">
        <button onClick={resetFlow} className="p-2 hover:bg-gray-100 rounded-2xl transition-colors" style={{ color: '#232323' }}>
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
          <span className="text-xs font-medium" style={{ color: '#232323', opacity: 0.7 }}>시술 기록</span>
          <h2 className="font-bold text-base mt-1" style={{ color: '#232323' }}>{getTodayDate()}</h2>
        </div>
        <button className="p-2" style={{ color: '#232323', opacity: 0.5 }}>
          <MoreHorizontal size={24} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-8 space-y-5 pb-32" style={{ backgroundColor: '#F2F0E6' }}>
        {/* 고객 정보 표시 - selectedCustomerForRecord가 있으면 카드, 없으면 입력창 */}
        {selectedCustomerForRecord ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200" style={{ padding: '12px 16px' }}>
            <div className="flex items-center gap-4 mb-1.5">
              <div className="text-4xl">{selectedCustomerForRecord.avatar}</div>
              <div className="flex-1">
                <h3 className="font-bold text-base mb-0.5" style={{ color: '#232323' }}>{selectedCustomerForRecord.name}</h3>
                <div className="flex items-center gap-2 text-xs" style={{ color: '#8C8C8C' }}>
                  <Phone size={12} style={{ color: '#C9A27A' }} />
                  <span>{selectedCustomerForRecord.phone}</span>
                </div>
              </div>
            </div>
            
            {/* 시술 태그 표시 - 히스토리 카드처럼 */}
            {(() => {
              const allTagIds = [...new Set([...(recommendedTagIds || []), ...(selectedTagIds || [])])];
              
              const validTags = allTagIds
                .map((tagId) => {
                  const tag = allVisitTags.find((t) => t.id === tagId);
                  return tag ? tag.label : null;
                })
                .filter((label) => label !== null);
              
              // serviceTags도 추가 (문자열 배열인 경우)
              const serviceTagLabels = (serviceTags || []).filter(tag => typeof tag === 'string');
              const allTagLabels = [...new Set([...validTags, ...serviceTagLabels])];
              
              if (allTagLabels.length === 0) return null;
              
              return (
                <div className="mt-1.5 mb-1.5 max-h-[70px] overflow-hidden flex flex-wrap gap-1.5">
                  {allTagLabels.map((tagLabel, idx) => {
                    // tagLabel이 객체일 경우 문자열로 변환
                    const displayLabel = typeof tagLabel === 'string' ? tagLabel : (typeof tagLabel === 'object' && tagLabel !== null ? (tagLabel.label || JSON.stringify(tagLabel)) : String(tagLabel || ''));
                    return (
                      <span 
                        key={idx}
                        className="text-[11px] px-2 py-1 rounded-md"
                        style={{ 
                          backgroundColor: '#F2F0E6',
                          color: '#8C6D46'
                        }}
                      >
                        {displayLabel}
                      </span>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200" style={{ padding: '12px 16px' }}>
            <label className="block text-sm font-medium mb-3" style={{ color: '#232323' }}>신규 고객 정보</label>
            
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
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
          <div className="px-8 py-6 relative overflow-hidden" style={{ backgroundColor: '#C9A27A' }}>
            <div className="relative z-10">
              <span className="inline-flex items-center px-3 py-1.5 rounded-2xl text-xs font-medium text-white mb-3 shadow-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}>
                {currentSector.icon}
                <span className="ml-2">{userProfile.roleTitle}</span>
              </span>
              <h3 className="font-bold text-white text-lg mb-2">📝 오늘의 시술 요약</h3>
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
            {resultData.sections.map((section, idx) => {
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
                      // item을 안전하게 문자열로 변환
                      let safeItem = '';
                      
                      if (typeof item === 'string') {
                        safeItem = item;
                      } else if (typeof item === 'object' && item !== null) {
                        // 객체인 경우 키-값 형태로 읽기 쉽게 변환
                        try {
                          if (Array.isArray(item)) {
                            safeItem = item.map(i => typeof i === 'object' ? JSON.stringify(i) : String(i)).join(', ');
                          } else {
                            // 객체를 키: 값 형태로 변환
                            safeItem = Object.entries(item)
                              .map(([key, value]) => {
                                const valStr = typeof value === 'object' && value !== null 
                                  ? JSON.stringify(value) 
                                  : String(value || '');
                                return `${key}: ${valStr}`;
                              })
                              .join(', ');
                          }
                        } catch (e) {
                          safeItem = String(item);
                        }
                      } else {
                        safeItem = String(item || '');
                      }
                      
                      return (
                        <li key={i} className="text-base leading-relaxed pl-4 font-light" style={{ color: '#232323', borderLeft: '2px solid #E5E7EB' }}>
                          {safeItem}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* 개발용 요약 테스트 박스 */}
        {DEV_MODE && (
          <section className="bg-white rounded-2xl border-2 border-dashed border-gray-300 shadow-sm p-5">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold px-2 py-1 rounded bg-yellow-100 text-yellow-800">DEV</span>
                <span className="text-base font-bold" style={{ color: '#232323' }}>개발용 요약 테스트</span>
              </div>
              <p className="text-sm" style={{ color: '#232323', opacity: 0.7 }}>
                음성 대신 텍스트를 입력해서 요약·태그 흐름을 테스트할 수 있어요.
              </p>
            </div>

            <textarea
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#C9A27A] focus:ring-1 focus:ring-[#C9A27A] mb-3 resize-none"
              placeholder="여기에 고객에게 말할 내용을 두서없이 적어보고, 아래 버튼을 눌러 테스트하세요."
              value={testSummaryInput}
              onChange={(e) => setTestSummaryInput(e.target.value)}
              rows={4}
              style={{ color: '#232323', backgroundColor: '#FFFFFF' }}
            />

            <button
              type="button"
              className="w-full py-3 rounded-xl font-medium text-white shadow-sm hover:shadow-md hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleTestSummarize}
              disabled={isTestingSummary || !testSummaryInput.trim()}
              style={{ backgroundColor: '#C9A27A' }}
            >
              {isTestingSummary ? "요약 테스트 중..." : "이 텍스트로 요약 테스트"}
            </button>
          </section>
        )}

        {/* Section 1: 이번 방문 태그 */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
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
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
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
        <details className="group bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
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

      {/* Fixed Action Bar - 3개 버튼 나란히 배치 (화면 하단 고정) */}
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
            className="flex items-center justify-center gap-2 py-4 rounded-2xl font-medium bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
            style={{ color: '#232323', width: '30%' }}
          >
            <Edit size={18} style={{ color: '#C9A27A' }} />
            <span>편집</span>
          </button>
          
          {/* 테스트 버튼 */}
          <button
            onClick={() => {
              const TEST_SCENARIOS = [
                {
                  summary: "속눈썹 D컬 11mm로 연장 리터치 진행함. 글루 알러지 있어서 예민하심.",
                  sections: [
                    {
                      title: '고객 기본 정보',
                      content: ['이름: 테스트 고객 / 전화번호: 010-0000-0000', '신규/기존 구분: 기존 고객']
                    },
                    {
                      title: '시술 내용',
                      content: ['속눈썹 D컬 11mm로 연장 리터치 진행함. 글루 알러지 있어서 예민하심.']
                    },
                    {
                      title: '주의사항',
                      content: ['글루 알러지 있으므로 저자극 제품 사용']
                    }
                  ]
                },
                {
                  summary: "기존 젤네일 제거하고 이달의아트로 변경. 현금영수증 해드렸음.",
                  sections: [
                    {
                      title: '고객 기본 정보',
                      content: ['이름: 테스트 고객 / 전화번호: 010-0000-0000', '신규/기존 구분: 기존 고객']
                    },
                    {
                      title: '시술 내용',
                      content: ['기존 젤네일 제거하고 이달의아트로 변경. 현금영수증 해드렸음.']
                    },
                    {
                      title: '결제 금액',
                      content: ['현금영수증 발급 완료']
                    }
                  ]
                },
                {
                  summary: "오늘은 케어만 받고 가심. 손톱이 많이 상해서 영양제 듬뿍 발라드림.",
                  sections: [
                    {
                      title: '고객 기본 정보',
                      content: ['이름: 테스트 고객 / 전화번호: 010-0000-0000', '신규/기존 구분: 기존 고객']
                    },
                    {
                      title: '시술 내용',
                      content: ['오늘은 케어만 받고 가심. 손톱이 많이 상해서 영양제 듬뿍 발라드림.']
                    },
                    {
                      title: '시술 후 상태',
                      content: ['손톱 상태 개선을 위해 영양 케어 강화']
                    }
                  ]
                },
                {
                  summary: "눈물이 많으셔서 시술 중간에 자주 쉬었음. 다음엔 C컬 말고 J컬로 하고 싶다고 하심.",
                  sections: [
                    {
                      title: '고객 기본 정보',
                      content: ['이름: 테스트 고객 / 전화번호: 010-0000-0000', '신규/기존 구분: 기존 고객']
                    },
                    {
                      title: '시술 내용',
                      content: ['눈물이 많으셔서 시술 중간에 자주 쉬었음. 다음엔 C컬 말고 J컬로 하고 싶다고 하심.']
                    },
                    {
                      title: '주의사항',
                      content: ['눈물이 많으므로 시술 시 주의 필요']
                    }
                  ]
                },
                {
                  summary: "이번 고객님은 임산부셔서 조심스럽게 시술했습니다. 기존 젤네일 제거하고, 이달의아트로 변경하셨어요. 결제는 현금영수증 해드렸습니다.",
                  sections: [
                    {
                      title: '고객 기본 정보',
                      content: ['이름: 테스트 고객 / 전화번호: 010-0000-0000', '신규/기존 구분: 기존 고객']
                    },
                    {
                      title: '시술 내용',
                      content: ['이번 고객님은 임산부셔서 조심스럽게 시술했습니다. 기존 젤네일 제거하고, 이달의아트로 변경하셨어요. 결제는 현금영수증 해드렸습니다.']
                    },
                    {
                      title: '주의사항',
                      content: ['임산부 고객이므로 조심스럽게 시술 진행']
                    }
                  ]
                }
              ];
              
              const randomIndex = Math.floor(Math.random() * TEST_SCENARIOS.length);
              const selectedScenario = TEST_SCENARIOS[randomIndex];
              
              const testResultData = {
                title: selectedScenario.summary,
                sections: selectedScenario.sections
              };
              
              setResultData(testResultData);
            }}
            className="flex items-center justify-center gap-2 py-4 rounded-2xl font-medium bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
            style={{ color: '#232323', width: '30%' }}
          >
            <span>🧪</span>
            <span>테스트</span>
          </button>
          
          {/* 저장하기 버튼 */}
          <button 
            onClick={() => {
              // 저장 전 검증
              if (selectedCustomerForRecord) {
                // 기존 고객 선택 시 - 기록 저장
                const customerId = selectedCustomerForRecord.id;
                const { dateStr, timeStr, recordedAt } = createDateTimeStrings();
                
                const parsedServiceDate = extractServiceDateFromSummary(resultData);
                const serviceDate = parsedServiceDate || dateStr;
                
                const cleanedTitle = cleanTitle(resultData.title, selectedCustomerForRecord?.name);
                
                const newVisit = createVisitRecord({
                  dateStr,
                  timeStr,
                  recordedAt,
                  serviceDate,
                  title: cleanedTitle,
                  summary: resultData.sections[0]?.content[0] || cleanedTitle,
                  rawTranscript: rawTranscript || transcript,
                  sections: resultData.sections,
                  selectedTagIds,
                  allVisitTags,
                  serviceTags
                });
                
                setVisits(prev => ({
                  ...prev,
                  [customerId]: [newVisit, ...(prev[customerId] || [])]
                }));
                
                const currentVisitCount = selectedCustomerForRecord.visitCount || 0;
                const nextVisitCount = currentVisitCount + 1;
                
                const updatedCustomerTags = updateCustomerTags({
                  existingCustomerTags: selectedCustomerForRecord.customerTags || {
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
                  if (c.id === customerId) {
                    return { 
                      ...c, 
                      visitCount: c.visitCount + 1, 
                      lastVisit: dateStr,
                      customerTags: updatedCustomerTags
                    };
                  }
                  return c;
                }));
                
                setSelectedCustomerId(customerId);
                setCurrentScreen(SCREENS.CUSTOMER_DETAIL);
              } else {
                // 신규 고객인 경우 이름 필수 검증
                if (!tempName || !tempName.trim()) {
                  alert('고객님의 이름을 입력해주세요!');
                  if (nameInputRef.current) {
                    nameInputRef.current.focus();
                    nameInputRef.current.style.borderColor = '#EF4444';
                    nameInputRef.current.style.borderWidth = '2px';
                    setTimeout(() => {
                      if (nameInputRef.current) {
                        nameInputRef.current.style.borderColor = '';
                        nameInputRef.current.style.borderWidth = '';
                      }
                    }, 2000);
                  }
                  return;
                }
                
                // 신규 고객인 경우 전화번호 필수 검증
                if (!tempPhone || !tempPhone.trim()) {
                  alert('고객님의 전화번호를 입력해주세요!');
                  if (phoneInputRef.current) {
                    phoneInputRef.current.focus();
                    phoneInputRef.current.style.borderColor = '#EF4444';
                    phoneInputRef.current.style.borderWidth = '2px';
                    setTimeout(() => {
                      if (phoneInputRef.current) {
                        phoneInputRef.current.style.borderColor = '';
                        phoneInputRef.current.style.borderWidth = '';
                      }
                    }, 2000);
                  }
                  return;
                }
                
                // 신규 고객 생성 및 기록 저장
                const { dateStr, timeStr, recordedAt } = createDateTimeStrings();
                
                const parsedServiceDate = extractServiceDateFromSummary(resultData);
                const serviceDate = parsedServiceDate || dateStr;
                
                // 신규 고객 태그 생성 (방문 횟수 1이므로 신규)
                const newCustomerTags = updateCustomerTags({
                  existingCustomerTags: {
                    caution: [],
                    trait: [],
                    payment: [],
                    pattern: []
                  },
                  selectedCustomerTagIds,
                  allCustomerTags,
                  visitCount: 1,
                  resultTitle: resultData.title,
                  resultSections: resultData.sections
                });
                
                const newCustomer = createNewCustomer({
                  name: tempName,
                  phone: tempPhone,
                  dateStr,
                  customers,
                  customerTags: newCustomerTags
                });
                
                const cleanedTitle = cleanTitle(resultData.title, tempName);
                
                const newVisit = createVisitRecord({
                  dateStr,
                  timeStr,
                  recordedAt,
                  serviceDate,
                  title: cleanedTitle,
                  summary: resultData.sections[0]?.content[0] || cleanedTitle,
                  rawTranscript: rawTranscript || transcript,
                  sections: resultData.sections,
                  selectedTagIds,
                  allVisitTags,
                  serviceTags
                });
                
                setCustomers(prev => [...prev, newCustomer]);
                setVisits(prev => ({
                  ...prev,
                  [newCustomer.id]: [newVisit]
                }));
                
                setSelectedCustomerId(newCustomer.id);
                setCurrentScreen(SCREENS.CUSTOMER_DETAIL);
              }
              
              // 저장 후 상태 초기화
              setResultData(null);
              setTranscript('');
              setRawTranscript('');
              setRecordingDate(null);
              setSelectedCustomerForRecord(null);
              setTempName('');
              setTempPhone('');
              setServiceTags([]);
              setNewServiceTag('');
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

