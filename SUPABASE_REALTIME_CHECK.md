# Supabase 실시간 기능 확인 방법

## 방법 1: 브라우저 콘솔에서 확인 (가장 쉬운 방법)

1. 앱을 실행하고 브라우저 개발자 도구를 엽니다 (F12)
2. Console 탭으로 이동
3. 다음 명령어를 입력합니다:

```javascript
// 실시간 연결 상태 확인
window.supabase.realtime.connectionState()

// 실시간이 연결되어 있는지 확인
window.supabase.realtime.isConnected()
```

**결과:**
- `connectionState()`가 `"OPEN"` 또는 `"CONNECTED"`이면 정상
- `isConnected()`가 `true`이면 정상

## 방법 2: Supabase SQL Editor에서 확인

1. Supabase 대시보드 → 좌측 메뉴: **SQL Editor**
2. 다음 SQL을 실행:

```sql
-- 실시간 publication 확인
SELECT * FROM pg_publication;

-- reservations 테이블이 실시간에 포함되어 있는지 확인
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'reservations';

-- customers 테이블이 실시간에 포함되어 있는지 확인
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'customers';
```

**결과:**
- `reservations`와 `customers` 테이블이 결과에 나타나면 실시간이 활성화된 것입니다
- 결과가 비어있으면 실시간을 활성화해야 합니다

## 방법 3: 실시간 활성화 (SQL로 직접)

만약 방법 2에서 결과가 비어있다면, 다음 SQL을 실행하세요:

```sql
-- 실시간 publication에 reservations 테이블 추가
ALTER PUBLICATION supabase_realtime ADD TABLE reservations;

-- 실시간 publication에 customers 테이블 추가
ALTER PUBLICATION supabase_realtime ADD TABLE customers;
```

실행 후 앱을 새로고침하면 실시간 동기화가 작동합니다!

## 방법 4: 실제 테스트

1. **폰에서 예약 추가**
2. **PC 브라우저 콘솔 확인** - 다음 로그가 나타나야 합니다:
   ```
   [실시간 구독] reservations 변경 감지: {...}
   ```
3. **PC에서 예약이 자동으로 나타나는지 확인**

## 문제 해결

만약 실시간이 작동하지 않는다면:
- 앱을 완전히 새로고침 (Ctrl+Shift+R)
- 브라우저 캐시 삭제
- 다른 네트워크에서 테스트
- Supabase 프로젝트가 무료 플랜인 경우 실시간 제한이 있을 수 있습니다

