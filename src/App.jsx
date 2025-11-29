import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Copy, Share2, Scissors, ArrowLeft, MoreHorizontal, Mail, Lock, ChevronDown, ChevronUp, ChevronRight, Phone, Calendar, Edit, Search, Minus, Home, User, Settings, History, X, Tag, Hash } from 'lucide-react';
import { formatRecordDateTime, formatVisitReservation, formatVisitReservationFull, formatVisitReservationTime, formatServiceDateTimeLabel } from './utils/date';

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



2) 두 번째 줄: 제목(시술 내용 요약)

   - 형식: "제목: ○○○"

   - 오늘 발화의 핵심 시술/업무 내용을 한 문장으로 요약한다.

   - **중요: 제목에는 고객 이름을 절대 포함하지 말고, 순수 시술 행위와 주요 내용만 간결하게 요약할 것.**

   - 예: "젤네일 제거 및 영양 케어" (O)

   - 예: "김민지 님 - 젤네일 제거..." (X - 고객 이름 포함 금지)



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

  "title": "시술 내용 요약 (고객 이름 제외, 순수 시술 행위만)",

  "customerInfo": {

    "name": "고객 이름 (TRANSCRIPT에서 추출, 없으면 null)",

    "phone": "전화번호 (TRANSCRIPT에서 추출, 없으면 null)"

  },

  "sections": [

    {

      "title": "섹션 제목",

      "content": ["항목 1", "항목 2", "항목 3"]

    }

  ]

}

**중요: customerInfo 필드 처리 규칙:**

- TRANSCRIPT에서 고객 이름이나 전화번호가 명확히 언급되면 해당 값을 추출하여 customerInfo에 포함시켜라.

- 예: "이름은 김민지, 번호는 010-1234-5678이야" → { "name": "김민지", "phone": "010-1234-5678" }

- 예: "고객 이름이 박지은이고 전화번호는 010-9876-5432예요" → { "name": "박지은", "phone": "010-9876-5432" }

- 이름이나 전화번호가 TRANSCRIPT에 없거나 불명확하면 null로 설정하라.

- 이름만 있고 전화번호가 없으면: { "name": "김민지", "phone": null }

- 전화번호만 있고 이름이 없으면: { "name": null, "phone": "010-1234-5678" }

- 둘 다 없으면: { "name": null, "phone": null }



**중요: "고객 기본 정보" 섹션의 경우 반드시 아래 형식을 정확히 따르라:**

{

  "title": "고객 기본 정보",

  "content": [

    "이름: ○○○ / 전화번호: 010-0000-0000",

    "구분: 신규 고객" (또는 "기존 고객(단골)", "미기재"),

    "고객 특징: 20대 중반 여성, 직장인, 곱슬 모발, 두피 민감" (또는 "미기재")

  ]

}



- "title"은 위에서 설명한 "제목: ○○○" 부분의 내용만 포함한다. **중요: title에는 고객 이름을 절대 포함하지 말고, 순수 시술 행위와 주요 내용만 간결하게 요약할 것. (예: "젤네일 제거 및 영양 케어")**

- "sections"는 위에서 설명한 섹션들을 배열로 구성한다.

- 각 섹션의 "title"은 섹션 이름(예: "고객 기본 정보", "시술·관리 상세" 등)이다.

- **"고객 기본 정보" 섹션의 "content"는 반드시 3개의 항목으로 구성되며, 위 형식을 정확히 따라야 한다.**

- 다른 섹션의 "content"는 해당 섹션의 불릿 포인트들을 배열로 나열한다.

- 다른 형식이나 추가 설명 없이 순수 JSON만 출력하라.

`;

// --- 1. Constants & Data Models ---

// 뷰티샵 전용 테마 (우아하고 따뜻한 뷰티샵)
const BEAUTY_THEME = {
    id: 'beauty',
  name: '뷰티샵',
  icon: <Scissors size={20} />,
  color: '#C9A27A', // 포인트 컬러 (우아한 골드 브라운)
  pastel: '#F2F0E6', // 앱 전체 바탕 (따뜻한 크림색)
  bg: '#F2F0E6', // 전체 배경 색상
  bgSurface: '#F2F0E6', // 메인 화면 컨테이너
  bgCard: '#FFFFFF', // 카드 배경
  iconBg: '#C9A27A',
  text: '#232323', // 기본 텍스트 (진한 차콜)
  textSecondary: '#232323', // 보조 텍스트
  border: 'border-gray-200', // 연한 회색 테두리
  ring: '#C9A27A',
  accent: '#C9A27A',
  accentText: '#C9A27A',
  accentBg: '#FFFFFF'
};

// --- MOCK DATA (태그 시스템 v1 적용) ---
const MOCK_CUSTOMERS = [
  {
    id: 1,
    name: '김민지',
    phone: '010-1234-5678',
    visitCount: 5,
    lastVisit: '2025-11-28',
    avatar: '👩',
    // 1. 고객 레벨 태그 (프로필 상단용)
    customerTags: {
      caution: ['글루알러지'], // 빨간색 경고 태그
      trait: ['대화선호'],
      payment: ['법인카드'],
      pattern: []
    },
    history: [
      {
        id: 101,
        date: '2025.11.28 15:00',
        // 2. 방문 레벨 태그 (히스토리 카드용)
        tags: ['속눈썹연장', 'D컬', '11mm', '리터치'], 
        content: '속눈썹 D컬 11mm로 리터치 진행함. 글루 알러지 있어서 저자극 글루 사용.'
      },
      {
        id: 102,
        date: '2025.11.15 14:30',
        tags: ['속눈썹연장', 'C컬', '제거'],
        content: '기존 C컬 제거 후 D컬로 변경 원하셔서 상담 진행.'
      },
      {
        id: 103,
        date: '2025.10.30 14:00',
        tags: ['젤네일', '이달의아트', '제거'],
        content: '젤네일 제거하고 누드톤으로 깔끔하게 재시술.'
      }
    ]
  },
  {
    id: 2,
    name: '이나영',
    phone: '010-9876-5432',
    visitCount: 2,
    lastVisit: '2025-11-20',
    avatar: '👱‍♀️',
    customerTags: {
      caution: [],
      trait: ['조용히'],
      payment: [],
      pattern: ['퇴근후']
    },
    history: [
      {
        id: 201,
        date: '2025.11.20 19:00',
        tags: ['젤네일', '그라데이션'],
        content: '퇴근 후 방문. 차분한 그라데이션 네일 시술.'
      }
    ]
  },
  {
    id: 3,
    name: '김수진',
    phone: '010-2345-6789',
    visitCount: 12,
    lastVisit: '2025-01-10',
    avatar: '👱‍♀️',
    tags: ['#단골', '#수다쟁이', '#이달의아트'],
    customerTags: {
      caution: [],
      trait: ['수다쟁이'],
      payment: [],
      pattern: ['단골']
    }
  },
  {
    id: 4,
    name: '김지은',
    phone: '010-3456-7890',
    visitCount: 18,
    lastVisit: '2025-01-18',
    avatar: '👩‍🦰',
    tags: ['#단골', '#조용한거선호', '#리터치'],
    customerTags: {
      caution: [],
      trait: ['조용한거선호'],
      payment: [],
      pattern: ['단골']
    }
  },
  {
    id: 5,
    name: '이수진',
    phone: '010-4567-8901',
    visitCount: 3,
    lastVisit: '2025-01-14',
    avatar: '👱‍♀️',
    tags: ['#단골', '#리터치'],
    customerTags: {
      caution: [],
      trait: [],
      payment: [],
      pattern: ['단골']
    }
  },
  {
    id: 6,
    name: '이수진',
    phone: '010-5678-9012',
    visitCount: 9,
    lastVisit: '2025-01-12',
    avatar: '👩',
    tags: ['#웨딩준비', '#인그로운'],
    customerTags: {
      caution: [],
      trait: [],
      payment: [],
      pattern: []
    }
  },
  {
    id: 7,
    name: '이지은',
    phone: '010-7890-1234',
    visitCount: 15,
    lastVisit: '2025-01-11',
    avatar: '👩‍🦰',
    tags: ['#단골', '#수다쟁이', '#이달의아트'],
    customerTags: {
      caution: [],
      trait: ['수다쟁이'],
      payment: [],
      pattern: ['단골']
    }
  },
  {
    id: 8,
    name: '이민지',
    phone: '010-8901-2345',
    visitCount: 4,
    lastVisit: '2025-01-09',
    avatar: '👩‍🦱',
    tags: ['#왁싱'],
    customerTags: {
      caution: [],
      trait: [],
      payment: [],
      pattern: []
    }
  },
  {
    id: 9,
    name: '이서연',
    phone: '010-9012-3456',
    visitCount: 11,
    lastVisit: '2025-01-08',
    avatar: '👱‍♀️',
    tags: ['#단골', '#속눈썹연장', '#조용한거선호'],
    customerTags: {
      caution: [],
      trait: ['조용한거선호'],
      payment: [],
      pattern: ['단골']
    }
  },
  {
    id: 10,
    name: '박지은',
    phone: '010-0123-4567',
    visitCount: 8,
    lastVisit: '2025-01-13',
    avatar: '👩‍🦰',
    tags: ['#염색'],
    customerTags: {
      caution: [],
      trait: [],
      payment: [],
      pattern: []
    }
  },
  {
    id: 11,
    name: '박서준',
    phone: '010-1357-2468',
    visitCount: 6,
    lastVisit: '2025-01-07',
    avatar: '👩',
    tags: ['#리터치', '#인그로운'],
    customerTags: {
      caution: [],
      trait: [],
      payment: [],
      pattern: []
    }
  },
  {
    id: 12,
    name: '최혜진',
    phone: '010-2468-1357',
    visitCount: 2,
    lastVisit: '2025-01-12',
    avatar: '👩‍🦱',
    tags: ['#왁싱'],
    customerTags: {
      caution: [],
      trait: [],
      payment: [],
      pattern: []
    }
  },
  {
    id: 13,
    name: '최수진',
    phone: '010-3579-2468',
    visitCount: 20,
    lastVisit: '2025-01-17',
    avatar: '👩',
    tags: ['#단골', '#수다쟁이', '#이달의아트', '#웨딩준비'],
    customerTags: {
      caution: [],
      trait: ['수다쟁이'],
      payment: [],
      pattern: ['단골']
    }
  },
  {
    id: 14,
    name: '정수빈',
    phone: '010-4680-3579',
    visitCount: 1,
    lastVisit: '2024-12-15',
    avatar: '👱‍♀️',
    tags: ['#왁싱'],
    customerTags: {
      caution: [],
      trait: [],
      payment: [],
      pattern: []
    }
  },
  {
    id: 15,
    name: '정유나',
    phone: '010-5791-4680',
    visitCount: 12,
    lastVisit: '2025-01-11',
    avatar: '👱',
    tags: ['#단골', '#네일'],
    customerTags: {
      caution: [],
      trait: [],
      payment: [],
      pattern: ['단골']
    }
  },
  {
    id: 16,
    name: '강나영',
    phone: '010-6802-5791',
    visitCount: 4,
    lastVisit: '2024-11-20',
    avatar: '👱‍♀️',
    tags: ['#쿨톤', '#짧은손톱'],
    customerTags: {
      caution: [],
      trait: [],
      payment: [],
      pattern: []
    }
  },
  {
    id: 17,
    name: '조은지',
    phone: '010-7913-6802',
    visitCount: 9,
    lastVisit: '2024-10-05',
    avatar: '👩‍🦰',
    tags: ['#속눈썹연장', '#단골'],
    customerTags: {
      caution: [],
      trait: [],
      payment: [],
      pattern: ['단골']
    }
  },
  {
    id: 18,
    name: '윤서연',
    phone: '010-8024-7913',
    visitCount: 6,
    lastVisit: '2024-09-18',
    avatar: '👩‍🦱',
    tags: ['#리터치', '#인그로운'],
    customerTags: {
      caution: [],
      trait: [],
      payment: [],
      pattern: []
    }
  },
  {
    id: 19,
    name: '한지민',
    phone: '010-9135-8024',
    visitCount: 15,
    lastVisit: '2025-01-17',
    avatar: '👩',
    tags: ['#단골', '#웨딩준비', '#이달의아트'],
    customerTags: {
      caution: [],
      trait: [],
      payment: [],
      pattern: ['단골']
    }
  },
  {
    id: 20,
    name: '오수아',
    phone: '010-0246-9135',
    visitCount: 3,
    lastVisit: '2024-08-22',
    avatar: '👱‍♀️',
    tags: ['#왁싱'],
    customerTags: {
      caution: [],
      trait: [],
      payment: [],
      pattern: []
    }
  },
  {
    id: 21,
    name: '이다혜',
    phone: '010-1357-8024',
    visitCount: 0,
    lastVisit: null,
    avatar: '👩',
    tags: [],
    customerTags: {
      caution: [],
      trait: [],
      payment: [],
      pattern: []
    }
  }
];

const MOCK_VISITS = {
  1: [ // 김민지 - 방문 10회
    {
      id: 1,
      date: '2025-11-28',
      time: '15:00',
      title: '속눈썹 D컬 리터치',
      summary: '기존 단골 속눈썹 고객 리터치 및 시술 후 관리 안내',
      tags: ['D컬', '11mm', '리터치'],
      detail: {
      sections: [
          { title: '고객 기본 정보', content: ['이름: 김민지 / 전화번호: 010-1234-5678', '신규/기존 구분: 기존 고객(단골)'] },
          { title: '방문·예약 정보', content: ['2025-11-28 15:00 방문'] },
          { title: '시술·관리 상세', content: ['D컬 11mm + 12mm 섞어서 화려한 디자인 시술', '이전 C컬에서 D컬로 변경 요청'] },
          { title: '주의사항·홈 케어', content: ['눈물 많아서 테이핑 주의', '리무버 자극 주의', '11/29 리터치 안내'] },
          { title: '결제 금액', content: ['회원권에서 50,000원 차감'] }
      ]
    }
  },
  {
      id: 2,
      date: '2025-11-15',
      time: '14:30',
      title: '속눈썹 C컬 → D컬 변경',
      summary: '끝이 처진 느낌으로 D컬로 변경, 11/29 리터치 안내',
      detail: {
      sections: [
          { title: '고객 기본 정보', content: ['이름: 김민지 / 전화번호: 010-1234-5678', '신규/기존 구분: 기존 고객(단골)'] },
          { title: '방문·예약 정보', content: ['2025-11-15 14:30 방문'] },
          { title: '현재 상태·고객 고민', content: ['이전 C컬 시술 후 끝이 처지는 느낌', '더 바짝 올라가길 원함'] },
          { title: '시술·관리 상세', content: ['C컬에서 D컬로 변경', '11mm와 12mm 혼합 디자인'] },
          { title: '결제 금액', content: ['60,000원 (카드)'] }
      ]
    }
  },
  {
      id: 3,
      date: '2025-10-30',
      time: '14:00',
      title: '젤네일 제거 + 누드톤 재시술',
      summary: '회사 회의 많아서 튀지 않게, 손톱 길이 짧게 정리',
      detail: {
      sections: [
          { title: '고객 기본 정보', content: ['이름: 김민지 / 전화번호: 010-1234-5678', '신규/기존 구분: 기존 고객(단골)'] },
          { title: '방문·예약 정보', content: ['2025-10-30 14:00 방문'] },
          { title: '시술·관리 상세', content: ['기존 젤 제거', '누드톤 젤네일 재시술', '손톱 길이 짧게 정리'] },
          { title: '결제 금액', content: ['55,000원 (카드)'] }
      ]
    }
  },
  {
      id: 4,
      date: '2025-09-20',
      time: '16:00',
      title: '속눈썹 리터치 및 영양 케어',
      summary: '리터치 진행, 눈물 많아서 테이핑 주의',
      detail: {
      sections: [
          { title: '고객 기본 정보', content: ['이름: 김민지 / 전화번호: 010-1234-5678', '신규/기존 구분: 기존 고객(단골)'] },
          { title: '방문·예약 정보', content: ['2025-09-20 16:00 방문'] },
          { title: '시술·관리 상세', content: ['속눈썹 리터치 진행', '영양 케어 서비스'] },
          { title: '주의사항·홈 케어', content: ['눈물 많아서 테이핑 주의', '리무버 자극 주의'] },
          { title: '결제 금액', content: ['회원권에서 50,000원 차감'] }
      ]
    }
  },
  {
      id: 5,
      date: '2025-08-10',
      time: '15:30',
      title: '젤네일 아트 변경',
      summary: '여름 시즌 맞춰 밝은 컬러로 변경, 손톱 상태 양호',
      detail: {
      sections: [
          { title: '고객 기본 정보', content: ['이름: 김민지 / 전화번호: 010-1234-5678', '신규/기존 구분: 기존 고객(단골)'] },
          { title: '방문·예약 정보', content: ['2025-08-10 15:30 방문'] },
          { title: '시술·관리 상세', content: ['기존 젤 제거', '여름 시즌 밝은 컬러 아트 시술'] },
          { title: '결제 금액', content: ['65,000원 (카드)'] }
        ]
      }
    },
    {
      id: 6,
      date: '2025-07-05',
      time: '13:00',
      title: '속눈썹 풀세트',
      summary: 'C컬 풀세트 시술, 눈을 꽉 감는 버릇 있어서 테이핑 주의',
      detail: {
        sections: [
          { title: '고객 기본 정보', content: ['이름: 김민지 / 전화번호: 010-1234-5678', '신규/기존 구분: 기존 고객(단골)'] },
          { title: '방문·예약 정보', content: ['2025-07-05 13:00 방문'] },
          { title: '시술·관리 상세', content: ['C컬 풀세트 시술', '11mm와 12mm 혼합'] },
          { title: '주의사항·홈 케어', content: ['눈을 꽉 감는 버릇 있어서 테이핑 주의', '눈물 많음'] },
          { title: '결제 금액', content: ['80,000원 (카드)'] }
        ]
      }
    },
    {
      id: 7,
      date: '2025-05-25',
      time: '14:00',
      title: '젤네일 리터치 및 영양 케어',
      summary: '리터치 진행, 손톱 건강 상태 양호',
      detail: {
        sections: [
          { title: '고객 기본 정보', content: ['이름: 김민지 / 전화번호: 010-1234-5678', '신규/기존 구분: 기존 고객(단골)'] },
          { title: '방문·예약 정보', content: ['2025-05-25 14:00 방문'] },
          { title: '시술·관리 상세', content: ['젤네일 리터치 진행', '영양 케어 서비스'] },
          { title: '결제 금액', content: ['회원권에서 50,000원 차감'] }
        ]
      }
    },
    {
      id: 8,
      date: '2025-04-15',
      time: '16:30',
      title: '속눈썹 리터치',
      summary: '리터치 진행, 이전 시술 상태 양호',
      detail: {
        sections: [
          { title: '고객 기본 정보', content: ['이름: 김민지 / 전화번호: 010-1234-5678', '신규/기존 구분: 기존 고객(단골)'] },
          { title: '방문·예약 정보', content: ['2025-04-15 16:30 방문'] },
          { title: '시술·관리 상세', content: ['속눈썹 리터치 진행'] },
          { title: '결제 금액', content: ['회원권에서 50,000원 차감'] }
        ]
      }
    },
    {
      id: 9,
      date: '2025-02-28',
      time: '15:00',
      title: '젤네일 제거 및 재시술',
      summary: '기존 젤 제거 후 누드톤 재시술, 손톱 상태 양호',
      detail: {
        sections: [
          { title: '고객 기본 정보', content: ['이름: 김민지 / 전화번호: 010-1234-5678', '신규/기존 구분: 기존 고객(단골)'] },
          { title: '방문·예약 정보', content: ['2025-02-28 15:00 방문'] },
          { title: '시술·관리 상세', content: ['기존 젤 제거', '누드톤 젤네일 재시술'] },
          { title: '결제 금액', content: ['55,000원 (카드)'] }
        ]
      }
    },
    {
      id: 10,
      date: '2024-12-01',
      time: '13:30',
      title: '첫 방문 – 속눈썹 C컬 풀세트',
      summary: '눈물 많고 테이핑 약하게, 리무버 자극 주의',
      detail: {
        sections: [
          { title: '고객 기본 정보', content: ['이름: 김민지 / 전화번호: 010-1234-5678', '신규/기존 구분: 신규 고객'] },
          { title: '방문·예약 정보', content: ['2024-12-01 13:30 방문'] },
          { title: '시술·관리 상세', content: ['속눈썹 C컬 풀세트 시술', '11mm와 12mm 혼합'] },
          { title: '주의사항·홈 케어', content: ['눈물 많아서 테이핑 약하게', '리무버 자극 주의', '눈을 꽉 감는 버릇 있음'] },
          { title: '결제 금액', content: ['90,000원 (카드, 회원권 가입)'] }
        ]
      }
    },
    {
      id: 11,
      date: '2024-11-15',
      time: '14:00',
      title: '젤네일 제거 및 재시술',
      summary: '기존 젤 제거 후 누드톤 재시술, 손톱 건강 상태 양호',
      detail: {
        sections: [
          { title: '고객 기본 정보', content: ['이름: 김민지 / 전화번호: 010-1234-5678', '신규/기존 구분: 기존 고객(단골)'] },
          { title: '방문·예약 정보', content: ['2024-11-15 14:00 방문'] },
          { title: '시술·관리 상세', content: ['기존 젤 제거', '누드톤 젤네일 재시술'] },
          { title: '결제 금액', content: ['55,000원 (카드)'] }
        ]
      }
    },
    {
      id: 12,
      date: '2024-10-20',
      time: '15:30',
      title: '속눈썹 리터치',
      summary: '리터치 진행, 이전 시술 상태 양호',
      detail: {
        sections: [
          { title: '고객 기본 정보', content: ['이름: 김민지 / 전화번호: 010-1234-5678', '신규/기존 구분: 기존 고객(단골)'] },
          { title: '방문·예약 정보', content: ['2024-10-20 15:30 방문'] },
          { title: '시술·관리 상세', content: ['속눈썹 리터치 진행'] },
          { title: '결제 금액', content: ['회원권에서 50,000원 차감'] }
        ]
      }
    },
    {
      id: 13,
      date: '2024-09-10',
      time: '16:00',
      title: '젤네일 아트 변경',
      summary: '가을 시즌 맞춰 따뜻한 톤으로 변경, 손톱 상태 양호',
      detail: {
        sections: [
          { title: '고객 기본 정보', content: ['이름: 김민지 / 전화번호: 010-1234-5678', '신규/기존 구분: 기존 고객(단골)'] },
          { title: '방문·예약 정보', content: ['2024-09-10 16:00 방문'] },
          { title: '시술·관리 상세', content: ['기존 젤 제거', '가을 시즌 따뜻한 톤 아트 시술'] },
          { title: '결제 금액', content: ['65,000원 (카드)'] }
        ]
      }
    },
    {
      id: 14,
      date: '2024-08-05',
      time: '13:30',
      title: '속눈썹 리터치 및 영양 케어',
      summary: '리터치 진행, 눈물 많아서 테이핑 주의',
      detail: {
        sections: [
          { title: '고객 기본 정보', content: ['이름: 김민지 / 전화번호: 010-1234-5678', '신규/기존 구분: 기존 고객(단골)'] },
          { title: '방문·예약 정보', content: ['2024-08-05 13:30 방문'] },
          { title: '시술·관리 상세', content: ['속눈썹 리터치 진행', '영양 케어 서비스'] },
          { title: '주의사항·홈 케어', content: ['눈물 많아서 테이핑 주의', '리무버 자극 주의'] },
          { title: '결제 금액', content: ['회원권에서 50,000원 차감'] }
        ]
      }
    },
    {
      id: 15,
      date: '2024-07-20',
      time: '14:30',
      title: '젤네일 리터치',
      summary: '리터치 진행, 손톱 건강 상태 양호',
      detail: {
        sections: [
          { title: '고객 기본 정보', content: ['이름: 김민지 / 전화번호: 010-1234-5678', '신규/기존 구분: 기존 고객(단골)'] },
          { title: '방문·예약 정보', content: ['2024-07-20 14:30 방문'] },
          { title: '시술·관리 상세', content: ['젤네일 리터치 진행'] },
          { title: '결제 금액', content: ['회원권에서 50,000원 차감'] }
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
      title: '젤네일 첫 시술 및 아트 추가',
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
  ],
  21: [] // 이다혜 - 신규 회원 (방문 기록 없음)
};

// --- 2. Visual Components ---

// Updated: WaveBars using standard Tailwind classes instead of custom <style>
const WaveBars = () => (
  <div className="flex items-center justify-center gap-1 h-12">
    {[...Array(5)].map((_, i) => (
      <div 
        key={i} 
        className="w-1.5 rounded-full animate-pulse"
        style={{ 
          backgroundColor: '#C9A27A',
          opacity: 0.6,
          animationDelay: `${i * 0.15}s`, 
          animationDuration: '0.6s' 
        }}
      ></div>
    ))}
  </div>
);


const SkeletonLoader = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5 w-full animate-pulse">
    <div className="h-6 bg-gray-200 rounded-2xl w-3/4 mb-6"></div>
    {[...Array(3)].map((_, i) => (
      <div key={i} className="space-y-3">
        <div className="h-4 bg-gray-200 rounded-2xl w-1/3"></div>
        <div className="h-3 bg-gray-100 rounded-2xl w-full"></div>
        <div className="h-3 bg-gray-100 rounded-2xl w-5/6"></div>
      </div>
    ))}
  </div>
);

// --- 3. Main App ---

export default function MalloApp() {
  const [currentScreen, setCurrentScreen] = useState('Login'); // Login 화면부터 시작
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('Home'); // 하단 네비게이션 활성 탭
  const [userProfile] = useState({ sectorId: 'beauty', roleTitle: '뷰티샵 원장' });
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
      care: ['영양', '랩핑', '제거']
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
      payment: ['회원권', '현금결제', '카드결제'],
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
  const normalize = (text) => {
    if (!text || typeof text !== 'string') return '';
    return text
      .toLowerCase()
      .replace(/\s+/g, '')      // 모든 공백 제거
      .replace(/[#\-,.]/g, '')  // #, -, , . 같은 기호 제거
      .trim();
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

  // 태그 매칭 함수: 원본 텍스트 또는 요약 텍스트에서 태그 찾기 (정규화된 키워드 매칭)
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
        // label + keywords 전부를 후보 키로 사용
        const keys = [tag.label, ...(tag.keywords || [])];
        
        const isMatched = keys.some((key) => {
          const normKey = normalize(key);
          if (!normKey || normKey.length === 0) return false;
          const found = normSummary.includes(normKey);
          if (found) {
            console.log('[태그 매칭] 매칭 성공:', tag.label, '-> 키워드:', key, '-> 정규화:', normKey);
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
      const matchedCustomerTags = matchTagsFromSummary(sourceText, allCustomerTags);
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
          
          // AI가 찾은 새 태그 ID 찾기
          const newTagIds = matchedCustomerTags.filter(id => !existingTagIds.includes(id));
          
          // 병합: 기존 태그 + AI가 찾은 새 태그 (중복 제거)
          const mergedTagIds = [...new Set([...existingTagIds, ...matchedCustomerTags])];
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

  const renderHome = () => {
    // 전화번호에서 하이픈과 공백 제거하는 헬퍼 함수
    const normalizePhone = (phone) => {
      return phone.replace(/[-\s]/g, '');
    };

    // 검색 필터링된 고객 리스트
    const filteredCustomers = customers.filter(customer => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const normalizedQuery = normalizePhone(query);
      
      // 이름 검색 (기존 로직 유지)
      const nameMatch = customer.name.toLowerCase().includes(query);
      
      // 전화번호 검색 (하이픈과 공백 제거 후 비교)
      const normalizedCustomerPhone = normalizePhone(customer.phone);
      const phoneMatch = normalizedCustomerPhone.includes(normalizedQuery);
      
      return nameMatch || phoneMatch;
    });

    // 오늘 날짜 표시
    const today = new Date();
    const todayStr = `${today.getMonth() + 1}월 ${today.getDate()}일`;

    return (
      <div className="flex flex-col h-full relative pb-[60px]" style={{ backgroundColor: '#F2F0E6' }}>
        <header className="px-8 py-6 flex justify-between items-center bg-white z-10 border-b border-gray-200 shadow-sm">
        <div className="flex flex-col">
            <h2 className="text-xl font-bold" style={{ color: '#232323' }}>원장님, 안녕하세요!</h2>
            <span className="text-sm font-light mt-1" style={{ color: '#232323', opacity: 0.6 }}>{todayStr}</span>
          </div>
          <button 
            onClick={() => {
              setActiveTab('History');
              setCurrentScreen('History');
            }}
            className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#C9A27A' }}
          >
            <Scissors size={20} className="text-white" />
          </button>
      </header>

        <main className="flex-1 overflow-y-auto flex flex-col items-center justify-start p-8 space-y-12 pb-20 relative">
          {/* 검색창 - 화면 중앙에 크게 배치 */}
          <div className="absolute left-1/2 -translate-x-1/2 w-full max-w-md px-8" style={{ top: '140px', zIndex: 100 }}>
            <div className="bg-white rounded-2xl shadow-md border border-[#EFECE1] p-6">
              <div className="flex items-center gap-4 bg-white rounded-2xl px-4 h-14 border border-[#EFECE1] focus-within:border-[#C9A27A] focus-within:ring-2 focus-within:ring-[#C9A27A] transition-all">
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="고객 이름이나 전화번호 검색"
                  className="w-full bg-transparent outline-none font-light placeholder-gray-400 text-lg leading-normal"
                  style={{ color: '#232323' }}
                />
        </div>
            </div>

            {/* 검색 결과 - Absolute Positioning으로 드롭다운 */}
            {searchQuery.trim() && filteredCustomers.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-200 z-[100] max-h-60 overflow-y-auto">
                <div className="p-2 space-y-1">
                  {filteredCustomers.map((customer) => (
                    <div 
                      key={customer.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('선택된 고객:', customer.name, customer.id, customer.phone);
                        setSelectedCustomerId(customer.id);
                        setCurrentScreen('CustomerDetail');
                      }}
                      className="bg-white rounded-xl p-4 hover:bg-gray-50 transition-all cursor-pointer border border-transparent hover:border-gray-200"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-3xl">{customer.avatar}</div>
                        <div className="flex-1">
                          <h4 className="font-bold text-base mb-1" style={{ color: '#232323' }}>{customer.name}</h4>
                          <p className="text-sm font-light" style={{ color: '#232323', opacity: 0.7 }}>{customer.phone}</p>
        </div>
                        <ChevronRight size={18} style={{ color: '#C9A27A' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 검색 결과 없음 - Absolute Positioning */}
            {searchQuery.trim() && filteredCustomers.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-200 z-[100] p-6">
                <p className="text-base font-light text-center" style={{ color: '#232323', opacity: 0.6 }}>검색 결과가 없습니다.</p>
              </div>
            )}
          </div>

          {/* 신규 고객 바로 녹음 버튼 - 큰 원형 카드 형태 (항상 표시) */}
          <div className="absolute left-1/2 -translate-x-1/2 w-full max-w-md px-8 z-0" style={{ bottom: '50px' }}>
        <div 
              className="w-full bg-white rounded-3xl shadow-lg border-2 border-gray-200 hover:shadow-xl hover:border-[#C9A27A] transition-all duration-300 p-12 flex flex-col items-center justify-center gap-6"
              style={{ backgroundColor: '#FFFFFF' }}
            >
        <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCustomerForRecord(null);
                  startRecording();
                }}
                className="rounded-full flex items-center justify-center shadow-md transition-transform duration-300 hover:scale-110 active:scale-95 cursor-pointer"
                style={{ backgroundColor: '#C9A27A', width: '136px', height: '136px' }}
              >
                <Mic size={40} className="text-white" />
        </button>
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-2" style={{ color: '#232323' }}>신규 고객 바로 녹음</h3>
                <p className="text-sm font-light" style={{ color: '#232323', opacity: 0.6 }}>시술 내용을 말로만 기록하세요</p>
              </div>
        </div>
          </div>
      </main>
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

  const renderRecording = () => (
    <div className="flex flex-col h-full bg-white relative items-center justify-center overflow-hidden">
      {/* 배경 효과 - 따뜻한 크림색 파동 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse opacity-20" style={{ backgroundColor: '#C9A27A', animationDuration: '4s' }}></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full blur-3xl animate-pulse opacity-15" style={{ backgroundColor: '#C9A27A', animationDuration: '5s', animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-88 h-88 rounded-full blur-3xl animate-pulse opacity-20" style={{ backgroundColor: '#F2F0E6', animationDuration: '6s', animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 rounded-full blur-3xl animate-pulse opacity-15" style={{ backgroundColor: '#F2F0E6', animationDuration: '4.5s', animationDelay: '2s' }}></div>
      </div>

      {/* 타이머 영역 */}
      <div className="z-10 text-center mb-10">
        <h2 className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: '#C9A27A', opacity: 0.8 }}>Recording</h2>
        <p 
          className="text-7xl font-mono font-light tracking-tighter tabular-nums"
          style={{
            color: '#232323',
            textShadow: '0 2px 10px rgba(201, 162, 122, 0.2)'
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
          className="group relative flex items-center justify-center"
          style={{ width: '136px', height: '136px' }}
        >
          {/* 물결 효과 - 여러 겹의 원 (골드 브라운 톤) */}
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border-2"
              style={{
                width: '136px',
                height: '136px',
                borderColor: 'rgba(201, 162, 122, 0.3)',
                animation: `ping ${2.5 + i * 0.4}s cubic-bezier(0, 0, 0.2, 1) infinite`,
                animationDelay: `${i * 0.25}s`,
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            ></div>
          ))}
          
          {/* 버튼 본체 */}
          <div className="absolute inset-0 rounded-full blur-xl transition-colors" style={{ backgroundColor: 'rgba(201, 162, 122, 0.15)' }}></div>
          <div 
            className="relative rounded-full flex items-center justify-center group-hover:scale-105 group-active:scale-95 transition-all duration-200 z-10"
            style={{ 
              width: '136px',
              height: '136px',
              backgroundColor: '#C9A27A',
              boxShadow: '0 10px 40px rgba(201, 162, 122, 0.4), 0 0 20px rgba(201, 162, 122, 0.2)'
            }}
          >
            <Square size={32} fill="white" stroke="white" className="ml-0.5" />
          </div>
        </button>
      </div>

      {/* 취소 버튼 */}
      <div className="absolute bottom-16 w-full px-8 flex justify-center z-10">
        <button
          onClick={cancelRecording}
          className="px-6 py-2 text-sm font-medium rounded-full transition-all duration-200 hover:opacity-70"
          style={{ 
            color: '#232323',
            backgroundColor: 'rgba(35, 35, 35, 0.05)',
            border: '1px solid rgba(35, 35, 35, 0.1)'
          }}
        >
          취소하기
        </button>
      </div>

      <div className="absolute bottom-32 w-full px-8 text-center z-10">
        <p 
          className="text-sm leading-relaxed font-light bg-white/80 py-3 px-4 rounded-xl border backdrop-blur-sm"
          style={{ 
            color: '#232323', 
            opacity: 0.7,
            borderColor: 'rgba(201, 162, 122, 0.2)'
          }}
        >
          💡 Tip: 고객 이름, 시술 종류, 결제 금액을<br/>구체적으로 말하면 더 정확해요.
        </p>
      </div>
    </div>
  );

  const renderProcessing = () => (
    <div className="flex flex-col h-full px-8 pt-24 pb-12" style={{ backgroundColor: '#F2F0E6' }}>
      <div className="text-center mb-12">
        <div className="inline-block p-5 rounded-2xl bg-white shadow-md border border-gray-200 mb-6 animate-bounce" style={{ backgroundColor: '#FFFFFF' }}>
          <Scissors size={32} style={{ color: '#C9A27A' }} />
        </div>
        <h2 className="text-2xl font-bold mb-3" style={{ color: '#232323' }}>시술 기록 정리 중</h2>
        <p className="font-light" style={{ color: '#232323' }}>AI가 내용을 분석하고 서식을 적용하고 있습니다.</p>
      </div>
      
      <div className="flex-1 w-full max-w-sm mx-auto space-y-5 opacity-50">
        <SkeletonLoader />
      </div>

      <div className="text-sm text-center font-light mt-auto" style={{ color: '#232323', opacity: 0.6 }}>
        Processing transcript...<br/>
        Applying beauty salon template...
      </div>
    </div>
  );

  const renderResult = () => {
    if (!resultData) {
      return (
        <div className="flex flex-col h-full items-center justify-center" style={{ backgroundColor: '#F2F0E6' }}>
          <p style={{ color: '#232323' }}>결과 데이터가 없습니다.</p>
          <button onClick={resetFlow} className="mt-4 font-medium" style={{ color: '#232323' }}>홈으로 돌아가기</button>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full relative" style={{ backgroundColor: '#F2F0E6' }}>
      {/* Header */}
        <header className="bg-white px-8 py-6 sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 shadow-sm">
          <button onClick={resetFlow} className="p-2 hover:bg-gray-100 rounded-2xl transition-colors" style={{ color: '#232323' }}>
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
            <span className="text-xs font-medium" style={{ color: '#232323', opacity: 0.7 }}>시술 기록</span>
            <h2 className="font-bold text-base mt-1" style={{ color: '#232323' }}>{getTodayDate()}</h2>
        </div>
          <button className="p-2" style={{ color: '#232323', opacity: 0.5 }}>
          <MoreHorizontal size={24} />
        </button>
      </header>

        <main className="flex-1 overflow-y-auto p-8 space-y-5 pb-32" style={{ backgroundColor: '#F2F0E6' }}>
          {/* 고객 정보 표시 - selectedCustomerForRecord가 있으면 카드, 없으면 입력창 */}
          {selectedCustomerForRecord ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-4">
                <div className="text-4xl">{selectedCustomerForRecord.avatar}</div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1" style={{ color: '#232323' }}>{selectedCustomerForRecord.name}</h3>
                  <div className="flex items-center gap-2 text-sm font-light" style={{ color: '#232323', opacity: 0.7 }}>
                    <Phone size={14} style={{ color: '#C9A27A' }} />
                    <span>{selectedCustomerForRecord.phone}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
              <label className="block text-sm font-medium mb-2" style={{ color: '#232323' }}>신규 고객 정보</label>
              
              {/* 이름 입력 */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: '#232323', opacity: 0.7 }}>이름</label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={tempName || ''}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder={!tempName ? "이름 입력" : ""}
                  className={`w-full px-4 py-3 rounded-2xl border focus:ring-1 outline-none transition-all ${
                    !tempName ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 focus:border-[#C9A27A] focus:ring-[#C9A27A]'
                  }`}
                  style={{ color: '#232323', backgroundColor: '#FFFFFF' }}
                />
                {!tempName && (
                  <p className="text-xs mt-2" style={{ color: '#EF4444' }}>* 이름은 필수입니다</p>
                )}
              </div>
              
              {/* 전화번호 입력 */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: '#232323', opacity: 0.7 }}>전화번호</label>
                <input
                  ref={phoneInputRef}
                  type="tel"
                  value={tempPhone || ''}
                  onChange={handlePhoneChange}
                  placeholder={!tempPhone ? "010-1234-5678" : ""}
                  className={`w-full px-4 py-3 rounded-2xl border focus:ring-1 outline-none transition-all ${
                    !tempPhone ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 focus:border-[#C9A27A] focus:ring-[#C9A27A]'
                  }`}
                  style={{ color: '#232323', backgroundColor: '#FFFFFF' }}
                />
                {!tempPhone && (
                  <p className="text-xs mt-2" style={{ color: '#EF4444' }}>* 전화번호는 필수입니다</p>
                )}
              </div>
            </div>
          )}

        {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
            <div className="px-8 py-6 relative overflow-hidden" style={{ backgroundColor: '#C9A27A' }}>
            <div className="relative z-10">
                <span className="inline-flex items-center px-3 py-1.5 rounded-2xl text-xs font-medium text-white mb-3 shadow-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}>
                {currentSector.icon}
                  <span className="ml-2">{userProfile.roleTitle}</span>
              </span>
                <h3 className="font-bold text-white text-lg mb-2">📝 오늘의 시술 요약</h3>
                <p className="text-base font-medium text-white/90 leading-relaxed">{resultData.title}</p>
            </div>
          </div>

            <div className="p-8 space-y-7">
            {resultData.sections.map((section, idx) => (
              <div key={idx} className="animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 100}ms` }}>
                  <h4 className="text-base font-bold mb-4" style={{ color: '#232323' }}>
                  {section.title}
                </h4>
                <ul className="space-y-3">
                  {section.content.map((item, i) => (
                      <li key={i} className="text-base leading-relaxed pl-4 font-light" style={{ color: '#232323', borderLeft: '2px solid #E5E7EB' }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* 개발용 요약 테스트 박스 */}
        {DEV_MODE && (
          <section className="bg-white rounded-2xl border-2 border-dashed border-gray-300 shadow-sm p-5">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold px-2 py-1 rounded bg-yellow-100 text-yellow-800">DEV</span>
                <span className="text-base font-bold" style={{ color: '#232323' }}>개발용 요약 테스트</span>
              </div>
              <p className="text-sm" style={{ color: '#232323', opacity: 0.7 }}>
                음성 대신 텍스트를 입력해서 요약·태그 흐름을 테스트할 수 있어요.
              </p>
            </div>

            <textarea
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#C9A27A] focus:ring-1 focus:ring-[#C9A27A] mb-3 resize-none"
              placeholder="여기에 고객에게 말할 내용을 두서없이 적어보고, 아래 버튼을 눌러 테스트하세요."
              value={testSummaryInput}
              onChange={(e) => setTestSummaryInput(e.target.value)}
              rows={4}
              style={{ color: '#232323', backgroundColor: '#FFFFFF' }}
            />

            <button
              type="button"
              className="w-full py-3 rounded-xl font-medium text-white shadow-sm hover:shadow-md hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleTestSummarize}
              disabled={isTestingSummary || !testSummaryInput.trim()}
              style={{ backgroundColor: '#C9A27A' }}
            >
              {isTestingSummary ? "요약 테스트 중..." : "이 텍스트로 요약 테스트"}
            </button>
          </section>
        )}

        {/* Section 1: 이번 방문 태그 */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="mb-4">
            <h3 className="text-base font-bold mb-2 flex items-center gap-2" style={{ color: '#232323' }}>
              <span>🧴</span>
              <span>이번 방문 태그</span>
            </h3>
            <p className="text-sm" style={{ color: '#232323', opacity: 0.7 }}>
              이번 시술 기록에 저장됩니다.
            </p>
          </div>

          {/* 추천 태그 칩들 */}
          <div className="flex flex-wrap gap-2 mb-4">
            {(recommendedTagIds.length === 0 && selectedTagIds.length === 0) ? (
              <p className="text-sm" style={{ color: '#232323', opacity: 0.5 }}>
                추천 태그가 없어요. 필요한 경우 아래에서 직접 추가할 수 있어요.
              </p>
            ) : (
              // recommendedTagIds와 selectedTagIds를 합쳐서 중복 제거
              [...new Set([...recommendedTagIds, ...selectedTagIds])].map((tagId) => {
                const tag = allVisitTags.find((t) => t.id === tagId);
                if (!tag) return null;

                const isSelected = selectedTagIds.includes(tag.id);
                const isRecommended = recommendedTagIds.includes(tag.id);

                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      // 고객 프로필 태그처럼 클릭 시 바로 제거
                      setSelectedTagIds((prev) => prev.filter((id) => id !== tag.id));
                      // AI 자동 추천이 OFF일 때는 recommendedTagIds에서도 제거
                      if (!isAutoTaggingEnabled) {
                        setRecommendedTagIds((prev) => prev.filter((id) => id !== tag.id));
                      }
                    }}
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

          {/* 태그 더 추가하기 버튼 */}
          <button
            type="button"
            onClick={() => setIsTagPickerOpen(true)}
            className="w-full py-2.5 rounded-xl text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            + 태그 더 추가하기
          </button>
        </section>

        {/* Section 2: 고객 프로필 업데이트 */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="mb-4">
            <h3 className="text-base font-bold mb-2 flex items-center gap-2" style={{ color: '#232323' }}>
              <span>👤</span>
              <span>고객 프로필 업데이트</span>
            </h3>
            <p className="text-sm" style={{ color: '#232323', opacity: 0.7 }}>
              {selectedCustomerForRecord 
                ? '고객 정보에 영구적으로 저장됩니다.'
                : '신규 고객으로 저장 시 고객 정보에 영구적으로 저장됩니다.'}
            </p>
          </div>

          {/* 고객 태그 칩들 */}
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedCustomerTagIds.length === 0 ? (
              <p className="text-sm" style={{ color: '#232323', opacity: 0.5 }}>
                고객 특징 태그가 없어요. 필요한 경우 아래에서 직접 추가할 수 있어요.
              </p>
            ) : (
              selectedCustomerTagIds.map((tagId) => {
                const tag = allCustomerTags.find((t) => t.id === tagId);
                if (!tag) return null;

                const isNew = selectedCustomerForRecord 
                  ? newCustomerTagIds.includes(tag.id)
                  : true; // 신규 고객인 경우 모든 태그를 새 태그로 표시

                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomerTagIds((prev) =>
                          prev.includes(tag.id)
                            ? prev.filter((id) => id !== tag.id) // OFF
                            : [...prev, tag.id]                   // ON
                        );
                        // 새 태그 목록에서도 제거
                        if (isNew) {
                          setNewCustomerTagIds((prev) => prev.filter((id) => id !== tag.id));
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${
                        isNew
                          ? 'bg-green-50 text-green-700 border border-green-200' // 새로 추가된 태그
                          : 'bg-gray-100 text-gray-600 border border-gray-200'    // 기존 태그
                      }`}
                    >
                      {tag.label}
                      {isNew && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-200 text-green-800 font-bold">
                          New
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

          {/* 고객 태그 더 추가하기 버튼 */}
          <button
            type="button"
            onClick={() => setIsCustomerTagPickerOpen(true)}
            className="w-full py-2.5 rounded-xl text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            + 태그 더 추가하기
          </button>
        </section>

        {/* 방문 태그 선택 모달 */}
        {isTagPickerOpen && (
          <TagPickerModal
            allVisitTags={allVisitTags}
            selectedTagIds={selectedTagIds}
            onClose={() => setIsTagPickerOpen(false)}
            onChangeSelected={(nextSelected) => {
              setSelectedTagIds(nextSelected);
              // AI 자동 추천이 OFF일 때는 수동으로 선택한 태그를 recommendedTagIds에도 추가
              if (!isAutoTaggingEnabled) {
                setRecommendedTagIds((prev) => {
                  const newRecommended = [...new Set([...prev, ...nextSelected])];
                  return newRecommended;
                });
              }
            }}
          />
        )}

        {/* 고객 태그 선택 모달 */}
        {isCustomerTagPickerOpen && (
          <CustomerTagPickerModal
            allCustomerTags={allCustomerTags}
            selectedTagIds={selectedCustomerTagIds}
            onClose={() => setIsCustomerTagPickerOpen(false)}
            onChangeSelected={(nextSelected) => {
              setSelectedCustomerTagIds(nextSelected);
              // 새로 추가된 태그 업데이트 (기존 고객 태그와 비교)
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
                
                const existingTagIds = allCustomerTags
                  .filter(tag => existingTagLabels.includes(tag.label))
                  .map(tag => tag.id);
                
                const newTagIds = nextSelected.filter(id => !existingTagIds.includes(id));
                setNewCustomerTagIds(newTagIds);
              }
            }}
          />
        )}

        {/* Transcript Toggle */}
          <details className="group bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <summary className="font-medium text-base cursor-pointer p-5 flex justify-between items-center hover:bg-gray-50 transition-colors select-none" style={{ color: '#232323' }}>
            <span>원본 녹음 내용 보기</span>
              <ChevronRight size={18} style={{ color: '#C9A27A' }} className="group-open:rotate-90 transition-transform duration-200" />
          </summary>
            <div className="p-5 pt-0 text-base leading-relaxed border-t border-gray-200 bg-gray-50" style={{ color: '#232323', opacity: 0.8 }}>
            <div className="pt-4">"{transcript}"</div>
          </div>
        </details>
        
          {/* 녹음 일시 표시 */}
          {recordingDate && (
            <p className="text-center text-xs mt-4 font-medium" style={{ color: 'rgba(35, 35, 35, 0.4)' }}>
              기록 일시: {(() => {
                const year = recordingDate.getFullYear();
                const month = recordingDate.getMonth() + 1;
                const day = recordingDate.getDate();
                const hours = recordingDate.getHours();
                const minutes = recordingDate.getMinutes();
                const ampm = hours >= 12 ? '오후' : '오전';
                const displayHours = hours % 12 || 12;
                const displayMinutes = minutes.toString().padStart(2, '0');
                return `${year}년 ${month}월 ${day}일 ${ampm} ${displayHours}:${displayMinutes}`;
              })()}
            </p>
          )}
        </main>

        {/* 녹음 일시 표시 */}
        {recordingDate && (
          <div className="p-8 pt-0 text-center">
            <p className="text-sm font-light" style={{ color: '#232323', opacity: 0.6 }}>
              {formatRecordingDate(recordingDate)}
            </p>
          </div>
        )}

        {/* Fixed Action Bar - 3개 버튼 나란히 배치 (화면 하단 고정) */}
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 px-8 py-4 shadow-lg" style={{ backgroundColor: '#F2F0E6' }}>
          <div className="flex gap-3">
            {/* 편집 버튼 */}
             <button 
              onClick={() => {
                // 편집 화면으로 이동 (임시 데이터 초기화)
                if (resultData) {
                  setTempResultData(JSON.parse(JSON.stringify(resultData))); // deep copy
                  setCurrentScreen('Edit');
                }
              }}
              className="flex items-center justify-center gap-2 py-4 rounded-2xl font-medium bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
              style={{ color: '#232323', width: '30%' }}
            >
              <Edit size={18} style={{ color: '#C9A27A' }} />
              <span>편집</span>
            </button>
            
            {/* 테스트 버튼 */}
            <button
              onClick={() => {
                // 테스트 시나리오 데이터
                const TEST_SCENARIOS = [
                  {
                    summary: "속눈썹 D컬 11mm로 연장 리터치 진행함. 글루 알러지 있어서 예민하심.",
                    sections: [
                      {
                        title: '고객 기본 정보',
                        content: ['이름: 테스트 고객 / 전화번호: 010-0000-0000', '신규/기존 구분: 기존 고객']
                      },
                      {
                        title: '시술 내용',
                        content: ['속눈썹 D컬 11mm로 연장 리터치 진행함. 글루 알러지 있어서 예민하심.']
                      },
                      {
                        title: '주의사항',
                        content: ['글루 알러지 있으므로 저자극 제품 사용']
                      }
                    ]
                  },
                  {
                    summary: "기존 젤네일 제거하고 이달의아트로 변경. 현금영수증 해드렸음.",
                    sections: [
                      {
                        title: '고객 기본 정보',
                        content: ['이름: 테스트 고객 / 전화번호: 010-0000-0000', '신규/기존 구분: 기존 고객']
                      },
                      {
                        title: '시술 내용',
                        content: ['기존 젤네일 제거하고 이달의아트로 변경. 현금영수증 해드렸음.']
                      },
                      {
                        title: '결제 금액',
                        content: ['현금영수증 발급 완료']
                      }
                    ]
                  },
                  {
                    summary: "오늘은 케어만 받고 가심. 손톱이 많이 상해서 영양제 듬뿍 발라드림.",
                    sections: [
                      {
                        title: '고객 기본 정보',
                        content: ['이름: 테스트 고객 / 전화번호: 010-0000-0000', '신규/기존 구분: 기존 고객']
                      },
                      {
                        title: '시술 내용',
                        content: ['오늘은 케어만 받고 가심. 손톱이 많이 상해서 영양제 듬뿍 발라드림.']
                      },
                      {
                        title: '시술 후 상태',
                        content: ['손톱 상태 개선을 위해 영양 케어 강화']
                      }
                    ]
                  },
                  {
                    summary: "눈물이 많으셔서 시술 중간에 자주 쉬었음. 다음엔 C컬 말고 J컬로 하고 싶다고 하심.",
                    sections: [
                      {
                        title: '고객 기본 정보',
                        content: ['이름: 테스트 고객 / 전화번호: 010-0000-0000', '신규/기존 구분: 기존 고객']
                      },
                      {
                        title: '시술 내용',
                        content: ['눈물이 많으셔서 시술 중간에 자주 쉬었음. 다음엔 C컬 말고 J컬로 하고 싶다고 하심.']
                      },
                      {
                        title: '주의사항',
                        content: ['눈물이 많으므로 시술 시 주의 필요']
                      }
                    ]
                  },
                  {
                    summary: "이번 고객님은 임산부셔서 조심스럽게 시술했습니다. 기존 젤네일 제거하고, 이달의아트로 변경하셨어요. 결제는 현금영수증 해드렸습니다.",
                    sections: [
                      {
                        title: '고객 기본 정보',
                        content: ['이름: 테스트 고객 / 전화번호: 010-0000-0000', '신규/기존 구분: 기존 고객']
                      },
                      {
                        title: '시술 내용',
                        content: ['이번 고객님은 임산부셔서 조심스럽게 시술했습니다. 기존 젤네일 제거하고, 이달의아트로 변경하셨어요. 결제는 현금영수증 해드렸습니다.']
                      },
                      {
                        title: '주의사항',
                        content: ['임산부 고객이므로 조심스럽게 시술 진행']
                      }
                    ]
                  }
                ];
                
                // 랜덤으로 시나리오 선택
                const randomIndex = Math.floor(Math.random() * TEST_SCENARIOS.length);
                const selectedScenario = TEST_SCENARIOS[randomIndex];
                
                const testResultData = {
                  title: selectedScenario.summary,
                  sections: selectedScenario.sections
                };
                
                setResultData(testResultData);
                
                // 태그 재분석을 위해 useEffect가 실행되도록 함
                // resultData가 변경되면 자동으로 태그 분석이 실행됨
              }}
              className="flex items-center justify-center gap-2 py-4 rounded-2xl font-medium bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
              style={{ color: '#232323', width: '30%' }}
            >
              <span>🧪</span>
              <span>테스트</span>
            </button>
            
            {/* 저장하기 버튼 */}
            <button 
              onClick={() => {
                // 저장 전 검증
                if (selectedCustomerForRecord) {
                  // 기존 고객 선택 시 - 기록 저장
                  const customerId = selectedCustomerForRecord.id;
                  const today = new Date();
                  // 녹음 기록을 년도, 달, 시간, 분으로 저장
                  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                  const timeStr = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
                  const recordedAt = today.toISOString(); // 녹음한 시각을 ISO 문자열로 저장 (년도, 달, 시간, 분, 초 포함)
                  
                  // serviceDate 추출 시도 (AI 결과에서 시술 날짜 파싱)
                  const parsedServiceDate = extractServiceDateFromSummary(resultData);
                  const serviceDate = parsedServiceDate || dateStr; // 파싱된 날짜가 있으면 사용, 없으면 녹음한 날짜
                  
                  console.log('[기존 고객 저장] 파싱된 serviceDate:', parsedServiceDate);
                  console.log('[기존 고객 저장] 최종 serviceDate:', serviceDate);
                  console.log('[기존 고객 저장] 녹음한 날짜 (date):', dateStr);
                  console.log('[기존 고객 저장] 녹음한 시간 (time):', timeStr);
                  console.log('[기존 고객 저장] 녹음한 시각 (recordedAt):', recordedAt);
                  
                  // title에서 고객 이름과 '신규 고객' 텍스트 제거
                  const cleanTitle = (title) => {
                    if (!title) return title;
                    let cleaned = title;
                    // 고객 이름 제거 (selectedCustomerForRecord.name이 있으면)
                    if (selectedCustomerForRecord?.name) {
                      cleaned = cleaned.replace(new RegExp(selectedCustomerForRecord.name, 'g'), '').trim();
                    }
                    // '신규 고객', '기존 고객' 등 제거
                    cleaned = cleaned.replace(/신규\s*고객/gi, '').trim();
                    cleaned = cleaned.replace(/기존\s*고객/gi, '').trim();
                    // 연속된 공백 정리
                    cleaned = cleaned.replace(/\s+/g, ' ').trim();
                    return cleaned || title; // 빈 문자열이면 원본 반환
                  };
                  
                  // 새로운 방문 기록 생성
                  const newVisitId = Date.now();
                  const newVisit = {
                    id: newVisitId,
                    date: dateStr, // 녹음한 날짜 (YYYY-MM-DD)
                    time: timeStr, // 녹음한 시간 (HH:mm)
                    recordedAt: recordedAt, // 녹음한 시각 (ISO 문자열: 년도, 달, 시간, 분, 초 포함)
                    serviceDate: serviceDate, // 시술/매출 날짜 (AI 파싱 또는 녹음한 날짜)
                    title: cleanTitle(resultData.title),
                    summary: resultData.sections[0]?.content[0] || cleanTitle(resultData.title),
                    rawTranscript: rawTranscript || transcript, // STT 원본 텍스트 (태그 매칭용)
                    detail: {
                      sections: resultData.sections
                    },
                    tags: (() => {
                      // selectedTagIds를 태그 label 배열로 변환
                      const selectedTagLabels = selectedTagIds
                        .map(id => {
                          const tag = allVisitTags.find(t => t.id === id);
                          return tag ? tag.label : null;
                        })
                        .filter(label => label !== null);
                      // serviceTags와 합치기 (중복 제거)
                      const allTags = [...new Set([...serviceTags, ...selectedTagLabels])];
                      return allTags;
                    })() // 방문 히스토리 카드에 표시용
                  };
                  
                  console.log('[기존 고객 저장] 저장되는 newVisit 객체:', JSON.stringify(newVisit, null, 2));
                  console.log('[기존 고객 저장] newVisit.date:', newVisit.date);
                  console.log('[기존 고객 저장] newVisit.time:', newVisit.time);
                  
                  // visits 상태 업데이트
                  setVisits(prev => ({
                    ...prev,
                    [customerId]: [newVisit, ...(prev[customerId] || [])]
                  }));
                  
                  // "신규" 키워드 감지 (resultData에서)
                  const detectNewCustomer = () => {
                    const allContent = [
                      resultData.title || '',
                      ...(resultData.sections || []).flatMap(section => 
                        (section.content || []).join(' ')
                      )
                    ].join(' ').toLowerCase();
                    
                    // "신규 고객", "신규 손님", "신규 회원" 등 감지
                    return /신규\s*(고객|손님|회원|손님)/i.test(allContent) || 
                           /신규/gi.test(allContent);
                  };
                  
                  const isNewCustomer = detectNewCustomer();
                  
                  // 고객 태그 업데이트: selectedCustomerTagIds를 카테고리별로 분류
                  const updatedCustomerTags = { ...selectedCustomerForRecord.customerTags || {
                    caution: [],
                    trait: [],
                    payment: [],
                    pattern: []
                  }};
                  
                  // selectedCustomerTagIds를 카테고리별로 분류
                  selectedCustomerTagIds.forEach(tagId => {
                    const tag = allCustomerTags.find(t => t.id === tagId);
                    if (tag) {
                      const category = tag.category;
                      if (updatedCustomerTags[category]) {
                        // 중복 제거를 위해 Set 사용
                        const existingLabels = new Set(
                          updatedCustomerTags[category].map(t => 
                            typeof t === 'string' ? t : t.label || t
                          )
                        );
                        if (!existingLabels.has(tag.label)) {
                          updatedCustomerTags[category] = [...updatedCustomerTags[category], tag.label];
                        }
                      } else {
                        updatedCustomerTags[category] = [tag.label];
                      }
                    }
                  });
                  
                  // "신규" 키워드가 감지되면 pattern에 추가 (중복 방지)
                  if (isNewCustomer) {
                    const patternTags = updatedCustomerTags.pattern || [];
                    if (!patternTags.includes('신규')) {
                      updatedCustomerTags.pattern = [...patternTags, '신규'];
                    }
                  }
                  
                  // 특정 키워드 감지하여 customerTags에 자동 추가
                  const allContent = [
                    resultData.title || '',
                    ...(resultData.sections || []).flatMap(section => 
                      (section.content || []).join(' ')
                    )
                  ].join(' ').toLowerCase();
                  
                  // "임산부" 키워드 감지
                  if (allContent.includes('임산부')) {
                    const cautionTags = updatedCustomerTags.caution || [];
                    if (!cautionTags.includes('임산부')) {
                      updatedCustomerTags.caution = [...cautionTags, '임산부'];
                    }
                  }
                  
                  // "글루알러지" 키워드 감지
                  if (allContent.includes('글루알러지') || allContent.includes('글루 알러지')) {
                    const cautionTags = updatedCustomerTags.caution || [];
                    if (!cautionTags.includes('글루알러지')) {
                      updatedCustomerTags.caution = [...cautionTags, '글루알러지'];
                    }
                  }
                  
                  // "눈물많음" 또는 "눈물 많음" 키워드 감지
                  if (allContent.includes('눈물많음') || allContent.includes('눈물 많음') || allContent.includes('눈물이 많')) {
                    const cautionTags = updatedCustomerTags.caution || [];
                    if (!cautionTags.includes('눈물많음')) {
                      updatedCustomerTags.caution = [...cautionTags, '눈물많음'];
                    }
                  }
                  
                  // 고객의 방문 횟수 및 customerTags 업데이트
                  setCustomers(prev => prev.map(c => {
                    if (c.id === customerId) {
                      return { 
                        ...c, 
                        visitCount: c.visitCount + 1, 
                        lastVisit: dateStr,
                        customerTags: updatedCustomerTags
                      };
                    }
                    return c;
                  }));
                  
                  // CustomerDetail로 이동
                  setSelectedCustomerId(customerId);
                  setCurrentScreen('CustomerDetail');
                } else {
                  // 신규 고객인 경우 이름 필수 검증
                  if (!tempName || !tempName.trim()) {
                    alert('고객님의 이름을 입력해주세요!');
                    // 이름 입력창에 포커스 및 빨간색 강조
                    if (nameInputRef.current) {
                      nameInputRef.current.focus();
                      nameInputRef.current.style.borderColor = '#EF4444';
                      nameInputRef.current.style.borderWidth = '2px';
                      setTimeout(() => {
                        if (nameInputRef.current) {
                          nameInputRef.current.style.borderColor = '';
                          nameInputRef.current.style.borderWidth = '';
                        }
                      }, 2000);
                    }
                    return;
                  }
                  
                  // 신규 고객인 경우 전화번호 필수 검증
                  if (!tempPhone || !tempPhone.trim()) {
                    alert('고객님의 전화번호를 입력해주세요!');
                    // 전화번호 입력창에 포커스 및 빨간색 강조
                    if (phoneInputRef.current) {
                      phoneInputRef.current.focus();
                      phoneInputRef.current.style.borderColor = '#EF4444';
                      phoneInputRef.current.style.borderWidth = '2px';
                      setTimeout(() => {
                        if (phoneInputRef.current) {
                          phoneInputRef.current.style.borderColor = '';
                          phoneInputRef.current.style.borderWidth = '';
                        }
                      }, 2000);
                    }
                    return;
                  }
                  
                  // 신규 고객 생성 및 기록 저장
                  const today = new Date();
                  // 녹음 기록을 년도, 달, 시간, 분으로 저장
                  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                  const timeStr = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
                  const recordedAt = today.toISOString(); // 녹음한 시각을 ISO 문자열로 저장 (년도, 달, 시간, 분, 초 포함)
                  
                  // serviceDate 추출 시도 (AI 결과에서 시술 날짜 파싱)
                  const parsedServiceDate = extractServiceDateFromSummary(resultData);
                  const serviceDate = parsedServiceDate || dateStr; // 파싱된 날짜가 있으면 사용, 없으면 녹음한 날짜
                  
                  console.log('[신규 고객 저장] 파싱된 serviceDate:', parsedServiceDate);
                  console.log('[신규 고객 저장] 최종 serviceDate:', serviceDate);
                  console.log('[신규 고객 저장] 녹음한 날짜 (date):', dateStr);
                  console.log('[신규 고객 저장] 녹음한 시간 (time):', timeStr);
                  console.log('[신규 고객 저장] 녹음한 시각 (recordedAt):', recordedAt);
                  
                  // 새로운 고객 ID 생성 (기존 최대 ID + 1)
                  const newCustomerId = Math.max(...customers.map(c => c.id), 0) + 1;
                  
                  // "신규" 키워드 감지 (resultData에서)
                  const detectNewCustomer = () => {
                    const allContent = [
                      resultData.title || '',
                      ...(resultData.sections || []).flatMap(section => 
                        (section.content || []).join(' ')
                      )
                    ].join(' ').toLowerCase();
                    
                    // "신규 고객", "신규 손님", "신규 회원" 등 감지
                    return /신규\s*(고객|손님|회원|손님)/i.test(allContent) || 
                           /신규/gi.test(allContent);
                  };
                  
                  const isNewCustomer = detectNewCustomer();
                  
                  // 신규 고객 태그 업데이트: selectedCustomerTagIds를 카테고리별로 분류
                  const newCustomerTags = {
                    caution: [],
                    trait: [],
                    payment: [],
                    pattern: []
                  };
                  
                  // selectedCustomerTagIds를 카테고리별로 분류
                  selectedCustomerTagIds.forEach(tagId => {
                    const tag = allCustomerTags.find(t => t.id === tagId);
                    if (tag) {
                      const category = tag.category;
                      if (newCustomerTags[category]) {
                        newCustomerTags[category] = [...newCustomerTags[category], tag.label];
                      } else {
                        newCustomerTags[category] = [tag.label];
                      }
                    }
                  });
                  
                  // "신규" 키워드가 감지되면 pattern에 추가
                  if (isNewCustomer) {
                    if (!newCustomerTags.pattern.includes('신규')) {
                      newCustomerTags.pattern = [...newCustomerTags.pattern, '신규'];
                    }
                  }
                  
                  // 특정 키워드 감지하여 customerTags에 자동 추가
                  const allContent = [
                    resultData.title || '',
                    ...(resultData.sections || []).flatMap(section => 
                      (section.content || []).join(' ')
                    )
                  ].join(' ').toLowerCase();
                  
                  // "임산부" 키워드 감지
                  if (allContent.includes('임산부')) {
                    if (!newCustomerTags.caution.includes('임산부')) {
                      newCustomerTags.caution = [...newCustomerTags.caution, '임산부'];
                    }
                  }
                  
                  // "글루알러지" 키워드 감지
                  if (allContent.includes('글루알러지') || allContent.includes('글루 알러지')) {
                    if (!newCustomerTags.caution.includes('글루알러지')) {
                      newCustomerTags.caution = [...newCustomerTags.caution, '글루알러지'];
                    }
                  }
                  
                  // "눈물많음" 또는 "눈물 많음" 키워드 감지
                  if (allContent.includes('눈물많음') || allContent.includes('눈물 많음') || allContent.includes('눈물이 많')) {
                    if (!newCustomerTags.caution.includes('눈물많음')) {
                      newCustomerTags.caution = [...newCustomerTags.caution, '눈물많음'];
                    }
                  }
                  
                  // 새로운 고객 생성
                  const newCustomer = {
                    id: newCustomerId,
                    name: tempName.trim(),
                    phone: tempPhone.trim(),
                    visitCount: 1,
                    lastVisit: dateStr,
                    avatar: '👤',
                    tags: [],
                    customerTags: newCustomerTags
                  };
                  
                  // title에서 고객 이름과 '신규 고객' 텍스트 제거
                  const cleanTitle = (title) => {
                    if (!title) return title;
                    let cleaned = title;
                    // 고객 이름 제거 (tempName이 있으면)
                    if (tempName) {
                      cleaned = cleaned.replace(new RegExp(tempName, 'g'), '').trim();
                    }
                    // '신규 고객', '기존 고객' 등 제거
                    cleaned = cleaned.replace(/신규\s*고객/gi, '').trim();
                    cleaned = cleaned.replace(/기존\s*고객/gi, '').trim();
                    // 연속된 공백 정리
                    cleaned = cleaned.replace(/\s+/g, ' ').trim();
                    return cleaned || title; // 빈 문자열이면 원본 반환
                  };
                  
                  // 새로운 방문 기록 생성
                  const newVisitId = Date.now();
                  const newVisit = {
                    id: newVisitId,
                    date: dateStr, // 녹음한 날짜 (YYYY-MM-DD)
                    time: timeStr, // 녹음한 시간 (HH:mm)
                    recordedAt: recordedAt, // 녹음한 시각 (ISO 문자열: 년도, 달, 시간, 분, 초 포함)
                    serviceDate: serviceDate, // 시술/매출 날짜 (AI 파싱 또는 녹음한 날짜)
                    title: cleanTitle(resultData.title),
                    summary: resultData.sections[0]?.content[0] || cleanTitle(resultData.title),
                    rawTranscript: rawTranscript || transcript, // STT 원본 텍스트 (태그 매칭용)
                    detail: {
                      sections: resultData.sections
                    },
                    tags: (() => {
                      // selectedTagIds를 태그 label 배열로 변환
                      const selectedTagLabels = selectedTagIds
                        .map(id => {
                          const tag = allVisitTags.find(t => t.id === id);
                          return tag ? tag.label : null;
                        })
                        .filter(label => label !== null);
                      // serviceTags와 합치기 (중복 제거)
                      const allTags = [...new Set([...serviceTags, ...selectedTagLabels])];
                      return allTags;
                    })() // 방문 히스토리 카드에 표시용
                  };
                  
                  console.log('[신규 고객 저장] 저장되는 newVisit 객체:', JSON.stringify(newVisit, null, 2));
                  console.log('[신규 고객 저장] newVisit.date:', newVisit.date);
                  console.log('[신규 고객 저장] newVisit.time:', newVisit.time);
                  
                  // customers와 visits 상태 업데이트
                  setCustomers(prev => [...prev, newCustomer]);
                  setVisits(prev => ({
                    ...prev,
                    [newCustomerId]: [newVisit]
                  }));
                  
                  // CustomerDetail로 이동
                  setSelectedCustomerId(newCustomerId);
                  setCurrentScreen('CustomerDetail');
                }
                
                // 저장 후 상태 초기화
                setResultData(null);
                setTranscript('');
                setRawTranscript('');
                setRecordingDate(null);
                setSelectedCustomerForRecord(null);
                setTempName('');
                setTempPhone('');
                setServiceTags([]);
                setNewServiceTag('');
              }}
              className="flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl font-medium text-white shadow-md hover:shadow-lg hover:opacity-90 transition-all"
              style={{ backgroundColor: '#C9A27A' }}
            >
              저장하기
             </button>
        </div>
        </div>
      </div>
    );
  };

  // record + customer를 합쳐서 사용하는 helper 함수
  const normalizeRecordWithCustomer = (record, customer) => {
    const filled = { ...record };

    const isEmpty = (v) =>
      v === null ||
      v === undefined ||
      v === '' ||
      v === 'null' ||
      v === '미기재' ||
      (typeof v === 'string' && v.toLowerCase() === 'null');

    if (customer) {
      if (isEmpty(filled.customerName)) {
        filled.customerName = customer.name || filled.customerName;
      }
      if (isEmpty(filled.customerPhone)) {
        filled.customerPhone = customer.phone || filled.customerPhone;
      }
    }

    return filled;
  };

  const renderCustomerDetail = () => {
    console.log('renderCustomerDetail - selectedCustomerId:', selectedCustomerId);
    console.log('renderCustomerDetail - customers 배열:', customers);
    console.log('renderCustomerDetail - id 21인 고객:', customers.find(c => c.id === 21));
    let customer = customers.find(c => c.id === selectedCustomerId);
    
    // customers 배열에 없으면 MOCK_CUSTOMERS에서 직접 찾기
    if (!customer) {
      console.log('customers 배열에 고객이 없어서 MOCK_CUSTOMERS에서 찾는 중...');
      const mockCustomer = MOCK_CUSTOMERS.find(c => c.id === selectedCustomerId);
      if (mockCustomer) {
        console.log('MOCK_CUSTOMERS에서 찾은 고객:', mockCustomer);
        customer = { 
          ...mockCustomer, 
          tags: (mockCustomer.tags || []).filter(tag => tag !== '#신규'),
          customerTags: mockCustomer.customerTags || {
            caution: [],
            trait: [],
            payment: [],
            pattern: []
          }
        };
        // customers 배열에 추가 (useEffect로 처리)
        setTimeout(() => {
          setCustomers(prev => {
            if (!prev.find(c => c.id === selectedCustomerId)) {
              return [...prev, customer];
            }
            return prev;
          });
        }, 0);
      }
    }
    
    // customerTags가 없으면 기본 구조 추가
    if (customer && !customer.customerTags) {
      customer = {
        ...customer,
        customerTags: {
          caution: [],
          trait: [],
          payment: [],
          pattern: []
        }
      };
    }
    
    const customerVisits = visits[selectedCustomerId] || [];
    
    console.log('renderCustomerDetail - 최종 찾은 고객:', customer);
    console.log('renderCustomerDetail - customer.customerTags:', customer?.customerTags);
    console.log('renderCustomerDetail - customerVisits:', customerVisits);
    console.log('renderCustomerDetail - 첫 번째 방문 tags:', customerVisits[0]?.tags);

    if (!customer) {
      return (
        <div className="flex flex-col h-full items-center justify-center" style={{ backgroundColor: '#F2F0E6' }}>
          <p style={{ color: '#232323' }}>고객 정보를 찾을 수 없습니다.</p>
          <button onClick={() => setCurrentScreen('History')} className="mt-4 font-medium" style={{ color: '#232323' }}>히스토리로 돌아가기</button>
        </div>
      );
    }

    // 더 보기 함수
    const handleLoadMoreVisits = () => {
      setVisibleVisitCount((prev) => Math.min(prev + 10, customerVisits.length));
    };

    // 접기 함수
    const handleCollapseVisits = () => {
      setVisibleVisitCount(10);
    };

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

    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: '#F2F0E6' }}>
        {/* Header */}
        <header className="bg-white px-8 py-6 sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 shadow-sm">
          <button onClick={() => setCurrentScreen('History')} className="p-2 hover:bg-gray-100 rounded-2xl transition-colors" style={{ color: '#232323' }}>
            <ArrowLeft size={24} />
          </button>
          <div className="text-center">
            <span className="text-xs font-medium" style={{ color: '#232323', opacity: 0.7 }}>고객 상세</span>
            <h2 className="font-bold text-base mt-1" style={{ color: '#232323' }}>{customer.name}</h2>
          </div>
          <button className="p-2" style={{ color: '#232323', opacity: 0.5 }}>
            <MoreHorizontal size={24} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-8 space-y-6 pb-32">
          {/* 고객 정보 카드 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 relative">
            {/* 편집 버튼 */}
            <button
              onClick={() => {
                setEditCustomerName(customer.name || '');
                setEditCustomerPhone(customer.phone || '');
                setEditCustomerTags([...(customer.tags || [])]);
                setEditCustomerMemo(customer.memo || '');
                setNewTag('');
                
                // 고객 특징 태그를 ID 배열로 변환하여 로드
                const customerTags = customer.customerTags || {};
                const tagLabels = [];
                Object.values(customerTags).forEach(categoryTags => {
                  if (Array.isArray(categoryTags)) {
                    categoryTags.forEach(tag => {
                      const label = typeof tag === 'string' ? tag : tag.label || tag;
                      tagLabels.push(label);
                    });
                  }
                });
                const tagIds = tagLabels
                  .map(label => {
                    const tag = allCustomerTags.find(t => t.label === label);
                    return tag ? tag.id : null;
                  })
                  .filter(id => id !== null);
                setEditCustomerTagIds(tagIds);
                
                setCurrentScreen('EditCustomer');
              }}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
              style={{ color: '#C9A27A' }}
              title="편집"
            >
              <Edit size={20} />
            </button>
            <div className="flex items-center gap-6 mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-2xl" style={{ color: '#232323' }}>{customer.name}</h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100" style={{ color: '#232323' }}>
                    {customer.visitCount}회방문
                  </span>
                </div>
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-3 font-light" style={{ color: '#232323' }}>
                    <Phone size={18} style={{ color: '#C9A27A' }} />
                    <span>{customer.phone}</span>
                  </div>
                </div>
                {/* customerTags 표시 (주의 태그가 맨 앞) */}
                {(() => {
                  const customerTags = customer.customerTags || {};
                  console.log('renderCustomerDetail - customerTags:', customerTags);
                  const allTags = [];
                  
                  // 주의 태그 먼저 추가
                  if (customerTags.caution && customerTags.caution.length > 0) {
                    customerTags.caution.forEach(tag => {
                      allTags.push({ tag, type: 'caution' });
                    });
                  }
                  
                  // 나머지 태그 추가
                  if (customerTags.trait && customerTags.trait.length > 0) {
                    customerTags.trait.forEach(tag => {
                      allTags.push({ tag, type: 'trait' });
                    });
                  }
                  if (customerTags.payment && customerTags.payment.length > 0) {
                    customerTags.payment.forEach(tag => {
                      allTags.push({ tag, type: 'payment' });
                    });
                  }
                  if (customerTags.pattern && customerTags.pattern.length > 0) {
                    customerTags.pattern.forEach(tag => {
                      allTags.push({ tag, type: 'pattern' });
                    });
                  }
                  
                  console.log('renderCustomerDetail - allTags:', allTags);
                  
                  if (allTags.length === 0) return null;
                  
                  return (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {allTags.map((item, idx) => {
                        const isCaution = item.type === 'caution';
                        return (
                          <span
                            key={idx}
                            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                              isCaution 
                                ? 'bg-red-50 text-red-600 border border-red-100' 
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {isCaution && <span>⚠️</span>}
                            {item.tag}
                          </span>
                        );
                      })}
                    </div>
                  );
                })()}
                {/* 메모 */}
                {customer.memo && customer.memo.trim() && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium mb-2" style={{ color: '#232323', opacity: 0.7 }}>메모</p>
                    <p className="text-sm font-light leading-relaxed" style={{ color: '#232323' }}>{customer.memo}</p>
            </div>
        )}
              </div>
            </div>
          </div>

          {/* 방문 히스토리 */}
          <div className="space-y-4 pb-24">
            <h3 className="text-base font-bold" style={{ color: '#232323' }}>방문 히스토리</h3>
            {customerVisits.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm">
                <p className="font-light text-base" style={{ color: '#232323', opacity: 0.6 }}>방문 기록이 없습니다</p>
              </div>
            ) : (
              customerVisits.slice(0, visibleVisitCount).map((visit) => {
                // record + customer를 합쳐서 사용 (customerName, customerPhone 보정)
                const normalizedVisit = normalizeRecordWithCustomer(visit, customer);
                const safeName = normalizedVisit.customerName || '미기재';
                const safePhone = normalizedVisit.customerPhone || '미기재';

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

                // 날짜/시간 정보 준비
                const serviceDateTimeLabel = extractServiceDateTimeLabel(visit);
                let dateTimeDisplay = '';
                if (serviceDateTimeLabel) {
                  // "2025-12-27 17:30 방문/예약" -> "2025.12.27 17:30"
                  const dateTimeMatch = serviceDateTimeLabel.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
                  if (dateTimeMatch) {
                    const [, year, month, day, hour, minute] = dateTimeMatch;
                    dateTimeDisplay = `${year}.${month}.${day} ${hour}:${minute}`;
                  } else {
                    // fallback: recordedAt 사용
                    const recordedAt = visit.recordedAt || visit.createdAt || (visit.date && visit.time ? `${visit.date}T${visit.time}:00` : null);
                    if (recordedAt) {
                      dateTimeDisplay = formatRecordDateTime(recordedAt);
                    }
                  }
                } else {
                  // serviceDateTimeLabel이 없으면 recordedAt 사용
                  const recordedAt = visit.recordedAt || visit.createdAt || (visit.date && visit.time ? `${visit.date}T${visit.time}:00` : null);
                  if (recordedAt) {
                    dateTimeDisplay = formatRecordDateTime(recordedAt);
                  }
                }

                // 시술 내용 요약 (고객 이름 제거)
                const cleanTitle = (title) => {
                  if (!title) return title;
                  let cleaned = title;
                  // 고객 이름 제거
                  if (safeName && safeName !== '미기재') {
                    cleaned = cleaned.replace(new RegExp(safeName, 'g'), '').trim();
                  }
                  // '기존 고객', '신규 고객' 등 제거
                  cleaned = cleaned.replace(/기존\s*고객/gi, '').trim();
                  cleaned = cleaned.replace(/신규\s*고객/gi, '').trim();
                  // 연속된 공백 정리
                  cleaned = cleaned.replace(/\s+/g, ' ').trim();
                  return cleaned || title || '';
                };

                const displayTitle = cleanTitle(visit.title || visit.subject || visit.summary || '');

                return (
                  <div key={visit.id} className="bg-white rounded-xl shadow-sm overflow-hidden relative" style={{ padding: '12px 16px' }}>
                    <div className="record-card-main flex flex-col relative">
                      {/* 맨 위줄: 날짜/시간 */}
                      {dateTimeDisplay && (
                        <div 
                          className="mb-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedVisitId(expandedVisitId === visit.id ? null : visit.id);
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <span className="text-xs font-bold text-[#C9A27A]">
                            {dateTimeDisplay}
                          </span>
                        </div>
                      )}
                      
                      {/* 두 번째 줄: 이름, 번호 */}
                      <div 
                        className="flex flex-row items-center justify-start"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedVisitId(expandedVisitId === visit.id ? null : visit.id);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* 이름 */}
                        {safeName && safeName !== '미기재' && (
                          <>
                            <span className="text-base font-bold text-[#232323]">{safeName}</span>
                            {/* 번호 */}
                            {safePhone && safePhone !== '미기재' && (
                              <span className="ml-2 text-xs text-gray-400">
                                / {safePhone}
                              </span>
                            )}
                          </>
                        )}
                        {/* 편집 버튼 */}
                        <button
                          type="button"
                          className="absolute right-8 top-0 visit-summary-edit-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            // 편집 화면으로 이동 (visit과 customer 함께 전달)
                            // "고객 기본 정보" 섹션의 첫 번째 줄을 보정된 값으로 업데이트
                            const sections = normalizedVisit.detail?.sections || [];
                            const basicInfoSectionIndex = sections.findIndex(
                              section => section.title && section.title.includes('고객 기본 정보')
                            );
                            
                            if (basicInfoSectionIndex !== -1 && sections[basicInfoSectionIndex].content.length > 0) {
                              const firstLine = `이름: ${safeName} / 전화번호: ${safePhone}`;
                              sections[basicInfoSectionIndex] = {
                                ...sections[basicInfoSectionIndex],
                                content: [
                                  firstLine,
                                  ...sections[basicInfoSectionIndex].content.slice(1)
                                ]
                              };
                            }
                            
                            const editData = {
                              title: normalizedVisit.title,
                              sections: sections
                            };
                            setTempResultData(editData);
                            setEditingVisit(normalizedVisit);
                            setEditingCustomer(customer);
                            
                            // 편집 중인 방문의 태그를 ID 배열로 변환
                            const visitTagLabels = normalizedVisit.tags || [];
                            const visitTagIds = visitTagLabels
                              .map(label => {
                                const tag = allVisitTags.find(t => t.label === label);
                                return tag ? tag.id : null;
                              })
                              .filter(id => id !== null);
                            setEditingVisitTagIds(visitTagIds);
                            
                            setCurrentScreen('Edit');
                          }}
                        >
                          <Edit size={18} />
                        </button>
                        {/* 화살표 아이콘 (우측 끝) */}
                        <button 
                          className="absolute right-0 top-0" 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedVisitId(expandedVisitId === visit.id ? null : visit.id);
                          }}
                        >
                          {expandedVisitId === visit.id ? (
                            <ChevronUp size={20} style={{ color: '#C9A27A' }} />
                          ) : (
                            <ChevronDown size={20} style={{ color: '#C9A27A' }} />
                          )}
                        </button>
                      </div>

                      {/* 태그 리스트: 이름/번호 아래, 시술 내용 위 */}
                      {visit.tags && visit.tags.length > 0 && (
                        <div className="mt-1.5 mb-1.5 max-h-[70px] overflow-hidden flex flex-wrap gap-1.5">
                          {visit.tags.map((tag, idx) => (
                            <span 
                              key={idx}
                              className="text-[11px] px-2 py-1 rounded-md"
                              style={{ 
                                backgroundColor: '#F2F0E6',
                                color: '#8C6D46'
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* 아랫줄: 시술 내용 */}
                      <div 
                        className="mt-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedVisitId(expandedVisitId === visit.id ? null : visit.id);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="text-sm text-[#232323]/80 font-medium truncate">
                          {displayTitle}
                        </div>
                      </div>
                    </div>
                    
                    {expandedVisitId === visit.id && normalizedVisit.detail && (
                      <div className="px-5 pb-5 space-y-5 border-t border-gray-200 pt-5 bg-gray-50">
                        {normalizedVisit.detail.sections.map((section, idx) => {
                          // "고객 기본 정보" 섹션의 첫 번째 줄을 보정된 값으로 표시
                          let displayContent = section.content;
                          if (section.title && section.title.includes('고객 기본 정보') && section.content.length > 0) {
                            const firstLine = section.content[0];
                            if (firstLine && firstLine.includes('이름:')) {
                              displayContent = [
                                `이름: ${safeName} / 전화번호: ${safePhone}`,
                                ...section.content.slice(1)
                              ];
                            }
                          }
                          
                          return (
                            <div key={idx}>
                              <h5 className="text-base font-bold mb-3" style={{ color: '#232323' }}>
                                {section.title}
                              </h5>
                              <ul className="space-y-2">
                                {displayContent.map((item, i) => (
                                  <li key={i} className="text-base leading-relaxed pl-4 font-light" style={{ color: '#232323', borderLeft: '2px solid #E5E7EB' }}>
                                    {overrideCustomerInfoLine(item, customer)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                        
                        {/* 기록 일시 (카드 하단) */}
                        {(() => {
                          const recordedAt = visit.recordedAt || (visit.date && visit.time ? `${visit.date}T${visit.time}:00` : null);
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
            
            {/* 이전 기록 더 보기 / 접기 버튼 */}
            {(customerVisits.length > visibleVisitCount || visibleVisitCount > 10) && (
              <div className="flex justify-center mt-4 mb-20 gap-3">
                {customerVisits.length > visibleVisitCount && (
                  <button
                    onClick={handleLoadMoreVisits}
                    className="px-4 py-2 text-sm rounded-full border border-[#C9A27A] text-[#C9A27A] bg-white/90 shadow-sm hover:bg-[#C9A27A] hover:text-white transition-colors min-w-[180px]"
                  >
                    이전 기록 10건 더 보기
                  </button>
                )}
                {visibleVisitCount > 10 && (
                  <button
                    onClick={handleCollapseVisits}
                    className="px-4 py-2 text-sm rounded-full border border-[#C9A27A] text-[#C9A27A] bg-white/90 shadow-sm hover:bg-[#C9A27A] hover:text-white transition-colors min-w-[180px]"
                  >
                    접기
                  </button>
                )}
              </div>
            )}
          </div>
      </main>

        {/* 하단 고정 버튼: 새 기록 남기기 */}
        <div className="absolute bottom-8 left-8 right-8 z-30">
          <button 
            onClick={() => {
              setSelectedCustomerForRecord(customer);
              startRecording();
            }}
            className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-medium text-white shadow-md hover:shadow-lg hover:opacity-90 transition-all"
            style={{ backgroundColor: '#C9A27A' }}
          >
            <Mic size={20} />
            <span>이 고객에 대해 새 기록 남기기</span>
        </button>
        </div>
      </div>
    );
  };

  const renderEdit = () => {
    if (!tempResultData) {
      return (
        <div className="flex flex-col h-full items-center justify-center" style={{ backgroundColor: '#F2F0E6' }}>
          <p style={{ color: '#232323' }}>편집할 데이터가 없습니다.</p>
          <button onClick={() => setCurrentScreen('Record')} className="mt-4 font-medium" style={{ color: '#232323' }}>결과 화면으로 돌아가기</button>
        </div>
      );
    }

    // 편집 중인 visit과 customer 정보로 정규화
    const normalizedVisit = editingVisit && editingCustomer 
      ? normalizeRecordWithCustomer(editingVisit, editingCustomer)
      : null;

    // 섹션 내용 업데이트 함수
    const updateSectionContent = (sectionIndex, contentIndex, newValue) => {
      setTempResultData(prev => {
        const updated = JSON.parse(JSON.stringify(prev));
        updated.sections[sectionIndex].content[contentIndex] = newValue;
        return updated;
      });
    };

    // 섹션에 새 항목 추가 함수
    const addSectionItem = (sectionIndex) => {
      setTempResultData(prev => {
        const updated = JSON.parse(JSON.stringify(prev));
        updated.sections[sectionIndex].content.push('');
        return updated;
      });
    };

    // 섹션 항목 삭제 함수
    const removeSectionItem = (sectionIndex, contentIndex) => {
      setTempResultData(prev => {
        const updated = JSON.parse(JSON.stringify(prev));
        updated.sections[sectionIndex].content.splice(contentIndex, 1);
        return updated;
      });
    };

    // 제목에서 고객 이름과 신규/기존 정보 제거 함수
    const cleanTitle = (title) => {
      if (!title) return title;
      let cleaned = title;
      
      // 편집 중인 고객 이름 제거
      if (editingCustomer?.name) {
        const customerName = editingCustomer.name;
        // 이름 패턴 제거 (앞뒤 공백 포함)
        cleaned = cleaned.replace(new RegExp(`\\s*${customerName}\\s*`, 'g'), ' ').trim();
        // "○○○ 고객" 패턴 제거
        cleaned = cleaned.replace(new RegExp(`${customerName}\\s*고객`, 'g'), '').trim();
      }
      
      // "신규 고객", "기존 고객" 패턴 제거
      cleaned = cleaned.replace(/\s*신규\s*고객\s*/gi, ' ').trim();
      cleaned = cleaned.replace(/\s*기존\s*고객\s*/gi, ' ').trim();
      cleaned = cleaned.replace(/\s*신규\s*/gi, ' ').trim();
      cleaned = cleaned.replace(/\s*기존\s*/gi, ' ').trim();
      
      // 연속된 공백 정리
      cleaned = cleaned.replace(/\s+/g, ' ').trim();
      
      return cleaned;
    };

    // 제목 업데이트 함수
    const updateTitle = (newTitle) => {
      // 입력 시에도 자동으로 정리
      const cleaned = cleanTitle(newTitle);
      setTempResultData(prev => ({
        ...prev,
        title: cleaned
      }));
    };

    // 완료 버튼 클릭 핸들러
    const handleComplete = () => {
      // 빈 항목 제거
      const cleanedData = {
        ...tempResultData,
        sections: tempResultData.sections.map(section => ({
          ...section,
          content: section.content.filter(item => item.trim() !== '')
        }))
      };
      
      // resultData 업데이트
      setResultData(cleanedData);
      
      // 편집 중인 visit이 있으면 업데이트 (customerName, customerPhone 저장)
      const currentNormalizedVisit = editingVisit && editingCustomer 
        ? normalizeRecordWithCustomer(editingVisit, editingCustomer)
        : null;
      
      if (editingVisit && editingCustomer && currentNormalizedVisit) {
        const customerId = editingCustomer.id;
        
        // 편집된 태그를 label 배열로 변환
        const editedTagLabels = editingVisitTagIds
          .map(id => {
            const tag = allVisitTags.find(t => t.id === id);
            return tag ? tag.label : null;
          })
          .filter(label => label !== null);
        
        setVisits(prev => {
          const updated = { ...prev };
          if (updated[customerId]) {
            updated[customerId] = updated[customerId].map(v => 
              v.id === editingVisit.id 
                ? { 
                    ...v, 
                    customerName: currentNormalizedVisit.customerName,
                    customerPhone: currentNormalizedVisit.customerPhone,
                    tags: editedTagLabels, // 태그 업데이트
                    detail: {
                      sections: cleanedData.sections
                    }
                  }
                : v
            );
          }
          return updated;
        });
      }
      
      setTempResultData(null);
      setEditingVisit(null);
      setEditingCustomer(null);
      setEditingVisitTagIds([]);
      
      // 결과 화면으로 복귀 (Record 화면의 result 상태)
      // 편집 화면에서 온 경우 CustomerDetail로 돌아가기
      if (editingVisit) {
        setCurrentScreen('CustomerDetail');
      } else {
        setCurrentScreen('Record');
      }
    };

    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: '#F2F0E6' }}>
        {/* Header */}
        <header className="bg-white px-8 py-6 sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 shadow-sm">
        <button 
            onClick={() => {
              setTempResultData(null);
              setEditingVisit(null);
              setEditingCustomer(null);
              setEditingVisitTagIds([]);
              // 편집 화면에서 온 경우 CustomerDetail로 돌아가기
              if (editingVisit) {
                setCurrentScreen('CustomerDetail');
              } else {
                setCurrentScreen('Record');
              }
            }} 
            className="p-2 hover:bg-gray-100 rounded-2xl transition-colors" 
            style={{ color: '#232323' }}
          >
            <ArrowLeft size={24} />
        </button>
          <h2 className="font-bold text-lg" style={{ color: '#232323' }}>편집</h2>
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
          {/* 제목 편집 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-bold mb-3" style={{ color: '#232323' }}>시술 요약</label>
            <textarea
              value={cleanTitle(tempResultData.title || '')}
              onChange={(e) => updateTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border-none resize-none focus:bg-gray-50 outline-none transition-colors"
              style={{ color: '#232323', minHeight: '60px' }}
              rows={2}
              placeholder="시술 내용만 입력하세요 (고객 이름, 신규/기존 정보는 자동으로 제거됩니다)"
            />
      </div>

          {/* 시술 태그 편집 섹션 */}
          {editingVisit && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="mb-4">
                <h4 className="text-base font-bold mb-2" style={{ color: '#232323' }}>
                  시술 태그
                </h4>
                <p className="text-sm" style={{ color: '#232323', opacity: 0.7 }}>
                  이번 방문에 적용된 시술 태그를 편집할 수 있습니다.
                </p>
    </div>

              {/* 태그 칩들 */}
              <div className="flex flex-wrap gap-2 mb-4">
                {editingVisitTagIds.length === 0 ? (
                  <p className="text-sm" style={{ color: '#232323', opacity: 0.5 }}>
                    태그가 없어요. 아래 버튼에서 추가할 수 있어요.
                  </p>
                ) : (
                  editingVisitTagIds.map((tagId) => {
                    const tag = allVisitTags.find((t) => t.id === tagId);
                    if (!tag) return null;

                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          setEditingVisitTagIds((prev) =>
                            prev.filter((id) => id !== tag.id)
                          );
                        }}
                        className="px-3 py-1.5 rounded-full text-sm font-medium transition-all bg-[#C9A27A] text-white shadow-sm hover:opacity-80 flex items-center gap-1"
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
                onClick={() => setIsEditingVisitTagPickerOpen(true)}
                className="w-full py-2.5 rounded-xl text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                + 태그 더 추가하기
              </button>
            </div>
          )}

          {/* 섹션 편집 */}
          {tempResultData.sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h4 className="text-base font-bold mb-4" style={{ color: '#232323' }}>
                  {section.title}
                </h4>
                <div className="space-y-3">
                  {section.content.map((item, contentIndex) => {
                    const isCustomerBasicInfo = section.title && section.title.includes('고객 기본 정보');
                    const isVisitInfo = section.title && (
                      section.title.includes('방문·예약 정보') ||
                      section.title.includes('방문예약 정보')
                    );
                    const isProtectedSection = isCustomerBasicInfo || isVisitInfo;
                    
                    // 보호된 섹션에서 기본 항목 이후에 추가된 항목만 삭제 버튼 표시
                    let showDeleteButton = false;
                    if (isProtectedSection) {
                      if (isCustomerBasicInfo) {
                        // 고객 기본 정보: 처음 3개 항목은 삭제 불가, 4번째부터 삭제 가능
                        showDeleteButton = contentIndex >= 3;
                      } else if (isVisitInfo) {
                        // 방문·예약 정보: 처음 1개 항목은 삭제 불가, 2번째부터 삭제 가능
                        showDeleteButton = contentIndex >= 1;
                      }
                    } else {
                      // 보호되지 않은 섹션: 항목이 2개 이상이면 삭제 버튼 표시
                      showDeleteButton = section.content.length > 1;
                    }

  return (
                      <div key={contentIndex} className="flex gap-2 relative">
                        <textarea
                          value={item}
                          onChange={(e) => updateSectionContent(sectionIndex, contentIndex, e.target.value)}
                          className="flex-1 px-4 py-3 rounded-2xl border-none resize-none focus:bg-gray-50 outline-none transition-colors"
                          style={{ color: '#232323', minHeight: '60px', paddingRight: showDeleteButton ? '50px' : '16px' }}
                          rows={Math.max(2, Math.ceil(item.length / 40))}
                          placeholder="내용을 입력하세요..."
                        />
                        {showDeleteButton && (
                          <button
                            onClick={() => removeSectionItem(sectionIndex, contentIndex)}
                            className="absolute top-2 right-2 bg-red-100 text-red-500 p-1.5 rounded-full hover:bg-red-200 transition-colors flex items-center justify-center z-10"
                            title="삭제"
                          >
                            <Minus size={16} />
                          </button>
                        )}
      </div>
  );
                  })}
                </div>
                <button
                  onClick={() => addSectionItem(sectionIndex)}
                  className="w-full py-3 rounded-2xl text-sm font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
                  style={{ color: '#232323' }}
                >
                  + 항목 추가
                </button>
              </div>
          ))}
          
          {/* 전체 삭제 버튼 (editingVisit이 있을 때만 표시, 스크롤 끝에만 표시) */}
          {editingVisit && editingCustomer && (
            <div className="flex justify-center p-6 mt-5">
              <button 
                onClick={() => {
                  if (window.confirm('이 방문 기록을 삭제하시겠습니까?\n삭제된 기록은 복구할 수 없습니다.')) {
                    const customerId = editingCustomer.id;
                    const visitId = editingVisit.id;
                    
                    // 방문 기록 삭제 및 고객 방문 횟수 업데이트
                    setVisits(prev => {
                      const updated = { ...prev };
                      if (updated[customerId]) {
                        const remainingVisits = updated[customerId].filter(v => v.id !== visitId);
                        updated[customerId] = remainingVisits.length > 0 ? remainingVisits : [];
                        
                        // 고객의 방문 횟수 업데이트
                        setCustomers(prevCustomers => prevCustomers.map(c => {
                          if (c.id === customerId) {
                            return {
                              ...c,
                              visitCount: remainingVisits.length,
                              lastVisit: remainingVisits.length > 0 
                                ? remainingVisits[0].date 
                                : null
                            };
                          }
                          return c;
                        }));
                      }
                      return updated;
                    });
                    
                    // 상태 초기화
                    setTempResultData(null);
                    setEditingVisit(null);
                    setEditingCustomer(null);
                    setEditingVisitTagIds([]);
                    
                    // CustomerDetail 화면으로 돌아가기
                    setSelectedCustomerId(customerId);
                    setCurrentScreen('CustomerDetail');
                  }
                }}
                className="px-6 py-2.5 rounded-xl text-sm font-medium text-white shadow-sm hover:shadow-md hover:opacity-90 transition-all"
                style={{ backgroundColor: '#EF4444' }}
              >
                전체 삭제
              </button>
            </div>
          )}
        </main>

        {/* 방문 편집용 태그 선택 모달 */}
        {isEditingVisitTagPickerOpen && (
          <TagPickerModal
            allVisitTags={allVisitTags}
            selectedTagIds={editingVisitTagIds}
            onClose={() => setIsEditingVisitTagPickerOpen(false)}
            onChangeSelected={(nextSelected) => setEditingVisitTagIds(nextSelected)}
          />
        )}
    </div>
    );
  };

  const renderEditCustomer = () => {
    const handleComplete = () => {
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

  // 알림 설정 상태
  const [notificationEnabled, setNotificationEnabled] = useState(true);

  const renderProfile = () => {

    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: '#F2F0E6' }}>
        {/* 헤더 */}
        <header className="bg-white px-8 py-6 sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 shadow-sm">
          <button 
            onClick={() => setCurrentScreen('Home')} 
            className="p-2 hover:bg-gray-100 rounded-2xl transition-colors" 
            style={{ color: '#232323' }}
          >
            <ArrowLeft size={24} />
          </button>
          <h2 className="font-bold text-base" style={{ color: '#232323' }}>프로필</h2>
          <div className="w-10"></div> {/* 오른쪽 공간 맞추기 */}
        </header>

        {/* 내용 영역 */}
        <main className="flex-1 overflow-y-auto p-8 space-y-4 pb-32">
          {/* 프로필 카드 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 relative">
            <button
              onClick={() => {
                // TODO: 프로필 편집 기능 구현
                alert('준비 중입니다.');
              }}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-xl transition-colors"
              style={{ color: '#C9A27A' }}
            >
              <Edit size={20} />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#C9A27A] to-[#B8946A] flex items-center justify-center text-2xl shadow-sm">
                👩‍⚕️
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1" style={{ color: '#232323' }}>
                  김말로 원장님
                </h3>
                <p className="text-sm font-light" style={{ color: '#232323', opacity: 0.7 }}>
                  mallo@beauty.com
                </p>
              </div>
            </div>
          </div>

          {/* 메뉴 리스트 */}
          <div className="space-y-2">
            {/* 내 샵 정보 */}
            <button
              onClick={() => {
                // TODO: 샵 정보 화면 구현
                alert('준비 중입니다.');
              }}
              className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F2F0E6] flex items-center justify-center">
                  <span className="text-xl">🏠</span>
                </div>
                <span className="text-sm font-medium" style={{ color: '#232323' }}>내 샵 정보</span>
              </div>
              <ChevronRight size={18} style={{ color: '#A7A196' }} />
            </button>

            {/* 시술 태그/키워드 관리 */}
            <button
              onClick={() => {
                setCurrentScreen('TagSettings');
              }}
              className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F2F0E6] flex items-center justify-center">
                  <span className="text-xl font-bold" style={{ color: '#C9A27A' }}>#</span>
                </div>
                <span className="text-sm font-medium" style={{ color: '#232323' }}>시술 태그/키워드 관리</span>
              </div>
              <ChevronRight size={18} style={{ color: '#A7A196' }} />
            </button>

            {/* 알림 설정 */}
            <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F2F0E6] flex items-center justify-center">
                  <span className="text-xl">🔔</span>
                </div>
                <span className="text-sm font-medium" style={{ color: '#232323' }}>알림 설정</span>
              </div>
              <button
                onClick={() => setNotificationEnabled(!notificationEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  notificationEnabled ? 'bg-[#C9A27A]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    notificationEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* AI 태그 자동 추천 */}
            <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F2F0E6] flex items-center justify-center">
                  <span className="text-xl">🏷️</span>
                </div>
                <span className="text-sm font-medium" style={{ color: '#232323' }}>AI 태그 자동 추천</span>
              </div>
              <button
                onClick={() => setIsAutoTaggingEnabled(!isAutoTaggingEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  isAutoTaggingEnabled ? 'bg-[#C9A27A]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    isAutoTaggingEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 테마 설정 */}
            <button
              onClick={() => {
                // TODO: 테마 설정 화면 구현
                alert('준비 중입니다.');
              }}
              className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F2F0E6] flex items-center justify-center">
                  <span className="text-xl">🎨</span>
                </div>
                <div className="flex-1 text-left">
                  <span className="text-sm font-medium" style={{ color: '#232323' }}>테마 설정</span>
                  <p className="text-xs mt-0.5" style={{ color: '#8B8574' }}>현재: 웜톤</p>
                </div>
              </div>
              <ChevronRight size={18} style={{ color: '#A7A196' }} />
            </button>

            {/* 도움말 / 문의하기 */}
            <button
              onClick={() => {
                alert('준비 중입니다.');
              }}
              className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F2F0E6] flex items-center justify-center">
                  <span className="text-xl">❓</span>
                </div>
                <span className="text-sm font-medium" style={{ color: '#232323' }}>도움말 / 문의하기</span>
              </div>
              <ChevronRight size={18} style={{ color: '#A7A196' }} />
            </button>

            {/* 로그아웃 */}
            <button
              onClick={() => {
                // TODO: 로그아웃 기능 구현
                alert('준비 중입니다.');
              }}
              className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors mt-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FEF2F0] flex items-center justify-center">
                  <span className="text-xl">🚪</span>
                </div>
                <span className="text-sm font-medium" style={{ color: '#D25B4B' }}>로그아웃</span>
              </div>
              <ChevronRight size={18} style={{ color: '#A7A196' }} />
            </button>
          </div>
        </main>
      </div>
    );
  };

  const renderTagSettings = () => {
    // 대분류 탭 정보
    const mainTabs = {
      visit: { label: '🧴 시술 태그 관리', icon: '🧴' },
      customer: { label: '👤 고객 특징 관리', icon: '👤' }
    };

    // 소분류 탭 정보
    const visitSubTabs = {
      procedure: { label: '시술', placeholder: '시술 태그 입력…' },
      design: { label: '디자인', placeholder: '디자인 태그 입력…' },
      care: { label: '케어', placeholder: '케어 태그 입력…' }
    };

    const customerSubTabs = {
      trait: { label: '성향', placeholder: '성향 태그 입력…' },
      payment: { label: '결제·예약', placeholder: '결제·예약 태그 입력…' },
      pattern: { label: '방문패턴', placeholder: '방문패턴 태그 입력…' },
      caution: { label: '⚠️주의', placeholder: '주의 태그 입력…' }
    };

    // 현재 선택된 대분류에 따른 소분류 탭
    const currentSubTabs = tagSettingsMainTab === 'visit' ? visitSubTabs : customerSubTabs;
    
    // 현재 선택된 카테고리의 태그 목록 (문자열과 객체 모두 처리)
    const currentTags = tagSettingsMainTab === 'visit' 
      ? (visitTags[tagSettingsSubTab] || [])
      : (customerTags[tagSettingsSubTab] || []);
    
    const currentSubTab = currentSubTabs[tagSettingsSubTab];
    const isCautionTab = tagSettingsSubTab === 'caution';

    // 대분류 탭 변경 시 소분류 탭 초기화
    const handleMainTabChange = (newMainTab) => {
      setTagSettingsMainTab(newMainTab);
      // 대분류 변경 시 첫 번째 소분류로 초기화
      if (newMainTab === 'visit') {
        setTagSettingsSubTab('procedure');
      } else {
        setTagSettingsSubTab('trait');
      }
    };

    // 태그 추가 함수
    const handleAddTag = () => {
      if (newManagedTag.trim()) {
        const trimmedLabel = newManagedTag.trim().replace(/^#/, '');
        
        // 현재 카테고리의 태그 개수 확인
        const currentCategoryTags = tagSettingsMainTab === 'visit' 
          ? (visitTags[tagSettingsSubTab] || [])
          : (customerTags[tagSettingsSubTab] || []);
        
        // 최대 50개 제한 확인
        if (currentCategoryTags.length >= 50) {
          alert(`각 카테고리마다 최대 50개까지 추가할 수 있습니다.\n현재 ${currentCategoryTags.length}개의 태그가 등록되어 있습니다.`);
          return;
        }
        
        // 모든 태그를 배열로 변환하여 중복 체크
        const allTags = tagSettingsMainTab === 'visit' 
          ? convertVisitTagsToArray(visitTags)
          : convertCustomerTagsToArray(customerTags);
        
        // normalize를 사용한 중복 체크
        const normalizedNew = normalize(trimmedLabel);
        const existing = allTags.find((tag) => {
          const keys = [tag.label, ...(tag.keywords || [])];
          return keys.some((k) => normalize(k) === normalizedNew);
        });
        
        if (existing) {
          // 이미 비슷한 태그가 있는 경우
          alert(`"${trimmedLabel}"와 비슷한 태그 "${existing.label}"가 이미 등록되어 있습니다.`);
          return;
        }
        
        // 같은 카테고리 내에서 정확히 같은 label이 있는지 확인
        const hasExactMatch = currentCategoryTags.some(tag => {
          if (typeof tag === 'string') {
            return tag === trimmedLabel;
          } else if (typeof tag === 'object' && tag.label) {
            return tag.label === trimmedLabel;
          }
          return false;
        });
        
        if (hasExactMatch) {
          alert(`"${trimmedLabel}" 태그는 이미 등록되어 있습니다.`);
          return;
        }
        
        // 새 태그 객체 생성
        const newTag = {
          id: `${tagSettingsSubTab}-${Date.now()}`,
          label: trimmedLabel,
          keywords: [] // 키워드 기능 제거
        };
        
        if (tagSettingsMainTab === 'visit') {
          setVisitTags(prev => {
            const updated = {
              ...prev,
              [tagSettingsSubTab]: [...(prev[tagSettingsSubTab] || []), newTag]
            };
            console.log('[태그 추가] visitTags 업데이트:', updated);
            return updated;
          });
        } else {
          setCustomerTags(prev => {
            const updated = {
              ...prev,
              [tagSettingsSubTab]: [...(prev[tagSettingsSubTab] || []), newTag]
            };
            console.log('[태그 추가] customerTags 업데이트:', updated);
            return updated;
          });
        }
        
        setNewManagedTag('');
        console.log('[태그 추가] 태그 추가 완료:', trimmedLabel, '카테고리:', tagSettingsSubTab);
      }
    };

    // 태그 삭제 함수
    const handleDeleteTag = (tagIndex) => {
      if (tagSettingsMainTab === 'visit') {
        setVisitTags(prev => ({
          ...prev,
          [tagSettingsSubTab]: prev[tagSettingsSubTab].filter((_, i) => i !== tagIndex)
        }));
      } else {
        setCustomerTags(prev => ({
          ...prev,
          [tagSettingsSubTab]: prev[tagSettingsSubTab].filter((_, i) => i !== tagIndex)
        }));
      }
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
          <h2 className="font-bold text-base" style={{ color: '#232323' }}>시술 태그 관리</h2>
          <button
            onClick={() => setIsTagEditing(!isTagEditing)}
            className="px-4 py-2 text-sm font-medium rounded-xl transition-colors"
            style={{ 
              color: '#C9A27A',
              backgroundColor: isTagEditing ? 'rgba(201, 162, 122, 0.1)' : 'transparent'
            }}
          >
            {isTagEditing ? '완료' : '편집'}
          </button>
        </header>

        {/* 내용 영역 */}
        <main className="flex-1 overflow-y-auto p-8 space-y-6 pb-32">
          {/* 설명 텍스트 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm font-light leading-relaxed" style={{ color: '#232323', opacity: 0.7 }}>
              {tagSettingsMainTab === 'visit' ? (
                <>
                  자주 쓰는 시술 용어를 등록해두세요.<br/>
                  AI가 녹음 내용을 분석할 때, 원장님만의 태그를 쏙쏙 뽑아줍니다.
                </>
              ) : (
                <>
                  고객 특징 키워드를 등록해두면,<br/>
                  AI가 대화 속에서 정보를 캐치하여 프로필에 자동으로 정리해줍니다.
                </>
              )}
            </p>
          </div>

          {/* Level 1 탭 (대분류) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex">
              {Object.keys(mainTabs).map((mainTabKey) => {
                const isActive = tagSettingsMainTab === mainTabKey;
                return (
                  <button
                    key={mainTabKey}
                    onClick={() => handleMainTabChange(mainTabKey)}
                    className={`flex-1 px-4 py-4 text-sm font-medium transition-colors ${
                      isActive ? '' : 'hover:bg-gray-50'
                    }`}
                    style={{ 
                      color: isActive ? '#8C6D46' : 'rgba(35, 35, 35, 0.4)',
                      fontWeight: isActive ? 'bold' : 'normal',
                      backgroundColor: isActive ? 'rgba(201, 162, 122, 0.08)' : 'transparent'
                    }}
                  >
                    {mainTabs[mainTabKey].label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Level 2 탭 (소분류) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex">
              {Object.keys(currentSubTabs).map((subTabKey) => {
                const isActive = tagSettingsSubTab === subTabKey;
                const isCaution = subTabKey === 'caution';
                return (
                  <button
                    key={subTabKey}
                    onClick={() => setTagSettingsSubTab(subTabKey)}
                    className={`flex-1 px-4 py-4 text-sm font-medium transition-colors ${
                      isActive ? '' : 'hover:bg-gray-50'
                    }`}
                    style={{ 
                      color: isActive 
                        ? (isCaution ? '#DC2626' : '#8C6D46')
                        : 'rgba(35, 35, 35, 0.4)',
                      fontWeight: isActive ? 'bold' : 'normal',
                      backgroundColor: isActive 
                        ? (isCaution ? 'rgba(220, 38, 38, 0.08)' : 'rgba(201, 162, 122, 0.08)')
                        : 'transparent'
                    }}
                  >
                    {currentSubTabs[subTabKey].label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 태그 입력 영역 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-3">
            <label className="block text-sm font-medium" style={{ color: '#232323' }}>
              새 태그 추가
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newManagedTag}
                onChange={(e) => setNewManagedTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddTag();
                  }
                }}
                placeholder={currentSubTab.placeholder}
                className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:border-[#C9A27A] focus:ring-1 focus:ring-[#C9A27A] transition-all"
                style={{ color: '#232323', backgroundColor: '#FFFFFF' }}
              />
              <button
                onClick={handleAddTag}
                className="px-6 py-3 rounded-2xl font-medium text-white shadow-sm hover:shadow-md transition-all"
                style={{ backgroundColor: '#C9A27A' }}
              >
                추가
              </button>
            </div>
          </div>

          {/* 태그 클라우드 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-base font-bold mb-4" style={{ color: '#232323' }}>
              {currentSubTab.label} 태그 ({currentTags.length}개)
            </h3>
            {currentTags.length === 0 ? (
              <p className="text-sm font-light text-center py-8" style={{ color: '#232323', opacity: 0.5 }}>
                등록된 태그가 없습니다.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {currentTags.map((tag, idx) => {
                  // 문자열인 경우와 객체인 경우 모두 처리
                  const tagLabel = typeof tag === 'string' ? tag : (tag.label || tag);
                  const tagKeywords = typeof tag === 'object' && tag.keywords ? tag.keywords : [];
                  const displayLabel = tagLabel.replace(/^#/, '');
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium"
                      style={{ 
                        backgroundColor: isCautionTab ? '#FEF2F2' : '#F7F5F0',
                        color: isCautionTab ? '#DC2626' : '#4A4A4A',
                        border: isCautionTab ? '1px solid #FECACA' : 'none'
                      }}
                    >
                      {displayLabel}
                      {isTagEditing && (
                        <button
                          onClick={() => handleDeleteTag(idx)}
                          className="ml-1 hover:opacity-70 transition-opacity"
                          style={{ color: isCautionTab ? '#DC2626' : '#B8A08A' }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </main>
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

  // 에러 핸들링
  let content;
  try {
    if (currentScreen === 'Login') {
      content = renderLogin();
    } else if (currentScreen === 'Home') {
      content = renderHome();
    } else if (currentScreen === 'Record') {
      // Record 화면 내부 상태에 따라 다른 컴포넌트 렌더링
      if (recordState === 'recording') {
        content = renderRecording();
      } else if (recordState === 'processing') {
        content = renderProcessing();
      } else if (recordState === 'result') {
        content = renderResult();
      } else {
        // idle 상태일 때는 녹음 시작
        content = renderRecording();
      }
    } else if (currentScreen === 'CustomerDetail') {
      content = renderCustomerDetail();
    } else if (currentScreen === 'Edit') {
      content = renderEdit();
    } else if (currentScreen === 'EditCustomer') {
      content = renderEditCustomer();
    } else if (currentScreen === 'History') {
      content = renderHistory();
    } else if (currentScreen === 'Profile') {
      content = renderProfile();
    } else if (currentScreen === 'TagSettings') {
      content = renderTagSettings();
    } else {
      content = <div className="p-8 text-center text-red-600">알 수 없는 화면: {String(currentScreen)}</div>;
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

  // 하단 네비게이션 바 컴포넌트
  const BottomNavigation = () => {
    const tabs = [
      { id: 'Home', label: '홈', icon: Home },
      { id: 'History', label: '기록', icon: History },
      { id: 'Settings', label: '설정', icon: User },
    ];

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
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="max-w-md mx-auto h-[60px] flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className="flex flex-col items-center justify-center flex-1 h-full transition-colors"
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 2}
                  style={{
                    color: isActive ? '#C9A27A' : '#D1D5DB',
                    transition: 'all 0.2s',
                  }}
                />
                <span
                  className="text-[10px] mt-1 font-medium"
                  style={{
                    color: isActive ? '#232323' : '#D1D5DB',
                    transition: 'color 0.2s',
                  }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  };

  return (
    <div className="h-screen w-full flex items-center justify-center font-sans" style={{ backgroundColor: '#F2F0E6' }}>
      <div className="w-full max-w-md h-full sm:h-[90vh] sm:rounded-[2rem] sm:shadow-md overflow-hidden relative border-0" style={{ backgroundColor: '#F2F0E6' }}>
        {content}
        {/* 로그인, Record, CustomerDetail, Edit, EditCustomer 화면이 아닐 때만 하단 네비게이션 바 표시 */}
        {currentScreen !== 'Login' && 
         currentScreen !== 'Record' && 
         currentScreen !== 'CustomerDetail' && 
         currentScreen !== 'Edit' && 
         currentScreen !== 'EditCustomer' && 
         <BottomNavigation />}
      </div>
    </div>
  );
}