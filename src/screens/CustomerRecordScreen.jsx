// 고객 상세에서 사용하는 음성 녹음 화면
// RecordScreen과 동일한 구조이지만 고객 상세 전용으로 분리
import RecordScreen from './RecordScreen';

// CustomerRecordScreen은 RecordScreen을 그대로 사용하되,
// 나중에 고객 상세 전용 로직을 추가할 수 있도록 별도 화면으로 분리
export default function CustomerRecordScreen(props) {
  return <RecordScreen {...props} />;
}

