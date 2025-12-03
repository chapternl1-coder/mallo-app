import { useState, useEffect, useRef } from 'react';
import { SCREENS } from '../constants/screens';
import { BEAUTY_THEME } from '../theme/beautyTheme';
import { MOCK_CUSTOMERS } from '../mock/customers';
import { MOCK_VISITS } from '../mock/visits';
import { migrateTagsToObjects, extractTagsFromContent, matchTagsFromSummary, convertVisitTagsToArray, convertCustomerTagsToArray } from '../utils/tagUtils';
import { extractServiceDateFromSummary, extractServiceDateTimeLabel } from '../utils/serviceUtils';
import { loadFromLocalStorage, saveToLocalStorage } from '../utils/storage';
import { formatPhoneNumber } from '../utils/formatters';
import { formatRecordDateTime } from '../utils/date';
import { normalizePhone } from '../utils/customerListUtils';
import { SYSTEM_PROMPT } from '../constants/systemPrompt';
import TagPickerModal from '../components/TagPickerModal';
import CustomerTagPickerModal from '../components/CustomerTagPickerModal';

// 녹음 시간 제한 상수
const MAX_RECORD_SECONDS = 120; // 2분

// Mallo localStorage 전체 초기화 헬퍼 함수
function clearMalloStorage() {
  try {
    // mallo_로 시작하는 모든 키 삭제
    Object.keys(localStorage)
      .filter((key) => key.startsWith('mallo_'))
      .forEach((key) => localStorage.removeItem(key));
    
    // 태그 관련 키도 삭제
    localStorage.removeItem('visitTags');
    localStorage.removeItem('customerTags');
    
    console.log('[데이터 초기화] localStorage의 모든 Mallo 관련 데이터가 삭제되었습니다.');
  } catch (e) {
    console.error('Failed to clear Mallo localStorage', e);
  }
}

export default function useMalloAppState() {
  const [currentScreen, setCurrentScreenState] = useState(SCREENS.LOGIN);
  const [previousScreen, setPreviousScreen] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // setCurrentScreen을 래핑하여 이전 화면 추적
  const setCurrentScreen = (screen) => {
    setPreviousScreen(currentScreen);
    setCurrentScreenState(screen);
  };
  const [activeTab, setActiveTab] = useState('Home');
  const [userProfile, setUserProfile] = useState({ 
    sectorId: 'beauty', 
    roleTitle: '뷰티샵 원장',
    name: '김말로 원장님',
    shopName: '말로 뷰티 스튜디오',
    email: 'mallo@beauty.com',
    phone: '010-1234-5678'
  });
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [rawTranscript, setRawTranscript] = useState('');
  const [resultData, setResultData] = useState(null);
  const [showPromptInfo, setShowPromptInfo] = useState(false);
  const [todayRecords, setTodayRecords] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [expandedVisitId, setExpandedVisitId] = useState(null);
  const [editingVisit, setEditingVisit] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editCustomerTags, setEditCustomerTags] = useState([]);
  const [editCustomerTagIds, setEditCustomerTagIds] = useState([]);
  const [isEditCustomerTagPickerOpen, setIsEditCustomerTagPickerOpen] = useState(false);
  const [editCustomerMemo, setEditCustomerMemo] = useState('');
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileShopName, setEditProfileShopName] = useState('');
  const [editProfileEmail, setEditProfileEmail] = useState('');
  const [editProfilePhone, setEditProfilePhone] = useState('');
  const [editingVisitTagIds, setEditingVisitTagIds] = useState([]);
  const [isEditingVisitTagPickerOpen, setIsEditingVisitTagPickerOpen] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [serviceTags, setServiceTags] = useState([]);
  const [newServiceTag, setNewServiceTag] = useState('');
  const [isAutoTaggingEnabled, setIsAutoTaggingEnabled] = useState(true);

  const loadInitialVisitTags = () => {
    try {
      const saved = localStorage.getItem('visitTags');
      if (saved) {
        const parsed = JSON.parse(saved);
        const migrated = migrateTagsToObjects(parsed);
        console.log('[초기값] visitTags 불러옴:', migrated);
        return migrated;
      }
    } catch (error) {
      console.error('[초기값] visitTags 로드 실패:', error);
    }
    return migrateTagsToObjects({
      procedure: ['속눈썹연장', '젤네일', '페디큐어'],
      design: ['D컬', 'C컬', '이달의아트', '그라데이션'],
      care: ['영양', '랩핑', '제거'],
      payment: ['회원권', '현금결제', '카드결제']
    });
  };

  const loadInitialCustomerTags = () => {
    try {
      const saved = localStorage.getItem('customerTags');
      if (saved) {
        const parsed = JSON.parse(saved);
        const migrated = migrateTagsToObjects(parsed);
        console.log('[초기값] customerTags 불러옴:', migrated);
        console.log('[초기값] customerTags - caution 태그 개수:', migrated.caution?.length || 0);
        return migrated;
      }
    } catch (error) {
      console.error('[초기값] customerTags 로드 실패:', error);
    }
    return migrateTagsToObjects({
      trait: ['수다쟁이', '조용함', '친절함'],
      pattern: ['단골', '신규', '비정기'],
      caution: ['글루알러지', '임산부', '눈물많음']
    });
  };
  
  const [visitTags, setVisitTags] = useState(loadInitialVisitTags);
  const [allVisitTags, setAllVisitTags] = useState([]);
  const [recommendedTagIds, setRecommendedTagIds] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [isTagPickerOpen, setIsTagPickerOpen] = useState(false);
  
  const DEV_MODE = true; // 개발용 요약 테스트 박스 표시 여부
  const [testSummaryInput, setTestSummaryInput] = useState('');
  const [isTestingSummary, setIsTestingSummary] = useState(false);
  
  const [allCustomerTags, setAllCustomerTags] = useState([]);
  const [recommendedCustomerTagIds, setRecommendedCustomerTagIds] = useState([]);
  const [selectedCustomerTagIds, setSelectedCustomerTagIds] = useState([]);
  const [newCustomerTagIds, setNewCustomerTagIds] = useState([]);
  const [isCustomerTagPickerOpen, setIsCustomerTagPickerOpen] = useState(false);
  
  const [customerTags, setCustomerTags] = useState(loadInitialCustomerTags);
  
  const [newManagedTag, setNewManagedTag] = useState('');
  const [newManagedTagKeywords, setNewManagedTagKeywords] = useState('');
  const [tagSettingsMainTab, setTagSettingsMainTab] = useState('visit');
  const [tagSettingsSubTab, setTagSettingsSubTab] = useState('procedure');
  const [isTagEditing, setIsTagEditing] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recordingDate, setRecordingDate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleVisitCount, setVisibleVisitCount] = useState(10);

  const [selectedCustomerForRecord, setSelectedCustomerForRecord] = useState(null);
  const [tempName, setTempName] = useState('');
  const [tempPhone, setTempPhone] = useState('');
  const nameInputRef = useRef(null);
  const phoneInputRef = useRef(null);
  const [pendingReservationCustomerId, setPendingReservationCustomerId] = useState(null);
  
  const [customers, setCustomers] = useState(() => {
    const loadedCustomers = loadFromLocalStorage('mallo_customers', []);
    if (!loadedCustomers || loadedCustomers.length === 0) {
      return [];
    }
    return loadedCustomers.map(customer => ({
      ...customer,
      tags: (customer.tags || []).filter(tag => tag !== '#신규'),
      customerTags: customer.customerTags || {
        caution: [],
        trait: [],
        payment: [],
        pattern: []
      }
    }));
  });
  const [visits, setVisits] = useState(() => {
    const loadedVisits = loadFromLocalStorage('mallo_visits', {});
    if (!loadedVisits || Object.keys(loadedVisits).length === 0) {
      return {};
    }
    const normalizedVisits = {};
    Object.keys(loadedVisits).forEach(customerId => {
      normalizedVisits[customerId] = (loadedVisits[customerId] || []).map(visit => ({
        ...visit,
        tags: visit.tags || []
      }));
    });
    return normalizedVisits;
  });

  // 예약 관리 상태 (localStorage 연동)
  const [reservations, setReservations] = useState(() => {
    const loadedReservations = loadFromLocalStorage('mallo_reservations', []);
    return loadedReservations || [];
  });
  
  const [tempResultData, setTempResultData] = useState(null);
  
  useEffect(() => {
    saveToLocalStorage('mallo_customers', customers);
  }, [customers]);
  
  useEffect(() => {
    saveToLocalStorage('mallo_visits', visits);
  }, [visits]);

  useEffect(() => {
    saveToLocalStorage('mallo_reservations', reservations);
  }, [reservations]);

  // 기존 예약 데이터에 isNew 플래그 마이그레이션
  useEffect(() => {
    const needsMigration = reservations.some(r => r.isNew === undefined);
    if (needsMigration) {
      console.log('[예약 마이그레이션] isNew 플래그 추가 시작');
      setReservations(prev => prev.map(reservation => {
        if (reservation.isNew !== undefined) {
          return reservation; // 이미 isNew가 있으면 그대로
        }
        
        // isNew 플래그가 없는 기존 예약은 신규로 처리 (기존 동작 유지)
        let isNewReservation = true;
        
        // 1. customerId로 기존 고객 찾기
        if (reservation.customerId) {
          const existingCustomer = customers.find(c => 
            c.id === reservation.customerId || String(c.id) === String(reservation.customerId)
          );
          if (existingCustomer) {
            isNewReservation = false;
          }
        }
        
        // 2. 전화번호로 기존 고객 찾기
        if (isNewReservation && reservation.phone) {
          const normalizedPhone = reservation.phone.replace(/\D/g, '');
          const existingCustomer = customers.find(c => 
            c.phone && c.phone.replace(/\D/g, '') === normalizedPhone
          );
          if (existingCustomer) {
            isNewReservation = false;
          }
        }
        
        return {
          ...reservation,
          isNew: isNewReservation
        };
      }));
    }
  }, [reservations, customers]);

  // 데모용 예약 데이터
  const DEMO_RESERVATIONS = [
    {
      id: 'r_demo_1',
      date: '2025-12-01',
      time: '10:30',
      name: '김민지',
      phoneLast4: '5678',
      isCompleted: false,
    },
    {
      id: 'r_demo_2',
      date: '2025-12-01',
      time: '14:00',
      name: '이상윤',
      phoneLast4: '5432',
      isCompleted: false,
    },
    {
      id: 'r_demo_3',
      date: '2025-12-02',
      time: '11:00',
      name: '오영진',
      phoneLast4: '7890',
      isCompleted: false,
    },
  ];

  // 데모 데이터 채우기 함수
  const fillDemoData = () => {
    setCustomers(MOCK_CUSTOMERS || []);
    setVisits(MOCK_VISITS || []);
    setReservations(DEMO_RESERVATIONS || []);
  };

  // 데이터 초기화 함수
  const resetAllData = () => {
    console.log('[데이터 초기화] 시작...');
    
    // localStorage에서 Mallo 관련 키 전부 제거 (먼저 실행)
    clearMalloStorage();

    // 메모리 state 초기화
    setCustomers([]);
    setVisits({});
    setReservations([]);

    // 태그 관련 state도 초기화 (기본값으로)
    if (typeof setVisitTags === 'function') {
      setVisitTags(migrateTagsToObjects({
        procedure: [],
        design: [],
        care: [],
        payment: []
      }));
    }
    
    if (typeof setCustomerTags === 'function') {
      setCustomerTags(migrateTagsToObjects({
        caution: [],
        trait: [],
        payment: [],
        pattern: []
      }));
    }
    
    console.log('[데이터 초기화] 완료 - 모든 데이터가 초기화되었습니다.');
    
    // useEffect가 빈 배열/객체를 localStorage에 저장하도록 함
    // 이렇게 하면 새로고침 후에도 빈 상태가 유지됨
  };

  // CSV 일괄 고객 추가 함수
  const bulkImportCustomers = (rows) => {
    // rows: [{ name, phone }, ...] 형태
    setCustomers((prev) => {
      const existing = [...prev];
      const existingPhones = new Set(
        existing
          .map((c) => c.phone)
          .filter(Boolean)
          .map((p) => normalizePhone(p))
      );

      const newCustomers = [];
      const duplicateCount = { value: 0 };

      rows.forEach((row) => {
        const rawName = row.name || row.이름 || row.Name || '';
        const rawPhone = row.phone || row.전화번호 || row.Phone || '';

        const name = String(rawName).trim();
        const phone = String(rawPhone).trim();

        if (!name || !phone) return;

        const normalized = normalizePhone(phone);
        if (!normalized || existingPhones.has(normalized)) {
          duplicateCount.value++;
          return;
        }

        existingPhones.add(normalized);

        // 전화번호 포맷팅 (010-XXXX-XXXX 형식)
        const formattedPhone = formatPhoneNumber(normalized);

        newCustomers.push({
          id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name,
          phone: formattedPhone,
          visitCount: 0,
          lastVisit: null,
          avatar: '👤',
          customerTags: {
            caution: [],
            trait: [],
            payment: [],
            pattern: []
          },
          history: []
        });
      });

      if (newCustomers.length === 0) return prev;

      return [...prev, ...newCustomers];
    });
  };

  const normalizeRecordWithCustomer = (visit, customer) => {
    if (!visit) return null;
    
    // displayName 계산 (우선순위: visit.customerName > customer.name > '이름 오류')
    let displayName = visit.customerName?.trim() || customer?.name?.trim();
    if (!displayName) {
      console.warn('[normalizeRecordWithCustomer] 이름이 비어 있는 방문 기록입니다.', visit);
      displayName = '이름 오류';
    }
    
    // displayPhone 계산
    let displayPhone = visit.customerPhone?.trim() || customer?.phone?.trim();
    if (!displayPhone) {
      displayPhone = '전화번호 미기재';
    }
    
    return {
      ...visit,
      customerName: displayName,
      customerPhone: displayPhone,
      detail: visit.detail || {
        sections: visit.summary ? [
          { title: '시술 내용', content: [visit.summary] }
        ] : []
      },
      title: visit.title || visit.summary || '',
      tags: visit.tags || []
    };
  };

  useEffect(() => {
    const converted = convertVisitTagsToArray(visitTags);
    setAllVisitTags(converted);
  }, [visitTags]);

  useEffect(() => {
    const converted = convertCustomerTagsToArray(customerTags);
    setAllCustomerTags(converted);
  }, [customerTags]);

  useEffect(() => {
    if (customerTags.payment && customerTags.payment.length > 0) {
      setVisitTags(prev => {
        const existingPaymentTags = prev.payment || [];
        const newPaymentTags = customerTags.payment.filter(tag => {
          const label = typeof tag === 'string' ? tag : tag.label || tag;
          return !existingPaymentTags.some(existing => {
            const existingLabel = typeof existing === 'string' ? existing : existing.label || existing;
            return existingLabel === label;
          });
        });
        if (newPaymentTags.length > 0) {
          return {
            ...prev,
            payment: [...existingPaymentTags, ...newPaymentTags]
          };
        }
        return prev;
      });
      setCustomerTags(prev => {
        const { payment, ...rest } = prev;
        return rest;
      });
      console.log('[태그 마이그레이션] payment를 customerTags에서 visitTags로 이동');
    }
  }, [customerTags.payment]);

  useEffect(() => {
    if (!isAutoTaggingEnabled) {
      setServiceTags([]);
      setRecommendedCustomerTagIds([]);
      setNewCustomerTagIds([]);
      return;
    }
    
    const sourceText = rawTranscript || (() => {
      if (!resultData) return '';
      const allContent = [
        resultData.title || '',
        ...(resultData.sections || []).flatMap(section => 
          (section.content || []).join(' ')
        )
      ].join(' ');
      return allContent;
    })();
    
    const trimmedSourceText = sourceText?.trim();
    if (!trimmedSourceText || trimmedSourceText.length === 0) {
      setServiceTags([]);
      setRecommendedTagIds([]);
      setSelectedTagIds([]);
      setRecommendedCustomerTagIds([]);
      setSelectedCustomerTagIds([]);
      setNewCustomerTagIds([]);
      return;
    }
    
    // console.log('[태그 자동 추출] sourceText 길이:', sourceText?.length);
    // console.log('[태그 자동 추출] sourceText 처음 200자:', sourceText?.substring(0, 200));
    
    const extractedTags = extractTagsFromContent(sourceText, visitTags);
    setServiceTags(extractedTags);
    
    if (allVisitTags.length > 0) {
      const matched = matchTagsFromSummary(sourceText, allVisitTags);
      // console.log('[방문 태그 자동 선택] 원본 텍스트:', sourceText?.substring(0, 100));
      // console.log('[방문 태그 자동 선택] 매칭된 태그 ID:', matched);
      
      // extractTagsFromContent로 추출한 태그도 ID로 변환하여 추가
      const extractedTagIds = extractedTags
        .map(tagLabel => {
          const tag = allVisitTags.find(t => t.label === tagLabel);
          return tag ? tag.id : null;
        })
        .filter(id => id !== null);
      
      // 두 방법으로 찾은 태그 ID를 합침
      const allMatchedTagIds = [...new Set([...matched, ...extractedTagIds])];
      
      const matchedTagLabels = allMatchedTagIds.map(id => {
        const tag = allVisitTags.find(t => t.id === id);
        return tag ? tag.label : id;
      });
      // console.log('[방문 태그 자동 선택] 매칭된 태그 라벨:', matchedTagLabels);
      // console.log('[방문 태그 자동 선택] extractTagsFromContent로 추출한 태그:', extractedTags);
      // console.log('[방문 태그 자동 선택] 최종 태그 ID:', allMatchedTagIds);
      setRecommendedTagIds(allMatchedTagIds);
      setSelectedTagIds(allMatchedTagIds);
    }
    
    if (allCustomerTags.length > 0) {
      // console.log('[태그 자동 선택] sourceText 길이:', sourceText?.length);
      // console.log('[태그 자동 선택] sourceText 처음 200자:', sourceText?.substring(0, 200));
      // console.log('[태그 자동 선택] allCustomerTags 개수:', allCustomerTags.length);
      // console.log('[태그 자동 선택] allCustomerTags 샘플 (처음 5개):', allCustomerTags.slice(0, 5).map(t => ({ id: t.id, label: t.label, category: t.category })));
      
      const visitCount = selectedCustomerForRecord?.visitCount || 0;
      const shouldExcludeNewTag = visitCount >= 2;
      
      const newTag = allCustomerTags.find(t => t.label === '신규');
      const newTagId = newTag?.id;
      
      let matchedCustomerTags = matchTagsFromSummary(sourceText, allCustomerTags);
      
      if (shouldExcludeNewTag && newTagId) {
        matchedCustomerTags = matchedCustomerTags.filter(id => id !== newTagId);
        // console.log('[태그 자동 선택] 방문 횟수 2 이상 - "신규" 태그 제외됨');
      }
      
      // console.log('[태그 자동 선택] 원본 텍스트:', sourceText?.substring(0, 100));
      // console.log('[태그 자동 선택] 매칭된 태그 ID:', matchedCustomerTags);
      const matchedTagLabels = matchedCustomerTags.map(id => {
        const tag = allCustomerTags.find(t => t.id === id);
        return tag ? tag.label : id;
      });
      // console.log('[태그 자동 선택] 매칭된 태그 라벨:', matchedTagLabels);
      setRecommendedCustomerTagIds(matchedCustomerTags);
      
      if (matchedCustomerTags.length === 0) {
        setSelectedCustomerTagIds([]);
        setNewCustomerTagIds([]);
      } else {
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
          
          let finalExistingTagIds = existingTagIds;
          if (shouldExcludeNewTag) {
            finalExistingTagIds = existingTagIds.filter(id => id !== newTagId);
            
            const existingTag = allCustomerTags.find(t => t.label === '기존');
            const existingTagId = existingTag?.id;
            if (existingTagId && !finalExistingTagIds.includes(existingTagId)) {
              finalExistingTagIds = [...finalExistingTagIds, existingTagId];
            }
          }
          
          const newTagIds = matchedCustomerTags.filter(id => !finalExistingTagIds.includes(id));
          
          const mergedTagIds = [...new Set([...finalExistingTagIds, ...matchedCustomerTags])];
          setSelectedCustomerTagIds(mergedTagIds);
          setNewCustomerTagIds(newTagIds);
        } else {
          setSelectedCustomerTagIds(matchedCustomerTags);
          setNewCustomerTagIds(matchedCustomerTags);
        }
      }
    }
  }, [resultData, rawTranscript, isAutoTaggingEnabled, allVisitTags, allCustomerTags, selectedCustomerForRecord]);

  useEffect(() => {
    if (currentScreen === SCREENS.CUSTOMER_DETAIL && selectedCustomerId) {
      const customer = customers.find(c => c.id === selectedCustomerId);
      const customerVisits = visits[selectedCustomerId] || [];
      
      if (customer && customerVisits.length > 0) {
        const allVisitContent = customerVisits
          .map(visit => {
            const content = visit.content || visit.summary || visit.title || '';
            const detailContent = visit.detail?.sections?.flatMap(s => {
              if (Array.isArray(s.content)) {
                return s.content;
              }
              return s.content ? [s.content] : [];
            }).join(' ') || '';
            return `${content} ${detailContent}`;
          })
          .join(' ')
          .toLowerCase();
        
        // console.log('[고객 태그 자동 감지] 고객 ID:', selectedCustomerId);
        // console.log('[고객 태그 자동 감지] 방문 기록 수:', customerVisits.length);
        // console.log('[고객 태그 자동 감지] 수집된 텍스트:', allVisitContent);
        // console.log('[고객 태그 자동 감지] "임산부" 포함 여부:', allVisitContent.includes('임산부'));
        
        const currentCustomerTags = customer.customerTags || {
          caution: [],
          trait: [],
          payment: [],
          pattern: []
        };
        
        // console.log('[고객 태그 자동 감지] 현재 customerTags:', currentCustomerTags);
        
        const updatedCustomerTags = { ...currentCustomerTags };
        let needsUpdate = false;
        
        if (allVisitContent.includes('임산부')) {
          const cautionTags = updatedCustomerTags.caution || [];
          if (!cautionTags.includes('임산부')) {
            updatedCustomerTags.caution = [...cautionTags, '임산부'];
            needsUpdate = true;
            // console.log('[고객 태그 자동 감지] "임산부" 태그 추가됨');
          }
        }
        
        if (allVisitContent.includes('글루알러지') || allVisitContent.includes('글루 알러지')) {
          const cautionTags = updatedCustomerTags.caution || [];
          if (!cautionTags.includes('글루알러지')) {
            updatedCustomerTags.caution = [...cautionTags, '글루알러지'];
            needsUpdate = true;
            // console.log('[고객 태그 자동 감지] "글루알러지" 태그 추가됨');
          }
        }
        
        if (allVisitContent.includes('눈물많음') || allVisitContent.includes('눈물 많음') || allVisitContent.includes('눈물이 많')) {
          const cautionTags = updatedCustomerTags.caution || [];
          if (!cautionTags.includes('눈물많음')) {
            updatedCustomerTags.caution = [...cautionTags, '눈물많음'];
            needsUpdate = true;
            // console.log('[고객 태그 자동 감지] "눈물많음" 태그 추가됨');
          }
        }
        
        const visitCount = customer.visitCount || 0;
        if (visitCount >= 2) {
          const patternTags = updatedCustomerTags.pattern || [];
          const hasNewTag = patternTags.includes('신규');
          const hasExistingTag = patternTags.includes('기존');
          
          if (hasNewTag || !hasExistingTag) {
            updatedCustomerTags.pattern = patternTags.filter(tag => tag !== '신규');
            if (!updatedCustomerTags.pattern.includes('기존')) {
              updatedCustomerTags.pattern = [...updatedCustomerTags.pattern, '기존'];
            }
            needsUpdate = true;
            // console.log('[고객 태그 자동 감지] 방문 횟수 2 이상 - "신규" → "기존" 태그 변경됨');
          }
        }
        
        if (needsUpdate) {
          // console.log('[고객 태그 자동 감지] 업데이트된 customerTags:', updatedCustomerTags);
          setCustomers(prev => prev.map(c => 
            c.id === customer.id ? { ...c, customerTags: updatedCustomerTags } : c
          ));
        } else {
          // console.log('[고객 태그 자동 감지] 업데이트 불필요 (이미 태그가 있거나 키워드 없음)');
        }
      }
    }
  }, [currentScreen, selectedCustomerId, customers, visits]);

  useEffect(() => {
    try {
      localStorage.setItem('visitTags', JSON.stringify(visitTags));
      console.log('[localStorage] visitTags 저장됨:', visitTags);
    } catch (error) {
      console.error('[localStorage] visitTags 저장 실패:', error);
    }
  }, [visitTags]);

  useEffect(() => {
    try {
      localStorage.setItem('customerTags', JSON.stringify(customerTags));
      console.log('[localStorage] customerTags 저장됨:', customerTags);
    } catch (error) {
      console.error('[localStorage] customerTags 저장 실패:', error);
    }
  }, [customerTags]);

  useEffect(() => {
    try {
      const currentVisitTags = visitTags;
      const savedVisitTags = localStorage.getItem('visitTags');
      if (savedVisitTags) {
        const parsed = JSON.parse(savedVisitTags);
        const migrated = migrateTagsToObjects(parsed);
        if (JSON.stringify(parsed) !== JSON.stringify(migrated)) {
          localStorage.setItem('visitTags', JSON.stringify(migrated));
          console.log('[localStorage] visitTags 마이그레이션 완료 및 저장');
        }
      }
      
      const currentCustomerTags = customerTags;
      const savedCustomerTags = localStorage.getItem('customerTags');
      if (savedCustomerTags) {
        const parsed = JSON.parse(savedCustomerTags);
        const migrated = migrateTagsToObjects(parsed);
        if (JSON.stringify(parsed) !== JSON.stringify(migrated)) {
          localStorage.setItem('customerTags', JSON.stringify(migrated));
          console.log('[localStorage] customerTags 마이그레이션 완료 및 저장');
          console.log('[localStorage] customerTags - caution 태그 개수:', migrated.caution?.length || 0);
        }
      }
    } catch (error) {
      console.error('[localStorage] 태그 데이터 마이그레이션 실패:', error);
    }
  }, []);

  useEffect(() => {
    setCustomers(prev => {
      const updated = [];
      
      MOCK_CUSTOMERS.forEach(mockCustomer => {
        updated.push({
          ...mockCustomer,
          tags: (mockCustomer.tags || []).filter(tag => tag !== '#신규'),
          customerTags: mockCustomer.customerTags || {
            caution: [],
            trait: [],
            payment: [],
            pattern: []
          }
        });
      });
      
      prev.forEach(existingCustomer => {
        const existsInMock = MOCK_CUSTOMERS.some(mock => mock.id === existingCustomer.id);
        if (!existsInMock) {
          updated.push({
            ...existingCustomer,
            customerTags: existingCustomer.customerTags || {
              caution: [],
              trait: [],
              payment: [],
              pattern: []
            }
          });
        }
      });
      
      return updated;
    });

    const historyToVisits = {};
    MOCK_CUSTOMERS.forEach(customer => {
      if (customer.history && customer.history.length > 0) {
        historyToVisits[customer.id] = customer.history.map((h, idx) => {
          const dateMatch = h.date.match(/(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})/);
          let dateStr = '';
          let timeStr = '';
          if (dateMatch) {
            const [, year, month, day, hour, minute] = dateMatch;
            dateStr = `${year}-${month}-${day}`;
            timeStr = `${hour}:${minute}`;
          }
          
          return {
            id: h.id || Date.now() + idx,
            date: dateStr,
            time: timeStr,
            title: h.content || '',
            summary: h.content || '',
            tags: h.tags || [],
            detail: {
              sections: [
                { title: '시술 내용', content: [h.content || ''] }
              ]
            }
          };
        });
      }
    });

    if (Object.keys(historyToVisits).length > 0) {
      setVisits(prev => ({
        ...prev,
        ...historyToVisits
      }));
    }
  }, []);

  useEffect(() => {
    if (resultData && resultData.customerInfo && !selectedCustomerForRecord) {
      const extractedName = resultData.customerInfo.name;
      const extractedPhone = resultData.customerInfo.phone;
      
      if (extractedName && extractedName !== 'null' && extractedName.trim() !== '' && !tempName) {
        setTempName(extractedName.trim());
      }
      if (extractedPhone && extractedPhone !== 'null' && extractedPhone.trim() !== '' && !tempPhone) {
        setTempPhone(extractedPhone.trim());
      }
    }
  }, [resultData, selectedCustomerForRecord]);

  useEffect(() => {
    console.log('App mounted, currentScreen:', currentScreen);
  }, [currentScreen]);

  useEffect(() => {
    if (currentScreen === SCREENS.HOME || currentScreen === SCREENS.HISTORY) {
      // 홈이나 히스토리 화면으로 이동 시 녹음 관련 상태 초기화
      setSearchQuery('');
      setResultData(null);
      setTranscript('');
      setRawTranscript('');
      setRecordingDate(null);
      setSelectedCustomerForRecord(null);
      setTempName('');
      setTempPhone('');
      setServiceTags([]);
      setNewServiceTag('');
      setRecommendedTagIds([]);
      setSelectedTagIds([]);
      setSelectedCustomerTagIds([]);
      setNewCustomerTagIds([]);
      // 주의: selectedCustomerId는 CUSTOMER_DETAIL 화면에서 사용하므로 여기서 초기화하지 않음
    }
  }, [currentScreen]);

  useEffect(() => {
    if (currentScreen === SCREENS.CUSTOMER_DETAIL) {
      setVisibleVisitCount(10);
    }
  }, [selectedCustomerId, currentScreen]);

  useEffect(() => {
    setCustomers(prev => {
      const updated = prev.map(customer => ({
        ...customer,
        tags: (customer.tags || []).filter(tag => tag !== '#신규')
      }));
      const hasChanges = prev.some((c, idx) => {
        const oldTags = c.tags || [];
        const newTags = updated[idx].tags || [];
        return oldTags.length !== newTags.length || oldTags.some(tag => !newTags.includes(tag));
      });
      if (hasChanges) {
        saveToLocalStorage('mallo_customers', updated);
      }
      return updated;
    });
  }, []);

  const timerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const currentSector = BEAUTY_THEME;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      
      setCurrentScreen(SCREENS.RECORD);
      setRecordingTime(0);
      setRecordState('recording');
      setIsPaused(false);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (error) {
      console.error('녹음 시작 오류:', error);
      alert(`마이크 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.\n\n오류: ${error.message}`);
      setCurrentScreen(SCREENS.HOME);
    }
  };

  const cancelRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setRecordingTime(0);
    setRecordState('idle');
    setIsPaused(false);
    setResultData(null);
    setTranscript('');
    setRawTranscript('');
    setRecordingDate(null);
    audioChunksRef.current = [];
    
    setCurrentScreen(SCREENS.HOME);
  };

  const pauseRecording = () => {
    // 타이머 일시정지
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // MediaRecorder 일시정지
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
    }
    
    setIsPaused(true);
  };

  const resumeRecording = () => {
    // MediaRecorder 재개
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
    }
    
    // 타이머 재개
    timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    
    setIsPaused(false);
  };

  // content 배열의 모든 항목을 문자열로 변환하는 헬퍼 함수
  // 객체인 경우 각 키-값을 개별 문자열 항목으로 분리
  const normalizeContentArray = (content) => {
    if (!Array.isArray(content)) {
      return [];
    }
    
    // null 값을 확인하는 헬퍼 함수
    const isNullValue = (value) => {
      if (value === null || value === undefined) return true;
      if (typeof value === 'string') {
        const trimmed = value.trim().toLowerCase();
        return trimmed === '' || trimmed === 'null' || trimmed === 'undefined';
      }
      return false;
    };
    
    // 문자열에서 "키: null" 형태를 필터링하는 함수
    const cleanNullFromString = (str) => {
      // "이름: null", "전화번호: null" 같은 패턴 제거
      const parts = str.split('/').map(part => part.trim()).filter(part => {
        // "키: null" 형태를 체크
        if (part.includes(':')) {
          const [, value] = part.split(':').map(s => s.trim());
          return !isNullValue(value);
        }
        return !isNullValue(part);
      });
      
      return parts.length > 0 ? parts.join(' / ') : null;
    };
    
    const result = [];
    
    content.forEach((item) => {
      // 이미 문자열이면 처리
      if (typeof item === 'string') {
        // 빈 문자열이나 null 문자열이면 스킵
        if (isNullValue(item)) {
          return;
        }
        
        // "키: null" 형태가 포함된 경우 정리
        const cleaned = cleanNullFromString(item);
        if (!cleaned || isNullValue(cleaned)) {
          return;
        }
        
        // 문자열이 JSON처럼 보이면 파싱해서 개별 항목으로 변환
        const trimmed = cleaned.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          try {
            const parsed = JSON.parse(cleaned);
            // 파싱 성공하면 객체를 각 키-값을 개별 항목으로 변환
            if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
              // 객체를 각 키-값을 개별 문자열 항목으로 변환 (null 값 필터링)
              Object.entries(parsed).forEach(([key, value]) => {
                if (isNullValue(value)) return;
                const valStr = typeof value === 'object' && value !== null 
                  ? JSON.stringify(value) 
                  : String(value);
                result.push(`${key}: ${valStr}`);
              });
              return;
            }
            // 배열이나 다른 형태면 그냥 문자열로
            result.push(JSON.stringify(parsed));
            return;
          } catch (e) {
            // JSON 파싱 실패하면 정리된 문자열 반환
            result.push(cleaned);
            return;
          }
        }
        result.push(cleaned);
        return;
      }
      
      // 객체인 경우 각 키-값을 개별 문자열 항목으로 변환
      if (typeof item === 'object' && item !== null) {
        try {
          if (Array.isArray(item)) {
            // 배열인 경우 각 항목을 처리
            item.forEach(i => {
              if (typeof i === 'object' && i !== null) {
                // 배열 안의 객체도 키-값으로 분리 (null 값 필터링)
                Object.entries(i).forEach(([key, value]) => {
                  if (!isNullValue(value)) {
                    result.push(`${key}: ${String(value)}`);
                  }
                });
              } else if (!isNullValue(i)) {
                result.push(String(i));
              }
            });
            return;
          }
          // 객체의 각 키-값을 개별 문자열 항목으로 변환 (null 값 필터링)
          Object.entries(item).forEach(([key, value]) => {
            if (isNullValue(value)) return;
            const valStr = typeof value === 'object' && value !== null 
              ? JSON.stringify(value) 
              : String(value);
            result.push(`${key}: ${valStr}`);
          });
          return;
        } catch (e) {
          const str = String(item);
          if (!isNullValue(str)) {
            result.push(str);
          }
          return;
        }
      }
      
      // 그 외의 경우 문자열로 변환
      if (!isNullValue(item)) {
        const str = String(item);
        if (!isNullValue(str)) {
          result.push(str);
        }
      }
    });
    
    return result.filter(item => item && !isNullValue(item)); // 빈 항목 및 null 제거
  };

  const handleSummaryResult = (summaryData) => {
    // sections의 content 배열을 정리하여 모든 항목이 문자열인지 확인
    const cleanedData = {
      ...summaryData,
      sections: (summaryData.sections || [])
        .map((section, sectionIndex) => {
          const normalizedContent = normalizeContentArray(section.content || []);
          
          // 디버깅: 객체가 있는지 확인
          const hasObjects = (section.content || []).some(item => typeof item === 'object' && item !== null);
          if (hasObjects) {
            console.warn(`[요약 변환] 섹션 "${section.title}"에 객체가 포함되어 있습니다.`, section.content);
          }
          
          return {
            ...section,
            content: normalizedContent,
          };
        })
        .filter(section => section.content && section.content.length > 0), // 빈 섹션 제거
    };
    
    setResultData(cleanedData);
    
    if (summaryData.customerInfo) {
      const extractedName = summaryData.customerInfo.name;
      const extractedPhone = summaryData.customerInfo.phone;
      
      if (extractedName && extractedName !== 'null' && extractedName.trim() !== '') {
        setTempName(extractedName.trim());
      }
      if (extractedPhone && extractedPhone !== 'null' && extractedPhone.trim() !== '') {
        setTempPhone(extractedPhone.trim());
      }
    }
    
    setRecordState('result');
  };

  const stopRecording = async () => {
    clearInterval(timerRef.current);
    
    setIsProcessing(true);
    setRecordState('processing');
    setIsPaused(false);

    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      await new Promise((resolve) => {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.onstop = resolve;
        } else {
          resolve();
        }
      });

      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      audioChunksRef.current = [];

      // 최소 체크만 수행 (1초 이내도 허용)
      if (audioBlob.size < 100) {
        console.log('[녹음 경고] 오디오 파일이 너무 작습니다.');
        alert('녹음 데이터가 충분하지 않습니다. 다시 시도해주세요.');
        setIsProcessing(false);
        setRecordState('idle');
        setCurrentScreen(SCREENS.HOME);
        return;
      }

      setRecordingDate(new Date());

      // 녹음 시간이 1초 이하면 STT 건너뛰고 바로 결과 화면으로 (텍스트 테스트용)
      if (recordingTime <= 1) {
        console.log('[빠른 테스트] 1초 이하 녹음 - STT 건너뛰고 결과 화면으로 이동');
        setTranscript('');
        setRawTranscript('');
        setResultData({
          title: '텍스트 테스트 모드',
          customerInfo: { name: null, phone: null },
          sections: []
        });
        setIsProcessing(false);
        setRecordState('result');
        return;
      }

      // FormData를 사용하여 오디오 파일 전송
      console.log('[음성 인식] FormData 준비 시작');
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      console.log('[음성 인식] 오디오 파일 크기:', audioBlob.size, 'bytes');

      // OpenAI Whisper API를 통해 음성을 텍스트로 변환
      console.log('[음성 인식] /api/transcribe 호출 시작');
      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData, // FormData는 Content-Type을 자동으로 설정
      });

      if (!transcribeResponse.ok) {
        const errorData = await transcribeResponse.json().catch(() => ({}));
        throw new Error(errorData.error || '음성 인식에 실패했습니다.');
      }

      const transcribeData = await transcribeResponse.json();
      const transcript = transcribeData.transcript || '';
      
      console.log('[음성 인식] 변환된 텍스트:', transcript);
      console.log('[음성 인식] 텍스트 길이:', transcript.length);
      
      // 텍스트가 비어있으면 홈으로 (시간 제한 제거)
      if (!transcript.trim()) {
        console.log('[녹음 경고] 변환된 텍스트가 비어있습니다.');
        alert('음성이 인식되지 않았습니다. 다시 시도해주세요.');
        setIsProcessing(false);
        setRecordState('idle');
        setCurrentScreen(SCREENS.HOME);
        return;
      }

      setTranscript(transcript);
      setRawTranscript(transcript);

      console.log('[요약 요청] transcript:', transcript);
      console.log('[요약 요청] transcript 길이:', transcript.length);

      // 서버 API로 요약 요청
      const today = new Date();
      const todayStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 (${['일','월','화','수','목','금','토'][today.getDay()]})`;
      
      console.log('[요약 요청] 오늘 날짜:', todayStr);
      console.log('[요약 요청] 시스템 프롬프트 길이:', SYSTEM_PROMPT.length);
      
      const summarizeResponse = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceText: transcript,
          systemPrompt: SYSTEM_PROMPT,
          today: todayStr,
        }),
      });

      if (!summarizeResponse.ok) {
        const errorData = await summarizeResponse.json().catch(() => ({}));
        throw new Error(errorData.error || '요약 서버 호출에 실패했습니다.');
      }

      const summarizeData = await summarizeResponse.json();
      console.log('[요약 응답] 받은 데이터:', summarizeData);
      
      let parsedResult = {};
      try {
        parsedResult = JSON.parse(summarizeData.summaryJson || '{}');
        console.log('[요약 응답] 파싱된 결과:', parsedResult);
      } catch (parseError) {
        console.error('[요약 응답] JSON 파싱 실패:', parseError);
        throw new Error('요약 결과를 파싱할 수 없습니다.');
      }
      
      // API 응답 형식을 정리하여 전달 (텍스트 테스트와 동일한 처리)
      let cleanedResult = {};
      
      if (parsedResult.title && parsedResult.sections && Array.isArray(parsedResult.sections)) {
        // 올바른 형식: content 배열을 먼저 정리한 후 전달
        cleanedResult = {
          ...parsedResult,
          customerInfo: parsedResult.customerInfo || { name: null, phone: null },
          sections: (parsedResult.sections || []).map((section) => ({
            ...section,
            content: normalizeContentArray(section.content || []),
          })),
        };
        handleSummaryResult(cleanedResult);
      } else {
        throw new Error('API 응답 형식이 올바르지 않습니다.');
      }
    } catch (error) {
      console.error('[녹음 처리 오류]', error);
      const errorMessage = error.message || '알 수 없는 오류가 발생했습니다.';
      alert(`오류가 발생했습니다\n\n${errorMessage}\n\n콘솔을 확인해주세요.`);
      setCurrentScreen(SCREENS.HOME);
      setRecordState('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTestSummarize = async () => {
    if (!testSummaryInput.trim()) return;

    setIsTestingSummary(true);
    try {
      console.log('[요약 API] 요청 시작');

      const today = new Date();
      const todayStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 (${['일','월','화','수','목','금','토'][today.getDay()]})`;

      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceText: testSummaryInput,
          systemPrompt: SYSTEM_PROMPT,
          today: todayStr,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '요약 API 호출 실패');
      }

      const data = await response.json();
      
      let parsedResult = {};
      try {
        parsedResult = JSON.parse(data.summaryJson || '{}');
      } catch (e) {
        console.error('[요약 API] 호출 실패', e);
        throw new Error('요약 결과를 파싱할 수 없습니다.');
      }
      
      // 응답 요약 로그
      console.log('[요약 API] 응답 요약', {
        status: response.status,
        hasSummaryJson: !!data?.summaryJson,
        sectionsCount: parsedResult?.sections?.length || 0,
      });
      
      // API 응답 형식을 기존 handleSummaryResult가 기대하는 형식으로 변환
      let cleanedResult = {};
      
      if (parsedResult.title && parsedResult.sections && Array.isArray(parsedResult.sections)) {
        // 올바른 형식: content 배열을 먼저 정리한 후 전달
        cleanedResult = {
          ...parsedResult,
          customerInfo: parsedResult.customerInfo || { name: null, phone: null },
          sections: (parsedResult.sections || []).map((section) => ({
            ...section,
            content: normalizeContentArray(section.content || []),
          })),
        };
        
        // // console.log('[요약 변환] API 응답 처리 시작', {
        //   sectionsCount: parsedResult.sections?.length || 0,
        //   sections: parsedResult.sections?.map(s => ({
        //     title: s.title,
        //     contentTypes: (s.content || []).map(item => typeof item),
        //     hasObjects: (s.content || []).some(item => typeof item === 'object' && item !== null),
        //   })),
        // });
        
        // parsedResult.sections.forEach((section, idx) => {
        //   const hasObjects = (section.content || []).some(item => typeof item === 'object' && item !== null);
        //   if (hasObjects) {
        //     // console.warn(`[요약 변환] ⚠️ 섹션 "${section.title}"에 객체가 포함되어 변환합니다.`, {
        //       before: section.content,
        //       after: cleanedResult.sections[idx].content,
        //     });
        //   }
        // });
      } else {
        // 다른 형식이면 변환
        cleanedResult = {
          title: parsedResult.title || parsedResult.summary || parsedResult.service || '시술 기록',
          customerInfo: parsedResult.customerInfo || { name: null, phone: null },
          sections: [
            {
              title: '시술 내용',
              content: normalizeContentArray([parsedResult.service || parsedResult.note || '시술 내용이 없습니다.'])
            },
            ...(parsedResult.note ? [{
              title: '주의사항',
              content: normalizeContentArray([parsedResult.note])
            }] : [])
          ]
        };
      }
      
      handleSummaryResult(cleanedResult);
      
      setTranscript(testSummaryInput);
      setRawTranscript(testSummaryInput);
      setRecordingDate(new Date());
    } catch (err) {
      console.error('[요약 API] 호출 실패', err);
      alert(`테스트 요약 실패\n\n요약 서버 호출에 실패했습니다. 잠시 후 다시 시도해주세요.`);
    } finally {
      setIsTestingSummary(false);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const resetFlow = () => {
    setCurrentScreen(SCREENS.HOME);
    setTranscript('');
    setRawTranscript('');
    setResultData(null);
    setRecordingDate(null);
    setSelectedCustomerForRecord(null);
    setTempName('');
    setTempPhone('');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    return `${year}년 ${month}월 ${day}일`;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setTempPhone(formatted);
  };

  const formatRecordingDate = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[date.getDay()];
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? '오후' : '오전';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    
    return `${year}년 ${month}월 ${day}일 (${dayName}) ${ampm} ${displayHours}:${displayMinutes}`;
  };

  const getTodayDateString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };
  
  const [expandedHistoryIds, setExpandedHistoryIds] = useState(new Set());
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());

  useEffect(() => {
    if (currentScreen === SCREENS.HISTORY) {
      const todayStr = getTodayDateString();
      
      setSelectedDate(todayStr);
      
      setExpandedHistoryIds(new Set());
    }
  }, [currentScreen]);

  useEffect(() => {
    if (currentScreen === SCREENS.PROFILE_EDIT) {
      setEditProfileName(userProfile.name || '');
      setEditProfileShopName(userProfile.shopName || '');
      setEditProfileEmail(userProfile.email || '');
      setEditProfilePhone(userProfile.phone || '');
    }
  }, [currentScreen, userProfile]);

  const [notificationEnabled, setNotificationEnabled] = useState(true);

  const [recordState, setRecordState] = useState('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (currentScreen === SCREENS.RECORD) {
      if (isProcessing) {
        setRecordState('processing');
      } else if (recordingTime > 0 && !resultData && !isPaused) {
        setRecordState('recording');
      } else if (resultData) {
        setRecordState('result');
      } else {
        // isPaused 상태일 때는 recordState를 유지 (idle로 바꾸지 않음)
        if (!isPaused) {
          setRecordState('idle');
        }
      }
    } else {
      setRecordState('idle');
      setIsProcessing(false);
      setIsPaused(false);
    }
  }, [currentScreen, recordingTime, resultData, isProcessing, isPaused]);

  // 2분 제한 도달 시 자동으로 녹음 종료
  useEffect(() => {
    if (recordState !== 'recording') return;
    if (isPaused) return; // 일시정지 중이면 무시
    if (isProcessing) return; // 이미 처리 중이면 무시
    
    if (recordingTime >= MAX_RECORD_SECONDS) {
      console.log('⏱ 2분 제한 도달, 자동으로 녹음 종료');
      stopRecording();
    }
  }, [recordState, recordingTime, isProcessing, isPaused]);

  useEffect(() => {
    if (currentScreen === SCREENS.HOME) {
      setActiveTab('Home');
    } else if (currentScreen === SCREENS.RESERVATION) {
      setActiveTab('Reservation');
    } else if (currentScreen === SCREENS.HISTORY) {
      setActiveTab('History');
    } else if (currentScreen === SCREENS.PROFILE) {
      setActiveTab('Settings');
    }
  }, [currentScreen]);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'Home') {
      setCurrentScreen(SCREENS.HOME);
    } else if (tabId === 'Reservation') {
      setCurrentScreen(SCREENS.RESERVATION);
    } else if (tabId === 'History') {
      setCurrentScreen(SCREENS.HISTORY);
    } else if (tabId === 'Settings') {
      setCurrentScreen(SCREENS.PROFILE);
    }
  };

  // 예약 관련 함수들
  const addReservation = ({ time, name, customerId = null, date, phone, phoneLast4 }) => {
    // 예약 생성 시점에 신규 여부 판단
    let isNewReservation = true;
    
    // 1. customerId로 기존 고객 찾기
    if (customerId) {
      const existingCustomer = customers.find(c => 
        c.id === customerId || String(c.id) === String(customerId)
      );
      if (existingCustomer) {
        isNewReservation = false;
      }
    }
    
    // 2. customerId가 없으면 전화번호로 찾기
    if (isNewReservation && phone) {
      const normalizedPhone = phone.replace(/\D/g, '');
      const existingCustomer = customers.find(c => 
        c.phone && c.phone.replace(/\D/g, '') === normalizedPhone
      );
      if (existingCustomer) {
        isNewReservation = false;
      }
    }
    
    const newReservation = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
      time,
      name,
      customerId, // 고객 id 연결 (없으면 null)
      date: date || (() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })(),
      phone: phone || '',
      phoneLast4: phoneLast4 || (phone ? phone.slice(-4) : ''),
      isCompleted: false,
      isNew: isNewReservation  // 생성 시점의 신규 여부 저장
    };
    setReservations(prev => [...prev, newReservation]);
    return newReservation;
  };

  const toggleReservationComplete = (id) => {
    setReservations(prev => prev.map(res => 
      res.id === id ? { ...res, isCompleted: !res.isCompleted } : res
    ));
  };

  const deleteReservation = (id) => {
    setReservations(prev => prev.filter(res => res.id !== id));
  };

  const updateReservation = (id, updatedData) => {
    setReservations(prev => prev.map(res => 
      res.id === id ? { ...res, ...updatedData } : res
    ));
  };

  const screenRouterProps = {
    currentScreen,
    setCurrentScreen,
    previousScreen,
    email,
    setEmail,
    password,
    setPassword,
    setIsLoggedIn,
    activeTab,
    setActiveTab,
    customers,
    setCustomers,
    visits,
    setVisits,
    searchQuery,
    setSearchQuery,
    selectedCustomerId,
    setSelectedCustomerId,
    selectedCustomerForRecord,
    setSelectedCustomerForRecord,
    expandedVisitId,
    setExpandedVisitId,
    editingVisit,
    setEditingVisit,
    editingCustomer,
    setEditingCustomer,
    editCustomerName,
    setEditCustomerName,
    editCustomerPhone,
    setEditCustomerPhone,
    editCustomerTags,
    setEditCustomerTags,
    editCustomerMemo,
    setEditCustomerMemo,
    editCustomerTagIds,
    setEditCustomerTagIds,
    isEditCustomerTagPickerOpen,
    setIsEditCustomerTagPickerOpen,
    newTag,
    setNewTag,
    editProfileName,
    setEditProfileName,
    editProfileShopName,
    setEditProfileShopName,
    editProfileEmail,
    setEditProfileEmail,
    editProfilePhone,
    setEditProfilePhone,
    editingVisitTagIds,
    setEditingVisitTagIds,
    isEditingVisitTagPickerOpen,
    setIsEditingVisitTagPickerOpen,
    userProfile,
    setUserProfile,
    notificationEnabled,
    setNotificationEnabled,
    isAutoTaggingEnabled,
    setIsAutoTaggingEnabled,
    recordState,
    recordingTime,
    formatTime,
    stopRecording,
    cancelRecording,
    pauseRecording,
    resumeRecording,
    isPaused,
    startRecording,
    resultData,
    setResultData,
    resetFlow,
    getTodayDate,
    tempName,
    setTempName,
    tempPhone,
    setTempPhone,
    nameInputRef,
    phoneInputRef,
    handlePhoneChange,
    currentSector,
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
    setTranscript,
    recordingDate,
    setRecordingDate,
    formatRecordingDate,
    tempResultData,
    setTempResultData,
    serviceTags,
    setServiceTags,
    rawTranscript,
    setRawTranscript,
    visibleVisitCount,
    setVisibleVisitCount,
    selectedDate,
    setSelectedDate,
    expandedHistoryIds,
    setExpandedHistoryIds,
    visitTags,
    setVisitTags,
    customerTags,
    setCustomerTags,
    tagSettingsMainTab,
    setTagSettingsMainTab,
    tagSettingsSubTab,
    setTagSettingsSubTab,
    newManagedTag,
    setNewManagedTag,
    isTagEditing,
    setIsTagEditing,
    extractServiceDateFromSummary,
    extractServiceDateTimeLabel,
    normalizeRecordWithCustomer,
    formatRecordDateTime,
    getTodayDateString,
    currentTheme: BEAUTY_THEME,
    MOCK_CUSTOMERS,
    TagPickerModal,
    CustomerTagPickerModal,
    saveToLocalStorage,
    reservations,
    setReservations,
    addReservation,
    toggleReservationComplete,
    deleteReservation,
    updateReservation,
    pendingReservationCustomerId,
    setPendingReservationCustomerId,
    bulkImportCustomers,
    fillDemoData,
    resetAllData
  };

  return {
    screenRouterProps,
    currentScreen,
    activeTab,
    handleTabClick
  };
}

