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











