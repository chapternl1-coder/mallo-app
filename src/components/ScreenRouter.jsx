import { SCREENS } from "../constants/screens";
import HomeScreen from "../screens/HomeScreen";
import RecordScreen from "../screens/RecordScreen";
import HistoryScreen from "../screens/HistoryScreen";
import CustomerDetailScreen from "../screens/CustomerDetailScreen";
import EditScreen from "../screens/EditScreen";
import EditCustomerScreen from "../screens/EditCustomerScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ProfileEditScreen from "../screens/ProfileEditScreen";
import TagSettingsScreen from "../screens/TagSettingsScreen";
import ReservationScreen from "../screens/ReservationScreen";
import ContactImportScreen from "../screens/ContactImportScreen";
import TextRecordScreen from "../screens/TextRecordScreen";
import CustomerRecordScreen from "../screens/CustomerRecordScreen";
import CustomerTextRecordScreen from "../screens/CustomerTextRecordScreen";

export default function ScreenRouter(props) {
  const { currentScreen } = props;

  // HistoryScreen에서 사용할 allRecords 계산
  const calculateAllRecords = () => {
    const { visits, customers, extractServiceDateFromSummary } = props;
    const allRecords = [];
    Object.keys(visits).forEach(customerId => {
      const customerVisits = visits[customerId];
      customerVisits.forEach(visit => {
        // customerId를 숫자와 문자열 모두 처리
        // 숫자로 변환 가능하면 숫자로, 아니면 원본 문자열로 비교
        const parsedId = isNaN(Number(customerId)) ? customerId : Number(customerId);
        const customer = customers.find(c => {
          // c.id도 숫자와 문자열 모두 가능하므로 동일하게 처리
          const compareId = isNaN(Number(c.id)) ? c.id : Number(c.id);
          return compareId === parsedId || String(c.id) === String(customerId);
        });
        
        // serviceDate가 없으면 detail.sections에서 파싱 시도
        let finalServiceDate = visit.serviceDate;
        if (!finalServiceDate && visit.detail && visit.detail.sections) {
          const visitData = {
            sections: visit.detail.sections
          };
          finalServiceDate = extractServiceDateFromSummary(visitData);
        }
        
        // displayName 계산 (우선순위: customer.name > visit.customerName > '이름 오류')
        let displayName = customer?.name?.trim() || visit.customerName?.trim();
        if (!displayName) {
          console.warn('[ScreenRouter] 이름이 비어 있는 방문 기록입니다. customerId:', customerId, 'visit:', visit);
          displayName = '이름 오류';
        }
        
        allRecords.push({
          ...visit,
          serviceDate: finalServiceDate || visit.serviceDate || visit.date,
          customerName: displayName,
          customerId: customerId, // 원본 customerId 그대로 사용
          customer: customer
        });
      });
    });
    return allRecords;
  };

  switch (currentScreen) {
    case SCREENS.LOGIN:
      // Auth 앞단에서 로그인은 이미 처리하므로,
      // 여기서는 홈 화면을 대신 보여준다.
      return <HomeScreen {...props} />;
    case SCREENS.HOME:
      return <HomeScreen {...props} />;
    case SCREENS.RECORD:
      return <RecordScreen {...props} />;
    case SCREENS.HISTORY:
      // visitLogs prop이 있으면 Supabase 데이터 사용, 없으면 기존 로직 사용
      return <HistoryScreen {...props} visitLogs={props.visitLogs} allRecords={props.allRecords || calculateAllRecords()} isVisitLogsLoading={props.isVisitLogsLoading} />;
    case SCREENS.CUSTOMER_DETAIL:
      // key prop으로 강제 재마운트: visitLogs가 변경되면 컴포넌트 전체 재생성
      return <CustomerDetailScreen 
        key={`customer-${props.selectedCustomerId}-${props.visitLogs?.length || 0}`} 
        {...props} 
        visitLogs={props.visitLogs} 
      />;
    case SCREENS.EDIT:
      return <EditScreen {...props} />;
    case SCREENS.EDIT_CUSTOMER:
      return <EditCustomerScreen {...props} />;
    case SCREENS.PROFILE:
      return <ProfileScreen {...props} />;
    case SCREENS.PROFILE_EDIT:
      return <ProfileEditScreen {...props} />;
    case SCREENS.TAG_SETTINGS:
      return <TagSettingsScreen {...props} />;
    case SCREENS.RESERVATION:
      return <ReservationScreen {...props} autoOpenForm={props.shouldOpenReservationForm || false} visitLogs={props.visitLogs} />;
    case SCREENS.CONTACT_IMPORT:
      return <ContactImportScreen {...props} />;
    case SCREENS.TEXT_RECORD:
      return (
        <TextRecordScreen
          reservation={props.selectedReservation || null}
          onBack={() => props.setCurrentScreen(SCREENS.HOME)}
          onSubmitTextLog={props.createVisitLogFromText}
          isSummarizing={props.isTextSummarizing || false}
        />
      );
    case SCREENS.CUSTOMER_RECORD:
      return <CustomerRecordScreen {...props} />;
    case SCREENS.CUSTOMER_TEXT_RECORD:
      return (
        <CustomerTextRecordScreen
          selectedCustomerForRecord={props.selectedCustomerForRecord || null}
          onBack={() => props.setCurrentScreen(SCREENS.CUSTOMER_DETAIL)}
          onSubmitTextLog={props.createVisitLogFromText}
          isSummarizing={props.isTextSummarizing || false}
        />
      );
    default:
      return <HomeScreen {...props} />;
  }
}
