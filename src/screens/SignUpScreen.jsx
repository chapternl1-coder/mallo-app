import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function SignUpScreen({ onBackToLogin }) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSignUp = async (e) => {
    e.preventDefault();
    setMessage('');

    // 유효성 검사
    if (password !== passwordConfirm) {
      setMessage('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 6) {
      setMessage('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    if (!shopName.trim()) {
      setMessage('샵/매장 이름을 입력해주세요.');
      return;
    }

    setSubmitting(true);

    try {
      await signUp({ email, password, shopName, phone });
      setMessage('회원가입 완료! 잠시만 기다려 주세요.');
    } catch (error) {
      console.error(error);
      setMessage(error.message || '오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-start justify-center px-6 pt-2"
      style={{ backgroundColor: '#F2F0E6' }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-1 text-center">
          <div className="flex items-center justify-center mb-0">
            <img 
              src="/logo.png" 
              alt="mallo 로고" 
              className="w-32 h-32 object-contain"
            />
          </div>
          <p className="text-sm text-neutral-500">
            회원가입하고 시술일지를 효율적으로 관리하세요.
          </p>
        </div>

        <div className="bg-white border border-[#E4D9CC] rounded-2xl px-5 py-6 shadow-sm/5">
          <form onSubmit={handleSignUp} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1.5">
                이메일
              </label>
              <input
                type="email"
                required
                className="w-full rounded-lg border border-[#E4D9CC] bg-neutral-50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#C9A27A]"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1.5">
                비밀번호
              </label>
              <input
                type="password"
                required
                minLength={6}
                className="w-full rounded-lg border border-[#E4D9CC] bg-neutral-50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#C9A27A]"
                placeholder="6자 이상 입력"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1.5">
                비밀번호 확인
              </label>
              <input
                type="password"
                required
                minLength={6}
                className="w-full rounded-lg border border-[#E4D9CC] bg-neutral-50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#C9A27A]"
                placeholder="비밀번호 재입력"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1.5">
                샵/매장 이름
              </label>
              <input
                type="text"
                required
                className="w-full rounded-lg border border-[#E4D9CC] bg-neutral-50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#C9A27A]"
                placeholder="예: 말로 뷰티샵"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1.5">
                연락처 (선택)
              </label>
              <input
                type="tel"
                className="w-full rounded-lg border border-[#E4D9CC] bg-neutral-50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#C9A27A]"
                placeholder="010-1234-5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            {message && (
              <p className="text-[11px] text-neutral-500 mt-1 whitespace-pre-line">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded-full py-2.5 text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#C9A27A' }}
            >
              {submitting ? '처리 중...' : '회원가입'}
            </button>
          </form>
        </div>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onBackToLogin}
            className="text-sm text-neutral-600 hover:text-neutral-900 transition"
          >
            이미 계정이 있으신가요? <span className="font-semibold" style={{ color: '#C9A27A' }}>로그인</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default SignUpScreen;

