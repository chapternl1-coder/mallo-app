import React, { useRef } from 'react';

import { Mail, Lock } from 'lucide-react';

import { SCREENS } from '../constants/screens';

import logo from '../assets/logo.png';

function LoginScreen({
  email,
  setEmail,
  password,
  setPassword,
  setIsLoggedIn,
  setActiveTab,
  setCurrentScreen
}) {
  const passwordInputRef = useRef(null);

  const handleLogin = () => {
    // 간단한 로그인 로직 (실제로는 API 호출)
    if (email && password) {
      setIsLoggedIn(true);
      setActiveTab('Home');
      setCurrentScreen(SCREENS.HOME);
    } else {
      alert('이메일과 비밀번호를 입력해주세요.');
    }
  };

  return (
    <div
      className="flex min-h-screen justify-center"
      style={{ backgroundColor: '#F2F0E6' }}
    >
      <div className="w-full max-w-sm px-8 pt-0 pb-8 mt-[-8px]">
        {/* ✅ 로고 (이 위치는 그대로 유지) */}
        <div className="text-center">
          <img
            src={logo}
            alt="Mallo 로고"
            className="w-60 h-60 object-contain mx-auto"
          />
        </div>

        {/* ✅ 텍스트 + 로그인 폼 묶음
            → 여기 margin-top으로 더 위로 당김 (mt-[-24px]) */}
        <div className="mt-[-24px] space-y-4">
          {/* 텍스트 */}
          <div className="text-center">
            <h1
              className="text-3xl font-bold mb-1"
              style={{ color: '#232323' }}
            >
              Mallo
            </h1>
            <p className="font-light" style={{ color: '#232323' }}>
              오늘 시술, 말로만 기록하세요.
            </p>
          </div>

          {/* 로그인 폼 */}
          <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200 space-y-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: '#232323' }}>
                  이메일
                </label>
                <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border border-gray-200 focus-within:border-[#C9A27A] focus-within:ring-1 focus-within:ring-[#C9A27A] transition-all">
                  <Mail size={18} style={{ color: '#C9A27A' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@beauty.com"
                    className="w-full bg-transparent outline-none font-light placeholder-gray-400"
                    style={{ color: '#232323' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        // Enter / Next 키를 누르면 비밀번호 인풋으로 포커스 이동
                        if (passwordInputRef.current) {
                          passwordInputRef.current.focus();
                        }
                      }
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: '#232323' }}>
                  비밀번호
                </label>
                <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border border-gray-200 focus-within:border-[#C9A27A] focus-within:ring-1 focus-within:ring-[#C9A27A] transition-all">
                  <Lock size={18} style={{ color: '#C9A27A' }} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent outline-none font-light placeholder-gray-400"
                    style={{ color: '#232323' }}
                    ref={passwordInputRef}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleLogin();
                      }
                    }}
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
    </div>
  );
}

export default LoginScreen;
