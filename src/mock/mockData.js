export const MOCK_CUSTOMERS = [
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

export const MOCK_VISITS = {
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