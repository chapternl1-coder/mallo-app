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
  const [currentScreen, setCurrentScreen] = useState(SCREENS.LOGIN);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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
  
  const DEV_MODE = true;
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
    
    return {
      ...visit,
      customerName: visit.customerName || customer?.name || '미기재',
      customerPhone: visit.customerPhone || customer?.phone || '미기재',
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
    
    console.log('[태그 자동 추출] sourceText 길이:', sourceText?.length);
    console.log('[태그 자동 추출] sourceText 처음 200자:', sourceText?.substring(0, 200));
    
    const extractedTags = extractTagsFromContent(sourceText, visitTags);
    setServiceTags(extractedTags);
    
    if (allVisitTags.length > 0) {
      const matched = matchTagsFromSummary(sourceText, allVisitTags);
      console.log('[방문 태그 자동 선택] 원본 텍스트:', sourceText?.substring(0, 100));
      console.log('[방문 태그 자동 선택] 매칭된 태그 ID:', matched);
      
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
      console.log('[방문 태그 자동 선택] 매칭된 태그 라벨:', matchedTagLabels);
      console.log('[방문 태그 자동 선택] extractTagsFromContent로 추출한 태그:', extractedTags);
      console.log('[방문 태그 자동 선택] 최종 태그 ID:', allMatchedTagIds);
      setRecommendedTagIds(allMatchedTagIds);
      setSelectedTagIds(allMatchedTagIds);
    }
    
    if (allCustomerTags.length > 0) {
      console.log('[태그 자동 선택] sourceText 길이:', sourceText?.length);
      console.log('[태그 자동 선택] sourceText 처음 200자:', sourceText?.substring(0, 200));
      console.log('[태그 자동 선택] allCustomerTags 개수:', allCustomerTags.length);
      console.log('[태그 자동 선택] allCustomerTags 샘플 (처음 5개):', allCustomerTags.slice(0, 5).map(t => ({ id: t.id, label: t.label, category: t.category })));
      
      const visitCount = selectedCustomerForRecord?.visitCount || 0;
      const shouldExcludeNewTag = visitCount >= 2;
      
      const newTag = allCustomerTags.find(t => t.label === '신규');
      const newTagId = newTag?.id;
      
      let matchedCustomerTags = matchTagsFromSummary(sourceText, allCustomerTags);
      
      if (shouldExcludeNewTag && newTagId) {
        matchedCustomerTags = matchedCustomerTags.filter(id => id !== newTagId);
        console.log('[태그 자동 선택] 방문 횟수 2 이상 - "신규" 태그 제외됨');
      }
      
      console.log('[태그 자동 선택] 원본 텍스트:', sourceText?.substring(0, 100));
      console.log('[태그 자동 선택] 매칭된 태그 ID:', matchedCustomerTags);
      const matchedTagLabels = matchedCustomerTags.map(id => {
        const tag = allCustomerTags.find(t => t.id === id);
        return tag ? tag.label : id;
      });
      console.log('[태그 자동 선택] 매칭된 태그 라벨:', matchedTagLabels);
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
        
        console.log('[고객 태그 자동 감지] 고객 ID:', selectedCustomerId);
        console.log('[고객 태그 자동 감지] 방문 기록 수:', customerVisits.length);
        console.log('[고객 태그 자동 감지] 수집된 텍스트:', allVisitContent);
        console.log('[고객 태그 자동 감지] "임산부" 포함 여부:', allVisitContent.includes('임산부'));
        
        const currentCustomerTags = customer.customerTags || {
          caution: [],
          trait: [],
          payment: [],
          pattern: []
        };
        
        console.log('[고객 태그 자동 감지] 현재 customerTags:', currentCustomerTags);
        
        const updatedCustomerTags = { ...currentCustomerTags };
        let needsUpdate = false;
        
        if (allVisitContent.includes('임산부')) {
          const cautionTags = updatedCustomerTags.caution || [];
          if (!cautionTags.includes('임산부')) {
            updatedCustomerTags.caution = [...cautionTags, '임산부'];
            needsUpdate = true;
            console.log('[고객 태그 자동 감지] "임산부" 태그 추가됨');
          }
        }
        
        if (allVisitContent.includes('글루알러지') || allVisitContent.includes('글루 알러지')) {
          const cautionTags = updatedCustomerTags.caution || [];
          if (!cautionTags.includes('글루알러지')) {
            updatedCustomerTags.caution = [...cautionTags, '글루알러지'];
            needsUpdate = true;
            console.log('[고객 태그 자동 감지] "글루알러지" 태그 추가됨');
          }
        }
        
        if (allVisitContent.includes('눈물많음') || allVisitContent.includes('눈물 많음') || allVisitContent.includes('눈물이 많')) {
          const cautionTags = updatedCustomerTags.caution || [];
          if (!cautionTags.includes('눈물많음')) {
            updatedCustomerTags.caution = [...cautionTags, '눈물많음'];
            needsUpdate = true;
            console.log('[고객 태그 자동 감지] "눈물많음" 태그 추가됨');
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
            console.log('[고객 태그 자동 감지] 방문 횟수 2 이상 - "신규" → "기존" 태그 변경됨');
          }
        }
        
        if (needsUpdate) {
          console.log('[고객 태그 자동 감지] 업데이트된 customerTags:', updatedCustomerTags);
          setCustomers(prev => prev.map(c => 
            c.id === customer.id ? { ...c, customerTags: updatedCustomerTags } : c
          ));
        } else {
          console.log('[고객 태그 자동 감지] 업데이트 불필요 (이미 태그가 있거나 키워드 없음)');
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
    if (currentScreen === SCREENS.HOME) {
      setSearchQuery('');
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
    setResultData(null);
    setTranscript('');
    setRawTranscript('');
    setRecordingDate(null);
    audioChunksRef.current = [];
    
    setCurrentScreen(SCREENS.HOME);
  };

  const handleSummaryResult = (summaryData) => {
    setResultData(summaryData);
    
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

      if (recordingTime < 0.5 || audioBlob.size < 1000) {
        const dummyResultData = {
          title: '테스트 시술 기록',
          sections: [
            {
              title: '고객 기본 정보',
              content: ['이름: 테스트 고객 / 전화번호: 010-0000-0000', '신규/기존 구분: 기존 고객', '고객 특징: 미기재']
            },
            {
              title: '시술 내용',
              content: ['테스트를 위한 더미 데이터입니다. 개발용 요약 테스트 박스나 테스트 버튼을 사용해주세요.']
            }
          ]
        };
        setResultData(dummyResultData);
        setTranscript('');
        setRawTranscript('');
        setIsProcessing(false);
        setRecordState('result');
        return;
      }

      setRecordingDate(new Date());

      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API 키가 설정되지 않았습니다. .env 파일에 VITE_OPENAI_API_KEY를 추가해주세요.');
      }

      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'ko');

      let whisperResponse;
      try {
        whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`
          },
          body: formData
        });
      } catch (fetchError) {
        if (fetchError.message.includes('CORS') || fetchError.message.includes('Failed to fetch')) {
          throw new Error('음성 인식 API 연결에 실패했습니다.\n\n브라우저에서 OpenAI API를 직접 호출할 수 없습니다.\n백엔드 서버를 통해 API를 호출하도록 설정해주세요.');
        }
        throw fetchError;
      }

      if (!whisperResponse.ok) {
        const errorData = await whisperResponse.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || '';
        if (errorMessage.includes('too short') || recordingTime < 1) {
          setIsProcessing(false);
          setRecordState('idle');
          setCurrentScreen(SCREENS.HOME);
          return;
        }
        let userMessage = `음성 인식 실패 (상태 코드: ${whisperResponse.status})`;
        if (whisperResponse.status === 401) {
          userMessage = 'OpenAI API 키가 유효하지 않거나 만료되었습니다.';
        }
        throw new Error(userMessage + (errorMessage ? `\n\n${errorMessage}` : ''));
      }

      const whisperData = await whisperResponse.json();
      const transcript = whisperData.text || '';
      
      if (!transcript.trim() || recordingTime < 1) {
        setIsProcessing(false);
        setRecordState('idle');
        setCurrentScreen(SCREENS.HOME);
        return;
      }

      setTranscript(transcript);
      setRawTranscript(transcript);

      const roleJson = {
        role_guess: '뷰티샵 원장',
        sector: '뷰티/샵',
        confidence: 1.0,
        need_user_confirmation: false,
        reason_short: '뷰티샵 원장님 전용 앱'
      };

      let gptResponse;
      try {
        gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: SYSTEM_PROMPT
              },
              {
                role: 'user',
                content: `[역할 추론 결과(JSON)]\n${JSON.stringify(roleJson)}\n\n{TODAY}: ${getTodayDate()}\n\n[원문 텍스트]\n${transcript}`
              }
            ],
            temperature: 0.7,
            response_format: { type: 'json_object' }
          })
        });
      } catch (fetchError) {
        if (fetchError.message.includes('CORS') || fetchError.message.includes('Failed to fetch')) {
          throw new Error('요약 API 연결에 실패했습니다.\n\n브라우저에서 OpenAI API를 직접 호출할 수 없습니다.\n백엔드 서버를 통해 API를 호출하도록 설정해주세요.');
        }
        throw fetchError;
      }

      if (!gptResponse.ok) {
        let errorMessage = `요약 API 요청 실패 (상태 코드: ${gptResponse.status})`;
        
        if (gptResponse.status === 401) {
          errorMessage = 'OpenAI API 키가 유효하지 않거나 만료되었습니다.\n\n.env 파일의 VITE_OPENAI_API_KEY를 확인해주세요.';
        } else if (gptResponse.status === 429) {
          errorMessage = 'API 사용량 한도에 도달했습니다.\n\n잠시 후 다시 시도해주세요.';
        } else if (gptResponse.status >= 500) {
          errorMessage = 'OpenAI 서버 오류가 발생했습니다.\n\n잠시 후 다시 시도해주세요.';
        }
        
        try {
          const errorData = await gptResponse.json();
          if (errorData.error?.message) {
            errorMessage += `\n\n상세: ${errorData.error.message}`;
          }
        } catch {
          // JSON 파싱 실패 시 기본 메시지 사용
        }
        
        throw new Error(errorMessage);
      }

      const gptData = await gptResponse.json();
      const content = gptData.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('API 응답에 내용이 없습니다.');
      }

      let parsedResult;
      try {
        parsedResult = JSON.parse(content);
      } catch (parseError) {
        throw new Error('API 응답을 파싱할 수 없습니다.');
      }
      
      if (parsedResult.title && parsedResult.sections && Array.isArray(parsedResult.sections)) {
        handleSummaryResult(parsedResult);
      } else {
        throw new Error('API 응답 형식이 올바르지 않습니다.');
      }
    } catch (error) {
      const errorMessage = error.message || '알 수 없는 오류가 발생했습니다.';
      alert(`오류가 발생했습니다\n\n${errorMessage}`);
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
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API 키가 설정되지 않았습니다.\n\n.env 파일에 VITE_OPENAI_API_KEY를 추가해주세요.');
      }

      const roleJson = {
        role_guess: '뷰티샵 원장',
        sector: '뷰티/샵',
        confidence: 1.0,
        need_user_confirmation: false,
        reason_short: '뷰티샵 원장님 전용 앱'
      };

      let gptResponse;
      try {
        gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: SYSTEM_PROMPT
              },
              {
                role: 'user',
                content: `[역할 추론 결과(JSON)]\n${JSON.stringify(roleJson)}\n\n{TODAY}: ${getTodayDate()}\n\n[원문 텍스트]\n${testSummaryInput}`
              }
            ],
            temperature: 0.7,
            response_format: { type: 'json_object' }
          })
        });
      } catch (fetchError) {
        // 네트워크 에러나 CORS 에러 처리
        if (fetchError.message.includes('CORS') || fetchError.message.includes('Failed to fetch')) {
          throw new Error('API 연결에 실패했습니다.\n\n브라우저에서 OpenAI API를 직접 호출할 수 없습니다.\n백엔드 서버를 통해 API를 호출하도록 설정해주세요.');
        }
        throw fetchError;
      }

      if (!gptResponse.ok) {
        let errorMessage = `API 요청 실패 (상태 코드: ${gptResponse.status})`;
        
        if (gptResponse.status === 401) {
          errorMessage = 'OpenAI API 키가 유효하지 않거나 만료되었습니다.\n\n.env 파일의 VITE_OPENAI_API_KEY를 확인해주세요.';
        } else if (gptResponse.status === 429) {
          errorMessage = 'API 사용량 한도에 도달했습니다.\n\n잠시 후 다시 시도해주세요.';
        } else if (gptResponse.status >= 500) {
          errorMessage = 'OpenAI 서버 오류가 발생했습니다.\n\n잠시 후 다시 시도해주세요.';
        }
        
        try {
          const errorData = await gptResponse.json();
          if (errorData.error?.message) {
            errorMessage += `\n\n상세: ${errorData.error.message}`;
          }
        } catch {
          // JSON 파싱 실패 시 기본 메시지 사용
        }
        
        throw new Error(errorMessage);
      }

      const gptData = await gptResponse.json();
      const content = gptData.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('API 응답에 내용이 없습니다.');
      }

      let parsedResult;
      try {
        parsedResult = JSON.parse(content);
      } catch (parseError) {
        throw new Error('API 응답을 파싱할 수 없습니다.');
      }
      
      if (parsedResult.title && parsedResult.sections && Array.isArray(parsedResult.sections)) {
        handleSummaryResult(parsedResult);
        
        setTranscript(testSummaryInput);
        setRawTranscript(testSummaryInput);
        setRecordingDate(new Date());
      } else {
        throw new Error('API 응답 형식이 올바르지 않습니다.');
      }
    } catch (e) {
      const errorMessage = e.message || '알 수 없는 오류가 발생했습니다.';
      alert(`테스트 요약 실패\n\n${errorMessage}`);
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
    return `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 (${['일','월','화','수','목','금','토'][today.getDay()]})`;
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

  useEffect(() => {
    if (currentScreen === SCREENS.RECORD) {
      if (isProcessing) {
        setRecordState('processing');
      } else if (recordingTime > 0 && !resultData) {
        setRecordState('recording');
      } else if (resultData) {
        setRecordState('result');
      } else {
        setRecordState('idle');
      }
    } else {
      setRecordState('idle');
      setIsProcessing(false);
    }
  }, [currentScreen, recordingTime, resultData, isProcessing]);

  // 2분 제한 도달 시 자동으로 녹음 종료
  useEffect(() => {
    if (recordState !== 'recording') return;
    if (isProcessing) return; // 이미 처리 중이면 무시
    
    if (recordingTime >= MAX_RECORD_SECONDS) {
      console.log('⏱ 2분 제한 도달, 자동으로 녹음 종료');
      stopRecording();
    }
  }, [recordState, recordingTime, isProcessing]);

  useEffect(() => {
    if (currentScreen === SCREENS.HOME) {
      setActiveTab('Home');
    } else if (currentScreen === SCREENS.HISTORY) {
      setActiveTab('History');
    } else if (currentScreen === SCREENS.RESERVATION) {
      setActiveTab('Reservation');
    } else if (currentScreen === SCREENS.PROFILE) {
      setActiveTab('Settings');
    }
  }, [currentScreen]);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'Home') {
      setCurrentScreen(SCREENS.HOME);
    } else if (tabId === 'History') {
      setCurrentScreen(SCREENS.HISTORY);
    } else if (tabId === 'Reservation') {
      setCurrentScreen(SCREENS.RESERVATION);
    } else if (tabId === 'Settings') {
      setCurrentScreen(SCREENS.PROFILE);
    }
  };

  // 예약 관련 함수들
  const addReservation = (reservation) => {
    const newReservation = {
      id: Date.now(),
      ...reservation,
      isCompleted: false
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

