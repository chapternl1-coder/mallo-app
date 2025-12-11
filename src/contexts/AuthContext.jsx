import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

// 브라우저 로컬스토리지에 저장할 키
const STORAGE_KEY = 'mallo_auth_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);      // { id, email } 형태
  const [loading, setLoading] = useState(true); // 앱 처음 켜질 때만 true

  // ✅ 앱 시작할 때 localStorage에서 유저 정보 불러오기
  useEffect(() => {
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
    } finally {
      setLoading(false);
    }
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

    const simpleUser = { id: supaUser.id, email: supaUser.email };
    setUser(simpleUser);
    saveUserToStorage(simpleUser);

    return simpleUser;
  };

  // ✅ 회원가입: 계정 만들고 곧바로 로그인된 상태로 취급
  const signUp = async ({ email, password, shopName, phone }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
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

    // ✅ 프로필 테이블에 추가 정보 저장 (profiles 테이블이 있다면)
    try {
      await supabase.from('profiles').upsert({
        id: supaUser.id,
        email: supaUser.email,
        shop_name: shopName,
        phone: phone || null,
      });
    } catch (profileError) {
      console.warn('[Auth] 프로필 저장 실패 (테이블이 없을 수 있음):', profileError);
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
