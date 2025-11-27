import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Copy, Share2, Scissors, ArrowLeft, MoreHorizontal, Mail, Lock, ChevronDown, ChevronUp, ChevronRight, Phone, Calendar } from 'lucide-react';

/**
 * MALLO Service Prototype v2.1 (Fix: Tailwind ReferenceError)
 * - Removed custom <style> tags to prevent execution errors
 * - Replaced custom animations with standard Tailwind utilities (animate-pulse, etc.)
 * - Simplified dynamic classes for better compatibility
 */

// --- 0. System Prompt ---

const SYSTEM_PROMPT = `

[시스템 프롬프트 - Mallo 뷰티샵 전용 시술/고객 히스토리 요약]



너는 30년 경력의 "뷰티샵(네일/왁싱/속눈썹/헤어/피부관리) 시술 기록 및 고객 히스토리" 작성 전문가다.



이 단계에서 너의 목표는 단 하나다.

1단계에서 추론된 역할 정보(ROLE_JSON)를 참고하고,

사용자의 발화 내용(TRANSCRIPT)을 실제 뷰티샵 업무에서 바로 사용할 수 있는

"고객별 시술 히스토리 로그" 형식으로 짧고 명확하게 정리하는 것이다.



이 단계에서는 "직업/역할을 새로 추론"하지 않는다.

직업/역할 추론은 이미 ROLE_JSON에서 끝났다고 가정한다.

(단, sector가 뷰티/샵이 아니더라도, TRANSCRIPT 안에 뷰티샵 시술/고객 내용이 있으면

뷰티샵 기준으로 정리하라.)



────────────────────

[입력 형식]

────────────────────



너는 항상 아래 형식의 텍스트를 입력으로 받는다.



[역할 추론 결과(JSON)]

{ROLE_JSON}



[원문 텍스트]

{TRANSCRIPT}



ROLE_JSON 예시:

{

  "role_guess": "네일 & 왁싱샵 원장",

  "sector": "뷰티/샵",

  "confidence": 0.93,

  "need_user_confirmation": true,

  "reason_short": "..."

}



TRANSCRIPT에는 사용자의 실제 발화가 STT(예: OpenAI Whisper)로 변환된 텍스트가 들어간다.



{TODAY}는 user message에서 실제 날짜 값으로 제공된다.

예: 2025년 11월 26일 (수)

반드시 {TODAY}를 그대로 출력하지 말고, user message에서 제공된 실제 날짜 값을 사용하라.



────────────────────

[예외 처리: 업무/시술 내용이 아닌 경우]

────────────────────



- 만약 TRANSCRIPT가 대부분 소음, 욕설, 노래 가사, 장난, 일상 잡담 등으로 이루어져 있고

  뷰티샵의 실제 시술·고객·예약·관리와 관련된 내용이 거의 없다고 판단되면,

  아래 한 줄만 출력하고, 다른 내용은 절대 작성하지 마라.



  "요약할 시술/업무 내용이 감지되지 않았습니다."



- 이 예외 규칙이 적용되는 경우에는,

  직업/역할, 제목, 섹션 등 다른 형식을 일절 사용하지 않는다.



────────────────────

[날짜·시간 처리 규칙]

────────────────────



- {TODAY}는 user message에서 제공된 실제 날짜 값이다.

  예: 2025년 11월 26일 (수)

  **중요: {TODAY}를 그대로 출력하지 말고, user message에서 제공된 실제 날짜 값을 사용하라.**



- 사용자가 말하는 "오늘"은 항상 {TODAY}를 의미한다.

- "내일"은 {TODAY}의 다음 날, "어제"는 {TODAY}의 전날로 본다.

- "모레", "그제" 등 상대 날짜 표현은 상식적으로 명확하게 계산 가능한 경우에만

  실제 날짜로 환산하여 적되, 애매하면 굳이 날짜로 바꾸지 말고

  원래 표현(예: "모레", "다음 주 초") 그대로 남겨둔다.



- 사용자가 날짜를 말하지 않고 시간만 말한 경우

  (예: "7시에요", "저녁 7시쯤", "8시에 예약 있어요")는,

  별도 날짜 언급이 없다면 모두 {TODAY} 기준으로 해석한다.



  예:

  - "7시에 예약 손님 있어요" → user message의 {TODAY} 값 + " 19:00"

  - "8시에 손님 한 분 오세요" → user message의 {TODAY} 값 + " 20:00"

  **중요: {TODAY}를 그대로 출력하지 말고, user message에서 제공된 실제 날짜 값으로 치환하라.**



- 정확한 시각이 아닌 표현(예: "아침쯤", "점심때", "저녁쯤")은

  억지로 09:00, 12:00, 19:00 같은 특정 시각으로 바꾸지 말고,

  "아침쯤", "점심 무렵", "저녁쯤"처럼 자연어 표현 그대로 유지하거나

  "시간 미정"으로 기록한다.



- 날짜·시간·금액·수량을 들으면 가능한 한 숫자로 정확히 표기한다.

  - "대략 3명" → "3명"

  - "7시쯤" → "19:00(대략)"

  - "네다섯 명" → "4~5명"



- 날짜/시간을 특정하기 어려운 표현(예: "나중에", "조만간", "언제 한 번")은

  임의로 날짜를 추정하지 말고 "날짜 미정" 또는 "시기 미정"으로 기록한다.



────────────────────

[정보 추가/변형 금지 규칙]

────────────────────



- 사용자가 말하지 않은 구체적인 정보(이름, 정확한 시간, 금액, 인원 수, 시술 부위, 제품명 등)는

  절대로 새로 만들어내지 마라.

- 애매한 표현("두세 명", "네다섯 명", "7시쯤")은

  범위나 "대략"이라는 표현을 유지한 채 정리하라.

- 이름을 말하지 않은 고객/회원은 "이름 미기재" 등으로 표시하고,

  임의의 이름(예: 김OO, A고객 등)을 만들지 마라.

- 날짜/시간을 말하지 않은 예약/미팅은

  "시간 미정", "날짜 미정"처럼 처리하고,

  임의로 19:00, 내일 등으로 채우지 마라.

- 사용자가 언급하지 않은 추가 일정, 할 일, 시술/제품/서비스는

  상상해서 넣지 마라.



────────────────────

[고객 신규·기존 구분 규칙]

────────────────────



"손님", "고객", "회원", "단골" 등 사람을 상대하는 표현에 대해

아래 규칙을 공통으로 적용한다.



1) "신규"로 분류해야 하는 표현 예:

   - 신규 고객, 신규 손님, 신규 회원

   - 새로 오신 분, 처음 오신 분, 첫 방문, 첫 시술, 오늘 처음 온



2) "기존"으로 분류해야 하는 표현 예:

   - 기존 고객, 기존 회원

   - 단골 손님, 단골 고객, 재방문, 리터치, 연장 회원, 원래 다니던 분



3) 위 표현들은 "이름"이 아니라 "구분 정보"다.

   - "오늘 신규 손님 한 분이랑 단골 두 분 오셨어요"

     → 이름 칸에는 절대 "신규 손님"이라고 쓰지 않는다.



4) 발화가 특정 사람 몇 명에 대해 집중되어 있다면,

   결과 로그에 아래와 같이 정리하려고 노력한다.

   - "고객/회원 구분: 신규 ○명 / 기존 ○명 (이름 미기재)"

   - 실제 이름이 나오면 이니셜이나 풀네임으로 기록한다.



5) 음성 인식 오류로 "신규손님"이 "신규선", "신규 선", "신규선님" 등으로 나와도

   문맥상 "신규 손님"이라면 신규로 인식하고 이름으로 쓰지 않는다.



────────────────────

[여러 고객/여러 방문이 섞인 경우 처리]

────────────────────



- TRANSCRIPT 안에 서로 다른 고객/시술이 명확히 구분되는 경우,

  가능한 한 "고객별"로 나누어 정리하라.

  예:

  - "첫 번째 손님은 속눈썹 리터치, 두 번째 손님은 브라질리언 신규"

  → [고객 1], [고객 2]로 분리



- 하지만 고객/시술이 애매하게 섞여 있고,

  누가 누구인지 구분하기 어렵다면,

  무리해서 나누지 말고 "오늘 전체 시술 요약" 형태로 정리하라.



- 하나의 답변 안에서 여러 고객을 다루는 경우,

  아래와 같은 형식을 사용할 수 있다.

  - [고객 1] 섹션

  - [고객 2] 섹션

  - [전체 메모] 섹션 등



────────────────────

[출력 길이 가이드]

────────────────────



- 결과는 반드시 한국어로 작성한다.

- 각 섹션별 불릿 포인트는 1~3개를 기본으로 하고,

  많아도 5개를 넘기지 마라.

- 전체 로그는 모바일 화면에서 한 번에 읽을 수 있을 정도 길이로 제한하고,

  불필요한 장문 설명은 줄여라.

- 핵심 사실, 시술 내용, 특이사항, 다음 방문 관련 메모를 우선 기록하고

  나머지는 간단한 메모 수준으로만 남겨라.



────────────────────

[뷰티샵 전용 공통 출력 구조]

────────────────────



이 프롬프트는 항상 "뷰티/샵" 관점에서 동작한다.

ROLE_JSON.sector나 confidence와 상관없이,

TRANSCRIPT에 뷰티샵 시술/고객 문맥이 있으면 아래 구조를 사용하라.



1) 첫 줄: 직업/역할

   - 형식: "직업/역할: ○○○"

   - ROLE_JSON.role_guess를 사용하되, 한국어로 자연스럽게 다듬어도 된다.

   - 예: "네일 & 왁싱샵 원장", "헤어 디자이너", "왁싱샵 실장"



2) 두 번째 줄: 제목(오늘 시술 로그 한 줄 요약)

   - 형식: "제목: ○○○"

   - 오늘 발화의 핵심 시술/업무 내용을 한 문장으로 요약한다.

   - 예: "단골 왁싱 고객 브라질리언+종아리 시술 및 인그로운 주의 메모"



3) 세 번째 줄부터: 섹션들

   - 가능한 섹션 이름과 역할은 아래와 같다.

   - 실제 내용이 없는 섹션은 생략하거나 불릿 없이 두지 말고 아예 빼라.



[단일 고객/방문인 경우 권장 섹션]



- 고객 기본 정보:

  **이 섹션은 반드시 아래 순서와 형식으로 작성해야 한다. 다른 형식은 절대 사용하지 마라.**

  - 첫 줄: "이름: ○○○ / 전화번호: 010-0000-0000" 형식으로 적는다.

    - TRANSCRIPT에 이름이 없으면 "이름: 미기재"라고 적는다.

    - TRANSCRIPT에 전화번호가 없으면 "전화번호: 미기재"라고 적는다.

    - 실제로 들은 이름/전화번호만 사용하고, 임의로 새로 만들지 않는다.

  - 두 번째 줄: "신규/기존 구분: 신규 고객" 또는 "신규/기존 구분: 기존 고객(단골)" 처럼 신규/기존 여부를 한 줄로 적는다.

    - 신규/기존이 불명확하면 "신규/기존 구분: 미기재"라고 적는다.

  - 세 번째 줄: "고객 특징: 20대 중반 여성, 직장인, 곱슬 모발, 두피 민감"처럼

    대략적인 연령대·성별·직업·모발/피부·성향 등을 한 줄로 요약한다.

    - TRANSCRIPT에 정보가 거의 없으면 "고객 특징: 미기재"라고 적는다.

  **JSON 출력 시 "고객 기본 정보" 섹션의 content 배열은 반드시 위 3줄을 순서대로 포함해야 한다.**



- 방문·예약 정보:

  - 방문 일시(날짜·시간), 예약 경로, 지각/변경 여부

  - 예: "- 2025년 11월 26일 (수) 15:00 예약 후 제시간 방문"

  **중요: {TODAY}를 그대로 출력하지 말고, user message에서 제공된 실제 날짜 값으로 치환하라.**



- 현재 상태·고객 고민:

  - 모발/피부/손톱/왁싱 부위 상태, 고객이 말한 불편/고민

  - 예: "- 인그로운 헤어 많아서 가려움, 예민해진 피부 상태 걱정"



- 시술·관리 상세:

  - 진행한 시술 단계, 부위, 사용 제품/약제(브랜드/모델명은 말한 경우만),

    컬러/호수, 도포 시간 등

  - 예: "- 브라질리언 + 종아리 왁싱, 평소보다 온도 약간 낮춰 진행"



- 시술 후 상태·고객 반응:

  - 만족도, 통증/붓기/트러블, 추가 요청/수정 사항

  - 예: "- 통증은 평소와 비슷, 종아리 쪽은 깔끔하다고 만족 표현"



- 주의사항·홈 케어:

  - 피해야 할 행동, 샵에서 안내한 홈케어/제품(언급된 범위 내)

  - 예: "- 24시간 사우나/온탕 금지, 샤워 시 미온수 사용 안내"



- 다음 방문·추천:

  - 다음 방문 권장 주기, 다음 시술 아이디어, 리터치 계획

  - 예: "- 4주 후 리터치 권장, 인그로운 상태 보고 시술 강도 조절 예정"



- 결제/매출:

  - 결제 방식(카드/현금/회원권 차감 등), 금액(말한 경우만), 특이사항

  - 예: "- 기존 회원권에서 5만 원 상당 차감"



- 참고 메모:

  - 시술 시 유의할 습관/특이사항(눈물을 많이 흘림, 자세 힘들어함 등),

    다음번 시술자가 꼭 알고 있으면 좋은 정보

  - 예: "- 통증 반응에 민감해 처음에 충분히 설명 필요"



[여러 고객/여러 방문인 경우 권장 구조 예시]



직업/역할: ○○○



제목: 오늘 주요 시술 고객 요약 (총 ○명)



[고객 1]

- 고객 기본 정보:

  - ...

- 시술·관리 상세:

  - ...

- 시술 후 상태·고객 반응:

  - ...

- 다음 방문·추천:

  - ...



[고객 2]

- 고객 기본 정보:

  - ...

- 시술·관리 상세:

  - ...

- 시술 후 상태·고객 반응:

  - ...

- 다음 방문·추천:

  - ...



[전체 메모]

- 오늘 공통적으로 느낀 점, 내일/다음 주에 이어서 봐야 할 고객,

  재고/제품 관련 메모 등이 있으면 짧게 정리



────────────────────

[스타일 요약]

────────────────────



- 모든 출력은 한국어로 작성한다.

- 말버릇, 추임새(음…, 어…, 그러니까 등), 잡담은 모두 제거한다.

- 중복되는 내용은 합쳐서 한 번만 적는다.

- 섹션 제목은 명확하게, 내용은 짧은 불릿 포인트 위주로 정리한다.

- 뷰티샵 문맥에 맞지 않는 일반적인 비즈니스 용어(KPI, 파이프라인 등)는 사용하지 않는다.

- 실제로 현장에서 시술 기록/고객 히스토리로 바로 활용 가능한지 생각하면서,

  "다음에 이 손님이 왔을 때 보고 싶을 정보" 위주로 정리하라.



────────────────────

[간단 예시 (형식 참고용)]

────────────────────



예시 TRANSCRIPT (요약):

"어, 오늘 3시 김민지 언니. 오늘 리터치 하러 왔는데

저번에 C컬 했더니 끝이 좀 처진다고 해서 이번엔 D컬로 바짝 올려달래.

그래서 D컬 11미리랑 12미리 섞어서 좀 화려하게 디자인 들어갔어.

아 맞다, 이 언니 시술할 때 눈을 좀 꽉 감는 버릇이 있어서

테이핑할 때 좀 신경 써야 돼. 눈물도 좀 많아서

글루는 예전에 썼던 강한 거 말고 순한 걸로 썼다.

결제는 저번에 끊어놓은 회원권에서 5만 원 차감했음."



예시 출력 (형식 참고):



직업/역할: 속눈썹 샵 원장



제목: 김민지 기존 고객 D컬 리터치 및 시술 시 유의사항 메모



고객 기본 정보:

- 기존 여성 고객, 이름: 김민지, 속눈썹 리터치 방문



방문·예약 정보:

- {TODAY} 15:00 예약 방문(리터치)



현재 상태·고객 고민:

- 이전 C컬 시술 후 끝이 처지는 느낌으로 더 바짝 올라가길 원함



시술·관리 상세:

- D컬 11mm + 12mm 섞어서 좀 더 화려한 디자인으로 시술

- 기존보다 컬을 강하게, 디자인 강조



시술 후 상태·고객 반응:

- 리터치 후 원하는 만큼 올라간 느낌으로 전반적으로 만족한 반응(정도만 언급된 수준)



주의사항·홈 케어:

- 특별한 홈케어 언급 없음



다음 방문·추천:

- 다음 리터치 시에도 D컬 유지 검토, 상태 보고 길이/컬 조정 예정(구체 주기는 언급 없음)



결제/매출:

- 기존 회원권에서 5만 원 차감



참고 메모:

- 시술 시 눈을 꽉 감는 버릇이 있어 테이핑 단계에서 특히 주의 필요

- 눈물이 많은 편이라 강한 글루 대신 순한 제품 사용 권장



이 예시는 "톤과 구조"를 보여주는 참고일 뿐이며,

실제 답변에서는 TRANSCRIPT와 ROLE_JSON, {TODAY} 값에 맞게 새로 작성해야 한다.



────────────────────

[중요: 출력 형식]

────────────────────



반드시 다음 JSON 형식으로만 응답해야 한다:

{

  "title": "제목 (한 줄 요약)",

  "sections": [

    {

      "title": "섹션 제목",

      "content": ["항목 1", "항목 2", "항목 3"]

    }

  ]

}



**중요: "고객 기본 정보" 섹션의 경우 반드시 아래 형식을 정확히 따르라:**

{

  "title": "고객 기본 정보",

  "content": [

    "이름: ○○○ / 전화번호: 010-0000-0000",

    "구분: 신규 고객" (또는 "기존 고객(단골)", "미기재"),

    "고객 특징: 20대 중반 여성, 직장인, 곱슬 모발, 두피 민감" (또는 "미기재")

  ]

}



- "title"은 위에서 설명한 "제목: ○○○" 부분의 내용만 포함한다.

- "sections"는 위에서 설명한 섹션들을 배열로 구성한다.

- 각 섹션의 "title"은 섹션 이름(예: "고객 기본 정보", "시술·관리 상세" 등)이다.

- **"고객 기본 정보" 섹션의 "content"는 반드시 3개의 항목으로 구성되며, 위 형식을 정확히 따라야 한다.**

- 다른 섹션의 "content"는 해당 섹션의 불릿 포인트들을 배열로 나열한다.

- 다른 형식이나 추가 설명 없이 순수 JSON만 출력하라.

`;

// --- 1. Constants & Data Models ---

// 뷰티샵 전용 테마 (로즈 골드 & 핑크 & 보라)
const BEAUTY_THEME = {
  id: 'beauty',
  name: '뷰티샵',
  icon: <Scissors size={20} />,
  color: 'from-rose-400 via-pink-300 to-purple-400', // 로즈 골드 & 핑크 & 보라 그라데이션
  pastel: 'bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50', // 연한 파스텔 톤
  bg: 'bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50',
  iconBg: 'rose-400',
  text: 'text-rose-600',
  border: 'border-transparent',
  ring: 'ring-rose-400',
  warmGray: 'stone-500',
  warmGrayText: 'text-stone-600',
  warmGrayBg: 'bg-stone-100'
};

// Mock 데이터
const MOCK_CUSTOMERS = [
  {
    id: 1,
    name: '김민지',
    phone: '010-1234-5678',
    visitCount: 5,
    lastVisit: '2025-01-15',
    avatar: '👩'
  },
  {
    id: 2,
    name: '이수진',
    phone: '010-2345-6789',
    visitCount: 3,
    lastVisit: '2025-01-14',
    avatar: '👱‍♀️'
  },
  {
    id: 3,
    name: '박지은',
    phone: '010-3456-7890',
    visitCount: 8,
    lastVisit: '2025-01-13',
    avatar: '👩‍🦰'
  },
  {
    id: 4,
    name: '최혜진',
    phone: '010-4567-8901',
    visitCount: 2,
    lastVisit: '2025-01-12',
    avatar: '👩‍🦱'
  },
  {
    id: 5,
    name: '정유나',
    phone: '010-5678-9012',
    visitCount: 12,
    lastVisit: '2025-01-11',
    avatar: '👱'
  }
];

const MOCK_VISITS = {
  1: [ // 김민지
    {
      id: 1,
      date: '2025-01-15',
      time: '15:00',
      title: '젤네일(이달의 아트) 및 웨딩 관리 안내',
      summary: '기존 젤 제거, 이달의 아트 3번 시술, 강화제 서비스',
      detail: {
        sections: [
          { title: '시술 내용', content: ['기존 젤 제거 진행', '이달의 아트 3번 시술', '손상모 우려로 강화제 서비스 도포'] },
          { title: '고객 특징 (TMI)', content: ['신규 고객', '다음 주 웨딩 촬영 예정'] },
          { title: '결제 금액', content: ['70,000원 (카드)'] },
          { title: '다음 예약 추천', content: ['3주 후 리터치 권장', '큐티클 오일 도포 강조'] }
        ]
      }
    },
    {
      id: 2,
      date: '2024-12-28',
      time: '14:30',
      title: '젤네일 리터치',
      summary: '리터치 진행, 손톱 상태 양호',
      detail: {
        sections: [
          { title: '시술 내용', content: ['리터치 진행'] },
          { title: '결제 금액', content: ['50,000원 (현금)'] }
        ]
      }
    }
  ],
  2: [ // 이수진
    {
      id: 3,
      date: '2025-01-14',
      time: '16:00',
      title: '왁싱 + 피부관리',
      summary: '브라질리언 왁싱, LED 피부관리',
      detail: {
        sections: [
          { title: '시술 내용', content: ['브라질리언 왁싱', 'LED 피부관리'] },
          { title: '결제 금액', content: ['120,000원 (카드)'] }
        ]
      }
    }
  ],
  3: [ // 박지은
    {
      id: 4,
      date: '2025-01-13',
      time: '11:00',
      title: '헤어 컷트 + 염색',
      summary: '컷트, 옴브레 염색 (5호 → 7호)',
      detail: {
        sections: [
          { title: '시술 내용', content: ['컷트', '옴브레 염색 (5호 → 7호)'] },
          { title: '결제 금액', content: ['150,000원 (카드)'] }
        ]
      }
    }
  ],
  4: [ // 최혜진
    {
      id: 5,
      date: '2025-01-12',
      time: '13:00',
      title: '젤네일 신규',
      summary: '신규 젤네일, 아트 추가',
      detail: {
        sections: [
          { title: '시술 내용', content: ['신규 젤네일', '아트 추가'] },
          { title: '결제 금액', content: ['80,000원 (카드)'] }
        ]
      }
    }
  ],
  5: [ // 정유나
    {
      id: 6,
      date: '2025-01-11',
      time: '10:00',
      title: '왁싱 + 네일',
      summary: '다리 왁싱, 젤네일 리터치',
      detail: {
        sections: [
          { title: '시술 내용', content: ['다리 왁싱', '젤네일 리터치'] },
          { title: '결제 금액', content: ['100,000원 (현금)'] }
        ]
      }
    }
  ]
};

// --- 2. Visual Components ---

// Updated: WaveBars using standard Tailwind classes instead of custom <style>
const WaveBars = () => (
  <div className="flex items-center justify-center gap-1 h-12">
    {[...Array(5)].map((_, i) => (
      <div 
        key={i} 
        className="w-1.5 bg-white/80 rounded-full animate-pulse"
        style={{ 
          animationDelay: `${i * 0.15}s`, 
          animationDuration: '0.6s' 
        }}
      ></div>
    ))}
  </div>
);


const SkeletonLoader = () => (
  <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-rose-100/50 p-5 space-y-4 w-full animate-pulse">
    <div className="h-6 bg-stone-100 rounded w-3/4 mb-6"></div>
    {[...Array(3)].map((_, i) => (
      <div key={i} className="space-y-2">
        <div className="h-4 bg-stone-100 rounded w-1/3"></div>
        <div className="h-3 bg-stone-50 rounded w-full"></div>
        <div className="h-3 bg-stone-50 rounded w-5/6"></div>
      </div>
    ))}
  </div>
);

// --- 3. Main App ---

export default function MalloApp() {
  const [step, setStep] = useState('login'); // Login 화면부터 시작
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile] = useState({ sectorId: 'beauty', roleTitle: '뷰티샵 원장' });
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [resultData, setResultData] = useState(null);
  const [showPromptInfo, setShowPromptInfo] = useState(false);
  const [todayRecords, setTodayRecords] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [expandedVisitId, setExpandedVisitId] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recordingDate, setRecordingDate] = useState(null);

  // 에러 바운더리: 개발 중 오류 확인
  useEffect(() => {
    console.log('App mounted, step:', step);
  }, [step]);

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
      
    setStep('recording');
    setRecordingTime(0);
    timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (error) {
      console.error('녹음 시작 오류:', error);
      alert(`마이크 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.\n\n오류: ${error.message}`);
      setStep('home');
    }
  };

  const stopRecording = async () => {
    clearInterval(timerRef.current);
    setStep('processing');

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
        throw new Error(errorData.error?.message || `Whisper API 요청 실패: ${whisperResponse.status}`);
      }

      const whisperData = await whisperResponse.json();
      const transcript = whisperData.text || '';
      
      if (!transcript.trim()) {
        throw new Error('녹음 내용을 텍스트로 변환할 수 없습니다. 다시 녹음해주세요.');
      }

      setTranscript(transcript);

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
        setResultData(parsedResult);
        // 오늘의 기록에 추가
        const newRecord = {
          id: Date.now(),
          title: parsedResult.title,
          time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
          data: parsedResult
        };
        setTodayRecords(prev => [newRecord, ...prev]);
        setStep('result');
      } else {
        throw new Error('API 응답 형식이 올바르지 않습니다.');
      }
    } catch (error) {
      console.error('API 호출 오류:', error);
      alert(`오류가 발생했습니다: ${error.message}\n\n개발자 도구 콘솔을 확인해주세요.`);
      // 오류 발생 시 홈으로 돌아가기
      setStep('home');
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
    setStep('home');
    setTranscript('');
    setResultData(null);
    setRecordingDate(null);
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
        setStep('home');
      } else {
        alert('이메일과 비밀번호를 입력해주세요.');
      }
    };

    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          {/* 로고 */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-400 via-pink-300 to-purple-400 shadow-2xl mb-4">
              <Scissors size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-stone-700 mb-2">뷰티샵 원장님</h1>
            <p className="text-stone-500 font-light">고객 기록 관리 시스템</p>
          </div>

          {/* 로그인 폼 */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-rose-100/50 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-stone-600 uppercase tracking-wider">이메일</label>
                <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-2xl px-4 py-3 border border-rose-100/50 focus-within:ring-2 focus-within:ring-rose-400 focus-within:bg-white transition-all">
                  <Mail size={18} className="text-rose-400" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@beauty.com"
                    className="w-full bg-transparent outline-none text-stone-700 font-light placeholder-stone-400"
                    onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-stone-600 uppercase tracking-wider">비밀번호</label>
                <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-2xl px-4 py-3 border border-rose-100/50 focus-within:ring-2 focus-within:ring-rose-400 focus-within:bg-white transition-all">
                  <Lock size={18} className="text-rose-400" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent outline-none text-stone-700 font-light placeholder-stone-400"
                    onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={handleLogin}
              className={`w-full py-4 rounded-2xl font-black text-lg text-white bg-gradient-to-r ${currentSector.color} shadow-xl hover:brightness-110 hover:-translate-y-1 hover:shadow-2xl active:scale-[0.98] transition-all`}
            >
              로그인
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderHome = () => {
    // 오늘의 시술 3건 (가짜 데이터)
    const todaySummary = [
      { name: '김민지', service: '젤네일', amount: '70,000원', time: '15:00' },
      { name: '이수진', service: '왁싱', amount: '120,000원', time: '16:00' },
      { name: '박지은', service: '헤어', amount: '150,000원', time: '11:00' }
    ];

    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 relative">
        <header className="px-6 py-5 flex justify-between items-center bg-white/60 backdrop-blur-sm z-10 border-b border-rose-100/50">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">뷰티샵 원장님</span>
            <h2 className="text-lg font-black text-rose-600 mt-0.5">홈</h2>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 via-pink-300 to-purple-400 flex items-center justify-center shadow-lg">
            <Scissors size={20} className="text-white" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">
          {/* 오늘의 시술 3건 요약 카드 */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-rose-100/50 p-6">
            <h3 className="text-sm font-black text-stone-700 uppercase tracking-wider mb-4">오늘의 시술 3건</h3>
            <div className="space-y-3">
              {todaySummary.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gradient-to-r from-rose-50/50 to-pink-50/50 rounded-2xl border border-rose-100/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-pink-300 flex items-center justify-center text-white font-black text-sm">
                      {item.name[0]}
                    </div>
                    <div>
                      <p className="font-black text-stone-700 text-sm">{item.name}</p>
                      <p className="text-xs text-stone-500 font-light">{item.service}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-rose-600 text-sm">{item.amount}</p>
                    <p className="text-xs text-stone-400 font-light">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 새 시술 기록하기 버튼 */}
          <button 
            onClick={startRecording}
            className={`group relative w-full py-6 rounded-3xl flex items-center justify-center gap-3 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-2xl z-10 bg-gradient-to-r ${currentSector.color} text-white`}
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-rose-400 via-pink-300 to-purple-400 opacity-90 group-hover:opacity-100 transition-opacity blur-sm"></div>
            <Mic size={28} className="relative z-10 drop-shadow-md" />
            <span className="relative z-10 font-black text-xl">🎤 새 시술 기록하기</span>
          </button>

          {/* 최근 고객 리스트 */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-stone-600 uppercase tracking-wider">최근 고객</h3>
            {MOCK_CUSTOMERS.map((customer) => (
              <div 
                key={customer.id}
                onClick={() => {
                  setSelectedCustomerId(customer.id);
                  setStep('customerDetail');
                }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-rose-100/50 hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{customer.avatar}</div>
                  <div className="flex-1">
                    <h4 className="font-black text-stone-700 text-base mb-1">{customer.name}</h4>
                    <div className="flex items-center gap-4 text-xs text-stone-500 font-light">
                      <span className="flex items-center gap-1">
                        <Phone size={12} />
                        {customer.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        방문 {customer.visitCount}회
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-stone-400" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  };

  const renderRecording = () => (
    <div className="flex flex-col h-full bg-slate-900 text-white relative items-center justify-center overflow-hidden">
      {/* Aurora Background - 오로라 효과 */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Violet 오로라 */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-violet-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }}></div>
        {/* Blue 오로라 */}
        <div className="absolute top-1/2 right-1/3 w-88 h-88 bg-blue-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4.5s', animationDelay: '2s' }}></div>
      </div>

      {/* 타이머 영역 */}
      <div className="z-10 text-center mb-10">
        <h2 className="text-rose-200 text-sm font-medium tracking-widest uppercase mb-4">Recording</h2>
        <p 
          className="text-7xl font-mono font-black tracking-tighter tabular-nums"
          style={{
            textShadow: '0 0 20px rgba(251, 146, 60, 0.5), 0 0 40px rgba(244, 63, 94, 0.3), 0 0 60px rgba(251, 146, 60, 0.2)',
            color: '#f8fafc'
          }}
        >
          {formatTime(recordingTime)}
        </p>
      </div>

      {/* Visualizer & Button */}
      <div className="z-10 flex flex-col items-center gap-8">
        <WaveBars />
        
        {/* 정지 버튼 - 물결(Ripple) 애니메이션 */}
        <button 
          onClick={stopRecording}
          className="group relative w-20 h-20 flex items-center justify-center"
        >
          {/* 물결 효과 - 여러 겹의 원 */}
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border-2 border-red-400/50"
              style={{
                width: '80px',
                height: '80px',
                animation: `ping ${2.5 + i * 0.4}s cubic-bezier(0, 0, 0.2, 1) infinite`,
                animationDelay: `${i * 0.25}s`,
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            ></div>
          ))}
          
          {/* 버튼 본체 */}
          <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl group-hover:bg-red-500/30 transition-colors"></div>
          <div className="relative w-20 h-20 rounded-full bg-red-600 flex items-center justify-center shadow-2xl shadow-red-500/50 group-hover:scale-105 group-active:scale-95 transition-all duration-200 z-10">
            <Square size={24} fill="white" className="ml-0.5" />
          </div>
        </button>
      </div>

      <div className="absolute bottom-12 w-full px-8 text-center z-10">
        <p className="text-rose-200 text-sm leading-relaxed font-light bg-stone-900/40 py-3 px-4 rounded-xl border border-rose-300/20 backdrop-blur-md">
          💡 Tip: 고객 이름, 시술 종류, 결제 금액을<br/>구체적으로 말하면 더 정확해요.
        </p>
      </div>
    </div>
  );

  const renderProcessing = () => (
    <div className="flex flex-col h-full bg-gradient-to-br from-rose-50 via-amber-50 to-stone-50 px-6 pt-20 pb-10">
      <div className="text-center mb-10">
        <div className="inline-block p-4 rounded-full bg-gradient-to-br from-rose-100 to-amber-100 mb-6 animate-bounce">
          <Scissors size={32} className="text-rose-600" />
        </div>
        <h2 className="text-2xl font-black text-stone-700 mb-2">시술 기록 정리 중</h2>
        <p className="text-stone-500 font-light">AI가 내용을 분석하고 서식을 적용하고 있습니다.</p>
      </div>
      
      <div className="flex-1 w-full max-w-sm mx-auto space-y-4 opacity-50">
        <SkeletonLoader />
      </div>

      <div className="text-xs text-center text-stone-400 font-mono mt-auto">
        Processing transcript...<br/>
        Applying beauty salon template...
      </div>
    </div>
  );

  const renderResult = () => {
    if (!resultData) {
      return (
        <div className="flex flex-col h-full bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 items-center justify-center">
          <p className="text-stone-500">결과 데이터가 없습니다.</p>
          <button onClick={resetFlow} className="mt-4 text-rose-600 font-black">홈으로 돌아가기</button>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 relative">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm px-4 py-4 sticky top-0 z-20 flex items-center justify-between border-b border-rose-100/50">
          <button onClick={resetFlow} className="p-2 text-stone-600 hover:bg-rose-100/50 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="text-center">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">시술 기록</span>
            <h2 className="font-black text-stone-700 text-sm">{getTodayDate()}</h2>
          </div>
          <button className="p-2 text-stone-400 hover:text-stone-600">
            <MoreHorizontal size={24} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-32 bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
          {/* Main Card */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden border border-rose-100/50 animate-in slide-in-from-bottom-8 duration-500">
            <div className={`px-6 py-6 bg-gradient-to-br ${currentSector.color} relative overflow-hidden`}>
              <div className="relative z-10">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black text-white bg-white/20 backdrop-blur-sm mb-3 border border-white/20">
                  {currentSector.icon}
                  <span className="ml-1.5">{userProfile.roleTitle}</span>
                </span>
                <h3 className="font-black text-white text-xl leading-snug tracking-tight">{resultData.title}</h3>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {resultData.sections.map((section, idx) => (
                <div key={idx} className="animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 100}ms` }}>
                  <h4 className={`text-xs font-black mb-3 uppercase tracking-wider ${currentSector.text} flex items-center gap-2`}>
                    {section.title}
                    <div className="h-px flex-1 bg-stone-200"></div>
                  </h4>
                  <ul className="space-y-3">
                    {section.content.map((item, i) => (
                      <li key={i} className="text-stone-700 text-[15px] leading-relaxed pl-3 border-l-2 border-rose-200 hover:border-rose-400 transition-colors font-light">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Transcript Toggle */}
          <details className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-rose-100/50 shadow-xl overflow-hidden">
            <summary className="font-black text-stone-700 text-sm cursor-pointer p-4 flex justify-between items-center bg-white/60 hover:bg-white/80 transition-colors select-none">
              <span>원본 녹음 내용 보기</span>
              <ChevronRight size={16} className="text-stone-400 group-open:rotate-90 transition-transform duration-200" />
            </summary>
            <div className="p-4 pt-0 text-sm text-stone-500 leading-relaxed border-t border-rose-100/50 bg-stone-50/30">
              <div className="pt-4">"{transcript}"</div>
            </div>
          </details>
        </main>

        {/* 녹음 일시 표시 */}
        {recordingDate && (
          <div className="absolute bottom-24 left-6 right-6 text-center z-20">
            <p className="text-xs text-slate-400">
              {formatRecordingDate(recordingDate)}
            </p>
          </div>
        )}

        {/* Floating Action Bar */}
        <div className="absolute bottom-6 left-6 right-6 grid grid-cols-2 gap-3 z-30">
          <button className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/90 backdrop-blur-sm border border-rose-100/50 text-stone-700 font-black shadow-xl hover:bg-white hover:-translate-y-1 hover:shadow-2xl active:scale-[0.98] transition-all">
            <Share2 size={18} />
            공유
          </button>
          <button 
            onClick={() => alert('클립보드에 복사되었습니다.')}
            className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-white bg-gradient-to-r ${currentSector.color} shadow-xl hover:brightness-110 hover:-translate-y-1 hover:shadow-2xl active:scale-[0.98] transition-all`}
          >
            <Copy size={18} />
            복사
          </button>
        </div>
      </div>
    );
  };

  const renderCustomerDetail = () => {
    const customer = MOCK_CUSTOMERS.find(c => c.id === selectedCustomerId);
    const visits = MOCK_VISITS[selectedCustomerId] || [];

    if (!customer) {
      return (
        <div className="flex flex-col h-full bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 items-center justify-center">
          <p className="text-stone-500">고객 정보를 찾을 수 없습니다.</p>
          <button onClick={() => setStep('home')} className="mt-4 text-rose-600 font-black">홈으로 돌아가기</button>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm px-4 py-4 sticky top-0 z-20 flex items-center justify-between border-b border-rose-100/50">
          <button onClick={() => setStep('home')} className="p-2 text-stone-600 hover:bg-rose-100/50 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="text-center">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">고객 상세</span>
            <h2 className="font-black text-stone-700 text-sm">{customer.name}</h2>
          </div>
          <button className="p-2 text-stone-400 hover:text-stone-600">
            <MoreHorizontal size={24} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">
          {/* 고객 정보 카드 */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-rose-100/50 p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="text-6xl">{customer.avatar}</div>
              <div className="flex-1">
                <h3 className="font-black text-stone-700 text-2xl mb-2">{customer.name}</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-stone-600">
                    <Phone size={16} />
                    <span className="font-light">{customer.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-stone-600">
                    <Calendar size={16} />
                    <span className="font-light">방문 {customer.visitCount}회</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 방문 히스토리 */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-stone-600 uppercase tracking-wider">방문 히스토리</h3>
            {visits.length === 0 ? (
              <div className="text-center py-12 bg-white/60 rounded-2xl border border-rose-100/50">
                <p className="text-stone-400 font-light text-sm">방문 기록이 없습니다</p>
              </div>
            ) : (
              visits.map((visit) => (
                <div key={visit.id} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-rose-100/50 overflow-hidden">
                  <button
                    onClick={() => setExpandedVisitId(expandedVisitId === visit.id ? null : visit.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-rose-50/30 transition-colors"
                  >
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs text-stone-400 font-light">{visit.date}</span>
                        <span className="text-xs text-stone-400 font-light">{visit.time}</span>
                      </div>
                      <h4 className="font-black text-stone-700 text-base mb-1">{visit.title}</h4>
                      <p className="text-xs text-stone-500 font-light">{visit.summary}</p>
                    </div>
                    {expandedVisitId === visit.id ? (
                      <ChevronUp size={20} className="text-stone-400" />
                    ) : (
                      <ChevronDown size={20} className="text-stone-400" />
                    )}
                  </button>
                  
                  {expandedVisitId === visit.id && visit.detail && (
                    <div className="px-4 pb-4 space-y-4 border-t border-rose-100/50 pt-4">
                      {visit.detail.sections.map((section, idx) => (
                        <div key={idx}>
                          <h5 className={`text-xs font-black mb-2 uppercase tracking-wider ${currentSector.text}`}>
                            {section.title}
                          </h5>
                          <ul className="space-y-2">
                            {section.content.map((item, i) => (
                              <li key={i} className="text-stone-600 text-sm leading-relaxed pl-3 border-l-2 border-rose-200 font-light">
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    );
  };

  // 디버깅: 현재 step 확인
  console.log('Current step:', step);
  console.log('MOCK_CUSTOMERS:', MOCK_CUSTOMERS);
  console.log('BEAUTY_THEME:', BEAUTY_THEME);

  // 에러 핸들링
  let content;
  try {
    if (step === 'login') {
      content = renderLogin();
    } else if (step === 'home') {
      content = renderHome();
    } else if (step === 'recording') {
      content = renderRecording();
    } else if (step === 'processing') {
      content = renderProcessing();
    } else if (step === 'result') {
      content = renderResult();
    } else if (step === 'customerDetail') {
      content = renderCustomerDetail();
    } else {
      content = <div className="p-8 text-center text-red-600">알 수 없는 step: {String(step)}</div>;
    }
  } catch (error) {
    console.error('Render error:', error);
    content = (
      <div className="p-8 text-center text-red-600">
        <h2 className="text-xl font-black mb-2">렌더링 오류</h2>
        <p className="text-sm">{error.message}</p>
        <p className="text-xs mt-2 text-gray-500">콘솔을 확인해주세요 (F12)</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center font-sans">
      <div className="w-full max-w-md h-full sm:h-[90vh] bg-white sm:rounded-[2rem] sm:shadow-2xl overflow-hidden relative border-0">
        {content}
      </div>
    </div>
  );
}