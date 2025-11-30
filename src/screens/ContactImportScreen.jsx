import React, { useState } from 'react';
import { ArrowLeft, FileUp, Users, Upload } from 'lucide-react';
import { SCREENS } from '../constants/screens';

function ContactImportScreen({
  setCurrentScreen,
  customers,
  setCustomers,
  currentTheme
}) {
  const bgColor = currentTheme?.pastel || '#F2F0E6';
  const textColor = currentTheme?.text || '#232323';
  const accentColor = currentTheme?.color || '#C9A27A';

  const [previewCustomers, setPreviewCustomers] = useState([]);
  const [isUploaded, setIsUploaded] = useState(false);

  // 샘플 데이터 생성 함수
  const generateSampleData = () => {
    const sampleData = [
      {
        id: Date.now() + 1,
        name: '최지영',
        phone: '010-1111-2222',
        visitCount: 0,
        lastVisit: null,
        avatar: '👩',
        customerTags: {
          caution: [],
          trait: [],
          payment: [],
          pattern: []
        },
        history: []
      },
      {
        id: Date.now() + 2,
        name: '박민수',
        phone: '010-3333-4444',
        visitCount: 0,
        lastVisit: null,
        avatar: '👨',
        customerTags: {
          caution: [],
          trait: [],
          payment: [],
          pattern: []
        },
        history: []
      },
      {
        id: Date.now() + 3,
        name: '이하나',
        phone: '010-5555-6666',
        visitCount: 0,
        lastVisit: null,
        avatar: '👱‍♀️',
        customerTags: {
          caution: [],
          trait: [],
          payment: [],
          pattern: []
        },
        history: []
      },
      {
        id: Date.now() + 4,
        name: '정우성',
        phone: '010-7777-8888',
        visitCount: 0,
        lastVisit: null,
        avatar: '👨‍💼',
        customerTags: {
          caution: [],
          trait: [],
          payment: [],
          pattern: []
        },
        history: []
      },
      {
        id: Date.now() + 5,
        name: '김예진',
        phone: '010-9999-0000',
        visitCount: 0,
        lastVisit: null,
        avatar: '👩‍🦰',
        customerTags: {
          caution: [],
          trait: [],
          payment: [],
          pattern: []
        },
        history: []
      }
    ];
    
    setPreviewCustomers(sampleData);
    setIsUploaded(true);
  };

  // 저장 함수
  const handleSave = () => {
    if (previewCustomers.length === 0) {
      alert('저장할 고객 데이터가 없습니다.');
      return;
    }

    if (setCustomers) {
      // 기존 고객과 중복 체크 (전화번호 기준)
      setCustomers(prev => {
        const existingPhones = new Set(prev.map(c => c.phone));
        const newCustomers = previewCustomers.filter(c => !existingPhones.has(c.phone));
        
        if (newCustomers.length === 0) {
          alert('이미 등록된 고객입니다.');
          return prev;
        }

        if (newCustomers.length < previewCustomers.length) {
          const duplicateCount = previewCustomers.length - newCustomers.length;
          alert(`${duplicateCount}명은 이미 등록되어 있어 제외되었습니다.\n${newCustomers.length}명이 추가되었습니다.`);
        } else {
          alert(`${newCustomers.length}명의 고객이 추가되었습니다.`);
        }

        return [...prev, ...newCustomers];
      });

      // 저장 후 초기화
      setPreviewCustomers([]);
      setIsUploaded(false);
      
      // 프로필 화면으로 돌아가기
      setTimeout(() => {
        setCurrentScreen(SCREENS.PROFILE);
      }, 500);
    }
  };

  // 전화번호 포맷팅 함수
  const formatPhone = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    }
    return phone;
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: bgColor }}>
      {/* 헤더 */}
      <header className="bg-white px-8 py-6 sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 shadow-sm h-[100px]">
        <button 
          onClick={() => setCurrentScreen(SCREENS.PROFILE)} 
          className="p-2 hover:bg-gray-100 rounded-2xl transition-colors" 
          style={{ color: textColor }}
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="font-bold text-base" style={{ color: textColor }}>연락처 가져오기</h2>
        <div className="w-10"></div>
      </header>

      {/* 메인 영역 */}
      <main className="flex-1 overflow-y-auto p-8 space-y-6 pb-32">
        {/* 파일 업로드 영역 */}
        {!isUploaded && (
          <div className="space-y-4">
            <div
              className="bg-white rounded-2xl border-2 border-dashed p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
              style={{ 
                borderColor: accentColor,
                minHeight: '300px'
              }}
              onClick={() => {
                // 실제 파일 업로드 기능은 추후 구현
                alert('파일 업로드 기능은 준비 중입니다. 샘플 데이터 버튼을 사용해주세요.');
              }}
            >
              <FileUp size={48} style={{ color: accentColor, marginBottom: '16px' }} />
              <p className="text-lg font-medium mb-2" style={{ color: textColor }}>
                엑셀/CSV 파일 올리기
              </p>
              <p className="text-sm text-center" style={{ color: textColor, opacity: 0.6 }}>
                클릭하여 파일을 선택하세요
              </p>
            </div>

            {/* 안내 문구 */}
            <p className="text-xs text-center" style={{ color: textColor, opacity: 0.7 }}>
              핸드폰이나 엑셀에 있는 고객 리스트를 한 번에 등록하세요.
            </p>

            {/* 샘플 데이터 버튼 */}
            <button
              onClick={generateSampleData}
              className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 px-6 py-4 flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors"
              style={{ color: accentColor }}
            >
              <Users size={20} />
              <span className="text-sm font-medium">테스트용 샘플 데이터 채우기</span>
            </button>
          </div>
        )}

        {/* 미리보기 리스트 */}
        {isUploaded && previewCustomers.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold" style={{ color: textColor }}>
                미리보기 ({previewCustomers.length}명)
              </h3>
              <button
                onClick={() => {
                  setPreviewCustomers([]);
                  setIsUploaded(false);
                }}
                className="text-sm px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                style={{ color: textColor, opacity: 0.7 }}
              >
                초기화
              </button>
            </div>

            <div className="space-y-3">
              {previewCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C9A27A] to-[#B8946A] flex items-center justify-center text-xl shadow-sm flex-shrink-0">
                    {customer.avatar || '👤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-base mb-1" style={{ color: textColor }}>
                      {customer.name}
                    </h4>
                    <p className="text-sm font-medium" style={{ color: textColor, opacity: 0.7 }}>
                      {formatPhone(customer.phone)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* 저장 버튼 */}
            <div className="sticky bottom-0 pt-4 pb-2 bg-transparent">
              <button
                onClick={handleSave}
                className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 shadow-lg transition-all hover:opacity-90"
                style={{ 
                  backgroundColor: accentColor,
                  color: '#FFFFFF'
                }}
              >
                <Upload size={20} />
                <span className="text-base font-bold">총 {previewCustomers.length}명 저장하기</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default ContactImportScreen;

