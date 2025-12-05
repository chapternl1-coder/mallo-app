import React, { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // 스크롤이 300px 이상 내려갔을 때 버튼 표시
      if (window.scrollY > 300 || document.documentElement.scrollTop > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
    
    // main 요소도 스크롤 초기화
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
      className="fixed bottom-24 right-5 z-40 w-12 h-12 rounded-full bg-[#C9A27A] text-white shadow-lg hover:bg-[#B8946A] transition-all flex items-center justify-center"
      aria-label="맨 위로"
    >
      <ChevronUp size={20} />
    </button>
  );
}

export default ScrollToTopButton;

