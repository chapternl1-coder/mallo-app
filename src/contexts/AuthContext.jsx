import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

// 브라우저 로컬스토리지에 저장할 키
const STORAGE_KEY = 'mallo_auth_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);      // { id, email } 형태
  const [loading, setLoading] = useState(true); // 앱 처음 켜질 때만 true

  // ✅ 앱 시작할 때 localStorage + Supabase 세션 확인
  useEffect(() => {
    // 1) 먼저 localStorage에서 유저 정보 불러오기 (빠른 UI 표시)
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id && parsed.email) {
          setUser(parsed);
        }
      }
    } catch (e) {
      console.warn('[Auth] localStorage 파싱 에러', e);
    }

    // 2) Supabase 세션 확인 및 자동 갱신
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn('[Auth] 세션 확인 실패:', error);
          setUser(null);
          saveUserToStorage(null);
        } else if (session?.user) {
          // Supabase 세션이 유효하면 user 업데이트
          const simpleUser = { id: session.user.id, email: session.user.email };
          setUser(simpleUser);
          saveUserToStorage(simpleUser);
        } else {
          // 세션이 없으면 로그아웃 처리
          console.warn('[Auth] 세션 만료 - 로그아웃 처리');
          setUser(null);
          saveUserToStorage(null);
        }
      } catch (e) {
        console.error('[Auth] 세션 체크 예외:', e);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // 3) Supabase auth 상태 변경 감지 (로그인/로그아웃 자동 처리)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] 상태 변경:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
          const simpleUser = { id: session.user.id, email: session.user.email };
          setUser(simpleUser);
          saveUserToStorage(simpleUser);
        } else if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
          console.warn('[Auth] 로그아웃 감지');
          setUser(null);
          saveUserToStorage(null);
          
          // 로그아웃 시 모든 로컬 데이터 삭제 (보안 및 데이터 분리)
          localStorage.removeItem('mallo_customers');
          localStorage.removeItem('mallo_visits');
          localStorage.removeItem('mallo_reservations');
          localStorage.removeItem('mallo_profile');
          
          // alert 제거: 자연스럽게 로그인 화면으로 이동
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('[Auth] 토큰 자동 갱신 완료');
          const simpleUser = { id: session.user.id, email: session.user.email };
          setUser(simpleUser);
          saveUserToStorage(simpleUser);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // localStorage에 저장/삭제 헬퍼
  const saveUserToStorage = (u) => {
    if (!u) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ id: u.id, email: u.email })
    );
  };

  // ✅ 로그인: Supabase로 비밀번호 확인 → 성공하면 우리 쪽 user 저장
  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    const supaUser = data?.user || data?.session?.user;
    if (!supaUser) {
      throw new Error('로그인에 실패했습니다. 다시 시도해주세요.');
    }

    // 🚨 로그인 성공 시 이전 계정의 모든 데이터 삭제 (계정 간 데이터 혼선 방지)
    console.log('[Auth] 로그인 성공 - 이전 계정 데이터 삭제');
    localStorage.removeItem('mallo_customers');
    localStorage.removeItem('mallo_visits');
    localStorage.removeItem('mallo_reservations');
    localStorage.removeItem('mallo_profile');

    const simpleUser = { id: supaUser.id, email: supaUser.email };
    setUser(simpleUser);
    saveUserToStorage(simpleUser);

    return simpleUser;
  };

  // ✅ 회원가입: 계정 만들고 곧바로 로그인된 상태로 취급
  const signUp = async ({ email, password, name, shopName, phone }) => {
    // 🚨 회원가입 시 이전 계정의 모든 데이터 삭제 (계정 간 데이터 혼선 방지)
    console.log('[Auth] 회원가입 - 이전 계정 데이터 삭제');
    localStorage.removeItem('mallo_customers');
    localStorage.removeItem('mallo_visits');
    localStorage.removeItem('mallo_reservations');
    localStorage.removeItem('mallo_profile');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
          shop_name: shopName,
          phone: phone || null,
        }
      }
    });

    if (error) {
      throw error;
    }

    const supaUser = data?.user || data?.session?.user;
    if (!supaUser) {
      // 어떤 이유로 user가 없다면, 바로 로그인 시도를 한 번 더 해본다
      const autoLogin = await signIn({ email, password });
      return autoLogin;
    }

    const simpleUser = { id: supaUser.id, email: supaUser.email };
    setUser(simpleUser);
    saveUserToStorage(simpleUser);

    // ✅ 프로필 테이블에 추가 정보 저장
    const { error: profileError } = await supabase.from('profiles').insert({
      id: supaUser.id,
      owner_name: name,
      shop_name: shopName,
      phone: phone || null,
    });

    if (profileError) {
      console.error('[Auth] 프로필 저장 실패:', profileError);
      // profiles 저장 실패 시 사용자 계정도 정리하는 것이 좋지만,
      // 일단 에러만 던져서 사용자에게 알림
      throw new Error('프로필 생성에 실패했습니다. 다시 시도해주세요.');
    }

    return simpleUser;
  };

  // ✅ 로그아웃: Supabase + localStorage 둘 다 정리
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('[Auth] signOut error', e);
    } finally {
      setUser(null);
      saveUserToStorage(null);
    }
  };

  const value = {
    user,      // { id, email } 또는 null
    loading,   // 앱 처음 켤 때만 true
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth는 AuthProvider 안에서만 사용할 수 있습니다.');
  }
  return ctx;
}
