import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Copy, Share2, Check, ChevronRight, User, Briefcase, Dumbbell, Scissors, HardHat, FileText, Settings, ArrowLeft, MoreHorizontal } from 'lucide-react';

/**
 * MALLO Service Prototype v2.1 (Fix: Tailwind ReferenceError)
 * - Removed custom <style> tags to prevent execution errors
 * - Replaced custom animations with standard Tailwind utilities (animate-pulse, etc.)
 * - Simplified dynamic classes for better compatibility
 */

// --- 0. System Prompt ---

const SYSTEM_PROMPT = `[시스템 프롬프트 - Mallo 직업별 업무 로그 요약/정리 전용]

너는 30년 경력의 비즈니스 로그/업무일지 작성 전문가다.

이 단계에서 너의 목표는 단 하나다.
1단계에서 추론된 직업/역할 정보(ROLE_JSON)를 바탕으로,
사용자의 발화 내용(TRANSCRIPT)을 실제 업무에서 바로 사용할 수 있는
"직업별 업무 로그" 형식으로 깔끔하게 정리하는 것이다.

이 단계에서는 "직업/역할을 새로 추론"하지 않는다.
직업/역할 추론은 이미 ROLE_JSON에서 끝났다고 가정한다.

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

────────────────────
[예외 처리: 업무 내용이 아닌 경우]
────────────────────

- 만약 TRANSCRIPT가 대부분 소음, 욕설, 노래 가사, 장난, 일상 잡담 등으로 이루어져 있고
  업무·고객·회원·현장·영업·과제 등의 실제 내용이 거의 없다고 판단되면,
  아래 한 줄만 출력하고, 다른 내용은 절대 작성하지 마라.

  "요약할 업무 내용이 감지되지 않았습니다."

- 이 예외 규칙이 적용되는 경우에는,
  직업/역할, 제목, 섹션 등 다른 형식을 일절 사용하지 않는다.

────────────────────
[날짜·시간 처리 공통 규칙]
────────────────────

- {TODAY}는 항상 "YYYY년 MM월 DD일 (요일)" 형식으로 주어진다고 가정한다.
  예: 2025년 11월 26일 (수)

- 사용자가 말하는 "오늘"은 항상 {TODAY}를 의미한다.
- "내일"은 {TODAY}의 다음 날, "어제"는 {TODAY}의 전날로 본다.
- "모레", "그제" 등 상대 날짜 표현은 상식적으로 명확하게 계산 가능한 경우에만
  실제 날짜로 환산하여 적되, 애매하면 굳이 날짜로 바꾸지 말고
  원래 표현(예: "모레", "다음 주 초") 그대로 남겨둔다.

- 사용자가 날짜를 말하지 않고 시간만 말한 경우
  (예: "7시에요", "저녁 7시쯤", "8시에 PT 있어요")는,
  별도 날짜 언급이 없다면 모두 {TODAY} 기준으로 해석한다.

  예:
  - "7시에 예약 손님 있어요" → {TODAY} 19:00
  - "8시에 PT 있어요" → {TODAY} 20:00

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
[중요: 정보 추가/변형 금지 규칙]
────────────────────

- 사용자가 말하지 않은 구체적인 정보(이름, 정확한 시간, 금액, 인원 수, 제품명 등)는
  절대로 새로 만들어내지 마라.
- 애매한 표현("두세 명", "네다섯 명", "7시쯤")은
  범위나 "대략"이라는 표현을 유지한 채 정리하라.
- 이름을 말하지 않은 고객/회원은 "이름 미기재" 등으로 표시하고,
  임의의 이름(예: 김OO, A고객 등)을 만들지 마라.
- 날짜/시간을 말하지 않은 예약/미팅은
  "시간 미정", "날짜 미정"처럼 처리하고,
  임의로 19:00, 내일 등으로 채우지 마라.
- 사용자가 언급하지 않은 추가 일정, 할 일, 제품/서비스는
  상상해서 넣지 마라.

────────────────────
[고객/회원 신규·기존 구분 공통 규칙]
────────────────────

"고객", "손님", "회원", "수강생", "환자" 등 사람을 상대하는 직업에서는
아래 규칙을 공통으로 적용한다.

1) "신규"로 분류해야 하는 표현 예시:
   - 신규 고객, 신규 손님, 신규 회원
   - 새로 오신 분, 처음 오신 분, 첫 방문, 첫 수업, 첫 PT, 오늘 처음 온

2) "기존"으로 분류해야 하는 표현 예시:
   - 기존 고객, 기존 회원
   - 단골 손님, 단골 고객, 재방문, 연장 회원, 원래 다니던 분, 계속 보던 회원

3) 위 표현들은 "이름"이 아니라 "구분 정보"다.
   - "오늘 신규 회원 한 분이랑 기존 회원 두 분 오셨어요"
     → 이름 칸에는 절대 "신규 회원"이라고 쓰지 않는다.

4) 발화가 특정 사람/회원 몇 명에 대해 집중되어 있다면,
   결과 로그에 아래와 같이 정리하려고 노력한다.
   - "고객/회원 구분: 신규 ○명 / 기존 ○명 (이름 미기재)"
   - 실제 이름이 나오면 이니셜이나 풀네임으로 기록한다.

5) 음성 인식 오류로 "신규손님"이 "신규선", "신규 선", "신규선님" 등으로 나와도
   문맥상 "신규 손님"이라면 신규로 인식하고 이름으로 쓰지 않는다.

────────────────────
[출력 길이 가이드]
────────────────────

- 결과는 반드시 한국어로 작성한다.
- 각 섹션별 불릿 포인트는 1~3개를 기본으로 하고,
  많아도 5개를 넘기지 마라.
- 전체 로그는 모바일 화면에서 한 번에 읽을 수 있을 정도 길이로 제한하고,
  불필요한 장문 설명은 줄여라.
- 핵심 사실, 수치, 일정, 요청 사항, 액션 아이템을 우선 기록하고
  나머지는 간단한 메모 수준으로만 남겨라.

────────────────────
[confidence에 따른 모드 선택]
────────────────────

ROLE_JSON.sector와 ROLE_JSON.confidence를 사용해
아래 두 가지 모드 중 하나로 동작하라.

1) 타깃 직업군 전문 모드:
   - 조건:
     - sector ∈ ["현장/건설", "뷰티/샵", "헬스/PT", "영업/세일즈"]
     - AND confidence >= 0.8
   - 이 경우, 너는 ROLE_JSON.role_guess에 해당하는 직업으로
     20년 이상 일한 현업 시니어 전문가라고 가정한다.
   - 해당 업계에서 실제로 쓰는 용어와 문서 구조를 최대한 반영하라.

2) 일반 업무·메모 모드:
   - 조건:
     - 위 조건에 해당하지 않는 모든 경우
     - (sector가 "교육/강의", "의료/헬스케어", "사무/지식노동", "기타"이거나,
        confidence < 0.8 인 경우)
   - 이 경우, 너는 "경험 많은 일반 비즈니스 비서"라고 가정한다.
   - 특정 업계를 단정 짓는 표현과 과도한 전문 용어 사용을 피하고,
     누구나 이해할 수 있는 일반적인 업무 메모/회의록 스타일로 정리하라.

- ROLE_JSON.confidence가 0.8 미만인 경우,
  sector와 role_guess는 "참고 정보"로만 사용하고,
  직종을 과하게 단정하는 뉘앙스는 줄여라.

────────────────────
[공통 출력 구조]
────────────────────

어떤 모드든 기본 구조는 아래를 따른다.

응답은 반드시 다음 JSON 형식으로만 출력해야 한다:

{
  "title": "제목 (한 줄 요약)",
  "sections": [
    {
      "title": "섹션 제목",
      "content": ["항목 1", "항목 2", "항목 3"]
    }
  ]
}

각 섹션 아래에는 짧은 불릿 포인트로 내용을 정리한다.
이후 sector와 모드에 따라 섹션 이름과 구성은 약간 변경해도 좋다.

────────────────────
[타깃 직업군 전문 모드 - sector별 섹션 가이드]
────────────────────

▼ 공통 규칙
- 조건:
  - sector ∈ ["현장/건설", "뷰티/샵", "헬스/PT", "영업/세일즈"]
  - AND confidence >= 0.8
- 이 조건이면 아래 sector별 섹션 구조를 우선 사용한다.

── 1) sector = "뷰티/샵" (네일/왁싱/헤어/피부관리)

권장 섹션:
- 고객 기본 정보:
  - 신규/기존, 성별/대략 연령대, 방문 목적(시술 종류)
- 방문·예약 정보:
  - 방문 일시(날짜·시간), 예약 경로, 지각/변경 여부
- 현재 상태·고객 고민:
  - 모발/피부/손톱/왁싱 부위 상태, 고객이 말한 불편/고민
- 시술·관리 상세:
  - 진행한 시술 단계, 사용 제품/약제명, 컬러/호수, 도포 시간 등
- 시술 후 상태·고객 반응:
  - 만족도, 추가 요청/수정 사항
- 주의사항·홈 케어:
  - 피해야 할 행동, 추천 홈케어/제품
- 다음 방문·추천:
  - 다음 방문 권장 주기, 다음 시술 아이디어

── 2) sector = "헬스/PT"

권장 섹션:
- 회원 기본 정보:
  - 신규/기존, 성별/대략 연령대, 목표(다이어트, 근력, 자세 교정 등)
- 오늘 세션 목표:
  - 부위(상체/하체/전신), 중점 과제(호흡, 자세 안정 등)
- 운동 수행 기록:
  - 운동별 세트/횟수/중량(kg), 워밍업/메인/마무리 구분
- 컨디션·통증:
  - 수면/식사 상태, 통증/위화감, 힘들어한 부분
- 코칭 포인트:
  - 자세 교정 포인트, 반복 교육이 필요한 부분
- 숙제·생활 습관:
  - 집에서 할 운동/스트레칭, 활동량/식습관 관련 조언
- 다음 세션 계획:
  - 다음 시간에 중점적으로 볼 부위/운동

── 3) sector = "현장/건설"

권장 섹션:
- 프로젝트/현장 개요:
  - 공사명, 위치, 오늘 로그가 해당하는 구역/공정
- 금일 공정 진행 현황:
  - 층/구역별 진행 공정과 진척도
- 금일 작업 실적(수량):
  - 작업량(㎡, m, 개수 등)과 계획 대비 실적
- 투입 인력·장비:
  - 직종별 인원, 주요 장비 사용 내역
- 자재 입·출고 및 재고:
  - 입고/반출 자재, 수량, 특이사항
- 안전·품질·민원:
  - 안전사고/근접사고, 품질 문제, 민원 발생 여부
- 익일 작업 계획:
  - 다음 작업 공정, 필요 인원/자재, 리스크 요인

── 4) sector = "영업/세일즈"

권장 섹션:
- 고객사/담당자 개요:
  - 회사명, 담당자 직책, 기존/신규 거래 여부
- 미팅/접점 개요:
  - 일시, 방식(방문/전화/화상), 목적(신규 제안/견적/클로징 등)
- 고객 니즈·Pain Point:
  - 현재 문제/불편, 해결하고 싶은 목표
- 제안 내용·조건:
  - 제안 상품/서비스, 가격/단가, 계약 조건, 옵션
- 고객 반응·경쟁사 상황:
  - 긍정/우려 포인트, 경쟁사 사용 여부/타사 제안 언급
- 우리 측 액션 아이템:
  - 자료/견적/계약서/데모 등 후속 조치, 담당자와 기한
- 고객 측 액션 아이템:
  - 내부 검토, 결재, 추가 정보 제공 등
- 다음 일정·리스크:
  - 후속 미팅/콜 예정, 딜 진행에 영향 줄 리스크

────────────────────
[일반 업무·메모 모드 섹션 가이드]
────────────────────

▼ 조건
- sector가 "교육/강의", "의료/헬스케어", "사무/지식노동", "기타"이거나
- ROLE_JSON.confidence < 0.8 인 경우

이 경우, 특정 업계 문서를 억지로 흉내 내지 말고
모든 직업에 공통으로 쓸 수 있는 일반 업무 메모 형식을 사용한다.

권장 섹션:
- 업무/프로젝트 개요:
  - 어떤 업무/프로젝트/공부에 대한 메모인지
- 배경·목적:
  - 왜 이 일을 하는지, 이번 메모의 맥락
- 주요 진행 내용·논의 사항:
  - 오늘 진행한 작업, 논의된 핵심 포인트
- 결정 사항:
  - 최종 합의된 내용, 누가 무엇을 하기로 했는지
- 미결 이슈·검토 필요 항목:
  - 아직 결정되지 않은 부분, 추가 검토 필요 사항
- 액션 아이템(To-do):
  - 담당자 - 할 일 - 목표 기한
- 일정·마일스톤:
  - 향후 주요 일정, 마감, 체크포인트
- 참고 메모·아이디어:
  - 나중에 보면 좋을 추가 메모/아이디어

────────────────────
[스타일 요약]
────────────────────

- 모든 출력은 한국어로 작성한다.
  (단, 업계에서 일반적으로 쓰는 영어 약어는 그대로 사용해도 된다. 예: PT, KPI, CRM 등)
- 말버릇, 추임새(음…, 어…, 그러니까 등), 잡담은 모두 제거한다.
- 중복되는 내용은 합쳐서 한 번만 적는다.
- 섹션 제목은 명확하게, 내용은 짧은 불릿 포인트 위주로 정리한다.
- 타깃 직업군 전문 모드에서는 해당 업계 문서 느낌을,
  일반 모드에서는 직관적이고 중립적인 업무 메모 느낌을 유지한다.

────────────────────
[중요: 출력 형식]
────────────────────

반드시 다음 JSON 형식으로만 응답해야 한다:

{
  "title": "제목",
  "sections": [
    {
      "title": "섹션 제목",
      "content": ["항목 1", "항목 2"]
    }
  ]
}

다른 형식이나 추가 설명 없이 순수 JSON만 출력하라.`;

// --- 1. Constants & Data Models ---

const SECTORS = [
  {
    id: 'beauty',
    name: '뷰티/샵',
    icon: <Scissors size={22} />,
    color: 'from-pink-500 to-rose-500',
    bg: 'bg-rose-50',
    text: 'text-rose-600',
    border: 'border-rose-200',
    ring: 'ring-rose-500',
    desc: '네일, 헤어, 왁싱, 에스테틱',
    defaultRole: '네일 & 왁싱샵 원장',
    sampleTranscript: "오늘 3시 예약하신 김민지 고객님, 신규 방문이시고요. 젤네일 제거하고 이달의 아트 3번으로 시술 들어갔어요. 손톱이 좀 얇아지셔서 강화제 서비스로 발라드렸고, 3주 뒤에 리터치 오시라고 안내했습니다. 아, 그리고 다음 주에 웨딩 촬영 있다고 하셔서 큐티클 오일 꼭 바르시라고 강조했어요.",
    mockResult: {
      title: "김민지 신규 고객 - 젤네일(이달의 아트) 및 웨딩 관리 안내",
      sections: [
        { title: "고객 기본 정보", content: ["신규 고객 (김민지)", "3시 예약 방문"] },
        { title: "시술·관리 상세", content: ["기존 젤 제거 진행", "이달의 아트 3번 시술", "손상모 우려로 강화제 서비스 도포"] },
        { title: "고객 반응/특이사항", content: ["다음 주 웨딩 촬영 예정"] },
        { title: "주의사항·홈 케어", content: ["큐티클 오일 도포 강조 (웨딩 촬영 대비)"] },
        { title: "다음 방문·추천", content: ["3주 후 리터치 권장"] }
      ]
    }
  },
  {
    id: 'pt',
    name: '헬스/PT',
    icon: <Dumbbell size={22} />,
    color: 'from-blue-500 to-indigo-500',
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    border: 'border-indigo-200',
    ring: 'ring-indigo-500',
    desc: '헬스, 필라테스, 요가, 재활',
    defaultRole: '퍼스널 트레이너',
    sampleTranscript: "오늘 저녁 7시 박철수 회원님 PT 진행했음. 하체 위주로 갔고 스쿼트 60키로 10회 3세트, 레그프레스 120키로 12회 4세트 함. 어제 야근하셔서 컨디션 좀 안 좋아 보이길래 쉬는 시간 좀 길게 가졌고, 무릎 통증은 없다고 하심. 숙제로 폼롤러 스트레칭 꼭 하고 주무시라고 함.",
    mockResult: {
      title: "박철수 회원 하체 PT - 컨디션 난조로 휴식 조절",
      sections: [
        { title: "회원 기본 정보", content: ["기존 회원 (박철수)", "19:00 세션 진행"] },
        { title: "오늘 세션 목표", content: ["하체 근력 강화"] },
        { title: "운동 수행 기록", content: ["스쿼트: 60kg / 10회 / 3세트", "레그프레스: 120kg / 12회 / 4세트"] },
        { title: "컨디션·통증", content: ["야근 여파로 컨디션 저조 (휴식 시간 조정)", "무릎 통증 없음 확인"] },
        { title: "숙제·생활 습관", content: ["취침 전 폼롤러 스트레칭 지도"] }
      ]
    }
  },
  {
    id: 'construction',
    name: '현장/건설',
    icon: <HardHat size={22} />,
    color: 'from-amber-500 to-orange-600',
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'border-orange-200',
    ring: 'ring-orange-500',
    desc: '현장 소장, 시공팀, 작업반장',
    defaultRole: '현장 소장',
    sampleTranscript: "11월 23일, A아파트 105동 주방 현장입니다. 오늘은 천장 도배 걷어내고, 전기 배선 정리까지 마무리했습니다. 콘센트 위치 두 군데 변경 요청 들어와서, 내일 오전에 전기기사 다시 들어와야 하고요. 퍼티가 많이 들어가서 자재가 부족해서, 내일 퍼티 두 박스 추가로 올려야 합니다. 내일은 전체 퍼티 1차 치고, 모서리 마감까지 보는 걸로 계획입니다.",
    mockResult: {
      title: "A아파트 105동 주방 - 도배 철거 및 전기 배선 마감",
      sections: [
        { title: "금일 공정 진행 현황", content: ["105동 주방 천장 도배 제거 완료", "전기 배선 정리 마무리"] },
        { title: "특이사항 및 이슈", content: ["콘센트 위치 2개소 변경 요청 접수", "내일 오전 전기 기사 재투입 필요"] },
        { title: "자재 입·출고 및 재고", content: ["퍼티 자재 부족 발생", "내일 퍼티 2박스 추가 양중(반입) 필요"] },
        { title: "익일 작업 계획", content: ["전체 퍼티 1차 작업", "모서리 마감 진행"] }
      ]
    }
  },
  {
    id: 'sales',
    name: '영업/세일즈',
    icon: <Briefcase size={22} />,
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-teal-50',
    text: 'text-teal-600',
    border: 'border-teal-200',
    ring: 'ring-teal-500',
    desc: 'B2B 영업, 보험, 부동산, 딜러',
    defaultRole: '영업 팀장',
    sampleTranscript: "오전에 성수동 위워크 들러서 최 대표님이랑 미팅했고요. 우리 SaaS 솔루션 도입 긍정적이신데, 가격이 조금 부담된다고 하셔서 3개월 무료 프로모션 조건 제안드렸습니다. 다음 주 월요일까지 내부 회의 거쳐서 연락 주시기로 했고, 경쟁사 A사 제품이랑 비교 중이신 것 같아요.",
    mockResult: {
      title: "성수동 위워크 최 대표 미팅 - 가격 이슈 및 프로모션 제안",
      sections: [
        { title: "고객사/담당자 개요", content: ["성수동 위워크 / 최 대표", "SaaS 솔루션 도입 검토 중"] },
        { title: "고객 니즈·Pain Point", content: ["도입 의사 있으나 가격 부담 호소", "경쟁사 A사 제품과 비교 검토 중"] },
        { title: "제안 내용·조건", content: ["3개월 무료 프로모션 적용 제안"] },
        { title: "고객 측 액션 아이템", content: ["내부 회의 후 다음 주 월요일(예상) 회신"] },
        { title: "리스크 요인", content: ["경쟁사 비교 우위 확보 필요"] }
      ]
    }
  },
  {
    id: 'general',
    name: '일반 업무',
    icon: <FileText size={22} />,
    color: 'from-gray-600 to-slate-700',
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-200',
    ring: 'ring-slate-500',
    desc: '직장인, 프리랜서, 학생, 회의록',
    defaultRole: '기획자',
    sampleTranscript: "오늘 마케팅 팀이랑 주간 회의했는데, 다음 달 이벤트 배너 디자인 시안 3개 내일까지 픽스하기로 했어. 김 대리님이 카피라이팅 좀 더 수정해오기로 했고, 나는 개발팀이랑 일정 조율해서 금요일까지 공유해줘야 해. 아, 그리고 예산 200만 원 추가 승인난 거 확인했음.",
    mockResult: {
      title: "마케팅 주간 회의 - 이벤트 배너 및 일정 조율",
      sections: [
        { title: "주요 논의 사항", content: ["다음 달 이벤트 배너 디자인 시안 검토", "예산 200만 원 추가 승인 확인"] },
        { title: "결정 사항", content: ["디자인 시안 3종 내일까지 확정"] },
        { title: "액션 아이템 (To-do)", content: ["김 대리: 카피라이팅 수정", "나: 개발팀과 일정 조율 후 금요일까지 공유"] }
      ]
    }
  }
];

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

const SectorCard = ({ sector, isSelected, onClick }) => (
  <button
    onClick={onClick}
    className={`relative w-full p-4 rounded-2xl border transition-all duration-300 text-left flex flex-col gap-3 h-32 group
      ${isSelected 
        ? `border-transparent ring-2 ring-offset-2 ${sector.ring} bg-white shadow-xl scale-[1.02]` 
        : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50 hover:shadow-md'}`}
  >
    <div className={`p-2.5 rounded-xl w-fit ${sector.bg} ${sector.text} transition-transform duration-300 group-hover:scale-110`}>
      {sector.icon}
    </div>
    <div>
      <h3 className="font-bold text-slate-800 tracking-tight">{sector.name}</h3>
      <p className="text-xs text-slate-500 mt-1 line-clamp-1 font-medium">{sector.desc}</p>
    </div>
    {isSelected && (
      <div className={`absolute top-3 right-3 w-6 h-6 rounded-full ${sector.text.replace('text', 'bg')} flex items-center justify-center animate-in zoom-in duration-200`}>
        <Check size={14} color="white" strokeWidth={3} />
      </div>
    )}
  </button>
);

const SkeletonLoader = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4 w-full animate-pulse">
    <div className="h-6 bg-slate-100 rounded w-3/4 mb-6"></div>
    {[...Array(3)].map((_, i) => (
      <div key={i} className="space-y-2">
        <div className="h-4 bg-slate-100 rounded w-1/3"></div>
        <div className="h-3 bg-slate-50 rounded w-full"></div>
        <div className="h-3 bg-slate-50 rounded w-5/6"></div>
      </div>
    ))}
  </div>
);

// --- 3. Main App ---

export default function MalloApp() {
  const [step, setStep] = useState('onboarding'); 
  const [userProfile, setUserProfile] = useState({ sectorId: null, roleTitle: '' });
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [resultData, setResultData] = useState(null);
  const [showPromptInfo, setShowPromptInfo] = useState(false);

  const timerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const currentSector = SECTORS.find(s => s.id === userProfile.sectorId) || SECTORS[0];

  const handleSectorSelect = (id) => {
    const selected = SECTORS.find(s => s.id === id);
    setUserProfile({ ...userProfile, sectorId: id, roleTitle: selected.defaultRole });
  };

  const startOnboarding = () => userProfile.sectorId && setStep('home');

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
        role_guess: userProfile.roleTitle,
        sector: sectorMap[userProfile.sectorId] || '사무/지식노동',
        confidence: 1.0,
        need_user_confirmation: false,
        reason_short: '사용자가 온보딩에서 직접 선택한 카테고리 및 역할'
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
              content: `[역할 추론 결과(JSON)]\n${JSON.stringify(roleJson, null, 2)}\n\n[원문 텍스트]\n${transcript}`
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

  // --- Screens ---

  const renderOnboarding = () => (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="px-6 pt-10 pb-4 bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">어떤 업무를 하시나요?</h1>
        <p className="text-slate-500 mt-1 text-sm font-medium">직업에 딱 맞는 AI 비서를 세팅해 드려요.</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 pb-32">
        <div className="grid grid-cols-2 gap-3 mb-8">
          {SECTORS.map(sector => (
            <SectorCard 
              key={sector.id} 
              sector={sector} 
              isSelected={userProfile.sectorId === sector.id}
              onClick={() => handleSectorSelect(sector.id)}
            />
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 w-full max-w-md bg-white/80 backdrop-blur-xl border-t border-slate-100 p-6 z-20 pb-8">
        {userProfile.sectorId ? (
          <div className="animate-in slide-in-from-bottom-4 duration-300">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              직업/역할 명칭
            </label>
            <div className="flex items-center gap-3 bg-slate-100/50 border border-slate-200 rounded-2xl px-4 py-3 mb-4 focus-within:ring-2 focus-within:ring-slate-400 focus-within:bg-white transition-all">
              <User size={18} className="text-slate-400" />
              <input 
                type="text" 
                value={userProfile.roleTitle}
                onChange={(e) => setUserProfile({...userProfile, roleTitle: e.target.value})}
                className="w-full bg-transparent outline-none text-slate-800 font-medium placeholder-slate-400"
                placeholder="예: 헤어 디자이너"
              />
            </div>
            <button 
              onClick={startOnboarding}
              className="w-full bg-slate-900 text-white font-bold text-lg py-4 rounded-2xl shadow-lg hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              Mallo 시작하기
              <ChevronRight size={20} />
            </button>
          </div>
        ) : (
          <div className="text-center text-slate-400 text-sm py-4">카테고리를 선택해주세요</div>
        )}
      </div>
    </div>
  );

  const renderHome = () => (
    <div className="flex flex-col h-full bg-white relative">
      <header className="px-6 py-5 flex justify-between items-center bg-white/80 backdrop-blur-sm z-10">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mallo AI</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <h2 className="text-lg font-bold text-slate-900">{userProfile.roleTitle}</h2>
            <div className={`w-2 h-2 rounded-full ${currentSector.text.replace('text', 'bg')}`}></div>
          </div>
        </div>
        <button onClick={() => setStep('onboarding')} className="p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors">
          <Settings size={22} />
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        {/* Decorative Background Blobs - Replaced custom animate-blob with standard animate-pulse */}
        <div className={`absolute top-1/4 -right-10 w-64 h-64 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse ${currentSector.text.replace('text', 'bg')}`}></div>
        <div className={`absolute bottom-1/4 -left-10 w-64 h-64 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse ${currentSector.text.replace('text', 'bg')}`} style={{ animationDelay: '1s' }}></div>

        <div className="z-10 mb-12 animate-in fade-in duration-700 slide-in-from-bottom-4">
          <p className="text-slate-400 font-medium mb-2 tracking-wide text-sm">{getTodayDate()}</p>
          <h1 className="text-4xl font-extrabold text-slate-900 leading-tight tracking-tight">
            오늘의 업무,<br/>
            <span className={`bg-clip-text text-transparent bg-gradient-to-r ${currentSector.color}`}>말로 기록하세요.</span>
          </h1>
        </div>

        <button 
          onClick={startRecording}
          className={`group relative w-36 h-36 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-2xl z-10`}
        >
          <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${currentSector.color} opacity-90 group-hover:opacity-100 transition-opacity`}></div>
          <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${currentSector.color} blur-md opacity-40 group-hover:opacity-60 transition-opacity`}></div>
          <Mic size={52} color="white" className="relative z-10 drop-shadow-md" />
        </button>
        <p className="mt-8 text-slate-500 font-medium text-sm animate-in fade-in duration-1000 delay-300">
          버튼을 누르고 편하게 말씀해주세요
        </p>
      </main>
      
      {/* Bottom Bar Pattern */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${currentSector.color}`}></div>
    </div>
  );

  const renderRecording = () => (
    <div className="flex flex-col h-full bg-slate-900 text-white relative items-center justify-center overflow-hidden">
      {/* Background Rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
         <div className="w-64 h-64 border border-white/5 rounded-full animate-[ping_3s_linear_infinite]"></div>
         <div className="w-96 h-96 border border-white/5 rounded-full animate-[ping_3s_linear_infinite_1s]"></div>
      </div>

      <div className="z-10 text-center mb-10">
        <h2 className="text-slate-400 text-sm font-medium tracking-widest uppercase mb-4">Recording</h2>
        <p className="text-6xl font-mono font-bold tracking-tighter tabular-nums">{formatTime(recordingTime)}</p>
      </div>

      {/* Visualizer & Button */}
      <div className="z-10 flex flex-col items-center gap-8">
        <WaveBars />
        
        <button 
          onClick={stopRecording}
          className="group relative w-20 h-20 flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl group-hover:bg-red-500/30 transition-colors"></div>
          <div className="relative w-20 h-20 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-105 group-active:scale-95 transition-all duration-200">
            <Square size={24} fill="white" className="ml-0.5" />
          </div>
        </button>
      </div>

      <div className="absolute bottom-12 w-full px-8 text-center">
        <p className="text-slate-400 text-sm leading-relaxed font-medium bg-slate-800/50 py-3 px-4 rounded-xl border border-white/5 backdrop-blur-sm">
          💡 Tip: 누가, 언제, 무엇을 했는지<br/>구체적으로 말하면 더 정확해요.
        </p>
      </div>
    </div>
  );

  const renderProcessing = () => (
    <div className="flex flex-col h-full bg-white px-6 pt-20 pb-10">
      <div className="text-center mb-10">
        <div className="inline-block p-4 rounded-full bg-blue-50 text-blue-600 mb-6 animate-bounce">
          <Briefcase size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">업무 로그 정리 중</h2>
        <p className="text-slate-500">AI가 내용을 분석하고 서식을 적용하고 있습니다.</p>
      </div>
      
      <div className="flex-1 w-full max-w-sm mx-auto space-y-4 opacity-50">
        <SkeletonLoader />
      </div>

      <div className="text-xs text-center text-slate-300 font-mono mt-auto">
        Processing transcript...<br/>
        Applying {userProfile.roleTitle} template...
      </div>
    </div>
  );

  const renderResult = () => (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md px-4 py-4 sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/60">
        <button onClick={resetFlow} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Result</span>
          <h2 className="font-bold text-slate-800 text-sm">{getTodayDate()}</h2>
        </div>
        <button className="p-2 text-slate-400 hover:text-slate-600">
          <MoreHorizontal size={24} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-8 duration-500">
          <div className={`px-6 py-6 bg-gradient-to-br ${currentSector.color} relative overflow-hidden`}>
            <div className="relative z-10">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-black/20 text-white mb-3 backdrop-blur-md border border-white/10">
                {currentSector.icon}
                <span className="ml-1.5">{userProfile.roleTitle}</span>
              </span>
              <h3 className="font-bold text-white text-xl leading-snug tracking-tight shadow-sm">{resultData.title}</h3>
            </div>
            {/* Background Pattern */}
            <div className="absolute top-[-50%] right-[-20%] w-48 h-48 bg-white opacity-10 rounded-full blur-2xl"></div>
          </div>

          <div className="p-6 space-y-6">
            {resultData.sections.map((section, idx) => (
              <div key={idx} className="animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 100}ms` }}>
                <h4 className={`text-xs font-bold mb-3 uppercase tracking-wider ${currentSector.text} flex items-center gap-2`}>
                  {section.title}
                  <div className="h-px flex-1 bg-slate-100"></div>
                </h4>
                <ul className="space-y-3">
                  {section.content.map((item, i) => (
                    <li key={i} className="text-slate-700 text-[15px] leading-relaxed pl-3 border-l-2 border-slate-100 hover:border-slate-300 transition-colors">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Transcript Toggle */}
        <details className="group bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <summary className="font-bold text-slate-600 text-sm cursor-pointer p-4 flex justify-between items-center bg-slate-50/50 hover:bg-slate-50 transition-colors select-none">
            <span>원본 녹음 내용 보기</span>
            <ChevronRight size={16} className="text-slate-400 group-open:rotate-90 transition-transform duration-200" />
          </summary>
          <div className="p-4 pt-0 text-sm text-slate-500 leading-relaxed border-t border-slate-100 bg-slate-50/30">
            <div className="pt-4">"{transcript}"</div>
          </div>
        </details>
        
        {/* Debug Toggle */}
        <div className="text-center pt-4">
             <button 
                onClick={() => setShowPromptInfo(!showPromptInfo)}
                className="text-[10px] text-slate-300 font-mono hover:text-slate-400 transition-colors"
             >
                {showPromptInfo ? 'Hide Debug Info' : 'Show Debug Info'}
             </button>
        </div>

        {showPromptInfo && (
            <div className="bg-slate-900 text-slate-400 p-5 rounded-2xl text-[10px] font-mono leading-relaxed overflow-x-auto shadow-inner">
                <p className="text-emerald-400 font-bold mb-2">// System Logic</p>
                {`ROLE_JSON = {
  "sector": "${userProfile.sectorId}",
  "role_guess": "${userProfile.roleTitle}",
  "confidence": 0.95
}
// Applied Rules:
- Mode: Professional (${userProfile.sectorId.toUpperCase()})
- Template: ${userProfile.roleTitle}`}
            </div>
        )}
      </main>

      {/* Floating Action Bar */}
      <div className="absolute bottom-6 left-6 right-6 grid grid-cols-2 gap-3 z-30">
        <button className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold shadow-lg hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98] transition-all">
          <Share2 size={18} />
          공유
        </button>
        <button 
          onClick={() => alert('클립보드에 복사되었습니다.')}
          className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r ${currentSector.color} shadow-lg hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all`}
        >
          <Copy size={18} />
          복사
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-full bg-slate-200 flex items-center justify-center font-sans">
      <div className="w-full max-w-md h-full sm:h-[90vh] bg-white sm:rounded-[2rem] sm:shadow-2xl overflow-hidden relative border-[8px] border-slate-900/5 ring-1 ring-slate-900/5">
        {step === 'onboarding' && renderOnboarding()}
        {step === 'home' && renderHome()}
        {step === 'recording' && renderRecording()}
        {step === 'processing' && renderProcessing()}
        {step === 'result' && renderResult()}
      </div>
    </div>
  );
}