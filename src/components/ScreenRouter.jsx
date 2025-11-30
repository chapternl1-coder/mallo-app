import { SCREENS } from "../constants/screens";
import LoginScreen from "../screens/LoginScreen";
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

export default function ScreenRouter(props) {
  const { currentScreen } = props;

  // HistoryScreen에서 사용할 allRecords 계산
  const calculateAllRecords = () => {
    const { visits, customers, extractServiceDateFromSummary } = props;
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
          serviceDate: finalServiceDate || visit.serviceDate || visit.date,
          customerName: customer?.name || '알 수 없음',
          customerId: parseInt(customerId),
          customer: customer
        });
      });
    });
    return allRecords;
  };

  switch (currentScreen) {
    case SCREENS.LOGIN:
      return <LoginScreen {...props} />;
    case SCREENS.HOME:
      return <HomeScreen {...props} />;
    case SCREENS.RECORD:
      return <RecordScreen {...props} />;
    case SCREENS.HISTORY:
      return <HistoryScreen {...props} allRecords={calculateAllRecords()} />;
    case SCREENS.CUSTOMER_DETAIL:
      return <CustomerDetailScreen {...props} />;
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
      return <ReservationScreen {...props} />;
    default:
      return <HomeScreen {...props} />;
  }
}
