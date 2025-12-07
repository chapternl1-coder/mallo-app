import React, { useState, useRef } from 'react';
import { ArrowLeft, FileUp, Users, Upload } from 'lucide-react';
import Papa from 'papaparse';
import { SCREENS } from '../constants/screens';

function ContactImportScreen({
  setCurrentScreen,
  customers,
  setCustomers,
  bulkImportCustomers,
  currentTheme
}) {
  const bgColor = currentTheme?.pastel || '#F2F0E6';
  const textColor = currentTheme?.text || '#232323';
  const accentColor = currentTheme?.color || '#C9A27A';

  const [previewCustomers, setPreviewCustomers] = useState([]);
  const [isUploaded, setIsUploaded] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // CSV 파일 파싱 함수
  const handleFileChange = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    setError('');
    setPreviewCustomers([]);
    setIsUploaded(false);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        const raw = results.data || [];

        // name/phone 컬럼 추려서 단순화
        const mapped = raw.map((row, index) => {
          const name = row.name || row.이름 || row.Name || row['고객명'] || '';
          const phone = row.phone || row.전화번호 || row.Phone || row['전화번호'] || '';

          return {
            name: String(name).trim(),
            phone: String(phone).trim(),
            rowIndex: index + 2 // 엑셀 행 번호 (헤더 + 1)
          };
        });

        const filtered = mapped.filter((r) => r.name && r.phone);

        if (filtered.length === 0) {
          setError('이름/전화번호가 있는 행을 찾을 수 없어요. CSV 컬럼 이름을 확인해주세요.\n\n예: 이름,전화번호 또는 name,phone');
          return;
        }

        // 미리보기용 데이터 변환
        const previewData = filtered.map((row, idx) => ({
          id: `preview_${Date.now()}_${idx}`,
          name: row.name,
          phone: row.phone,
          visitCount: 0,
          lastVisit: null,
          avatar: '👤',
          customerTags: {
            feature: [],
            caution: [],
            trait: [],
            payment: [],
            pattern: []
          },
          history: []
        }));

        setPreviewCustomers(previewData);
        setIsUploaded(true);
      },
      error: (err) => {
        console.error('CSV 파싱 오류:', err);
        setError('CSV 파일을 읽는 중 문제가 발생했어요. 파일 형식을 확인해주세요.');
      }
    });
  };

  // 파일 선택 트리거
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

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

    // bulkImportCustomers 사용 또는 기본 setCustomers 사용
    if (bulkImportCustomers) {
      const rows = previewCustomers.map(c => ({
        name: c.name,
        phone: c.phone
      }));

      // 중복 체크를 위해 기존 고객 전화번호 Set 생성
      const existingPhones = new Set(
        customers.map(c => c.phone?.replace(/[-\s]/g, '')).filter(Boolean)
      );
      
      const newRows = rows.filter(row => {
        const normalizedPhone = row.phone.replace(/[-\s]/g, '');
        return normalizedPhone && !existingPhones.has(normalizedPhone);
      });

      if (newRows.length === 0) {
        alert('이미 등록된 고객입니다.');
        return;
      }

      bulkImportCustomers(newRows);

      const duplicateCount = rows.length - newRows.length;
      
      if (duplicateCount > 0) {
        alert(`${duplicateCount}명은 이미 등록되어 있어 제외되었습니다.\n${newRows.length}명이 추가되었습니다.`);
      } else {
        alert(`${newRows.length}명의 고객이 추가되었습니다.`);
      }

      // 프로필 화면으로 돌아가기
      setPreviewCustomers([]);
      setIsUploaded(false);
      setTimeout(() => {
        setCurrentScreen(SCREENS.PROFILE);
      }, 500);
    } else if (setCustomers) {
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
      <header className="bg-white px-8 py-6 sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 shadow-sm h-[80px]">
        <button 
          onClick={() => setCurrentScreen(SCREENS.PROFILE)} 
          className="p-2 hover:bg-gray-100 rounded-2xl transition-colors" 
          style={{ color: textColor }}
        >
          <span className="text-[32px]">&#x2039;</span>
        </button>
        <h2 className="font-bold text-base" style={{ color: textColor }}>연락처 가져오기</h2>
        <div className="w-10"></div>
      </header>

      {/* 메인 영역 */}
      <main className="flex-1 overflow-y-auto p-8 space-y-6 pb-32">
        {/* 파일 업로드 영역 */}
        {!isUploaded && (
          <div className="space-y-4">
            {/* CSV 파일 안내 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
              <div className="text-xs mb-2" style={{ color: textColor, opacity: 0.8 }}>
                <p className="font-semibold mb-1">CSV 형식 안내</p>
                <p>- 엑셀에서 "다른 이름으로 저장" &gt; CSV 형식으로 저장해주세요.</p>
                <p>- 최소한 <span className="font-semibold">이름, 전화번호</span> 컬럼이 있어야 해요.</p>
                <p className="mt-1 text-xs" style={{ opacity: 0.7 }}>
                  예) <span className="font-mono">이름,전화번호</span> 또는 <span className="font-mono">name,phone</span>
                </p>
              </div>
            </div>

            {/* 파일 입력 (숨김) */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              className="bg-white rounded-2xl border-2 border-dashed p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
              style={{ 
                borderColor: accentColor,
                minHeight: '300px'
              }}
              onClick={handleFileSelect}
            >
              <FileUp size={48} style={{ color: accentColor, marginBottom: '16px' }} />
              <p className="text-lg font-medium mb-2" style={{ color: textColor }}>
                엑셀/CSV 파일 올리기
              </p>
              <p className="text-sm text-center" style={{ color: textColor, opacity: 0.6 }}>
                클릭하여 파일을 선택하세요
              </p>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-xs text-red-600 whitespace-pre-line">{error}</p>
              </div>
            )}

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

