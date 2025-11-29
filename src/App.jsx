import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Copy, Share2, Scissors, ArrowLeft, MoreHorizontal, Mail, Lock, ChevronDown, ChevronUp, ChevronRight, Phone, Calendar, Edit, Search, Minus, Home, User, Settings, History, X, Tag, Hash, Camera } from 'lucide-react';
import { formatRecordDateTime, formatVisitReservation, formatVisitReservationFull, formatVisitReservationTime, formatServiceDateTimeLabel } from './utils/date';
import ProfileScreen from './screens/ProfileScreen';
import TagSettingsScreen from './screens/TagSettingsScreen';
import HomeScreen from './screens/HomeScreen';
import CustomerDetailScreen from './screens/CustomerDetailScreen';
import RecordScreen from './screens/RecordScreen';
import LoginScreen from './screens/LoginScreen';
import ProfileEditScreen from './screens/ProfileEditScreen';
import EditCustomerScreen from './screens/EditCustomerScreen';
import EditScreen from './screens/EditScreen';
import HistoryScreen from './screens/HistoryScreen';
import ScreenRouter from './components/ScreenRouter';
import BottomNavigation from './components/BottomNavigation';
import TagPickerModal from './components/TagPickerModal';
import CustomerTagPickerModal from './components/CustomerTagPickerModal';
import { SYSTEM_PROMPT } from './constants/systemPrompt';
import { BEAUTY_THEME } from './theme/beautyTheme';
import { MOCK_CUSTOMERS, MOCK_VISITS } from './mock/mockData';
import { migrateTagsToObjects, extractTagsFromContent, normalize, generateAutoKeywords, parseKeywords, matchTagsFromSummary, convertVisitTagsToArray, convertCustomerTagsToArray } from './utils/tagUtils';
import { extractServiceDateFromSummary, extractServiceDateTimeLabel } from './utils/serviceUtils';
import { loadFromLocalStorage, saveToLocalStorage } from './utils/storage';
import { formatPhoneNumber } from './utils/formatters';

/**
 * MALLO Service Prototype v2.1 (Fix: Tailwind ReferenceError)
 * - Removed custom <style> tags to prevent execution errors
 * - Replaced custom animations with standard Tailwind utilities (animate-pulse, etc.)
 * - Simplified dynamic classes for better compatibility
 */

// --- 0. System Prompt ---

// --- 1. Constants & Data Models ---


// --- 3. Main App ---

export default function MalloApp() {
  const [currentScreen, setCurrentScreen] = useState('Login'); // Login 화면부터 시작
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('Home'); // 하단 네비게이션 활성 탭
  const [userProfile, setUserProfile] = useState({ 
    sectorId: 'beauty', 
    roleTitle: '뷰티샵 원장',
    name: '김말로 원장님',
    email: 'mallo@beauty.com',
    phone: '010-1234-5678'
  });
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [rawTranscript, setRawTranscript] = useState(''); // STT 원본 텍스트 (태그 매칭용)
  const [resultData, setResultData] = useState(null);
  const [showPromptInfo, setShowPromptInfo] = useState(false);
  const [todayRecords, setTodayRecords] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [expandedVisitId, setExpandedVisitId] = useState(null);
  const [editingVisit, setEditingVisit] = useState(null); // 편집 중인 visit 기록
  const [editingCustomer, setEditingCustomer] = useState(null); // 편집 중인 customer 정보
  const [editCustomerName, setEditCustomerName] = useState(''); // 고객 정보 편집용
  const [editCustomerPhone, setEditCustomerPhone] = useState(''); // 고객 정보 편집용
  const [editCustomerTags, setEditCustomerTags] = useState([]); // 고객 정보 편집용 (레거시, 사용 안 함)
  const [editCustomerTagIds, setEditCustomerTagIds] = useState([]); // 고객 특징 태그 편집용 (ID 배열)
  const [isEditCustomerTagPickerOpen, setIsEditCustomerTagPickerOpen] = useState(false); // 고객 특징 태그 선택 모달 오픈 여부
  const [editCustomerMemo, setEditCustomerMemo] = useState(''); // 고객 메모 편집용
  const [editProfileName, setEditProfileName] = useState(''); // 프로필 편집용
  const [editProfileEmail, setEditProfileEmail] = useState(''); // 프로필 편집용
  const [editProfilePhone, setEditProfilePhone] = useState(''); // 프로필 편집용
  const [editingVisitTagIds, setEditingVisitTagIds] = useState([]); // 방문 편집용 태그 ID 배열
  const [isEditingVisitTagPickerOpen, setIsEditingVisitTagPickerOpen] = useState(false); // 방문 태그 선택 모달 오픈 여부
  const [newTag, setNewTag] = useState(''); // 새 태그 입력용
  const [serviceTags, setServiceTags] = useState([]); // 시술 태그 (ResultScreen에서 편집)
  const [newServiceTag, setNewServiceTag] = useState(''); // 새 시술 태그 입력용
  const [isAutoTaggingEnabled, setIsAutoTaggingEnabled] = useState(true); // AI 태그 자동 추천 설정 상태
  // 문자열 배열을 객체 형태로 변환하는 마이그레이션 함수
  const migrateTagsToObjects = (tags) => {
    if (!tags || typeof tags !== 'object') return tags;
    
    const migrated = {};
    Object.keys(tags).forEach(category => {
      const categoryTags = tags[category];
      if (Array.isArray(categoryTags)) {
        migrated[category] = categoryTags.map((tag, index) => {
          // 이미 객체인 경우 그대로 사용
          if (typeof tag === 'object' && tag.label) {
            return tag;
          }
          // 문자열인 경우 객체로 변환
          if (typeof tag === 'string') {
            return {
              id: `${category}-${Date.now()}-${index}`,
              label: tag,
              keywords: []
            };
          }
          return tag;
        });
      } else {
        migrated[category] = categoryTags;
      }
    });
    
    return migrated;
  };

  // localStorage에서 초기값 로드하는 함수 (useState 초기값으로 사용)
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
  
  // 시술 태그 관리 목록 (방문용) - 함수로 초기값 설정하여 localStorage에서 먼저 로드
  const [visitTags, setVisitTags] = useState(loadInitialVisitTags);
  
  // 방문 태그 선택 UI용 상태
  // visitTags를 객체 배열로 변환한 전체 태그 리스트
  const [allVisitTags, setAllVisitTags] = useState([]);
  // AI가 요약에서 찾아낸 추천 태그들의 id
  const [recommendedTagIds, setRecommendedTagIds] = useState([]);
  // 실제로 최종 저장될 선택된 태그들의 id
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  // 태그 선택 바텀시트/모달 오픈 여부
  const [isTagPickerOpen, setIsTagPickerOpen] = useState(false);
  
  // 개발용 플래그 및 테스트 상태
  const DEV_MODE = true; // 나중에 false로 바꾸면 통째로 안 보이게 하기 쉽도록
  const [testSummaryInput, setTestSummaryInput] = useState('');
  const [isTestingSummary, setIsTestingSummary] = useState(false);
  
  // 고객 특징 태그 관리용 상태
  // customerTags를 객체 배열로 변환한 전체 태그 리스트
  const [allCustomerTags, setAllCustomerTags] = useState([]);
  // AI가 요약에서 찾아낸 고객 특징 태그들의 id
  const [recommendedCustomerTagIds, setRecommendedCustomerTagIds] = useState([]);
  // 기존 고객 태그 + AI가 찾은 태그를 병합한 최종 태그들의 id
  const [selectedCustomerTagIds, setSelectedCustomerTagIds] = useState([]);
  // 새로 추가된 고객 태그 ID들 (시각적 구분용)
  const [newCustomerTagIds, setNewCustomerTagIds] = useState([]);
  // 고객 태그 선택 바텀시트/모달 오픈 여부
  const [isCustomerTagPickerOpen, setIsCustomerTagPickerOpen] = useState(false);
  
  // 고객 특징 태그 관리 목록 (고객용) - 함수로 초기값 설정하여 localStorage에서 먼저 로드
  const [customerTags, setCustomerTags] = useState(loadInitialCustomerTags);
  
  const [newManagedTag, setNewManagedTag] = useState(''); // 태그 관리 화면에서 새 태그 입력용
  const [newManagedTagKeywords, setNewManagedTagKeywords] = useState(''); // 태그 키워드 입력용
  const [tagSettingsMainTab, setTagSettingsMainTab] = useState('visit'); // 대분류 탭: 'visit' | 'customer'
  const [tagSettingsSubTab, setTagSettingsSubTab] = useState('procedure'); // 소분류 탭
  const [isTagEditing, setIsTagEditing] = useState(false); // 태그 편집 모드
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recordingDate, setRecordingDate] = useState(null);
  const [searchQuery, setSearchQuery] = useState(''); // 고객 검색어
  const [visibleVisitCount, setVisibleVisitCount] = useState(10); // 방문 히스토리에서 보여줄 개수

  // 요약 텍스트에서 방문·예약 날짜를 파싱하는 helper 함수
  const extractServiceDateFromSummary = (resultData) => {
    if (!resultData || !resultData.sections) {
      console.log('[extractServiceDateFromSummary] resultData 또는 sections 없음');
      return undefined;
    }

    // "방문·예약 정보" 섹션 찾기
    const visitSection = resultData.sections.find(
      section => section.title && section.title.includes('방문·예약 정보')
    );

    if (!visitSection) {
      console.log('[extractServiceDateFromSummary] 방문·예약 정보 섹션 없음');
      return undefined;
    }

    if (!visitSection.content || !Array.isArray(visitSection.content)) {
      console.log('[extractServiceDateFromSummary] content가 배열이 아님');
      return undefined;
    }

    console.log('[extractServiceDateFromSummary] 방문·예약 정보 섹션 찾음:', visitSection);

    // 섹션의 content 배열에서 날짜 패턴 찾기
    // 여러 날짜가 있을 수 있으므로, 가장 최근 날짜(가장 나중 날짜)를 사용
    let foundDates = [];
    
    for (const line of visitSection.content) {
      if (!line || typeof line !== 'string') continue;

      console.log('[extractServiceDateFromSummary] 검사 중인 줄:', line);

      // "2025년 12월 27일" 패턴 찾기 (앞에 "- " 또는 다른 문자가 있어도 매칭)
      // 예: "- 2025년 12월 27일 (금) 17:30 예약 후 제시간 방문"
      const match = line.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
      if (match) {
        const [, year, month, day] = match;
        const mm = String(month).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        
        const serviceDate = `${year}-${mm}-${dd}`;
        const dateObj = new Date(`${year}-${mm}-${dd}`);
        foundDates.push({ date: serviceDate, dateObj: dateObj, line: line });
        console.log('[extractServiceDateFromSummary] 날짜 발견:', serviceDate, '줄:', line);
      }
    }

    // 날짜가 여러 개 있으면, 가장 최근 날짜(가장 나중 날짜)를 사용
    if (foundDates.length > 0) {
      // 날짜 객체 기준으로 정렬 (최신 날짜가 마지막)
      foundDates.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
      
      // 가장 최근 날짜 선택
      const latestDate = foundDates[foundDates.length - 1];
      console.log('[extractServiceDateFromSummary] 가장 최근 날짜 선택:', latestDate.date, '전체 발견된 날짜:', foundDates.map(d => d.date));
      return latestDate.date;
    }

    console.log('[extractServiceDateFromSummary] 날짜 패턴을 찾지 못함');
    return undefined;
  };

  // 태그 추출 함수 (content에서 키워드 매칭)
  const extractTagsFromContent = (content, managedTags = null) => {
    if (!content) return [];
    const tags = [];
    // 한국어와 영문 대소문자 모두 처리
    const contentLower = content.toLowerCase();
    const contentOriginal = content;
    
    // visitTags에서 등록된 모든 태그 가져오기
    const allManagedTags = [];
    const tagsToSearch = managedTags || visitTags;
    if (tagsToSearch) {
      Object.values(tagsToSearch).forEach(categoryTags => {
        if (Array.isArray(categoryTags)) {
          categoryTags.forEach(tagObj => {
            if (typeof tagObj === 'object' && tagObj.label) {
              allManagedTags.push(tagObj.label);
            } else if (typeof tagObj === 'string') {
              allManagedTags.push(tagObj);
            }
          });
        }
      });
    }
    
    // 기본 키워드 매핑 (하드코딩된 키워드 - 호환성 유지)
    const keywordMap = {
      'D컬': ['d컬', '디컬', 'd 컬', 'D컬', '디 컬'],
      'C컬': ['c컬', '씨컬', 'c 컬', 'C컬', '씨 컬'],
      '리터치': ['리터치', '리 터치', '리터'],
      '연장': ['연장'],
      '제거': ['제거', '리무버', '리무'],
      '젤네일': ['젤', '젤네일', '젤 네일', '젤 네일'],
      '아트': ['아트', '네일아트', '네일 아트', '네일아'],
      '영양': ['영양', '영양케어', '영양 케어', '케어'],
      '회원권': ['회원권', '멤버십', '멤버']
    };
    
    // 등록된 태그들을 키워드로 매칭
    allManagedTags.forEach(tagLabel => {
      // 태그 라벨 자체가 포함되어 있는지 확인
      if (contentLower.includes(tagLabel.toLowerCase()) || contentOriginal.includes(tagLabel)) {
        if (!tags.includes(tagLabel)) {
          tags.push(tagLabel);
        }
      }
    });
    
    // 기본 키워드 매핑도 확인 (등록된 태그와 중복되지 않는 경우만)
    Object.keys(keywordMap).forEach(tag => {
      if (!tags.includes(tag)) {
        const keywords = keywordMap[tag];
        const found = keywords.some(keyword => {
          const keywordLower = keyword.toLowerCase();
          return contentLower.includes(keywordLower) || contentOriginal.includes(keyword);
        });
        if (found) {
          tags.push(tag);
        }
      }
    });
    
    return tags;
  };

  // serviceDateTimeLabel 생성 함수
  const extractServiceDateTimeLabel = (record) => {
    // "방문·예약 정보" 섹션에서 날짜 + 시간 파싱
    if (record.detail && record.detail.sections) {
      const visitSection = record.detail.sections.find(
        section => section.title && section.title.includes('방문·예약 정보')
      );
      
      if (visitSection && visitSection.content && Array.isArray(visitSection.content)) {
        for (const line of visitSection.content) {
          if (!line || typeof line !== 'string') continue;
          
          // "2025년 12월 27일 (금) 17:30 예약 후 제시간 방문" 패턴 찾기
          // 날짜와 시간을 모두 추출
          const dateMatch = line.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
          const timeMatch = line.match(/(\d{1,2}):(\d{2})/);
          
          if (dateMatch && timeMatch) {
            const [, year, month, day] = dateMatch;
            const [, hour, minute] = timeMatch;
            const mm = String(month).padStart(2, '0');
            const dd = String(day).padStart(2, '0');
            const hh = String(hour).padStart(2, '0');
            const mi = String(minute).padStart(2, '0');
            
            // 형식: "2025-12-27 17:30 방문/예약"
            return `${year}-${mm}-${dd} ${hh}:${mi} 방문/예약`;
          }
        }
      }
    }
    
    // 섹션에서 찾지 못하면 recordedAt 또는 createdAt 사용
    const recordedAt = record.recordedAt || record.createdAt;
    if (recordedAt) {
      return formatServiceDateTimeLabel(recordedAt);
    }
    
    // date와 time 조합 시도
    if (record.date && record.time) {
      const dateTimeStr = `${record.date}T${record.time}:00`;
      return formatServiceDateTimeLabel(dateTimeStr);
    }
    
    return '';
  };

  const [selectedCustomerForRecord, setSelectedCustomerForRecord] = useState(null); // Record 화면에서 선택된 고객
  const [tempName, setTempName] = useState(''); // 신규 고객 이름 (AI 자동 추출 또는 수동 입력)
  const [tempPhone, setTempPhone] = useState(''); // 신규 고객 전화번호 (AI 자동 추출 또는 수동 입력)
  const nameInputRef = useRef(null); // 이름 입력창 참조 (포커스용)
  const phoneInputRef = useRef(null); // 전화번호 입력창 참조 (포커스용)
  
  // localStorage에서 데이터 불러오기 함수
  const loadFromLocalStorage = (key, defaultValue) => {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        return JSON.parse(item);
      }
    } catch (error) {
      console.error(`localStorage에서 ${key} 불러오기 실패:`, error);
    }
    return defaultValue;
  };

  // localStorage에 데이터 저장하기 함수
  const saveToLocalStorage = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`localStorage에 ${key} 저장 실패:`, error);
    }
  };

  // MOCK_CUSTOMERS와 MOCK_VISITS를 상태로 관리 (실제 저장 기능을 위해)
  // 초기값은 localStorage에서 불러오거나, 없으면 MOCK 데이터 사용
  const [customers, setCustomers] = useState(() => {
    const loadedCustomers = loadFromLocalStorage('mallo_customers', MOCK_CUSTOMERS);
    // "#신규" 태그 제거 및 customerTags 기본 구조 추가
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
    const loadedVisits = loadFromLocalStorage('mallo_visits', MOCK_VISITS);
    // 모든 방문 기록에 tags 필드가 없으면 빈 배열로 초기화
    const normalizedVisits = {};
    Object.keys(loadedVisits).forEach(customerId => {
      normalizedVisits[customerId] = (loadedVisits[customerId] || []).map(visit => ({
        ...visit,
        tags: visit.tags || []
      }));
    });
    return normalizedVisits;
  });
  
  // 편집 화면용 임시 데이터
  const [tempResultData, setTempResultData] = useState(null);
  
  // customers 상태 변경 시 localStorage에 자동 저장
  useEffect(() => {
    saveToLocalStorage('mallo_customers', customers);
  }, [customers]);
  
  // visits 상태 변경 시 localStorage에 자동 저장
  useEffect(() => {
    saveToLocalStorage('mallo_visits', visits);
  }, [visits]);

  // 문자열 정규화 함수: 공백, 특수문자 제거하여 비교
  // visit과 customer를 합쳐서 정규화된 visit 객체 반환 (customerName, customerPhone 보정)
  const normalizeRecordWithCustomer = (visit, customer) => {
    if (!visit) return null;
    
    return {
      ...visit,
      customerName: visit.customerName || customer?.name || '미기재',
      customerPhone: visit.customerPhone || customer?.phone || '미기재',
      // detail이 없으면 기본 구조 생성
      detail: visit.detail || {
        sections: visit.summary ? [
          { title: '시술 내용', content: [visit.summary] }
        ] : []
      },
      // title이 없으면 summary 사용
      title: visit.title || visit.summary || '',
      // tags는 배열로 보장
      tags: visit.tags || []
    };
  };

  const normalize = (text) => {
    if (!text || typeof text !== 'string') return '';
    return text
      .toLowerCase()
      .replace(/\s+/g, '')      // 모든 공백 제거
      .replace(/[#\-,.]/g, '')  // #, -, , . 같은 기호 제거
      .trim();
  };

  // 자동 어근 키워드 생성 함수
  const generateAutoKeywords = (normalizedLabel) => {
    const len = normalizedLabel.length;
    const results = new Set();

    // 너무 짧은 단어는 건드리지 않는다.
    if (len >= 3) {
      // 마지막 글자 하나 뗀 버전
      results.add(normalizedLabel.slice(0, len - 1));
    }
    if (len >= 4) {
      // 마지막 글자 두 개 뗀 버전
      results.add(normalizedLabel.slice(0, len - 2));
    }

    return Array.from(results);
  };

  // 키워드 파싱 함수: 쉼표로 구분된 문자열을 배열로 변환
  const parseKeywords = (input) => {
    if (!input || typeof input !== 'string') return [];
    return input
      .split(',')
      .map((kw) => kw.trim())
      .filter((kw) => kw.length > 0);
  };

  // visitTags를 객체 배열로 변환하는 함수
  const convertVisitTagsToArray = (tags) => {
    const result = [];
    Object.keys(tags).forEach(category => {
      tags[category].forEach((label, index) => {
        // 이미 객체인 경우와 문자열인 경우 모두 처리
        if (typeof label === 'object' && label.label) {
          result.push({
            id: label.id || `${category}-${index}`,
            label: label.label,
            category: category,
            keywords: label.keywords || []
          });
        } else {
          result.push({
            id: `${category}-${index}-${label}`,
            label: label,
            category: category,
            keywords: []
          });
        }
      });
    });
    return result;
  };

  // visitTags가 변경될 때 allVisitTags 업데이트
  useEffect(() => {
    const converted = convertVisitTagsToArray(visitTags);
    setAllVisitTags(converted);
  }, [visitTags]);

  // customerTags를 객체 배열로 변환하는 함수
  const convertCustomerTagsToArray = (tags) => {
    const result = [];
    Object.keys(tags).forEach(category => {
      tags[category].forEach((label, index) => {
        if (typeof label === 'object' && label.label) {
          result.push({
            id: label.id || `${category}-${index}`,
            label: label.label,
            category: category,
            keywords: label.keywords || []
          });
        } else {
          result.push({
            id: `${category}-${index}-${label}`,
            label: label,
            category: category,
            keywords: []
          });
        }
      });
    });
    return result;
  };

  // customerTags가 변경될 때 allCustomerTags 업데이트
  useEffect(() => {
    const converted = convertCustomerTagsToArray(customerTags);
    setAllCustomerTags(converted);
  }, [customerTags]);

  // payment가 customerTags에 있으면 visitTags로 마이그레이션
  useEffect(() => {
    if (customerTags.payment && customerTags.payment.length > 0) {
      // customerTags의 payment를 visitTags로 이동 (중복 제거)
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
      // customerTags에서 payment 제거
      setCustomerTags(prev => {
        const { payment, ...rest } = prev;
        return rest;
      });
      console.log('[태그 마이그레이션] payment를 customerTags에서 visitTags로 이동');
    }
  }, [customerTags.payment]); // customerTags.payment가 변경될 때만 실행

  // 태그 매칭 함수: 원본 텍스트 또는 요약 텍스트에서 태그 찾기 (정규화된 키워드 매칭 + 어근 매칭)
  const matchTagsFromSummary = (sourceText, tags) => {
    if (!sourceText || !tags || tags.length === 0) return [];
    
    // 빈 텍스트나 공백만 있는 경우 매칭하지 않음
    const trimmedText = sourceText.trim();
    if (!trimmedText || trimmedText.length === 0) return [];
    
    const normSummary = normalize(sourceText);
    
    // 정규화된 텍스트도 비어있으면 매칭하지 않음
    if (!normSummary || normSummary.length === 0) return [];
    
    console.log('[태그 매칭] 정규화된 텍스트:', normSummary.substring(0, 200));
    console.log('[태그 매칭] 전체 태그 개수:', tags.length);
    
    const matched = tags
      .filter((tag) => {
        // 1) 기본 키(라벨 + 수동 키워드)
        const baseKeys = [tag.label, ...(tag.keywords || [])];

        // 2) 기본 키들을 정규화
        const normalizedKeys = baseKeys
          .map((key) => normalize(key))
          .filter((k) => k.length > 0);

        // 3) 각 키에서 자동으로 어근 키워드를 생성
        const autoKeys = normalizedKeys
          .flatMap((nk) => generateAutoKeywords(nk))
          .filter((k) => k.length > 0);

        // 4) 최종적으로 비교에 사용할 모든 키
        const allKeys = [...normalizedKeys, ...autoKeys];

        // 5) 요약/원본 안에 어느 하나라도 포함되면 매칭
        const isMatched = allKeys.some((normKey) => {
          const found = normSummary.includes(normKey);
          if (found) {
            console.log('[태그 매칭] 매칭 성공:', tag.label, '-> 키워드:', normKey, '(어근 포함)');
          }
          return found;
        });
        
        return isMatched;
      })
      .map((tag) => tag.id);
    
    console.log('[태그 매칭] 최종 매칭된 태그 ID:', matched);
    return matched;
  };

  // resultData가 변경될 때마다 태그 자동 추출 (isAutoTaggingEnabled에 따라)
  // 태그 매칭은 rawTranscript(원본 텍스트)를 우선 사용, 없으면 요약 텍스트 사용
  useEffect(() => {
    if (!isAutoTaggingEnabled) {
      // OFF일 경우: 자동 추천은 하지 않지만, 사용자가 수동으로 추가할 수 있도록 상태는 유지
      // recommendedTagIds는 초기화하지 않음 (이미 선택된 태그는 유지)
      // selectedTagIds도 초기화하지 않음 (사용자가 수동으로 선택한 태그 유지)
      setServiceTags([]);
      // setRecommendedTagIds([]); // 주석 처리: 수동 선택을 위해 유지
      // setSelectedTagIds([]); // 주석 처리: 수동 선택을 위해 유지
      setRecommendedCustomerTagIds([]);
      // setSelectedCustomerTagIds([]); // 주석 처리: 수동 선택을 위해 유지
      setNewCustomerTagIds([]);
      return;
    }
    
    // 원본 텍스트 우선 사용, 없으면 요약 텍스트 사용
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
    
    // 텍스트가 비어있거나 의미있는 내용이 없으면 태그 매칭하지 않음
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
    
    // 방문 태그 선택 UI용: 원본 텍스트에서 태그 매칭
    if (allVisitTags.length > 0) {
      const matched = matchTagsFromSummary(sourceText, allVisitTags);
      console.log('[방문 태그 자동 선택] 원본 텍스트:', sourceText?.substring(0, 100));
      console.log('[방문 태그 자동 선택] 매칭된 태그 ID:', matched);
      const matchedTagLabels = matched.map(id => {
        const tag = allVisitTags.find(t => t.id === id);
        return tag ? tag.label : id;
      });
      console.log('[방문 태그 자동 선택] 매칭된 태그 라벨:', matchedTagLabels);
      setRecommendedTagIds(matched);
      // 기본값: 추천된 태그는 전부 ON 상태
      setSelectedTagIds(matched);
    }
    
    // 고객 특징 태그 선택 UI용: 원본 텍스트에서 태그 매칭
    if (allCustomerTags.length > 0) {
      console.log('[태그 자동 선택] sourceText 길이:', sourceText?.length);
      console.log('[태그 자동 선택] sourceText 처음 200자:', sourceText?.substring(0, 200));
      console.log('[태그 자동 선택] allCustomerTags 개수:', allCustomerTags.length);
      console.log('[태그 자동 선택] allCustomerTags 샘플 (처음 5개):', allCustomerTags.slice(0, 5).map(t => ({ id: t.id, label: t.label, category: t.category })));
      
      // 방문 횟수 확인 (2 이상이면 "신규" 태그 제외)
      const visitCount = selectedCustomerForRecord?.visitCount || 0;
      const shouldExcludeNewTag = visitCount >= 2;
      
      // "신규" 태그 ID 찾기
      const newTag = allCustomerTags.find(t => t.label === '신규');
      const newTagId = newTag?.id;
      
      // 태그 매칭 (방문 횟수가 2 이상이면 "신규" 태그 제외)
      let matchedCustomerTags = matchTagsFromSummary(sourceText, allCustomerTags);
      
      // 방문 횟수가 2 이상이면 "신규" 태그 제거
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
      
      // 텍스트가 비어있으면 태그를 선택하지 않음 (기존 고객 태그도 표시하지 않음)
      if (matchedCustomerTags.length === 0) {
        setSelectedCustomerTagIds([]);
        setNewCustomerTagIds([]);
      } else {
        // 기존 고객 태그와 AI가 찾은 태그 병합 (Smart Merge)
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
          
          // 기존 태그 ID 찾기
          const existingTagIds = allCustomerTags
            .filter(tag => existingTagLabels.includes(tag.label))
            .map(tag => tag.id);
          
          // 방문 횟수가 2 이상이면 "신규" 태그를 제거하고 "기존" 태그 추가
          let finalExistingTagIds = existingTagIds;
          if (shouldExcludeNewTag) {
            // "신규" 태그 제거
            finalExistingTagIds = existingTagIds.filter(id => id !== newTagId);
            
            // "기존" 태그 추가 (없으면)
            const existingTag = allCustomerTags.find(t => t.label === '기존');
            const existingTagId = existingTag?.id;
            if (existingTagId && !finalExistingTagIds.includes(existingTagId)) {
              finalExistingTagIds = [...finalExistingTagIds, existingTagId];
            }
          }
          
          // AI가 찾은 새 태그 ID 찾기
          const newTagIds = matchedCustomerTags.filter(id => !finalExistingTagIds.includes(id));
          
          // 병합: 기존 태그 + AI가 찾은 새 태그 (중복 제거)
          const mergedTagIds = [...new Set([...finalExistingTagIds, ...matchedCustomerTags])];
          setSelectedCustomerTagIds(mergedTagIds);
          setNewCustomerTagIds(newTagIds);
        } else {
          // 신규 고객인 경우 AI가 찾은 태그만 사용
          setSelectedCustomerTagIds(matchedCustomerTags);
          setNewCustomerTagIds(matchedCustomerTags);
        }
      }
    }
  }, [resultData, rawTranscript, isAutoTaggingEnabled, allVisitTags, allCustomerTags, selectedCustomerForRecord]);

  // 고객 상세 화면 진입 시 방문 기록에서 키워드 감지하여 customerTags 자동 업데이트
  useEffect(() => {
    if (currentScreen === 'CustomerDetail' && selectedCustomerId) {
      const customer = customers.find(c => c.id === selectedCustomerId);
      const customerVisits = visits[selectedCustomerId] || [];
      
      if (customer && customerVisits.length > 0) {
        // 모든 방문 기록의 텍스트를 수집
        const allVisitContent = customerVisits
          .map(visit => {
            // content, summary, title 필드 확인
            const content = visit.content || visit.summary || visit.title || '';
            // detail.sections의 모든 content 수집
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
        
        // "임산부" 키워드 감지
        if (allVisitContent.includes('임산부')) {
          const cautionTags = updatedCustomerTags.caution || [];
          if (!cautionTags.includes('임산부')) {
            updatedCustomerTags.caution = [...cautionTags, '임산부'];
            needsUpdate = true;
            console.log('[고객 태그 자동 감지] "임산부" 태그 추가됨');
          }
        }
        
        // "글루알러지" 키워드 감지
        if (allVisitContent.includes('글루알러지') || allVisitContent.includes('글루 알러지')) {
          const cautionTags = updatedCustomerTags.caution || [];
          if (!cautionTags.includes('글루알러지')) {
            updatedCustomerTags.caution = [...cautionTags, '글루알러지'];
            needsUpdate = true;
            console.log('[고객 태그 자동 감지] "글루알러지" 태그 추가됨');
          }
        }
        
        // "눈물많음" 또는 "눈물 많음" 키워드 감지
        if (allVisitContent.includes('눈물많음') || allVisitContent.includes('눈물 많음') || allVisitContent.includes('눈물이 많')) {
          const cautionTags = updatedCustomerTags.caution || [];
          if (!cautionTags.includes('눈물많음')) {
            updatedCustomerTags.caution = [...cautionTags, '눈물많음'];
            needsUpdate = true;
            console.log('[고객 태그 자동 감지] "눈물많음" 태그 추가됨');
          }
        }
        
        // 방문 횟수가 2 이상이면 "신규" 태그를 "기존"으로 변경
        const visitCount = customer.visitCount || 0;
        if (visitCount >= 2) {
          const patternTags = updatedCustomerTags.pattern || [];
          const hasNewTag = patternTags.includes('신규');
          const hasExistingTag = patternTags.includes('기존');
          
          if (hasNewTag || !hasExistingTag) {
            // "신규" 태그 제거
            updatedCustomerTags.pattern = patternTags.filter(tag => tag !== '신규');
            // "기존" 태그 추가 (없으면)
            if (!updatedCustomerTags.pattern.includes('기존')) {
              updatedCustomerTags.pattern = [...updatedCustomerTags.pattern, '기존'];
            }
            needsUpdate = true;
            console.log('[고객 태그 자동 감지] 방문 횟수 2 이상 - "신규" → "기존" 태그 변경됨');
          }
        }
        
        // 업데이트가 필요하면 customer 상태 업데이트
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

  // visitTags 변경 시 localStorage에 저장
  useEffect(() => {
    try {
      localStorage.setItem('visitTags', JSON.stringify(visitTags));
      console.log('[localStorage] visitTags 저장됨:', visitTags);
    } catch (error) {
      console.error('[localStorage] visitTags 저장 실패:', error);
    }
  }, [visitTags]);

  // customerTags 변경 시 localStorage에 저장
  useEffect(() => {
    try {
      localStorage.setItem('customerTags', JSON.stringify(customerTags));
      console.log('[localStorage] customerTags 저장됨:', customerTags);
    } catch (error) {
      console.error('[localStorage] customerTags 저장 실패:', error);
    }
  }, [customerTags]);

  // 컴포넌트 마운트 시 마이그레이션이 필요하면 localStorage에 저장
  useEffect(() => {
    try {
      // 현재 상태를 localStorage에 저장 (마이그레이션된 형태로)
      const currentVisitTags = visitTags;
      const savedVisitTags = localStorage.getItem('visitTags');
      if (savedVisitTags) {
        const parsed = JSON.parse(savedVisitTags);
        const migrated = migrateTagsToObjects(parsed);
        // 마이그레이션이 발생했다면 다시 저장
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
        // 마이그레이션이 발생했다면 다시 저장
        if (JSON.stringify(parsed) !== JSON.stringify(migrated)) {
          localStorage.setItem('customerTags', JSON.stringify(migrated));
          console.log('[localStorage] customerTags 마이그레이션 완료 및 저장');
          console.log('[localStorage] customerTags - caution 태그 개수:', migrated.caution?.length || 0);
        }
      }
    } catch (error) {
      console.error('[localStorage] 태그 데이터 마이그레이션 실패:', error);
    }
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  // 컴포넌트 마운트 시 MOCK_CUSTOMERS 데이터를 localStorage에 강제 업데이트
  useEffect(() => {
    // MOCK_CUSTOMERS의 모든 고객 데이터를 강제로 적용
    setCustomers(prev => {
      // MOCK_CUSTOMERS를 기준으로 새 배열 생성 (기존 데이터와 병합)
      const updated = [];
      
      // 먼저 MOCK_CUSTOMERS 데이터 추가
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
      
      // 기존 customers에서 MOCK_CUSTOMERS에 없는 고객들 추가 (customerTags 기본 구조 포함)
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

    // MOCK_CUSTOMERS의 history를 visits 형식으로 변환
    const historyToVisits = {};
    MOCK_CUSTOMERS.forEach(customer => {
      if (customer.history && customer.history.length > 0) {
        historyToVisits[customer.id] = customer.history.map((h, idx) => {
          // date 형식 변환: "2025.11.28 15:00" -> "2025-11-28", "15:00"
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

    // visits 업데이트
    if (Object.keys(historyToVisits).length > 0) {
      setVisits(prev => ({
        ...prev,
        ...historyToVisits
      }));
    }
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  // resultData 변경 시 customerInfo 동기화 (AI 추출 정보를 tempName, tempPhone에 반영)
  useEffect(() => {
    if (resultData && resultData.customerInfo && !selectedCustomerForRecord) {
      // 신규 고객일 때만 AI 추출 정보를 반영
      const extractedName = resultData.customerInfo.name;
      const extractedPhone = resultData.customerInfo.phone;
      
      // null이 아니고 빈 문자열이 아니며, 현재 값이 비어있을 때만 설정
      if (extractedName && extractedName !== 'null' && extractedName.trim() !== '' && !tempName) {
        setTempName(extractedName.trim());
      }
      if (extractedPhone && extractedPhone !== 'null' && extractedPhone.trim() !== '' && !tempPhone) {
        setTempPhone(extractedPhone.trim());
      }
    }
  }, [resultData, selectedCustomerForRecord]);

  // 에러 바운더리: 개발 중 오류 확인
  useEffect(() => {
    console.log('App mounted, currentScreen:', currentScreen);
  }, [currentScreen]);

  // 홈 화면으로 돌아올 때 검색창 리셋
  useEffect(() => {
    if (currentScreen === 'Home') {
      setSearchQuery('');
    }
  }, [currentScreen]);

  // 고객이 변경될 때 방문 히스토리 보기 개수 리셋
  useEffect(() => {
    if (currentScreen === 'CustomerDetail') {
      setVisibleVisitCount(10);
    }
  }, [selectedCustomerId, currentScreen]);

  // customers에서 "#신규" 태그 제거
  useEffect(() => {
    setCustomers(prev => {
      const updated = prev.map(customer => ({
        ...customer,
        tags: (customer.tags || []).filter(tag => tag !== '#신규')
      }));
      // 변경사항이 있으면 localStorage에도 저장
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
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  const timerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const currentSector = BEAUTY_THEME;

  const startRecording = async () => {
    try {
      // 마이크 권한 요청 및 스트림 가져오기
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // MediaRecorder 초기화
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // 녹음 데이터 수집
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // 녹음 시작
      mediaRecorder.start();
      
    setCurrentScreen('Record');
    setRecordingTime(0);
    timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (error) {
      console.error('녹음 시작 오류:', error);
      alert(`마이크 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.\n\n오류: ${error.message}`);
      setCurrentScreen('Home');
    }
  };

  // 녹음 취소 함수
  const cancelRecording = () => {
    // 타이머 정리
    if (timerRef.current) {
    clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // 녹음 중지
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // 스트림 정리
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // 상태 초기화
    setRecordingTime(0);
    setRecordState('idle');
    setResultData(null);
    setTranscript('');
    setRawTranscript('');
    setRecordingDate(null);
    audioChunksRef.current = [];
    
    // 홈 화면으로 이동
    setCurrentScreen('Home');
  };

  // 요약 텍스트가 확정됐을 때 공통으로 쓰는 함수
  const handleSummaryResult = (summaryData) => {
    // resultData 설정
    setResultData(summaryData);
    
    // AI가 추출한 고객 정보가 있으면 자동으로 채우기 (null 값 방어)
    if (summaryData.customerInfo) {
      const extractedName = summaryData.customerInfo.name;
      const extractedPhone = summaryData.customerInfo.phone;
      
      // null이 아니고 빈 문자열이 아닐 때만 설정
      if (extractedName && extractedName !== 'null' && extractedName.trim() !== '') {
        setTempName(extractedName.trim());
      }
      if (extractedPhone && extractedPhone !== 'null' && extractedPhone.trim() !== '') {
        setTempPhone(extractedPhone.trim());
      }
    }
    
    // resultData가 설정되면 Record 화면에서 result 상태로 표시됨
    // (resultData 변경 시 useEffect가 자동으로 태그 추출 및 상태 업데이트 수행)
    setRecordState('result');
  };

  const stopRecording = async () => {
    clearInterval(timerRef.current);
    
    // 처리 중 상태로 변경
    setIsProcessing(true);
    setRecordState('processing');

    try {
      // 녹음 중지
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      // 스트림 정리
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // 녹음이 완료될 때까지 대기
      await new Promise((resolve) => {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.onstop = resolve;
        } else {
          resolve();
        }
      });

      // 오디오 Blob 생성
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      audioChunksRef.current = [];

      // 녹음 시간이 너무 짧거나 오디오 파일이 너무 작으면 테스트용 더미 데이터로 시술 기록 화면 이동
      if (recordingTime < 0.5 || audioBlob.size < 1000) {
        // 테스트를 위해 더미 데이터로 시술 기록 화면으로 이동
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

      // 녹음 완료 시점의 날짜 저장
      setRecordingDate(new Date());

      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API 키가 설정되지 않았습니다. .env 파일에 VITE_OPENAI_API_KEY를 추가해주세요.');
      }

      // Step 1: Whisper API로 STT 변환
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'ko');

      const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        body: formData
      });

      if (!whisperResponse.ok) {
        const errorData = await whisperResponse.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || '';
        // "Audio file is too short" 같은 에러는 조용히 처리
        if (errorMessage.includes('too short') || errorMessage.includes('too short') || recordingTime < 1) {
          setIsProcessing(false);
          setRecordState('idle');
          setCurrentScreen('Home');
          return;
        }
        throw new Error(errorMessage || `Whisper API 요청 실패: ${whisperResponse.status}`);
      }

      const whisperData = await whisperResponse.json();
      const transcript = whisperData.text || '';
      
      // 녹음 시간이 너무 짧거나 transcript가 비어있으면 조용히 처리
      if (!transcript.trim() || recordingTime < 1) {
        // 에러 메시지 없이 조용히 홈으로 돌아가기
        setIsProcessing(false);
        setRecordState('idle');
        setCurrentScreen('Home');
        return;
      }

      setTranscript(transcript);
      setRawTranscript(transcript); // 원본 텍스트 저장 (태그 매칭용)

      // Step 2: GPT API로 요약
      // ROLE_JSON 생성
      const sectorMap = {
        'beauty': '뷰티/샵',
        'pt': '헬스/PT',
        'construction': '현장/건설',
        'sales': '영업/세일즈',
        'general': '사무/지식노동'
      };

      const roleJson = {
        role_guess: '뷰티샵 원장',
        sector: '뷰티/샵',
        confidence: 1.0,
        need_user_confirmation: false,
        reason_short: '뷰티샵 원장님 전용 앱'
      };

      const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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

      if (!gptResponse.ok) {
        const errorData = await gptResponse.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `GPT API 요청 실패: ${gptResponse.status}`);
      }

      const gptData = await gptResponse.json();
      const content = gptData.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('GPT API 응답에 내용이 없습니다.');
      }

      // JSON 파싱
      const parsedResult = JSON.parse(content);
      
      // 결과 데이터 구조 검증 및 설정
      if (parsedResult.title && parsedResult.sections && Array.isArray(parsedResult.sections)) {
        // 공통 요약 처리 함수 호출
        handleSummaryResult(parsedResult);
      } else {
        throw new Error('API 응답 형식이 올바르지 않습니다.');
      }
    } catch (error) {
      console.error('API 호출 오류:', error);
      alert(`오류가 발생했습니다: ${error.message}\n\n개발자 도구 콘솔을 확인해주세요.`);
      // 오류 발생 시 홈으로 돌아가기
      setCurrentScreen('Home');
      setRecordState('idle');
    } finally {
      // 처리 완료 후 상태 초기화
      setIsProcessing(false);
    }
  };

  // 텍스트 기반 요약 테스트용 핸들러
  const handleTestSummarize = async () => {
    if (!testSummaryInput.trim()) return;

    setIsTestingSummary(true);
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API 키가 설정되지 않았습니다. .env 파일에 VITE_OPENAI_API_KEY를 추가해주세요.');
      }

      // Step 1: GPT API로 요약 생성 (음성 녹음과 동일한 프로세스)
      const sectorMap = {
        'beauty': '뷰티/샵',
        'pt': '헬스/PT',
        'construction': '현장/건설',
        'sales': '영업/세일즈',
        'general': '사무/지식노동'
      };

      const roleJson = {
        role_guess: '뷰티샵 원장',
        sector: '뷰티/샵',
        confidence: 1.0,
        need_user_confirmation: false,
        reason_short: '뷰티샵 원장님 전용 앱'
      };

      const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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

      if (!gptResponse.ok) {
        const errorData = await gptResponse.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `GPT API 요청 실패: ${gptResponse.status}`);
      }

      const gptData = await gptResponse.json();
      const content = gptData.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('GPT API 응답에 내용이 없습니다.');
      }

      // JSON 파싱
      const parsedResult = JSON.parse(content);
      
      // 결과 데이터 구조 검증 및 설정
      if (parsedResult.title && parsedResult.sections && Array.isArray(parsedResult.sections)) {
        // 공통 요약 처리 함수 호출
        handleSummaryResult(parsedResult);
        
        // transcript도 설정 (태그 분석에 사용될 수 있음)
        setTranscript(testSummaryInput);
        setRawTranscript(testSummaryInput); // 테스트 입력을 원본처럼 사용
        setRecordingDate(new Date());
      } else {
        throw new Error('API 응답 형식이 올바르지 않습니다.');
      }
    } catch (e) {
      console.error("테스트 요약 실패", e);
      alert(`테스트 요약 실패: ${e.message}`);
    } finally {
      setIsTestingSummary(false);
    }
  };

  // 컴포넌트 언마운트 시 녹음 정리
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
    setCurrentScreen('Home');
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

  // 전화번호 자동 포맷팅 함수
  const formatPhoneNumber = (value) => {
    // 숫자가 아닌 문자 모두 제거
    const numbers = value.replace(/[^0-9]/g, '');
    
    // 길이에 따라 포맷팅
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else if (numbers.length <= 11) {
      // 010-XXXX-XXXX 형식
      if (numbers.startsWith('010') || numbers.startsWith('011') || numbers.startsWith('016') || numbers.startsWith('017') || numbers.startsWith('018') || numbers.startsWith('019')) {
        return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
      } else {
        // 지역번호 (02, 031, 032 등)
        if (numbers.startsWith('02')) {
          return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6)}`;
        } else {
          return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
        }
      }
    } else {
      // 11자리 초과 시 앞 11자리만 사용
      const limited = numbers.slice(0, 11);
      if (limited.startsWith('010') || limited.startsWith('011') || limited.startsWith('016') || limited.startsWith('017') || limited.startsWith('018') || limited.startsWith('019')) {
        return `${limited.slice(0, 3)}-${limited.slice(3, 7)}-${limited.slice(7)}`;
      } else if (limited.startsWith('02')) {
        return `${limited.slice(0, 2)}-${limited.slice(2, 6)}-${limited.slice(6)}`;
      } else {
        return `${limited.slice(0, 3)}-${limited.slice(3, 7)}-${limited.slice(7)}`;
      }
    }
  };

  // 전화번호 입력 핸들러
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

  // --- Screens ---

  const renderLogin = () => {
    const handleLogin = () => {
      // 간단한 로그인 로직 (실제로는 API 호출)
      if (email && password) {
        setIsLoggedIn(true);
        setActiveTab('Home');
        setCurrentScreen('Home');
      } else {
        alert('이메일과 비밀번호를 입력해주세요.');
      }
    };

    return (
      <div className="flex flex-col h-full items-center justify-center p-8" style={{ backgroundColor: '#F2F0E6' }}>
        <div className="w-full max-w-sm space-y-10">
          {/* 로고 */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl shadow-md mb-6" style={{ backgroundColor: '#C9A27A' }}>
              <Scissors size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-3" style={{ color: '#232323' }}>Mallo</h1>
            <p className="font-light" style={{ color: '#232323' }}>오늘 시술, 말로만 기록하세요.</p>
      </div>

          {/* 로그인 폼 */}
          <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200 space-y-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: '#232323' }}>이메일</label>
                <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border border-gray-200 focus-within:border-[#C9A27A] focus-within:ring-1 focus-within:ring-[#C9A27A] transition-all">
                  <Mail size={18} style={{ color: '#C9A27A' }} />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@beauty.com"
                    className="w-full bg-transparent outline-none font-light placeholder-gray-400"
                    style={{ color: '#232323' }}
                    onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  />
        </div>
      </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: '#232323' }}>비밀번호</label>
                <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border border-gray-200 focus-within:border-[#C9A27A] focus-within:ring-1 focus-within:ring-[#C9A27A] transition-all">
                  <Lock size={18} style={{ color: '#C9A27A' }} />
              <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent outline-none font-light placeholder-gray-400"
                    style={{ color: '#232323' }}
                    onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
              </div>
            </div>

            <button 
              onClick={handleLogin}
              className="w-full py-4 rounded-2xl font-medium text-lg text-white shadow-md hover:shadow-lg hover:opacity-90 active:scale-[0.98] transition-all"
              style={{ backgroundColor: '#C9A27A' }}
            >
              로그인
            </button>
          </div>
      </div>
    </div>
  );
  };


  // 고객 태그 선택 모달 컴포넌트
  const CustomerTagPickerModal = ({ allCustomerTags, selectedTagIds, onClose, onChangeSelected }) => {
    const [activeCategory, setActiveCategory] = useState('all');
    const [search, setSearch] = useState('');

    const categoryLabels = {
      'all': '전체',
      'trait': '성향',
      'payment': '결제·예약',
      'pattern': '방문패턴',
      'caution': '주의'
    };

    const filteredTags = allCustomerTags.filter((tag) => {
      if (activeCategory !== 'all' && tag.category !== activeCategory) return false;
      if (!search) return true;
      return tag.label.toLowerCase().includes(search.toLowerCase());
    });

    const toggleTag = (tagId) => {
      onChangeSelected(
        selectedTagIds.includes(tagId)
          ? selectedTagIds.filter((id) => id !== tagId)
          : [...selectedTagIds, tagId]
      );
    };

    return (
      <div 
        className="fixed inset-0 z-50 flex items-end justify-center"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-t-3xl w-full max-w-md max-h-[80vh] flex flex-col shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-bold" style={{ color: '#232323' }}>고객 태그 추가</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              style={{ color: '#232323' }}
            >
              <X size={20} />
        </button>
      </header>

          {/* 카테고리 탭 */}
          <div className="flex gap-2 px-6 py-4 border-b border-gray-200 overflow-x-auto">
            {['all', 'trait', 'payment', 'pattern', 'caution'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? 'bg-[#C9A27A] text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {categoryLabels[cat]}
              </button>
            ))}
          </div>

          {/* 검색 */}
          <div className="px-6 py-4 border-b border-gray-200">
            <input
              type="text"
              placeholder="태그 검색…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-[#C9A27A] focus:ring-1 focus:ring-[#C9A27A]"
              style={{ color: '#232323', backgroundColor: '#FFFFFF' }}
            />
        </div>

          {/* 태그 리스트 */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="flex flex-wrap gap-2">
              {filteredTags.length === 0 ? (
                <p className="text-sm w-full text-center" style={{ color: '#232323', opacity: 0.5 }}>
                  해당 조건에 맞는 태그가 없어요.
                </p>
              ) : (
                filteredTags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
        <button 
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-[#C9A27A] text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}
                    >
                      {tag.label}
        </button>
                  );
                })
              )}
            </div>
          </div>

          <footer className="px-6 py-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl font-medium text-white shadow-sm hover:shadow-md hover:opacity-90 transition-all"
              style={{ backgroundColor: '#C9A27A' }}
            >
              완료
            </button>
          </footer>
        </div>
      </div>
    );
  };

  // 태그 선택 모달 컴포넌트
  const TagPickerModal = ({ allVisitTags, selectedTagIds, onClose, onChangeSelected }) => {
    const [activeCategory, setActiveCategory] = useState('all');
    const [search, setSearch] = useState('');

    const categoryLabels = {
      'all': '전체',
      'procedure': '시술',
      'design': '디자인',
      'care': '케어'
    };

    const filteredTags = allVisitTags.filter((tag) => {
      if (activeCategory !== 'all' && tag.category !== activeCategory) return false;
      if (!search) return true;
      return tag.label.toLowerCase().includes(search.toLowerCase());
    });

    const toggleTag = (tagId) => {
      onChangeSelected(
        selectedTagIds.includes(tagId)
          ? selectedTagIds.filter((id) => id !== tagId)
          : [...selectedTagIds, tagId]
      );
    };

    return (
      <div 
        className="fixed inset-0 z-50 flex items-end justify-center"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-t-3xl w-full max-w-md max-h-[80vh] flex flex-col shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-bold" style={{ color: '#232323' }}>태그 추가</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              style={{ color: '#232323' }}
            >
              <X size={20} />
            </button>
          </header>

          {/* 카테고리 탭 */}
          <div className="flex gap-2 px-6 py-4 border-b border-gray-200 overflow-x-auto">
            {['all', 'procedure', 'design', 'care'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? 'bg-[#C9A27A] text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {categoryLabels[cat]}
              </button>
            ))}
          </div>

          {/* 검색 */}
          <div className="px-6 py-4 border-b border-gray-200">
            <input
              type="text"
              placeholder="태그 검색…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-[#C9A27A] focus:ring-1 focus:ring-[#C9A27A]"
              style={{ color: '#232323', backgroundColor: '#FFFFFF' }}
            />
          </div>

          {/* 태그 리스트 */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="flex flex-wrap gap-2">
              {filteredTags.length === 0 ? (
                <p className="text-sm w-full text-center" style={{ color: '#232323', opacity: 0.5 }}>
                  해당 조건에 맞는 태그가 없어요.
                </p>
              ) : (
                filteredTags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-[#C9A27A] text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}
                    >
                      {tag.label}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <footer className="px-6 py-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl font-medium text-white shadow-sm hover:shadow-md hover:opacity-90 transition-all"
              style={{ backgroundColor: '#C9A27A' }}
            >
              완료
            </button>
          </footer>
        </div>
    </div>
  );
  };

  // renderEdit 함수는 EditScreen 컴포넌트로 이동됨

      if (!editCustomerName.trim()) {
        alert('이름은 필수입니다.');
        return;
      }

      // 편집된 고객 특징 태그를 카테고리별로 분류
      const updatedCustomerTags = {
        caution: [],
        trait: [],
        payment: [],
        pattern: []
      };
      
      editCustomerTagIds.forEach(tagId => {
        const tag = allCustomerTags.find(t => t.id === tagId);
        if (tag) {
          const category = tag.category;
          if (updatedCustomerTags[category]) {
            updatedCustomerTags[category] = [...updatedCustomerTags[category], tag.label];
          } else {
            updatedCustomerTags[category] = [tag.label];
          }
        }
      });

      // 고객 정보 업데이트
      setCustomers(prev => {
        const updated = prev.map(c => {
          if (c.id === selectedCustomerId) {
            return {
              ...c,
              name: editCustomerName.trim(),
              phone: editCustomerPhone.trim() || null,
              tags: editCustomerTags.filter(tag => tag.trim() !== ''), // 레거시 태그 유지
              customerTags: updatedCustomerTags, // 고객 특징 태그 업데이트
              memo: editCustomerMemo.trim() || null
            };
          }
          return c;
        });
        
        // localStorage에 저장
        saveToLocalStorage('mallo_customers', updated);
        return updated;
      });

      // 관련된 visits의 customerName, customerPhone도 업데이트
      setVisits(prev => {
        const updated = { ...prev };
        if (updated[selectedCustomerId]) {
          updated[selectedCustomerId] = updated[selectedCustomerId].map(visit => ({
            ...visit,
            customerName: editCustomerName.trim(),
            customerPhone: editCustomerPhone.trim() || null
          }));
        }
        localStorage.setItem('visits', JSON.stringify(updated));
        return updated;
      });

      // 편집 화면 닫기
      setEditCustomerName('');
      setEditCustomerPhone('');
      setEditCustomerTags([]);
      setEditCustomerTagIds([]);
      setEditCustomerMemo('');
      setNewTag('');
      setCurrentScreen('CustomerDetail');
    };

    const handleCancel = () => {
      setEditCustomerName('');
      setEditCustomerPhone('');
      setEditCustomerTags([]);
      setEditCustomerTagIds([]);
      setEditCustomerMemo('');
      setNewTag('');
      setCurrentScreen('CustomerDetail');
    };

    const addTag = () => {
      if (newTag.trim() && !editCustomerTags.includes(newTag.trim())) {
        setEditCustomerTags([...editCustomerTags, newTag.trim()]);
        setNewTag('');
      }
    };

    const removeTag = (index) => {
      setEditCustomerTags(editCustomerTags.filter((_, i) => i !== index));
    };

  return (
      <div className="flex flex-col h-full" style={{ backgroundColor: '#F2F0E6' }}>
        {/* Header */}
        <header className="bg-white px-8 py-6 sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 shadow-sm">
          <button 
            onClick={handleCancel}
            className="p-2 hover:bg-gray-100 rounded-2xl transition-colors" 
            style={{ color: '#232323' }}
          >
            <ArrowLeft size={24} />
          </button>
          <h2 className="font-bold text-lg" style={{ color: '#232323' }}>고객 정보 편집</h2>
          <button 
            onClick={handleComplete}
            className="px-4 py-2 rounded-2xl font-medium text-white shadow-sm hover:shadow-md hover:opacity-90 transition-all"
            style={{ backgroundColor: '#C9A27A' }}
          >
            완료
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8 space-y-5">
          {/* 이름 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-bold mb-2" style={{ color: '#232323' }}>이름 *</label>
            <input
              type="text"
              value={editCustomerName}
              onChange={(e) => setEditCustomerName(e.target.value)}
              className="w-full px-3 py-1.5 rounded-2xl border border-gray-200 focus:border-[#C9A27A] focus:outline-none transition-colors"
              style={{ color: '#232323', height: '36px' }}
              placeholder="고객 이름을 입력하세요"
            />
      </div>

          {/* 전화번호 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-bold mb-2" style={{ color: '#232323' }}>전화번호</label>
            <input
              type="tel"
              value={editCustomerPhone}
              onChange={(e) => setEditCustomerPhone(e.target.value)}
              className="w-full px-3 py-1.5 rounded-2xl border border-gray-200 focus:border-[#C9A27A] focus:outline-none transition-colors"
              style={{ color: '#232323', height: '36px' }}
              placeholder="010-0000-0000"
            />
          </div>

          {/* 고객 특징 태그 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2" style={{ color: '#232323' }}>고객 특징 태그</label>
              <p className="text-sm" style={{ color: '#232323', opacity: 0.7 }}>
                고객의 특징을 태그로 관리할 수 있습니다.
              </p>
            </div>

            {/* 태그 칩들 */}
            <div className="flex flex-wrap gap-2 mb-4">
              {editCustomerTagIds.length === 0 ? (
                <p className="text-sm" style={{ color: '#232323', opacity: 0.5 }}>
                  태그가 없어요. 아래 버튼에서 추가할 수 있어요.
                </p>
              ) : (
                editCustomerTagIds.map((tagId) => {
                  const tag = allCustomerTags.find((t) => t.id === tagId);
                  if (!tag) return null;

                  // 주의 태그만 빨간색, 나머지는 회색
                  const isCaution = tag.category === 'caution';

                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        setEditCustomerTagIds((prev) =>
                          prev.filter((id) => id !== tag.id)
                        );
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border flex items-center gap-1 ${
                        isCaution 
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}
                    >
                      {tag.label}
                      <X size={14} />
                    </button>
                  );
                })
              )}
            </div>

            {/* 태그 더 추가하기 버튼 */}
            <button
              type="button"
              onClick={() => setIsEditCustomerTagPickerOpen(true)}
              className="w-full py-2.5 rounded-xl text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              + 태그 더 추가하기
            </button>
          </div>

          {/* 메모 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-bold mb-3" style={{ color: '#232323' }}>메모</label>
            <textarea
              value={editCustomerMemo}
              onChange={(e) => setEditCustomerMemo(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[#C9A27A] focus:outline-none transition-colors resize-none"
              style={{ color: '#232323', minHeight: '100px' }}
              placeholder="고객에 대한 중요한 메모를 입력하세요"
              rows={4}
            />
          </div>
          
          {/* 고객 삭제 버튼 (스크롤 끝에만 표시) */}
          <div className="flex justify-center p-6 mt-5">
            <button 
              onClick={() => {
                if (window.confirm(`정말로 "${editCustomerName}" 고객을 삭제하시겠습니까?\n고객 정보와 모든 방문 기록이 삭제되며 복구할 수 없습니다.`)) {
                  const customerId = selectedCustomerId;
                  
                  // 고객 삭제
                  setCustomers(prev => prev.filter(c => c.id !== customerId));
                  
                  // 해당 고객의 방문 기록 삭제
                  setVisits(prev => {
                    const updated = { ...prev };
                    delete updated[customerId];
                    return updated;
                  });
                  
                  // 상태 초기화
                  setEditCustomerName('');
                  setEditCustomerPhone('');
                  setEditCustomerTags([]);
                  setEditCustomerTagIds([]);
                  setEditCustomerMemo('');
                  setNewTag('');
                  
                  // History 화면으로 이동
                  setSelectedCustomerId(null);
                  setCurrentScreen('History');
                }
              }}
              className="px-6 py-2.5 rounded-xl text-sm font-medium text-white shadow-sm hover:shadow-md hover:opacity-90 transition-all"
              style={{ backgroundColor: '#EF4444' }}
            >
              고객 삭제
            </button>
          </div>
        </main>

        {/* 고객 특징 태그 선택 모달 */}
        {isEditCustomerTagPickerOpen && (
          <CustomerTagPickerModal
            allCustomerTags={allCustomerTags}
            selectedTagIds={editCustomerTagIds}
            onClose={() => setIsEditCustomerTagPickerOpen(false)}
            onChangeSelected={(nextSelected) => setEditCustomerTagIds(nextSelected)}
          />
        )}
    </div>
    );
  };

  // 히스토리 화면용 검색어 상태
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [expandedHistoryIds, setExpandedHistoryIds] = useState(new Set()); // 여러 개의 기록을 펼칠 수 있도록 Set 사용
  
  // 오늘 날짜 구하기
  const getTodayDateString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };
  
  const [selectedDate, setSelectedDate] = useState(getTodayDateString()); // 날짜 필터 (기본값: 오늘 날짜)

  // History 화면 진입 시 오늘 날짜로 리셋 (자동 펼치기 제거)
  useEffect(() => {
    if (currentScreen === 'History') {
      const todayStr = getTodayDateString();
      
      // 히스토리 화면 진입 시 항상 오늘 날짜로 리셋
      setSelectedDate(todayStr);
      
      // 모든 항목을 접힌 상태로 초기화
      setExpandedHistoryIds(new Set());
    }
  }, [currentScreen]);

  // 프로필 편집 화면 진입 시 현재 프로필 값으로 초기화
  useEffect(() => {
    if (currentScreen === 'profile-edit') {
      setEditProfileName(userProfile.name || '');
      setEditProfileEmail(userProfile.email || '');
      setEditProfilePhone(userProfile.phone || '');
    }
  }, [currentScreen, userProfile]);

  // 알림 설정 상태
  const [notificationEnabled, setNotificationEnabled] = useState(true);

  // renderProfileEdit 함수는 ProfileEditScreen 컴포넌트로 이동됨 (제거됨)
  const _renderProfileEdit_removed = () => {
    const handleSave = () => {
      setUserProfile(prev => ({
        ...prev,
        name: editProfileName.trim(),
        email: editProfileEmail.trim(),
        phone: editProfilePhone.trim()
      }));
      setCurrentScreen('Profile');
    };

    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: '#F2F0E6' }}>
        {/* 헤더 */}
        <header className="bg-white px-8 py-6 sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 shadow-sm">
          <button 
            onClick={() => setCurrentScreen('Profile')} 
            className="p-2 hover:bg-gray-100 rounded-2xl transition-colors" 
            style={{ color: '#232323' }}
          >
            <ArrowLeft size={24} />
          </button>
          <h2 className="font-bold text-base" style={{ color: '#232323' }}>프로필 수정</h2>
          <div className="w-10"></div> {/* 오른쪽 공간 맞추기 */}
        </header>

        {/* 내용 영역 */}
        <main className="flex-1 overflow-y-auto p-8 space-y-6 pb-32">
          {/* 프로필 사진 */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#C9A27A] to-[#B8946A] flex items-center justify-center text-4xl shadow-sm">
                👩‍⚕️
              </div>
              <button
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#C9A27A] flex items-center justify-center text-white shadow-md hover:bg-[#B8946A] transition-colors"
                onClick={() => {
                  // TODO: 프로필 사진 변경 기능 구현
                  alert('프로필 사진 변경 기능은 준비 중입니다.');
                }}
              >
                <Camera size={16} />
              </button>
            </div>
          </div>

          {/* 이름 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-bold mb-2" style={{ color: '#232323' }}>이름</label>
            <input
              type="text"
              value={editProfileName}
              onChange={(e) => setEditProfileName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#C9A27A] focus:outline-none transition-colors"
              style={{ color: '#232323' }}
              placeholder="이름을 입력하세요"
            />
          </div>

          {/* 연락처 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-bold mb-2" style={{ color: '#232323' }}>연락처</label>
            <input
              type="tel"
              value={editProfilePhone}
              onChange={(e) => setEditProfilePhone(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#C9A27A] focus:outline-none transition-colors"
              style={{ color: '#232323' }}
              placeholder="010-0000-0000"
            />
          </div>

          {/* 이메일 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-bold mb-2" style={{ color: '#232323' }}>이메일</label>
            <input
              type="email"
              value={editProfileEmail}
              onChange={(e) => setEditProfileEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#C9A27A] focus:outline-none transition-colors"
              style={{ color: '#232323' }}
              placeholder="email@example.com"
            />
          </div>
        </main>

        {/* 저장 버튼 (하단 고정) */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-200 shadow-lg z-30">
          <button
            onClick={handleSave}
            className="w-full py-4 rounded-xl font-bold text-white shadow-md hover:opacity-90 transition-all"
            style={{ backgroundColor: '#C9A27A' }}
          >
            저장 완료
          </button>
        </div>
      </div>
    );
  };



  const renderHistory = () => {
    // "미기재"와 "null"을 실제 고객 정보로 치환하는 helper 함수
    const overrideCustomerInfoLine = (line, customerInfo) => {
      if (!line) return line;
      
      let updated = line;

      // 이름이 미기재나 null로 되어있으면 실제 이름으로 교체
      if (customerInfo?.name) {
        updated = updated.replace(/이름:\s*미기재/g, `이름: ${customerInfo.name}`);
        updated = updated.replace(/이름\s*:\s*미기재/g, `이름: ${customerInfo.name}`);
        updated = updated.replace(/이름:\s*null/gi, `이름: ${customerInfo.name}`);
        updated = updated.replace(/이름\s*:\s*null/gi, `이름: ${customerInfo.name}`);
      }

      // 전화번호가 미기재나 null로 되어있으면 실제 전화번호로 교체
      if (customerInfo?.phone) {
        updated = updated.replace(/전화번호:\s*미기재/g, `전화번호: ${customerInfo.phone}`);
        updated = updated.replace(/전화번호\s*:\s*미기재/g, `전화번호: ${customerInfo.phone}`);
        updated = updated.replace(/전화번호:\s*null/gi, `전화번호: ${customerInfo.phone}`);
        updated = updated.replace(/전화번호\s*:\s*null/gi, `전화번호: ${customerInfo.phone}`);
      }

      return updated;
    };

    // 전체 시술 기록 수집 (모든 고객의 방문 기록)
    const allRecords = [];
    Object.keys(visits).forEach(customerId => {
      const customerVisits = visits[customerId];
      customerVisits.forEach(visit => {
        const customer = customers.find(c => c.id === parseInt(customerId));
        
        // serviceDate가 없으면 detail.sections에서 파싱 시도
        let finalServiceDate = visit.serviceDate;
        if (!finalServiceDate && visit.detail && visit.detail.sections) {
          const visitData = {
            sections: visit.detail.sections
          };
          finalServiceDate = extractServiceDateFromSummary(visitData);
        }
        
        allRecords.push({
          ...visit,
          serviceDate: finalServiceDate || visit.serviceDate || visit.date, // 파싱된 날짜 또는 기존 serviceDate 또는 date
          customerName: customer?.name || '알 수 없음',
          customerId: parseInt(customerId),
          customer: customer // 고객 정보 전체를 포함
        });
      });
    });

    // 오늘 날짜 구하기
    const todayStr = getTodayDateString();

    // 날짜 필터링 (serviceDate 우선, 없으면 detail.sections에서 파싱, 그래도 없으면 date 사용)
    const filteredRecords = selectedDate 
      ? allRecords.filter(record => {
          let baseDate = record.serviceDate;
          if (!baseDate && record.detail && record.detail.sections) {
            const visitData = { sections: record.detail.sections };
            baseDate = extractServiceDateFromSummary(visitData);
          }
          baseDate = baseDate || record.date;
          return baseDate === selectedDate;
        })
      : allRecords;

    // 날짜와 시간순 정렬 (serviceDate 우선, 없으면 detail.sections에서 파싱, 그래도 없으면 date 사용)
    filteredRecords.sort((a, b) => {
      let baseDateA = a.serviceDate;
      if (!baseDateA && a.detail && a.detail.sections) {
        const visitDataA = { sections: a.detail.sections };
        baseDateA = extractServiceDateFromSummary(visitDataA);
      }
      baseDateA = baseDateA || a.date;
      
      let baseDateB = b.serviceDate;
      if (!baseDateB && b.detail && b.detail.sections) {
        const visitDataB = { sections: b.detail.sections };
        baseDateB = extractServiceDateFromSummary(visitDataB);
      }
      baseDateB = baseDateB || b.date;
      
      const isAToday = baseDateA === todayStr;
      const isBToday = baseDateB === todayStr;
      
      // 오늘 날짜가 항상 맨 위
      if (isAToday && !isBToday) return -1;
      if (!isAToday && isBToday) return 1;
      
      // 날짜 비교
      const dateA = new Date(baseDateA);
      const dateB = new Date(baseDateB);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateB.getTime() - dateA.getTime(); // 최신 날짜가 먼저
      }
      // 같은 날짜면 시간 비교
      const timeA = a.time.split(':').map(Number);
      const timeB = b.time.split(':').map(Number);
      if (timeA[0] !== timeB[0]) return timeB[0] - timeA[0];
      return timeB[1] - timeA[1];
    });

    // 날짜 포맷팅 함수 (YYYY-MM-DD -> YYYY년 MM월 DD일)
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const [year, month, day] = dateStr.split('-');
      return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
    };

  return (
      <div className="flex flex-col h-full relative pb-[60px]" style={{ backgroundColor: '#F2F0E6' }}>
        {/* Header */}
        <header className="bg-white px-8 py-6 sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 shadow-sm">
        <button 
            onClick={() => {
              setActiveTab('Home');
              setCurrentScreen('Home');
            }}
            className="p-2 hover:bg-gray-100 rounded-2xl transition-colors"
            style={{ color: '#232323' }}
        >
            <ArrowLeft size={24} />
        </button>
          <div className="text-center">
            <h2 className="text-xl font-bold" style={{ color: '#232323' }}>전체 기록</h2>
            {selectedDate && (
              <p className="text-xs font-light mt-1" style={{ color: '#232323', opacity: 0.6 }}>
                {formatDate(selectedDate)} 기록
              </p>
            )}
      </div>
          <div className="w-10"></div> {/* 공간 맞추기용 */}
        </header>

        <main className="flex-1 overflow-y-auto p-8 space-y-4 pb-8" style={{ backgroundColor: '#F2F0E6' }}>
          {/* 날짜 필터 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <Calendar size={20} style={{ color: '#C9A27A' }} />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:border-[#C9A27A] focus:ring-1 focus:ring-[#C9A27A] outline-none transition-all text-sm"
                style={{ color: '#232323', backgroundColor: '#FFFFFF' }}
              />
              {selectedDate && (
                <button
                  onClick={() => {
                    setSelectedDate(getTodayDateString()); // 전체가 아닌 오늘 날짜로 초기화
                  }}
                  className="px-3 py-2 text-xs font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                  style={{ color: '#232323' }}
                >
                  오늘
                </button>
              )}
    </div>
          </div>

          {/* 전체 시술 기록 */}
          <div className="space-y-4">
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: '#232323' }}>
              <span>📅</span>
              <span>{selectedDate ? formatDate(selectedDate) + ' 기록' : '전체 시술 기록'}</span>
            </h3>
            
            {filteredRecords.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
                <p className="font-light text-base" style={{ color: '#232323', opacity: 0.6 }}>
                  {selectedDate ? '해당 날짜의 시술 기록이 없습니다' : '시술 기록이 없습니다'}
                </p>
              </div>
            ) : (
              filteredRecords.map((record) => {
                // summary 텍스트에서 고객 정보 추출하는 helper 함수
                const extractCustomerInfoFromSummary = (summary) => {
                  if (!summary) return { name: undefined, phone: undefined };

                  let name;
                  let phone;

                  // "이름: ○○○" 패턴 찾기 (뒤에 "/" 또는 줄끝까지)
                  const nameMatch = summary.match(/이름:\s*([^\/\n]+?)(?:\s*\/|$|\n)/);
                  if (nameMatch && nameMatch[1]) {
                    name = nameMatch[1].trim();
                    // "미기재", "null" 제거
                    if (name === '미기재' || name === 'null' || name.toLowerCase() === 'null' || !name) {
                      name = undefined;
                    }
                  }

                  // "전화번호: 010-0000-0000" 또는 "전화번호: null" 패턴 찾기
                  // 더 유연한 패턴: 전화번호 뒤에 "/", 줄바꿈, 또는 다른 필드가 올 수 있음
                  const phoneMatch = summary.match(/전화번호:\s*([^\n\/]+?)(?:\s*\/|\s*$|\s*\n|\s*구분)/);
                  if (phoneMatch && phoneMatch[1]) {
                    const phoneValue = phoneMatch[1].trim();
                    // "미기재", "null"이 아니고 숫자가 포함된 경우만 사용
                    if (phoneValue && 
                        phoneValue !== '미기재' && 
                        phoneValue !== 'null' && 
                        phoneValue.toLowerCase() !== 'null' &&
                        /[0-9]/.test(phoneValue)) {
                      phone = phoneValue;
                    }
                  }

                  return { name, phone };
                };

                // 고객 정보 찾기
                const customer = customers.find(c => c.id === record.customerId);
                const visitCount = customer?.visitCount || 0;
                
                // 신규/기존 구분 (방문 횟수가 1이면 신규, 아니면 기존)
                const status = visitCount === 1 ? '신규' : null;
                
                // summary 텍스트 수집 (record.detail.sections에서 "고객 기본 정보" 섹션 찾기)
                let summaryText = '';
                if (record.detail && record.detail.sections) {
                  const customerInfoSection = record.detail.sections.find(
                    section => section.title === '고객 기본 정보' || section.title?.includes('고객 기본')
                  );
                  if (customerInfoSection && customerInfoSection.content) {
                    // content 배열의 각 항목을 하나의 문자열로 합치기
                    summaryText = customerInfoSection.content.join(' ');
                  }
                }
                // fallback: record.summary나 record.title 사용
                if (!summaryText) {
                  summaryText = record.summary || record.title || '';
                }

                // summary에서 고객 정보 추출
                const { name: extractedName, phone: extractedPhone } = 
                  extractCustomerInfoFromSummary(summaryText);

                // displayName 계산 (우선순위: record.customerName > customer.name > extractedName > '이름 미기재')
                const displayName = 
                  record.customerName || 
                  customer?.name || 
                  extractedName || 
                  '이름 미기재';

                // displayPhone 계산 (우선순위: customer.phone > extractedPhone > 가짜 번호)
                let displayPhone = null;
                if (customer?.phone && customer.phone !== 'null' && customer.phone.toLowerCase() !== 'null') {
                  displayPhone = customer.phone;
                } else if (extractedPhone && extractedPhone !== 'null' && extractedPhone.toLowerCase() !== 'null') {
                  displayPhone = extractedPhone;
                } else {
                  // 가짜 번호 생성 (010-xxxx-xxxx 형식)
                  const fakePhone = `010-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
                  displayPhone = fakePhone;
                }

                // 날짜 포맷팅 (YYYY-MM-DD -> YYYY.MM.DD)
                const formatDateShort = (dateStr) => {
                  if (!dateStr) return '';
                  const [year, month, day] = dateStr.split('-');
                  return `${year}.${month}.${day}`;
                };
                
                // 시간 포맷팅 (HH:mm -> 오전/오후 HH:mm)
                const formatTimeDisplay = (timeStr) => {
                  if (!timeStr) return '';
                  // HH:mm:ss 또는 HH:mm 형식 모두 처리
                  const parts = timeStr.split(':');
                  const hour = parts[0];
                  const minute = parts[1] || '00';
                  const second = parts[2] || '00'; // 초 포함
                  const hourNum = parseInt(hour);
                  const period = hourNum >= 12 ? '오후' : '오전';
                  const displayHour = hourNum > 12 ? hourNum - 12 : (hourNum === 0 ? 12 : hourNum);
                  // HH:mm:ss 형식이면 초도 표시, 아니면 HH:mm만 표시
                  if (parts.length >= 3 && second !== '00') {
                    return `${period} ${displayHour}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
                  }
                  return `${period} ${displayHour}:${minute.padStart(2, '0')}`;
                };

                // 날짜/시간 통합 포맷팅
                const formatDateTime = (dateStr, timeStr) => {
                  const date = formatDateShort(dateStr);
                  const time = formatTimeDisplay(timeStr);
                  return `${date} · ${time}`;
                };

                // serviceDate 우선 사용, 없으면 date 사용 (날짜 표시용)
                let baseDate = record.serviceDate;
                if (!baseDate && record.detail && record.detail.sections) {
                  const visitData = {
                    sections: record.detail.sections
                  };
                  baseDate = extractServiceDateFromSummary(visitData);
                }
                baseDate = baseDate || record.date;
                
                // 날짜 포맷팅 (YYYY-MM-DD -> YYYY.MM.DD)
                const displayDate = formatDateShort(baseDate);
                
                // serviceDateTimeLabel 생성
                const serviceDateTimeLabel = extractServiceDateTimeLabel(record);
                
                // 전체 기록 화면에서는 시간 부분만 잘라서 사용 (HH:MM 예약)
                const reservationTimeLabel = serviceDateTimeLabel 
                  ? (() => {
                      // "2025-12-27 17:30 방문/예약" -> "17:30 예약"
                      const timeMatch = serviceDateTimeLabel.match(/(\d{2}):(\d{2})/);
                      if (timeMatch) {
                        const [, hh, mm] = timeMatch;
                        return `${hh}:${mm} 예약`;
                      }
                      return '';
                    })()
                  : '';
                
                // 고객 상세 페이지로 이동 핸들러
                const handleCustomerClick = (record) => {
                  if (!record || !record.customerId) return;
                  setSelectedCustomerId(record.customerId);
                  setCurrentScreen('CustomerDetail');
                };

                // 기록 상세 펼치기/접기 핸들러
                const handleRecordClick = (record) => {
                  const newExpanded = new Set(expandedHistoryIds);
                  if (newExpanded.has(record.id)) {
                    newExpanded.delete(record.id);
                  } else {
                    newExpanded.add(record.id);
                  }
                  setExpandedHistoryIds(newExpanded);
                };

                return (
                <div key={record.id} className="record-card bg-white rounded-xl shadow-sm">
                  <div className="record-card-main flex flex-col relative">
                    {/* 상단 정보: 시간과 고객 정보 */}
                    <div 
                      className="flex flex-col items-start relative"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRecordClick(record);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* 윗줄: 시간 */}
                      {reservationTimeLabel && (
                        <div className="mb-1">
                          <span className="text-xs font-bold text-[#C9A27A]">
                            {reservationTimeLabel}
                          </span>
                        </div>
                      )}
                      {/* 아랫줄: 이름과 전화번호 */}
                      {displayName && displayName !== '이름 미기재' && (
                        <div className="flex flex-row items-center">
                          <button
                            type="button"
                            style={{ padding: 0, margin: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCustomerClick(record);
                            }}
                          >
                            <span className="text-lg font-bold text-[#232323]">{displayName}</span>
                          </button>
                          {/* 번호 */}
                          {displayPhone && displayPhone !== '전화번호 미기재' && (
                            <span className="ml-2 text-xs text-gray-400">
                              / {displayPhone}
                            </span>
                          )}
                        </div>
                      )}
                      {/* 화살표 아이콘 (우측 끝) */}
                      <button 
                        className="absolute right-0 top-0" 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRecordClick(record);
                        }}
                      >
                        {expandedHistoryIds.has(record.id) ? (
                          <ChevronUp size={20} style={{ color: '#C9A27A' }} />
                        ) : (
                          <ChevronDown size={20} style={{ color: '#C9A27A' }} />
                        )}
                      </button>
                    </div>

                    {/* 아랫줄: 시술 내용 */}
                    <div 
                      className="mt-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRecordClick(record);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="text-sm text-[#232323]/80 font-medium truncate">
                        {(() => {
                          // title에서 고객 이름과 '기존 고객', '신규 고객' 텍스트 제거
                          let cleanedTitle = record.title || '';
                          if (cleanedTitle) {
                            // 고객 이름 제거
                            if (displayName && displayName !== '이름 미기재') {
                              cleanedTitle = cleanedTitle.replace(new RegExp(displayName, 'g'), '').trim();
                            }
                            // '기존 고객', '신규 고객' 등 제거
                            cleanedTitle = cleanedTitle.replace(/기존\s*고객/gi, '').trim();
                            cleanedTitle = cleanedTitle.replace(/신규\s*고객/gi, '').trim();
                            // 연속된 공백 정리
                            cleanedTitle = cleanedTitle.replace(/\s+/g, ' ').trim();
                          }
                          return cleanedTitle || record.title || '';
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  {/* Accordion 상세 내용 */}
                  {expandedHistoryIds.has(record.id) && record.detail && (
                    <div className="px-5 pb-5 space-y-5 border-t border-gray-200 pt-5 bg-gray-50" style={{ marginTop: '16px' }}>
                      {record.detail.sections.map((section, idx) => {
                        // 고객 정보 준비 (record.customer 또는 customer 객체 사용)
                        const customerInfoForOverride = record.customer || customer || {
                          name: displayName !== '이름 미기재' ? displayName : undefined,
                          phone: displayPhone !== '전화번호 미기재' ? displayPhone : undefined
                        };
                        
                        return (
                          <div key={idx}>
                            <h5 className="text-base font-bold mb-3" style={{ color: '#232323' }}>
                              {section.title}
                            </h5>
                            <ul className="space-y-2">
                              {section.content.map((item, i) => (
                                <li key={i} className="text-base leading-relaxed pl-4 font-light" style={{ color: '#232323', borderLeft: '2px solid #E5E7EB' }}>
                                  {overrideCustomerInfoLine(item, customerInfoForOverride)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                      
                      {/* 기록 일시 (카드 하단) */}
                      {(() => {
                        const recordedAt = record.recordedAt || record.createdAt || (record.date && record.time ? `${record.date}T${record.time}:00` : null);
                        return recordedAt ? (
                          <div className="visit-detail-footer">
                            기록 일시: {formatRecordDateTime(recordedAt)}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>
                );
              })
            )}
          </div>
        </main>
    </div>
  );
  };

  // 디버깅: 현재 화면 확인
  console.log('Current screen:', currentScreen);
  console.log('MOCK_CUSTOMERS:', MOCK_CUSTOMERS);
  console.log('BEAUTY_THEME:', BEAUTY_THEME);

  // Record 화면 내부 상태 관리 (recording, processing, result)
  const [recordState, setRecordState] = useState('idle'); // 'idle', 'recording', 'processing', 'result'
  const [isProcessing, setIsProcessing] = useState(false);

  // Record 화면 상태 업데이트
  useEffect(() => {
    if (currentScreen === 'Record') {
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

  // currentScreen 변경 시 activeTab 동기화
  useEffect(() => {
    if (currentScreen === 'Home') {
      setActiveTab('Home');
    } else if (currentScreen === 'History') {
      setActiveTab('History');
    } else if (currentScreen === 'Profile') {
      setActiveTab('Settings');
    }
  }, [currentScreen]);

  // 하단 네비게이션 탭 클릭 핸들러
  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'Home') {
      setCurrentScreen('Home');
    } else if (tabId === 'History') {
      setCurrentScreen('History');
    } else if (tabId === 'Settings') {
      setCurrentScreen('Profile');
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center font-sans" style={{ backgroundColor: '#F2F0E6' }}>
      <div className="w-full max-w-md h-full sm:h-[90vh] sm:rounded-[2rem] sm:shadow-md overflow-hidden relative border-0" style={{ backgroundColor: '#F2F0E6' }}>
        <ScreenRouter
          currentScreen={currentScreen}
          setCurrentScreen={setCurrentScreen}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          setIsLoggedIn={setIsLoggedIn}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          customers={customers}
          setCustomers={setCustomers}
          visits={visits}
          setVisits={setVisits}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCustomerId={selectedCustomerId}
          setSelectedCustomerId={setSelectedCustomerId}
          selectedCustomerForRecord={selectedCustomerForRecord}
          setSelectedCustomerForRecord={setSelectedCustomerForRecord}
          expandedVisitId={expandedVisitId}
          setExpandedVisitId={setExpandedVisitId}
          editingVisit={editingVisit}
          setEditingVisit={setEditingVisit}
          editingCustomer={editingCustomer}
          setEditingCustomer={setEditingCustomer}
          editCustomerName={editCustomerName}
          setEditCustomerName={setEditCustomerName}
          editCustomerPhone={editCustomerPhone}
          setEditCustomerPhone={setEditCustomerPhone}
          editCustomerTags={editCustomerTags}
          setEditCustomerTags={setEditCustomerTags}
          editCustomerMemo={editCustomerMemo}
          setEditCustomerMemo={setEditCustomerMemo}
          editCustomerTagIds={editCustomerTagIds}
          setEditCustomerTagIds={setEditCustomerTagIds}
          isEditCustomerTagPickerOpen={isEditCustomerTagPickerOpen}
          setIsEditCustomerTagPickerOpen={setIsEditCustomerTagPickerOpen}
          newTag={newTag}
          setNewTag={setNewTag}
          editProfileName={editProfileName}
          setEditProfileName={setEditProfileName}
          editProfileEmail={editProfileEmail}
          setEditProfileEmail={setEditProfileEmail}
          editProfilePhone={editProfilePhone}
          setEditProfilePhone={setEditProfilePhone}
          editingVisitTagIds={editingVisitTagIds}
          setEditingVisitTagIds={setEditingVisitTagIds}
          isEditingVisitTagPickerOpen={isEditingVisitTagPickerOpen}
          setIsEditingVisitTagPickerOpen={setIsEditingVisitTagPickerOpen}
          userProfile={userProfile}
          setUserProfile={setUserProfile}
          notificationEnabled={notificationEnabled}
          setNotificationEnabled={setNotificationEnabled}
          isAutoTaggingEnabled={isAutoTaggingEnabled}
          setIsAutoTaggingEnabled={setIsAutoTaggingEnabled}
          recordState={recordState}
          recordingTime={recordingTime}
          formatTime={formatTime}
          stopRecording={stopRecording}
          cancelRecording={cancelRecording}
          startRecording={startRecording}
          resultData={resultData}
          setResultData={setResultData}
          resetFlow={resetFlow}
          getTodayDate={getTodayDate}
          tempName={tempName}
          setTempName={setTempName}
          tempPhone={tempPhone}
          setTempPhone={setTempPhone}
          nameInputRef={nameInputRef}
          phoneInputRef={phoneInputRef}
          handlePhoneChange={handlePhoneChange}
          currentSector={currentSector}
          DEV_MODE={DEV_MODE}
          testSummaryInput={testSummaryInput}
          setTestSummaryInput={setTestSummaryInput}
          isTestingSummary={isTestingSummary}
          handleTestSummarize={handleTestSummarize}
          recommendedTagIds={recommendedTagIds}
          setRecommendedTagIds={setRecommendedTagIds}
          selectedTagIds={selectedTagIds}
          setSelectedTagIds={setSelectedTagIds}
          allVisitTags={allVisitTags}
          setIsTagPickerOpen={setIsTagPickerOpen}
          isTagPickerOpen={isTagPickerOpen}
          selectedCustomerTagIds={selectedCustomerTagIds}
          setSelectedCustomerTagIds={setSelectedCustomerTagIds}
          newCustomerTagIds={newCustomerTagIds}
          setNewCustomerTagIds={setNewCustomerTagIds}
          allCustomerTags={allCustomerTags}
          setIsCustomerTagPickerOpen={setIsCustomerTagPickerOpen}
          isCustomerTagPickerOpen={isCustomerTagPickerOpen}
          transcript={transcript}
          setTranscript={setTranscript}
          recordingDate={recordingDate}
          setRecordingDate={setRecordingDate}
          formatRecordingDate={formatRecordingDate}
          tempResultData={tempResultData}
          setTempResultData={setTempResultData}
          serviceTags={serviceTags}
          setServiceTags={setServiceTags}
          rawTranscript={rawTranscript}
          setRawTranscript={setRawTranscript}
          visibleVisitCount={visibleVisitCount}
          setVisibleVisitCount={setVisibleVisitCount}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          expandedHistoryIds={expandedHistoryIds}
          setExpandedHistoryIds={setExpandedHistoryIds}
          visitTags={visitTags}
          setVisitTags={setVisitTags}
          customerTags={customerTags}
          setCustomerTags={setCustomerTags}
          tagSettingsMainTab={tagSettingsMainTab}
          setTagSettingsMainTab={setTagSettingsMainTab}
          tagSettingsSubTab={tagSettingsSubTab}
          setTagSettingsSubTab={setTagSettingsSubTab}
          newManagedTag={newManagedTag}
          setNewManagedTag={setNewManagedTag}
          isTagEditing={isTagEditing}
          setIsTagEditing={setIsTagEditing}
          extractServiceDateFromSummary={extractServiceDateFromSummary}
          extractServiceDateTimeLabel={extractServiceDateTimeLabel}
          normalizeRecordWithCustomer={normalizeRecordWithCustomer}
          formatRecordDateTime={formatRecordDateTime}
          getTodayDateString={getTodayDateString}
          currentTheme={BEAUTY_THEME}
          MOCK_CUSTOMERS={MOCK_CUSTOMERS}
          TagPickerModal={TagPickerModal}
          CustomerTagPickerModal={CustomerTagPickerModal}
          saveToLocalStorage={saveToLocalStorage}
        />
        {/* 로그인, Record, CustomerDetail, Edit, EditCustomer, profile-edit 화면이 아닐 때만 하단 네비게이션 바 표시 */}
        {currentScreen !== 'Login' && 
         currentScreen !== 'Record' && 
         currentScreen !== 'CustomerDetail' && 
         currentScreen !== 'Edit' && 
         currentScreen !== 'EditCustomer' && 
         currentScreen !== 'profile-edit' && 
         <BottomNavigation activeTab={activeTab} onTabChange={handleTabClick} />}
      </div>
    </div>
  );
}
