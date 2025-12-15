import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { supabase } from '../lib/supabaseClient';
import useProfile from './useProfile';
import { useAuth } from '../contexts/AuthContext';

// 🚨 긴급: 로컬 데이터 클리어 함수
export const clearLocalData = () => {
  try {
    localStorage.removeItem('mallo_customers');
    localStorage.removeItem('mallo_visits');
    localStorage.removeItem('mallo_reservations');
    localStorage.removeItem('mallo_profile');
    console.log('🧹 로컬 데이터가 모두 삭제되었습니다.');
    window.location.reload(); // 페이지 새로고침
  } catch (error) {
    console.error('로컬 데이터 삭제 실패:', error);
  }
};

// 브라우저 콘솔에서 사용할 수 있도록 전역에 노출
if (typeof window !== 'undefined') {
  window.clearLocalData = clearLocalData;
}

// 녹음 시간 제한 상수
const MAX_RECORD_SECONDS = 120; // 2분

// 요약 API URL 상수
const SUMMARY_API_URL =
  import.meta.env.MODE === 'development'
    ? 'https://mallo-app.vercel.app/api/summarize'
    : '/api/summarize';

// 음성 인식 API URL 상수
const TRANSCRIBE_API_URL =
  import.meta.env.MODE === 'development'
    ? 'https://mallo-app.vercel.app/api/transcribe'
    : '/api/transcribe';

// 태그 동기화 시 로컬 변경 직후 서버/타 클라이언트 스냅샷을 무시할 쿨다운(밀리초)
const TAG_SYNC_LOCAL_COOLDOWN_MS = 5000;

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

// 로컬 날짜 기준 오늘 날짜 키 생성 (UTC 버그 방지)
function getLocalTodayKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function useMalloAppState(user, supabaseReservations = null) {
  const { user: authUser } = useAuth();
  const currentUser = user || authUser;

  const [currentScreen, setCurrentScreenState] = useState(SCREENS.LOGIN);
  const [previousScreen, setPreviousScreen] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 프로필 정보 가져오기 및 캐싱 (Stale-while-revalidate 패턴)
  // 로그인된 상태에서만 프로필 정보 가져오기
  const { profile, loading: profileLoading, refetch: refetchProfile } = useProfile();
  const [cachedProfile, setCachedProfile] = useState(null);
  const [isProfileInitialized, setIsProfileInitialized] = useState(false);

  // 프로필 정보 캐싱: 한 번 로드되면 캐시에 저장 (로딩 중에도 유지)
  useEffect(() => {
    if (profile) {
      // 프로필 데이터가 있으면 즉시 캐시에 저장 (로딩 중이어도)
      setCachedProfile(profile);
      if (!profileLoading) {
        setIsProfileInitialized(true);
      }
    }
  }, [profile, profileLoading]);

  // 프로필 탭 진입 시 백그라운드에서 최신 정보 갱신 (Stale-while-revalidate)
  // 로그인된 상태에서만 실행
  useEffect(() => {
    if (currentUser && currentScreen === SCREENS.PROFILE && isProfileInitialized) {
      // 캐시된 데이터는 즉시 표시하고, 백그라운드에서 최신 정보 가져오기
      refetchProfile().catch((e) => {
        console.warn('[프로필] 백그라운드 갱신 실패, 캐시된 데이터 사용:', e);
      });
    }
  }, [currentUser, currentScreen, isProfileInitialized, refetchProfile]);

  // Auth 도입 후에는 내부 SCREENS.LOGIN을 더 이상 쓰지 않으므로, Login이면 자동으로 Home으로 교정
  useEffect(() => {
    // 예전 버전에서 저장해둔 'Login' 화면은
    // 이제 Auth 앞단에서 처리하므로, 홈 화면으로 강제 전환
    if (currentScreen === SCREENS.LOGIN) {
      setCurrentScreenState(SCREENS.HOME);
    }
  }, [currentScreen]);
  
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
  
  // 프로필의 shop_name을 userProfile.shopName에 반영 (캐시된 프로필 사용)
  useEffect(() => {
    const profileToUse = cachedProfile || profile;
    if (profileToUse && profileToUse.shop_name) {
      setUserProfile((prev) => ({
        ...prev,
        shopName: profileToUse.shop_name,
        name: profileToUse.owner_name || prev.name,
      }));
    }
  }, [cachedProfile, profile]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [rawTranscript, setRawTranscript] = useState('');
  const [resultData, setResultData] = useState(null);
  const [summaryDraft, setSummaryDraft] = useState(null);
  const [isTextSummarizing, setIsTextSummarizing] = useState(false);
  const [showPromptInfo, setShowPromptInfo] = useState(false);
  const [todayRecords, setTodayRecords] = useState([]);
  const [shouldOpenReservationForm, setShouldOpenReservationForm] = useState(false);
  const [reservationPrefill, setReservationPrefill] = useState(null); // 예약 추가 폼에 미리 채울 고객 정보
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
      procedure: [
        { label: '속눈썹연장', keywords: ['속눈썹연장', '속눈썹 연장'] },
        { label: '속눈썹펌', keywords: ['속눈썹펌', '속눈썹 펌'] },
        '젤네일',
        '페디큐어'
      ],
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
      feature: [],
      trait: ['수다쟁이', '조용함', '친절함'],
      pattern: ['단골', '비정기'],
      caution: ['글루알러지', '임산부', '눈물많음']
    });
  };
  
  const [visitTags, setVisitTags] = useState(loadInitialVisitTags);
  const [allVisitTags, setAllVisitTags] = useState([]);
  const [recommendedTagIds, setRecommendedTagIds] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [isTagPickerOpen, setIsTagPickerOpen] = useState(false);
  const tagSyncChannelRef = useRef(null);
  const tagSyncClientIdRef = useRef(`tag-sync-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const tagSyncReadyRef = useRef(false);
  const lastServerVisitTagsRef = useRef(null);
  const lastServerCustomerTagsRef = useRef(null);
  const latestVisitTagsRef = useRef(null);
  const latestCustomerTagsRef = useRef(null);
  const fetchInFlightRef = useRef(false);
  const syncCooldownUntilRef = useRef(0);
  const lastWarnAtRef = useRef(0);
  const customerTagsFetchInFlightRef = useRef(false);
  const lastLocalTagUpdateAtRef = useRef(0);     // 로컬에서 마지막으로 태그를 변경한 시각
  const lastServerTagUpdateAtRef = useRef(0);    // 서버/다른 클라이언트로부터 받은 최신 시각
  const applyingServerTagsRef = useRef(false);   // 서버 태그를 적용 중일 때 로컬 타임스탬프 증가 방지
  const isInitialLoadRef = useRef(true);  // 앱 초기 로드인지 확인 (초기 로드 시에는 로컬 타임스탬프 업데이트 안 함)
  // 프로덕션에서는 로그인된 사용자만 태그 설정 사용 가능
  const effectiveOwnerId = useMemo(() => user?.id, [user?.id]);
  
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
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [tempName, setTempName] = useState('');
  const [tempPhone, setTempPhone] = useState('');
  const [tempServiceDate, setTempServiceDate] = useState(null);  // 고객 상세 전용 날짜 입력
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
        feature: [],
        caution: [],
        trait: [],
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

  // 예약 관리 상태 (Supabase 우선, 없으면 localStorage)
  const [reservations, setReservations] = useState(() => {
    if (supabaseReservations && supabaseReservations.length > 0) {
      return supabaseReservations;
    }
    const loadedReservations = loadFromLocalStorage('mallo_reservations', []);
    return loadedReservations || [];
  });
  
  // Supabase reservations가 업데이트되면 로컬 상태도 업데이트
  useEffect(() => {
    if (supabaseReservations) {
      setReservations(supabaseReservations);
      console.log('[useMalloAppState] Supabase reservations 동기화:', supabaseReservations.length, '개');
    }
  }, [supabaseReservations]);
  
  const [tempResultData, setTempResultData] = useState(null);

  // 로컬스토리지에서 최신 태그를 다시 불러오는 헬퍼
  const refreshTagsFromStorage = () => {
    try {
      const savedVisit = localStorage.getItem('visitTags');
      if (savedVisit) {
        const parsed = migrateTagsToObjects(JSON.parse(savedVisit));
        if (JSON.stringify(parsed) !== JSON.stringify(visitTags)) {
          setVisitTags(parsed);
        }
      }
    } catch (e) {
      console.warn('[태그 동기화] visitTags 재로딩 실패', e);
    }

    try {
      const savedCustomer = localStorage.getItem('customerTags');
      if (savedCustomer) {
        const parsed = migrateTagsToObjects(JSON.parse(savedCustomer));
        if (JSON.stringify(parsed) !== JSON.stringify(customerTags)) {
          setCustomerTags(parsed);
        }
      }
    } catch (e) {
      console.warn('[태그 동기화] customerTags 재로딩 실패', e);
    }
  };

  // 동일 기기 내 다른 탭/창에서 localStorage 변경 시 반영
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'visitTags' || e.key === 'customerTags') {
        refreshTagsFromStorage();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [visitTags, customerTags]);

  // 다른 화면 갔다가 돌아올 때(포커스/가시성 변경) 최신 태그 재로딩
  useEffect(() => {
    const handleFocus = () => refreshTagsFromStorage();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [visitTags, customerTags]);

  // Supabase에 태그 저장 (최신 상태를 테이블에 upsert)
  useEffect(() => {
    if (!effectiveOwnerId) return;
    if (!canSync()) return;

    const visitStr = JSON.stringify(visitTags);
    const customerStr = JSON.stringify(customerTags);

    if (
      lastServerVisitTagsRef.current === visitStr &&
      lastServerCustomerTagsRef.current === customerStr
    ) {
      return;
    }

    const saveTagsToServer = async () => {
      try {
        const { error } = await supabase
          .from('tag_settings')
          .upsert({
            owner_id: effectiveOwnerId,
            visit_tags: visitTags,
            customer_tags: customerTags,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'owner_id' });

        if (error) {
          markSyncFailure('[태그 동기화] Supabase 저장 실패:', error);
        } else {
          lastServerVisitTagsRef.current = visitStr;
          lastServerCustomerTagsRef.current = customerStr;
          lastServerTagUpdateAtRef.current = Date.now();
        }
      } catch (e) {
        markSyncFailure('[태그 동기화] Supabase 저장 예외:', e);
      }
    };

    saveTagsToServer();
  }, [visitTags, customerTags, effectiveOwnerId]);

  // Supabase에서 태그 불러오기 (polling + 포커스 시)
  const fetchTagsFromServer = useCallback(
    async (reason = 'poll') => {
      if (!effectiveOwnerId) return;
      if (!canSync()) return;
      if (fetchInFlightRef.current) return;
      fetchInFlightRef.current = true;
      try {
        const now = Date.now();
        const isLocalCooling =
          lastLocalTagUpdateAtRef.current > 0 &&
          now - lastLocalTagUpdateAtRef.current < TAG_SYNC_LOCAL_COOLDOWN_MS;

        if (isLocalCooling) {
          fetchInFlightRef.current = false;
          return;
        }

        const { data, error } = await supabase
          .from('tag_settings')
          .select('visit_tags, customer_tags, updated_at')
          .eq('owner_id', effectiveOwnerId)
          .maybeSingle();

        if (error) {
          markSyncFailure(`[태그 동기화] Supabase 로드 실패(${reason}):`, error);
          return;
        }

        if (data) {
          const serverUpdatedAt = data.updated_at ? new Date(data.updated_at).getTime() : 0;
          const effectiveServerStamp = serverUpdatedAt || lastServerTagUpdateAtRef.current || 0;
          const isServerStale =
            lastLocalTagUpdateAtRef.current > 0 &&
            effectiveServerStamp > 0 &&
            effectiveServerStamp < lastLocalTagUpdateAtRef.current;
          const isOlderThanLastServer =
            lastLocalTagUpdateAtRef.current > lastServerTagUpdateAtRef.current &&
            effectiveServerStamp > 0 &&
            effectiveServerStamp <= lastServerTagUpdateAtRef.current;

          if (isServerStale || isOlderThanLastServer) {
            console.log('[태그 동기화] 서버 데이터가 로컬보다 오래되어 무시합니다.', {
              reason,
              serverUpdatedAt,
              lastServerTagUpdateAt: lastServerTagUpdateAtRef.current,
              lastLocal: lastLocalTagUpdateAtRef.current,
              isServerStale,
              isOlderThanLastServer,
            });
            fetchInFlightRef.current = false;
            return;
          }

          const incomingVisit = migrateTagsToObjects(data.visit_tags || {});
          const incomingCustomer = migrateTagsToObjects(data.customer_tags || {});

          const visitStr = JSON.stringify(incomingVisit);
          const customerStr = JSON.stringify(incomingCustomer);

          let appliedFromServer = false;
          if (visitStr !== JSON.stringify(latestVisitTagsRef.current)) {
            applyingServerTagsRef.current = true;
            setVisitTags(incomingVisit);
            appliedFromServer = true;
          }
          if (customerStr !== JSON.stringify(latestCustomerTagsRef.current)) {
            applyingServerTagsRef.current = true;
            setCustomerTags(incomingCustomer);
            appliedFromServer = true;
          }
          if (appliedFromServer) {
            setTimeout(() => {
              applyingServerTagsRef.current = false;
            }, 0);
          }

          // 서버에서 가져온 값으로 동기화 기준 업데이트
          lastServerVisitTagsRef.current = visitStr;
          lastServerCustomerTagsRef.current = customerStr;
          lastServerTagUpdateAtRef.current = serverUpdatedAt || Date.now();
          
          // 서버 데이터를 성공적으로 가져왔으므로 초기 로드 완료
          if (isInitialLoadRef.current) {
            console.log('[태그 동기화] 서버 데이터 로드 완료, 이제부터 로컬 변경 추적 시작');
            isInitialLoadRef.current = false;
          }
        } else {
          // 서버에 데이터가 없어도 초기 로드는 완료된 것으로 간주
          if (isInitialLoadRef.current) {
            console.log('[태그 동기화] 서버에 데이터 없음, 초기 로드 완료로 표시');
            isInitialLoadRef.current = false;
          }
        }
      } catch (e) {
        markSyncFailure(`[태그 동기화] Supabase 로드 예외(${reason}):`, e);
      } finally {
        fetchInFlightRef.current = false;
      }
    },
    [effectiveOwnerId]
  );

  // Supabase에서 고객별 customer_tags를 가져와 로컬 customers에 병합
  const fetchCustomerTagsFromServer = useCallback(
    async (reason = 'poll') => {
      if (!effectiveOwnerId) return;
      if (!canSync()) return;
      if (customerTagsFetchInFlightRef.current) return;
      customerTagsFetchInFlightRef.current = true;
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id, customer_tags')
          .eq('owner_id', effectiveOwnerId);

        if (error) {
          markSyncFailure(`[고객 태그 동기화] Supabase 로드 실패(${reason}):`, error);
          return;
        }

        if (Array.isArray(data) && data.length > 0) {
          const serverMap = new Map();
          data.forEach((row) => {
            if (row && row.id) {
              serverMap.set(String(row.id), row.customer_tags || {});
            }
          });

          setCustomers((prev) => {
            let changed = false;
            const updated = prev.map((c) => {
              const serverTags = serverMap.get(String(c.id));
              if (!serverTags) return c;
              const currentTags = c.customerTags || {};
              const currentStr = JSON.stringify(currentTags);
              const serverStr = JSON.stringify(serverTags);
              if (currentStr !== serverStr) {
                changed = true;
                return { ...c, customerTags: serverTags };
              }
              return c;
            });
            return changed ? updated : prev;
          });
        }
      } catch (e) {
        markSyncFailure(`[고객 태그 동기화] Supabase 로드 예외(${reason}):`, e);
      } finally {
        customerTagsFetchInFlightRef.current = false;
      }
    },
    [effectiveOwnerId]
  );

  // effectiveOwnerId 변경 시 초기 로드 플래그 리셋
  useEffect(() => {
    if (effectiveOwnerId) {
      console.log('[태그 동기화] effectiveOwnerId 변경됨, 초기 로드 플래그 리셋');
      isInitialLoadRef.current = true;
      lastLocalTagUpdateAtRef.current = 0;
    }
  }, [effectiveOwnerId]);

  // 폴링 및 포커스 시 서버에서 최신 태그 가져오기
  useEffect(() => {
    if (!effectiveOwnerId) return undefined;

    // 초기 1회 즉시 로드
    fetchTagsFromServer('initial');
    fetchCustomerTagsFromServer('initial');

    const interval = setInterval(() => {
      fetchTagsFromServer('interval');
      fetchCustomerTagsFromServer('interval');
    }, 15000); // 15초마다 폴링

    const handleFocus = () => fetchTagsFromServer('focus');
    const handleFocusAll = () => {
      fetchTagsFromServer('focus');
      fetchCustomerTagsFromServer('focus');
    };
    window.addEventListener('focus', handleFocusAll);
    document.addEventListener('visibilitychange', handleFocusAll);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocusAll);
      document.removeEventListener('visibilitychange', handleFocusAll);
    };
  }, [effectiveOwnerId, fetchTagsFromServer, fetchCustomerTagsFromServer]);
  
  useEffect(() => {
    saveToLocalStorage('mallo_customers', customers);
  }, [customers]);
  
  useEffect(() => {
    saveToLocalStorage('mallo_visits', visits);
  }, [visits]);

  useEffect(() => {
    saveToLocalStorage('mallo_reservations', reservations);
  }, [reservations]);

  useEffect(() => {
    latestVisitTagsRef.current = visitTags;
  }, []); // 초기값 한 번 세팅

  useEffect(() => {
    latestCustomerTagsRef.current = customerTags;
  }, []); // 초기값 한 번 세팅

  useEffect(() => {
    latestVisitTagsRef.current = visitTags;
    // 초기 로드나 서버 데이터 적용 중에는 로컬 타임스탬프 업데이트 안 함
    if (!applyingServerTagsRef.current && !isInitialLoadRef.current) {
      lastLocalTagUpdateAtRef.current = Date.now();
      console.log('[태그 동기화] visitTags 로컬 변경 감지, 타임스탬프 업데이트:', Date.now());
    }
  }, [visitTags]);

  useEffect(() => {
    latestCustomerTagsRef.current = customerTags;
    // 초기 로드나 서버 데이터 적용 중에는 로컬 타임스탬프 업데이트 안 함
    if (!applyingServerTagsRef.current && !isInitialLoadRef.current) {
      lastLocalTagUpdateAtRef.current = Date.now();
      console.log('[태그 동기화] customerTags 로컬 변경 감지, 타임스탬프 업데이트:', Date.now());
    }
  }, [customerTags]);

  const canSync = () => {
    const now = Date.now();
    if (syncCooldownUntilRef.current > now) return false;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
    return true;
  };

  const markSyncFailure = (msg, error) => {
    const now = Date.now();
    syncCooldownUntilRef.current = now + 30000; // 30초 쿨다운
    if (lastWarnAtRef.current + 15000 < now) {
      console.warn(msg, error || '');
      lastWarnAtRef.current = now;
    }
  };

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
        feature: [],
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
            feature: [],
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
    
    // 태그 우선순위: visit.tags > visit.visitTags > detail.tags > summaryJson.tags
    const primaryTags = visit.tags || visit.visitTags || visit.detail?.tags || visit.summaryJson?.tags || visit.summary_json?.tags || [];
    
    return {
      ...visit,
      customerName: displayName,
      customerPhone: displayPhone,
      // 모든 태그 필드 보존 (병합된 태그가 모든 필드에 있을 수 있음)
      tags: primaryTags,
      visitTags: visit.visitTags || primaryTags,
      serviceTags: visit.serviceTags || primaryTags,
      summaryTags: visit.summaryTags || primaryTags,
      tagLabels: visit.tagLabels || primaryTags,
      autoTags: visit.autoTags || primaryTags,
      // detail 보존 (태그 포함)
      detail: {
        ...(visit.detail || {
        sections: visit.summary ? [
          { title: '시술 내용', content: [visit.summary] }
        ] : []
        }),
        tags: visit.detail?.tags || primaryTags
      },
      // summaryJson 보존 (태그 포함)
      summaryJson: {
        ...(visit.summaryJson || {}),
        tags: visit.summaryJson?.tags || primaryTags
      },
      summary_json: {
        ...(visit.summary_json || {}),
        tags: visit.summary_json?.tags || primaryTags
      },
      title: visit.title || visit.summary || ''
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

  // 태그 설정을 Supabase Realtime으로 동기화 (PC/모바일 간 새로고침 없이 반영)
  useEffect(() => {
    const channel = supabase.channel('tag-settings');
    tagSyncChannelRef.current = channel;

    channel
      .on('broadcast', { event: 'tags-updated' }, (payload) => {
        const { sender, visitTags: incomingVisitTags, customerTags: incomingCustomerTags, updatedAt } = payload?.payload || {};
        if (!payload || sender === tagSyncClientIdRef.current) return; // 내 이벤트 무시

        const incomingUpdatedAt = typeof updatedAt === 'number' ? updatedAt : 0;
        const now = Date.now();
        const isLocalCooling =
          lastLocalTagUpdateAtRef.current > 0 &&
          now - lastLocalTagUpdateAtRef.current < TAG_SYNC_LOCAL_COOLDOWN_MS;
        const isStale =
          incomingUpdatedAt > 0 &&
          lastLocalTagUpdateAtRef.current > 0 &&
          incomingUpdatedAt < lastLocalTagUpdateAtRef.current;

        if (isLocalCooling || isStale) {
          console.log('[태그 동기화] Realtime 수신 데이터가 로컬보다 오래되어 무시합니다.', {
            incomingUpdatedAt,
            lastLocal: lastLocalTagUpdateAtRef.current,
            isLocalCooling,
          });
          return;
        }

        let appliedFromServer = false;
        if (incomingVisitTags) {
          applyingServerTagsRef.current = true;
          setVisitTags(migrateTagsToObjects(incomingVisitTags));
          appliedFromServer = true;
        }
        if (incomingCustomerTags) {
          applyingServerTagsRef.current = true;
          setCustomerTags(migrateTagsToObjects(incomingCustomerTags));
          appliedFromServer = true;
        }
        if (appliedFromServer) {
          setTimeout(() => {
            applyingServerTagsRef.current = false;
          }, 0);
        }

        lastServerTagUpdateAtRef.current = incomingUpdatedAt || Date.now();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          tagSyncReadyRef.current = true;
          console.log('[태그 동기화] Realtime 구독 완료:', tagSyncClientIdRef.current);
        }
      });

    return () => {
      tagSyncReadyRef.current = false;
      channel.unsubscribe();
      tagSyncChannelRef.current = null;
    };
  }, []);

  // 태그 변경 시 다른 클라이언트로 브로드캐스트
  useEffect(() => {
    if (!tagSyncChannelRef.current || !tagSyncReadyRef.current) return;
    const sendUpdate = async () => {
      const { error } = await tagSyncChannelRef.current.send({
        type: 'broadcast',
        event: 'tags-updated',
        payload: {
          sender: tagSyncClientIdRef.current,
          visitTags,
          customerTags,
          updatedAt: Date.now(),
        },
      });
      if (error) {
        console.warn('[태그 동기화] 브로드캐스트 실패:', error);
      }
    };
    sendUpdate();
  }, [visitTags, customerTags]);

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
      // 🎯 태그 추천 완전 제거 (키워드 매칭도 제거)
      console.log('[태그 선택 최종] 추천 없음');
      setRecommendedTagIds([]);
      setSelectedTagIds([]);
    }
    
    if (allCustomerTags.length > 0) {
      // 🎯 고객 태그 추천 완전 제거
      console.log('[고객 태그 자동 선택] 추천 없음');
      setRecommendedCustomerTagIds([]);
      setSelectedCustomerTagIds([]);
      setNewCustomerTagIds([]);
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
          feature: [],
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
      
      // 고객 상세 진입 전용 녹음 화면은 제거, 항상 기본 RECORD 화면으로 이동
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

  // 요약 결과 처리 헬퍼 함수 (음성/텍스트 공통)
  const handleSummaryResultFromAnySource = ({
    reservationId,
    customerId,
    customerName,
    customerPhone,
    summaryJson,
    sectionsCount,
    rawText,
    source,
    fromCustomerDetail = false,
  }) => {
    console.log('[요약 처리] source:', source, 'reservationId:', reservationId, 'fromCustomerDetail:', fromCustomerDetail);

    setSummaryDraft({
      reservationId,
      customerId,
      customerName,
      customerPhone,
      summaryJson,
      sectionsCount,
      rawText,
      source,
    });

    // 고객 상세에서 온 경우는 호출한 쪽에서 직접 화면 이동 처리하므로 여기서는 이동하지 않음
    // 그 외의 경우에만 RECORD로 이동
    if (!fromCustomerDetail) {
      const targetScreen = SCREENS.RECORD;
      
      console.log('[요약 처리] 현재 화면:', currentScreen, 'fromCustomerDetail:', fromCustomerDetail, '→ 이동할 화면:', targetScreen);
      
      // 녹음 화면 깜빡임 방지: 화면 이동 전에 녹음 상태 먼저 초기화
      setRecordState('idle');
      setIsProcessing(false);
      setIsPaused(false);
      
      // 상태 초기화 후 화면 전환 (녹음 화면이 보이지 않도록)
      setTimeout(() => {
      setCurrentScreen(targetScreen);
      }, 0);
    } else {
      console.log('[요약 처리] 고객 상세에서 온 경우, 화면 이동은 호출한 쪽에서 처리');
    }
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
    
    // 고객 정보 적용: 이미 선택한 프로필/입력값이 있으면 덮어쓰지 않음
    if (summaryData.customerInfo) {
      const extractedName = summaryData.customerInfo.name;
      const extractedPhone = summaryData.customerInfo.phone;
      
      if (
        extractedName &&
        extractedName !== 'null' &&
        extractedName.trim() !== '' &&
        !tempName
      ) {
        setTempName(extractedName.trim());
      }
      if (
        extractedPhone &&
        extractedPhone !== 'null' &&
        extractedPhone.trim() !== '' &&
        !tempPhone
      ) {
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
        
        // 녹음 화면 깜빡임 방지: 상태 먼저 초기화 후 화면 전환
        setIsProcessing(false);
        setRecordState('idle');
        setIsPaused(false);
        setRecordingTime(0);
        
        setTimeout(() => {
          alert('녹음 데이터가 충분하지 않습니다. 다시 시도해주세요.');
        setCurrentScreen(SCREENS.HOME);
        }, 0);
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
      console.log('[음성 인식] transcribe API 호출 시작:', TRANSCRIBE_API_URL);
      const transcribeResponse = await fetch(TRANSCRIBE_API_URL, {
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
        
        // 녹음 화면 깜빡임 방지: 상태 먼저 초기화 후 화면 전환
        setIsProcessing(false);
        setRecordState('idle');
        setIsPaused(false);
        setRecordingTime(0);
        
        setTimeout(() => {
          alert('음성이 인식되지 않았습니다. 다시 시도해주세요.');
        setCurrentScreen(SCREENS.HOME);
        }, 0);
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
      
      const summarizeResponse = await fetch(SUMMARY_API_URL, {
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
        
        // 🎯 예약으로 들어온 경우: "방문·예약 정보" 섹션 맨 앞에 예약 날짜 강제 삽입
        try {
          const reservationId = selectedCustomerForRecord?.reservationId;
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('🎯 [음성 녹음 - 예약 날짜 주입 시작]');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('reservationId:', reservationId);
          console.log('selectedCustomerForRecord:', selectedCustomerForRecord);
          console.log('reservations 배열 길이:', reservations?.length);
          console.log('reservations 배열 내용:', reservations);
          
          if (reservationId && reservations && reservations.length > 0) {
            const reservation = reservations.find(r => r.id === reservationId);
            console.log('[음성 녹음 - 예약 날짜 주입] 찾은 예약:', reservation);
            
            if (reservation && reservation.date && reservation.time) {
              // "방문·예약 정보" 섹션 찾기
              const visitSectionIndex = cleanedResult.sections.findIndex(
                section => section.title && section.title.includes('방문·예약 정보')
              );
              
              console.log('[음성 녹음 - 예약 날짜 주입] 방문·예약 정보 섹션 인덱스:', visitSectionIndex);
              console.log('[음성 녹음 - 예약 날짜 주입] 전체 섹션 제목:', cleanedResult.sections.map(s => s.title));
              
              if (visitSectionIndex !== -1) {
                // 예약 날짜를 한국어 형식으로 변환
                const dateParts = reservation.date.split('-');
                console.log('[음성 녹음 - 예약 날짜 주입] 날짜 분리:', dateParts);
                
                if (dateParts.length === 3) {
                  const [year, month, day] = dateParts.map(Number);
                  const dateObj = new Date(year, month - 1, day);
                  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
                  const weekday = weekdays[dateObj.getDay()];
                  const reservationDateLine = `${year}년 ${month}월 ${day}일 (${weekday}) ${reservation.time} 예약`;
                  
                  console.log('[음성 녹음 - 예약 날짜 주입] 생성된 예약 날짜 라인:', reservationDateLine);
                  console.log('[음성 녹음 - 예약 날짜 주입] 기존 content:', cleanedResult.sections[visitSectionIndex].content);
                  
                  // 기존 content에서 날짜 패턴이 있는 줄은 제거하고, 예약 날짜만 사용
                  const existingContent = cleanedResult.sections[visitSectionIndex].content || [];
                  const filteredContent = existingContent.filter(line => {
                    if (!line || typeof line !== 'string') return true;
                    // "YYYY년 MM월 DD일" 패턴이 있는 줄은 제거 (AI가 추출한 날짜)
                    return !line.match(/\d{4}년\s*\d{1,2}월\s*\d{1,2}일/);
                  });
                  
                  cleanedResult.sections[visitSectionIndex].content = [
                    reservationDateLine,
                    ...filteredContent
                  ];
                  
                  console.log('[음성 녹음 - 예약 날짜 주입] ✅ 성공! 새 content (AI 날짜 제거됨):', cleanedResult.sections[visitSectionIndex].content);
                } else {
                  console.warn('[음성 녹음 - 예약 날짜 주입] ⚠️ 예약 날짜 형식이 올바르지 않습니다:', reservation.date);
                }
              } else {
                console.log('[음성 녹음 - 예약 날짜 주입] ⚠️ 방문·예약 정보 섹션을 찾을 수 없습니다.');
              }
            } else {
              console.log('[음성 녹음 - 예약 날짜 주입] ⚠️ 예약 정보가 불완전합니다. date:', reservation?.date, 'time:', reservation?.time);
            }
          } else {
            console.log('[음성 녹음 - 예약 날짜 주입] ⚠️ 예약 ID가 없거나 예약 배열이 비어있습니다.');
          }
        } catch (error) {
          console.error('[음성 녹음 - 예약 날짜 주입] ❌ 에러 (무시하고 계속):', error);
        }
        
        // 공통 헬퍼 함수 호출 (고객 상세 전용 화면 제거됨)
        const isFromCustomerDetailVoice = false;
        handleSummaryResultFromAnySource({
          reservationId: selectedCustomerForRecord?.reservationId || null,
          customerId: selectedCustomerForRecord?.id || null,
          customerName: selectedCustomerForRecord?.name || parsedResult.customerInfo?.name || null,
          customerPhone: selectedCustomerForRecord?.phone || parsedResult.customerInfo?.phone || null,
          summaryJson: summarizeData.summaryJson,
          sectionsCount: parsedResult.sections?.length || 0,
          rawText: transcript,
          source: 'voice',
          fromCustomerDetail: isFromCustomerDetailVoice,
        });
        
        // 기존 handleSummaryResult도 호출하여 resultData 설정 (RecordScreen 호환성)
        handleSummaryResult(cleanedResult);
      } else {
        throw new Error('API 응답 형식이 올바르지 않습니다.');
      }
    } catch (error) {
      console.error('[녹음 처리 오류]', error);
      const errorMessage = error.message || '알 수 없는 오류가 발생했습니다.';
      
      // 녹음 화면 깜빡임 방지: 상태 먼저 초기화 후 화면 전환
      setRecordState('idle');
      setIsProcessing(false);
      setIsPaused(false);
      setRecordingTime(0);
      
      setTimeout(() => {
      alert(`오류가 발생했습니다\n\n${errorMessage}\n\n콘솔을 확인해주세요.`);
      setCurrentScreen(SCREENS.HOME);
      }, 0);
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

      const response = await fetch(SUMMARY_API_URL, {
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
      
      // 🎯 예약으로 들어온 경우: "방문·예약 정보" 섹션 맨 앞에 예약 날짜 강제 삽입
      try {
        const reservationId = selectedCustomerForRecord?.reservationId;
        if (reservationId && reservations && reservations.length > 0) {
          const reservation = reservations.find(r => r.id === reservationId);
          if (reservation && reservation.date && reservation.time) {
            // "방문·예약 정보" 섹션 찾기
            const visitSectionIndex = cleanedResult.sections.findIndex(
              section => section.title && section.title.includes('방문·예약 정보')
            );
            
            if (visitSectionIndex !== -1) {
              // 예약 날짜를 한국어 형식으로 변환
              const dateParts = reservation.date.split('-');
              if (dateParts.length === 3) {
                const [year, month, day] = dateParts.map(Number);
                const dateObj = new Date(year, month - 1, day);
                const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
                const weekday = weekdays[dateObj.getDay()];
                const reservationDateLine = `${year}년 ${month}월 ${day}일 (${weekday}) ${reservation.time} 예약`;
                
                // 기존 content에서 날짜 패턴이 있는 줄은 제거하고, 예약 날짜만 사용
                const existingContent = cleanedResult.sections[visitSectionIndex].content || [];
                const filteredContent = existingContent.filter(line => {
                  if (!line || typeof line !== 'string') return true;
                  // "YYYY년 MM월 DD일" 패턴이 있는 줄은 제거 (AI가 추출한 날짜)
                  return !line.match(/\d{4}년\s*\d{1,2}월\s*\d{1,2}일/);
                });
                
                cleanedResult.sections[visitSectionIndex].content = [
                  reservationDateLine,
                  ...filteredContent
                ];
                
                console.log('[테스트 요약] ✅ 성공! 새 content (AI 날짜 제거됨):', reservationDateLine);
              } else {
                console.warn('[테스트 요약] 예약 날짜 형식이 올바르지 않습니다:', reservation.date);
              }
            } else {
              console.log('[테스트 요약] 방문·예약 정보 섹션을 찾을 수 없어 예약 날짜를 추가하지 않습니다.');
            }
          }
        }
      } catch (error) {
        console.error('[테스트 요약] 예약 날짜 주입 중 에러 (무시하고 계속):', error);
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
    setTempServiceDate(null);
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
    const dayNames = ['일','월','화','수','목','금','토'];
    const dayName = dayNames[today.getDay()];
    return `${year}년 ${month}월 ${day}일 (${dayName})`;
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
    // RECORD 화면일 때 recordState 설정
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
      // 다른 화면으로 이동할 때 즉시 녹음 상태 초기화 (녹음 화면 깜빡임 방지)
      // 즉시 초기화하여 녹음 화면이 보이지 않도록 함
      setRecordState('idle');
      setIsProcessing(false);
      setIsPaused(false);
      setRecordingTime(0);
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
  const addReservation = async ({ time, name, customerId = null, date, phone, phoneLast4, memo }) => {
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
    
    // 날짜 키 생성 (YYYY-MM-DD 형식)
    const dateKey = date || (() => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })();
    
    // 시간 입력이 없을 수도 있으니까 기본값은 '00:00'으로
    const safeTime = time && time.length >= 4 ? time : '00:00';
    
    // KST(+09:00)를 기준으로 reserved_at 타임스탬프 만들기
    const reservedAt = new Date(`${dateKey}T${safeTime}:00+09:00`).toISOString();
    
    // ⚠️ Supabase insert는 ReservationScreen에서만 처리하도록 변경
    // 예약 추가 = ReservationScreen 한 군데에서만 insert
    // 읽기 = useSupabaseReservations 훅이 select만 담당
    // if (user && user.id) {
    //   try {
    //     const { data, error } = await supabase
    //       .from('reservations')
    //       .insert({
    //         owner_id: user.id,
    //         reserved_at: reservedAt,
    //         customer_id: customerId || null,
    //         status: 'scheduled',
    //         memo: memo || '',
    //       })
    //       .select()
    //       .single();
    //     
    //     console.log('[예약 추가 결과]', data, error);
    //     
    //     if (error) {
    //       console.error('[예약 추가 에러]', error);
    //     } else if (data) {
    //       const newReservation = {
    //         id: data.id,
    //         time,
    //         name,
    //         customerId: data.customer_id || null,
    //         date: dateKey,
    //         phone: phone || '',
    //         phoneLast4: phoneLast4 || (phone ? phone.slice(-4) : ''),
    //         isCompleted: false,
    //         isNew: isNewReservation,
    //         reserved_at: data.reserved_at,
    //       };
    //       setReservations(prev => [...prev, newReservation]);
    //       return newReservation;
    //     }
    //   } catch (err) {
    //     console.error('[예약 추가 예외]', err);
    //   }
    // }
    
    // Supabase insert 실패 시 또는 user가 없을 때 로컬 state만 업데이트 (fallback)
    const newReservation = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
      time,
      name,
      customerId, // 고객 id 연결 (없으면 null)
      date: dateKey,
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

  // 방문 기록에서 예약 자동 생성 헬퍼 함수
  const formatReservationDate = (date) => {
    // 예약 리스트/홈에서 쓰는 기본 날짜 포맷 (예: '2025-12-06')
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatReservationTime = (date) => {
    // 예약 카드에서 쓰는 시간 포맷 (예: '15:00')
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // 방문 기록 저장 시 예약 자동 생성 함수
  const addReservationFromVisit = ({ customerId, visitDateTime }) => {
    if (!visitDateTime || !customerId) {
      console.log('[예약 자동 생성] visitDateTime 또는 customerId가 없어서 예약을 생성하지 않습니다.');
      return;
    }

    const customer = customers.find((c) => c.id === customerId);
    if (!customer) {
      console.error('[예약 자동 생성] 고객을 찾을 수 없습니다.', customerId);
      return;
    }

    // visitDateTime이 문자열인 경우 Date 객체로 변환
    const dateObj = visitDateTime instanceof Date 
      ? visitDateTime 
      : new Date(visitDateTime);

    if (isNaN(dateObj.getTime())) {
      console.error('[예약 자동 생성] 유효하지 않은 날짜입니다.', visitDateTime);
      return;
    }

    const dateStr = formatReservationDate(dateObj);
    const timeStr = formatReservationTime(dateObj);

    setReservations((prev) => {
      // 🔁 동일 날짜+시간+고객 예약이 이미 있으면 새로 만들지 않음
      const exists = prev.some(
        (r) =>
          r.customerId === customerId &&
          r.date === dateStr &&
          r.time === timeStr
      );

      if (exists) {
        console.log('[예약 자동 생성] 동일한 예약이 이미 존재합니다. 중복 생성하지 않습니다.', {
          customerId,
          dateStr,
          timeStr
        });
        return prev;
      }

      // 예약 생성 시점에 신규 여부 판단
      let isNewReservation = true;
      if (customerId) {
        const existingCustomer = customers.find(c => 
          c.id === customerId || String(c.id) === String(customerId)
        );
        if (existingCustomer) {
          isNewReservation = false;
        }
      }

      const newReservation = {
        id: `${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
        date: dateStr,              // 예약 페이지 / 홈에서 필터링에 사용하는 날짜
        time: timeStr,              // 카드에 보이는 시간
        customerId: customerId,
        name: customer.name,
        phone: customer.phone || '',
        phoneLast4: customer.phone ? customer.phone.slice(-4) : '',
        memo: '',                   // 필요하면 나중에 요약 일부를 넣어도 됨
        isCompleted: false,
        isNew: isNewReservation,
        createdFrom: 'visitSummary' // 출처(요약에서 만들어졌다는 표시)
      };

      console.log('[예약 자동 생성] 새 예약 생성:', newReservation);
      return [...prev, newReservation];
    });
  };

  const deleteReservation = (id) => {
    setReservations(prev => prev.filter(res => res.id !== id));
  };

  const updateReservation = (id, updatedData) => {
    setReservations(prev => prev.map(res => 
      res.id === id ? { ...res, ...updatedData } : res
    ));
  };

  // 텍스트 기록에서 VisitLog 생성
  const createVisitLogFromText = async ({ reservationId, customerName, customerPhone, rawText }) => {
    try {
      // 요약 시작 플래그 on
      setIsTextSummarizing(true);

      console.log('[텍스트 기록] 요약 요청 시작:', { reservationId, customerName, customerPhone, textLength: rawText.length });

      const today = new Date();
      const todayStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 (${['일','월','화','수','목','금','토'][today.getDay()]})`;

      // 요약 API 호출
      const summarizeResponse = await fetch(SUMMARY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceText: rawText,
          systemPrompt: SYSTEM_PROMPT,
          today: todayStr,
        }),
      });

      if (!summarizeResponse.ok) {
        const errorData = await summarizeResponse.json().catch(() => ({}));
        throw new Error(errorData.error || '요약 서버 호출에 실패했습니다.');
      }

      const summarizeData = await summarizeResponse.json();
      console.log('[텍스트 기록] 요약 응답:', summarizeData);

      let parsedResult = {};
      try {
        parsedResult = JSON.parse(summarizeData.summaryJson || '{}');
      } catch (parseError) {
        console.error('[텍스트 기록] JSON 파싱 실패:', parseError);
        throw new Error('요약 결과를 파싱할 수 없습니다.');
      }

      // API 응답 형식을 정리하여 전달
      let cleanedResult = {};
      
      if (parsedResult.title && parsedResult.sections && Array.isArray(parsedResult.sections)) {
        cleanedResult = {
          ...parsedResult,
          customerInfo: parsedResult.customerInfo || { name: customerName || null, phone: customerPhone || null },
          sections: (parsedResult.sections || []).map((section) => ({
            ...section,
            content: normalizeContentArray(section.content || []),
          })),
        };
      } else {
        // 다른 형식이면 변환
        cleanedResult = {
          title: parsedResult.title || parsedResult.summary || parsedResult.service || '시술 기록',
          customerInfo: parsedResult.customerInfo || { name: customerName || null, phone: customerPhone || null },
          sections: [
            {
              title: '시술 내용',
              content: normalizeContentArray([parsedResult.service || parsedResult.note || rawText])
            },
            ...(parsedResult.note ? [{
              title: '주의사항',
              content: normalizeContentArray([parsedResult.note])
            }] : [])
          ]
        };
      }

      // 🎯 예약으로 들어온 경우: "방문·예약 정보" 섹션 맨 앞에 예약 날짜 강제 삽입
      try {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎯 [텍스트 기록 - 예약 날짜 주입 시작]');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('reservationId:', reservationId);
        console.log('reservations 배열 길이:', reservations?.length);
        console.log('reservations 배열 내용:', reservations);
        
        if (reservationId && reservations && reservations.length > 0) {
          const reservation = reservations.find(r => r.id === reservationId);
          console.log('찾은 예약:', reservation);
          
          if (reservation && reservation.date && reservation.time) {
            // "방문·예약 정보" 섹션 찾기
            const visitSectionIndex = cleanedResult.sections.findIndex(
              section => section.title && section.title.includes('방문·예약 정보')
            );
            
            console.log('방문·예약 정보 섹션 인덱스:', visitSectionIndex);
            console.log('전체 섹션 제목:', cleanedResult.sections.map(s => s.title));
            
            if (visitSectionIndex !== -1) {
              // 예약 날짜를 한국어 형식으로 변환
              const dateParts = reservation.date.split('-');
              console.log('날짜 분리:', dateParts);
              
              if (dateParts.length === 3) {
                const [year, month, day] = dateParts.map(Number);
                const dateObj = new Date(year, month - 1, day);
                const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
                const weekday = weekdays[dateObj.getDay()];
                const reservationDateLine = `${year}년 ${month}월 ${day}일 (${weekday}) ${reservation.time} 예약`;
                
                console.log('생성된 예약 날짜 라인:', reservationDateLine);
                console.log('기존 content:', cleanedResult.sections[visitSectionIndex].content);
                
                // 기존 content에서 날짜 패턴이 있는 줄은 제거하고, 예약 날짜만 사용
                const existingContent = cleanedResult.sections[visitSectionIndex].content || [];
                const filteredContent = existingContent.filter(line => {
                  if (!line || typeof line !== 'string') return true;
                  // "YYYY년 MM월 DD일" 패턴이 있는 줄은 제거 (AI가 추출한 날짜)
                  return !line.match(/\d{4}년\s*\d{1,2}월\s*\d{1,2}일/);
                });
                
                cleanedResult.sections[visitSectionIndex].content = [
                  reservationDateLine,
                  ...filteredContent
                ];
                
                console.log('✅ 성공! 새 content (AI 날짜 제거됨):', cleanedResult.sections[visitSectionIndex].content);
              } else {
                console.warn('⚠️ 예약 날짜 형식이 올바르지 않습니다:', reservation.date);
              }
            } else {
              console.log('⚠️ 방문·예약 정보 섹션을 찾을 수 없습니다.');
            }
          } else {
            console.log('⚠️ 예약 정보가 불완전합니다. date:', reservation?.date, 'time:', reservation?.time);
          }
        } else {
          console.log('⚠️ 예약 ID가 없거나 예약 배열이 비어있습니다.');
        }
      } catch (error) {
        console.error('❌ 예약 날짜 주입 중 에러 (무시하고 계속):', error);
      }

      // 고객 정보 설정
      if (customerName || customerPhone) {
        const matchedCustomer = customers.find(c => 
          (customerName && c.name === customerName) || 
          (customerPhone && c.phone === customerPhone)
        );

        if (matchedCustomer) {
          setSelectedCustomerForRecord({
            ...matchedCustomer,
            reservationId: reservationId || null,
          });
          setSelectedCustomerId(matchedCustomer.id);
        } else {
          // 신규 고객
          const tempCustomer = {
            id: null,
            name: customerName || '이름 미입력',
            phone: customerPhone || '',
            isNew: true,
            tags: [],
            reservationId: reservationId || null,
          };
          setSelectedCustomerForRecord(tempCustomer);
          setSelectedCustomerId(null);
        }
      }

      // 고객 ID 찾기
      let foundCustomerId = null;
      if (customerName || customerPhone) {
        const matchedCustomer = customers.find(c => 
          (customerName && c.name === customerName) || 
          (customerPhone && c.phone === customerPhone)
        );
        foundCustomerId = matchedCustomer?.id || null;
      }

      const isFromCustomerDetail = false;
      console.log('[텍스트 기록] 현재 화면 확인:', currentScreen, 'isFromCustomerDetail:', isFromCustomerDetail);
      
      // resultData 설정
      setTranscript(rawText);
      setRawTranscript(rawText);
      setRecordingDate(today);
      handleSummaryResult(cleanedResult);
      
      // summaryDraft 설정
      handleSummaryResultFromAnySource({
        reservationId,
        customerId: foundCustomerId,
        customerName,
        customerPhone,
        summaryJson: summarizeData.summaryJson,
        sectionsCount: parsedResult.sections?.length || 0,
        rawText,
        source: 'text',
        fromCustomerDetail: isFromCustomerDetail,
      });

      console.log('[텍스트 기록] 요약 완료, 결과 화면으로 이동');
    } catch (error) {
      console.error('[텍스트 기록] 오류:', error);
      const errorMessage = error.message || '알 수 없는 오류가 발생했습니다.';
      alert(`텍스트 기록 처리 중 오류가 발생했습니다\n\n요약 서버 호출에 실패했습니다.\n콘솔을 확인해 주세요.`);
      setCurrentScreen(SCREENS.HOME);
    } finally {
      // 요약 종료 플래그 off
      setIsTextSummarizing(false);
    }
  };

  const screenRouterProps = {
    user,
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
    selectedReservation,
    setSelectedReservation,
    isTextSummarizing,
    setIsTextSummarizing,
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
    setRecordState,
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
    tempServiceDate,
    setTempServiceDate,
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
    resetAllData,
    createVisitLogFromText,
    isTextSummarizing,
    setIsTextSummarizing,
    addReservationFromVisit,
    shouldOpenReservationForm,
    reservationPrefill,
    setReservationPrefill,
    setShouldOpenReservationForm,
    cachedProfile,
    profileLoading,
    refetchProfile
  };

  return {
    screenRouterProps,
    currentScreen,
    activeTab,
    handleTabClick
  };
}

