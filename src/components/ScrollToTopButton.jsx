import React, { useState, useEffect, useRef } from 'react';
import { ChevronUp } from 'lucide-react';

function ScrollToTopButton({ currentScreen }) {
  const [isVisible, setIsVisible] = useState(false);
  const mainListenersRef = useRef(new Set());

  useEffect(() => {
    const toggleVisibility = () => {
      // window 스크롤 확인
      const windowScrolled = window.scrollY > 300 || document.documentElement.scrollTop > 300;
      
      // main 요소 스크롤 확인
      let mainScrolled = false;
      const mainElements = document.querySelectorAll('main');
      mainElements.forEach((main) => {
        if (main.scrollTop > 300) {
          mainScrolled = true;
        }
      });
      
      // 둘 중 하나라도 300px 이상 스크롤되면 버튼 표시
      setIsVisible(windowScrolled || mainScrolled);
    };

    // main 요소에 이벤트 리스너 추가하는 함수
    const attachMainListeners = () => {
      const mainElements = document.querySelectorAll('main');
      mainElements.forEach((main) => {
        // 이미 리스너가 붙어있는지 확인
        if (!mainListenersRef.current.has(main)) {
          main.addEventListener('scroll', toggleVisibility);
          mainListenersRef.current.add(main);
        }
      });
    };

    // window 스크롤 이벤트 리스너
    window.addEventListener('scroll', toggleVisibility);
    
    // 초기 main 요소들에 이벤트 리스너 추가
    attachMainListeners();

    // MutationObserver로 DOM 변화 감지 (새로운 main 요소 추가 시)
    const observer = new MutationObserver(() => {
      attachMainListeners();
      toggleVisibility(); // 새로운 main 추가 시 스크롤 상태도 체크
    });

    // body의 자식 요소 변화 감지
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // 초기 체크
    toggleVisibility();

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
      // 모든 main 요소의 리스너 제거
      mainListenersRef.current.forEach((main) => {
        main.removeEventListener('scroll', toggleVisibility);
      });
      mainListenersRef.current.clear();
      observer.disconnect();
    };
  }, []);

  const scrollToTop = () => {
    // window 스크롤 초기화
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
    
    // main 요소들도 스크롤 초기화
    const mainElements = document.querySelectorAll('main');
    mainElements.forEach((main) => {
      main.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={scrollToTop}
      className="fixed right-3 z-40 w-12 h-12 rounded-full bg-[#C9A27A] text-white shadow-lg hover:bg-[#B8946A] transition-all flex items-center justify-center"
      style={{
        bottom: 'calc(60px + env(safe-area-inset-bottom) + 16px)'
      }}
      aria-label="맨 위로"
    >
      <ChevronUp size={20} />
    </button>
  );
}

export default ScrollToTopButton;

