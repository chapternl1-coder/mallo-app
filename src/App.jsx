import React, { useState, useEffect } from 'react';

import ScreenRouter from './components/ScreenRouter';

import BottomNavigation from './components/BottomNavigation';

import ScrollToTopButton from './components/ScrollToTopButton';

import { SCREENS } from './constants/screens';

import useMalloAppState from './hooks/useMalloAppState';

import { useAuth } from './contexts/AuthContext';

import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';

import useSupabaseDebug from './hooks/useSupabaseDebug';

import useSupabaseReservations from './hooks/useSupabaseReservations';

import useVisitLogs from './hooks/useVisitLogs';

import { supabase } from './lib/supabaseClient';

// 콘솔 디버그 토글 (과도한 로그 방지)
const ENABLE_APP_DEBUG_LOG = false;
const appLog = (...args) => {
  if (ENABLE_APP_DEBUG_LOG) console.log(...args);
};



export default function MalloApp() {

  const { user, loading } = useAuth();
  const [authScreen, setAuthScreen] = useState('login'); // 'login' | 'signup'



  // Supabase에 있는 고객/예약 데이터를 콘솔로 확인하는 디버그용 훅

  useSupabaseDebug();



  // Supabase 연동을 위해 user를 훅에 넘겨줌

  // Supabase 데이터 로딩 + 콘솔 출력용

  const {

    customers,

    reservations: supabaseReservations,

    loading: reservationsLoading,

    error: reservationsError,

    refresh: refreshSupabaseData,  // 고객/예약 모두 새로고침

  } = useSupabaseReservations();

  

  const {

    screenRouterProps,

    currentScreen,

    activeTab,

    handleTabClick,

  } = useMalloAppState(user, supabaseReservations);



  // Supabase 값으로 초기화되는 로컬 state

  const [reservations, setReservations] = useState([]);
  const [mergedCustomers, setMergedCustomers] = useState([]);



  useEffect(() => {
    // 🚨 데이터 손실 방지: supabaseReservations가 null/undefined인 경우 기존 데이터 유지
    if (!Array.isArray(supabaseReservations)) {
      console.warn('[App] ⚠️ Supabase 예약 데이터 없음, 기존 데이터 유지');
      return; // 빈 배열로 설정하지 않고 기존 state 유지
    }

    // 🚨 빈 배열이 반환된 경우: 로그인 세션 만료 가능성 체크
    if (supabaseReservations.length === 0 && user) {
      console.warn('[App] ⚠️ Supabase 빈 배열 반환 (세션 만료 가능성)');
    }

    // Supabase 데이터를 우선 적용하되, 아직 Supabase에 반영되지 않은
    // 로컬 임시 예약(예: reserved_at 없는 항목)은 보존하여 즉시 UI에 반영
    setReservations((prev) => {
      const merged = new Map();

      // 1) Supabase에서 내려온 최신 데이터를 먼저 채운다.
      supabaseReservations.forEach((res) => {
        if (res && res.id) {
          merged.set(res.id, res);
        }
      });

      // 2) Supabase에 아직 없는 로컬 예약(주로 새로 추가된 항목)만 추가한다.
      prev.forEach((res) => {
        if (!res) return;
        const hasSupabaseRow = res.id && merged.has(res.id);
        const isLocalOnly = !res.reserved_at; // Supabase row에는 reserved_at이 항상 존재

        if (!hasSupabaseRow && isLocalOnly) {
          merged.set(res.id || `local-${merged.size}`, res);
        }
      });

      const result = Array.from(merged.values());
      
      // 🚨 Supabase가 빈 배열인데 로컬에 데이터가 있으면 경고 (로그인 상태에서만)
      if (user && supabaseReservations.length === 0 && prev.length > 0 && result.length === 0) {
        console.error('[App] 🚨 데이터 손실 위험 감지! Supabase 빈 배열이 로컬 예약을 덮어쓸 뻔함');
        // 기존 로컬 데이터 유지
        return prev;
      }

      return result;
    });
  }, [supabaseReservations, user]);

  // Supabase customers를 localStorage와 병합하여 실제 사용할 customers 생성
  // 기존 localStorage의 customerTags를 보존하면서 병합
  useEffect(() => {
    // 🚨 데이터 손실 방지: Supabase가 빈 배열을 반환해도 기존 로컬 데이터 유지
    if (customers && customers.length > 0) {
      try {
        // 기존 localStorage의 customerTags 보존
        const existingCustomersStr = localStorage.getItem('mallo_customers');
        const existingCustomers = existingCustomersStr ? JSON.parse(existingCustomersStr) : [];
        const existingTagsMap = new Map();
        existingCustomers.forEach(c => {
          if (c.id && c.customerTags) {
            existingTagsMap.set(c.id, c.customerTags);
          }
        });

        // Supabase에서 가져온 customers에 기존 customerTags 병합
        // Supabase에 customerTags가 있으면 우선 사용, 없으면 localStorage의 것을 사용
        const merged = customers.map(c => {
          const existingTags = existingTagsMap.get(c.id);
          // Supabase에 customerTags가 있고 비어있지 않으면 Supabase 것을 사용
          if (c.customerTags && typeof c.customerTags === 'object' && Object.keys(c.customerTags).length > 0) {
            return c; // Supabase의 customerTags 사용
          }
          // Supabase에 없거나 비어있으면 localStorage의 것을 사용
          if (existingTags) {
            return {
              ...c,
              customerTags: existingTags
            };
          }
          return c;
        });

        // 병합된 결과를 state에 저장하여 실제로 사용
        setMergedCustomers(merged);
        
        // localStorage에도 저장 (다음 로드 시 사용)
        localStorage.setItem('mallo_customers', JSON.stringify(merged));
        appLog('[App] Supabase customers를 localStorage와 병합:', merged.length, '명');
      } catch (e) {
        console.error('[App] localStorage 동기화 실패:', e);
        // 에러 발생 시에도 기존 데이터 유지 (빈 배열로 덮어쓰지 않음)
        const existingCustomersStr = localStorage.getItem('mallo_customers');
        const existingCustomers = existingCustomersStr ? JSON.parse(existingCustomersStr) : [];
        if (existingCustomers.length > 0) {
          console.warn('[App] ⚠️ Supabase 동기화 실패, 기존 로컬 데이터 유지:', existingCustomers.length, '명');
          setMergedCustomers(existingCustomers);
        } else {
          setMergedCustomers(customers);
        }
      }
    } else if (customers && customers.length === 0) {
      // 🚨 Supabase가 빈 배열을 반환한 경우: 기존 로컬 데이터 유지 (로그인 상태에서만)
      const existingCustomersStr = localStorage.getItem('mallo_customers');
      const existingCustomers = existingCustomersStr ? JSON.parse(existingCustomersStr) : [];
      if (user && existingCustomers.length > 0) {
        console.warn('[App] ⚠️ Supabase 빈 배열 반환, 기존 로컬 데이터 유지:', existingCustomers.length, '명');
        setMergedCustomers(existingCustomers);
      } else {
        // 로컬에도 데이터가 없거나 로그아웃 상태면 빈 배열 사용
        setMergedCustomers([]);
      }
    }
  }, [customers]);



  // UUID 검증 헬퍼 함수
  const isValidUuid = (value) => {
    if (typeof value !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value
    );
  };

  // 예약 추가/삭제 함수 정의

  const addReservation = (newReservation) => {

    setReservations((prev) => [...prev, newReservation]);

  };



  const deleteReservation = async (reservationId) => {

    // 3-1. 먼저 로컬 state에서 삭제 (UI 즉시 반영)

    setReservations((prev) => prev.filter((res) => res.id !== reservationId));



    // 3-2. id 가 uuid가 아니면 Supabase 삭제는 생략 (옛 로컬 id 보호)

    if (!isValidUuid(reservationId)) {

      return;

    }



    try {

      const { error } = await supabase

        .from('reservations')

        .delete()

        .eq('id', reservationId)

        .eq('owner_id', user.id);



      if (error) {

        console.error('[Supabase] 예약 삭제 에러:', error);

        // 필요하면 여기서 alert 한 줄 추가 가능

      }

    } catch (e) {

      console.error('[Supabase] 예약 삭제 중 예외:', e);

    }

  };



  // Supabase visit_logs 데이터 로딩

  const {

    visitLogsByCustomer,

    visitLogs,

    allVisitLogs,

    loading: visitLogsLoading,

    error: visitLogsError,

    refresh: refreshVisitLogs,

    refetchVisitLogs,        // ✅ 이 줄 추가

  } = useVisitLogs();



  // 필요하면 아래처럼 콘솔에 다시 한 번 찍을 수도 있음

  appLog('[MalloApp] Supabase customers 길이:', customers.length);
  appLog('[MalloApp] Supabase reservations 길이:', supabaseReservations.length);
  appLog('[MalloApp] 로컬 reservations 길이:', reservations.length);
  appLog('[MalloApp] Supabase visit_logs 길이:', allVisitLogs.length);

  // ✅ 전체 앱 로딩 상태: 처음 한 번만 표시
  const [hasShownInitialAppLoading, setHasShownInitialAppLoading] = useState(false);

  useEffect(() => {
    // 처음으로 모든 로딩이 끝난 시점을 기억
    if (
      !hasShownInitialAppLoading &&
      !reservationsLoading &&
      !visitLogsLoading
    ) {
      setHasShownInitialAppLoading(true);
    }
  }, [hasShownInitialAppLoading, reservationsLoading, visitLogsLoading]);

  const shouldShowAppLoading =
    !hasShownInitialAppLoading &&
    (reservationsLoading || visitLogsLoading);

  // ✅ Supabase 고객(mergedCustomers) + 로컬 고객(screenRouterProps.customers)을 병합
  const combinedCustomers = (() => {
    const map = new Map();

    const addList = (list) => {
      (list || []).forEach((c) => {
        const key =
          c?.id !== undefined && c?.id !== null
            ? String(c.id)
            : c?.phone
            ? `phone-${c.phone}`
            : Math.random().toString(16);
        if (!map.has(key)) {
          map.set(key, c);
        }
      });
    };

    // 우선순위: 로컬 customers(즉시 반영) → mergedCustomers(=Supabase) → Supabase 기본 customers
    addList(screenRouterProps.customers);
    addList(mergedCustomers);
    addList(customers);

    return Array.from(map.values());
  })();


  // 1) Auth 로딩 중 또는 앱 첫 로딩 중 로딩 화면

  if (loading || shouldShowAppLoading) {

    return (

      <div

        className="min-h-screen flex items-center justify-center"

        style={{ backgroundColor: '#F2F0E6' }}

      >

        <div className="text-center">

          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-[#E4D9CC] bg-white mb-3">

            <span className="text-xs font-semibold tracking-widest" style={{ color: '#C9A27A' }}>

              MALLO

            </span>

          </div>

          <p className="text-xs text-neutral-600">계정 정보를 불러오는 중입니다...</p>

        </div>

      </div>

    );

  }



  // 2) 로그인 안 된 상태면 → 로그인/회원가입 화면

  if (!user) {

    if (authScreen === 'signup') {
      return <SignUpScreen onBackToLogin={() => setAuthScreen('login')} />;
    }

    return <LoginScreen onGoToSignUp={() => setAuthScreen('signup')} />;

  }



  // 3) 로그인 된 상태면 → 메인 앱

  return (

    <div

      className="h-screen w-full flex items-center justify-center font-sans"

      style={{ backgroundColor: '#F2F0E6' }}

    >

      <div

        className="w-full max-w-md h-full sm:h-[90vh] sm:rounded-[2rem] sm:shadow-md overflow-hidden relative border-0"

        style={{ backgroundColor: '#F2F0E6' }}

      >

        <ScreenRouter

          {...screenRouterProps}

          reservationsLoading={reservationsLoading}

          customers={combinedCustomers}  // Supabase + 로컬 추가 고객 병합본

          reservations={reservations}

          // visits는 screenRouterProps에서 가져온 것 사용 (로컬 저장된 태그 포함)
          // visitLogs는 Supabase 데이터 (태그 없을 수 있음)
          visits={screenRouterProps.visits || visitLogsByCustomer}

          visitLogs={visitLogs}

          allRecords={allVisitLogs}

          isVisitLogsLoading={visitLogsLoading}

          addReservation={addReservation}

          deleteReservation={deleteReservation}

          refreshVisitLogs={refreshVisitLogs}

          refetchVisitLogs={refetchVisitLogs}  // ✅ 태그 변경 후 Supabase 데이터 새로고침용

          refreshReservations={refreshSupabaseData}

          refreshCustomers={refreshSupabaseData}  // ✅ 실제 Supabase 고객/예약 새로고침 함수 전달

        />



        {/* 스크롤이 일정 이상 내려갔을 때 공통으로 보이는 '맨 위로' 버튼 */}

        <ScrollToTopButton currentScreen={currentScreen} />



        {(currentScreen === SCREENS.HOME ||

          currentScreen === SCREENS.RESERVATION ||

          currentScreen === SCREENS.HISTORY ||

          currentScreen === SCREENS.PROFILE) && (

          <BottomNavigation activeTab={activeTab} onTabChange={handleTabClick} />

        )}

      </div>

    </div>

  );

}
