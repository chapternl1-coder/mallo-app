import React from 'react';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import RecordScreen from '../screens/RecordScreen';
import CustomerDetailScreen from '../screens/CustomerDetailScreen';
import EditScreen from '../screens/EditScreen';
import EditCustomerScreen from '../screens/EditCustomerScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProfileEditScreen from '../screens/ProfileEditScreen';
import TagSettingsScreen from '../screens/TagSettingsScreen';

function ScreenRouter(props) {
  // allRecords 계산 함수 (HistoryScreen에서 사용)
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
          serviceDate: finalServiceDate || visit.serviceDate || visit.date, // 파싱된 날짜 또는 기존 serviceDate 또는 date
          customerName: customer?.name || '알 수 없음',
          customerId: parseInt(customerId),
          customer: customer // 고객 정보 전체를 포함
        });
      });
    });
    return allRecords;
  };

  // 에러 핸들링
  let content;
  try {
    if (props.currentScreen === 'Login') {
      content = (
        <LoginScreen
          email={props.email}
          setEmail={props.setEmail}
          password={props.password}
          setPassword={props.setPassword}
          setIsLoggedIn={props.setIsLoggedIn}
          setActiveTab={props.setActiveTab}
          setCurrentScreen={props.setCurrentScreen}
        />
      );
    } else if (props.currentScreen === 'Home') {
      content = (
        <HomeScreen
          currentScreen={props.currentScreen}
          setCurrentScreen={props.setCurrentScreen}
          setActiveTab={props.setActiveTab}
          customers={props.customers}
          searchQuery={props.searchQuery}
          setSearchQuery={props.setSearchQuery}
          setSelectedCustomerId={props.setSelectedCustomerId}
          selectedCustomerForRecord={props.selectedCustomerForRecord}
          setSelectedCustomerForRecord={props.setSelectedCustomerForRecord}
          startRecording={props.startRecording}
        />
      );
    } else if (props.currentScreen === 'Record') {
      content = (
        <RecordScreen
          recordState={props.recordState}
          recordingTime={props.recordingTime}
          formatTime={props.formatTime}
          stopRecording={props.stopRecording}
          cancelRecording={props.cancelRecording}
          resultData={props.resultData}
          resetFlow={props.resetFlow}
          getTodayDate={props.getTodayDate}
          selectedCustomerForRecord={props.selectedCustomerForRecord}
          tempName={props.tempName}
          setTempName={props.setTempName}
          tempPhone={props.tempPhone}
          setTempPhone={props.setTempPhone}
          nameInputRef={props.nameInputRef}
          phoneInputRef={props.phoneInputRef}
          handlePhoneChange={props.handlePhoneChange}
          currentSector={props.currentSector}
          userProfile={props.userProfile}
          DEV_MODE={props.DEV_MODE}
          testSummaryInput={props.testSummaryInput}
          setTestSummaryInput={props.setTestSummaryInput}
          isTestingSummary={props.isTestingSummary}
          handleTestSummarize={props.handleTestSummarize}
          recommendedTagIds={props.recommendedTagIds}
          setRecommendedTagIds={props.setRecommendedTagIds}
          selectedTagIds={props.selectedTagIds}
          setSelectedTagIds={props.setSelectedTagIds}
          allVisitTags={props.allVisitTags}
          isAutoTaggingEnabled={props.isAutoTaggingEnabled}
          setIsTagPickerOpen={props.setIsTagPickerOpen}
          isTagPickerOpen={props.isTagPickerOpen}
          selectedCustomerTagIds={props.selectedCustomerTagIds}
          setSelectedCustomerTagIds={props.setSelectedCustomerTagIds}
          newCustomerTagIds={props.newCustomerTagIds}
          setNewCustomerTagIds={props.setNewCustomerTagIds}
          allCustomerTags={props.allCustomerTags}
          setIsCustomerTagPickerOpen={props.setIsCustomerTagPickerOpen}
          isCustomerTagPickerOpen={props.isCustomerTagPickerOpen}
          transcript={props.transcript}
          recordingDate={props.recordingDate}
          formatRecordingDate={props.formatRecordingDate}
          setTempResultData={props.setTempResultData}
          setCurrentScreen={props.setCurrentScreen}
          extractServiceDateFromSummary={props.extractServiceDateFromSummary}
          customers={props.customers}
          setCustomers={props.setCustomers}
          visits={props.visits}
          setVisits={props.setVisits}
          setSelectedCustomerId={props.setSelectedCustomerId}
          serviceTags={props.serviceTags}
          setServiceTags={props.setServiceTags}
          rawTranscript={props.rawTranscript}
          TagPickerModal={props.TagPickerModal}
          CustomerTagPickerModal={props.CustomerTagPickerModal}
          setResultData={props.setResultData}
          setTranscript={props.setTranscript}
          setRawTranscript={props.setRawTranscript}
          setRecordingDate={props.setRecordingDate}
          setSelectedCustomerForRecord={props.setSelectedCustomerForRecord}
        />
      );
    } else if (props.currentScreen === 'CustomerDetail') {
      content = (
        <CustomerDetailScreen
          currentScreen={props.currentScreen}
          setCurrentScreen={props.setCurrentScreen}
          selectedCustomerId={props.selectedCustomerId}
          customers={props.customers}
          setCustomers={props.setCustomers}
          visits={props.visits}
          visibleVisitCount={props.visibleVisitCount}
          setVisibleVisitCount={props.setVisibleVisitCount}
          expandedVisitId={props.expandedVisitId}
          setExpandedVisitId={props.setExpandedVisitId}
          setEditCustomerName={props.setEditCustomerName}
          setEditCustomerPhone={props.setEditCustomerPhone}
          setEditCustomerTags={props.setEditCustomerTags}
          setEditCustomerMemo={props.setEditCustomerMemo}
          setNewTag={props.setNewTag}
          setEditCustomerTagIds={props.setEditCustomerTagIds}
          allCustomerTags={props.allCustomerTags}
          allVisitTags={props.allVisitTags}
          extractServiceDateTimeLabel={props.extractServiceDateTimeLabel}
          normalizeRecordWithCustomer={props.normalizeRecordWithCustomer}
          setTempResultData={props.setTempResultData}
          setEditingVisit={props.setEditingVisit}
          setEditingCustomer={props.setEditingCustomer}
          setEditingVisitTagIds={props.setEditingVisitTagIds}
          setSelectedCustomerForRecord={props.setSelectedCustomerForRecord}
          startRecording={props.startRecording}
          MOCK_CUSTOMERS={props.MOCK_CUSTOMERS}
        />
      );
    } else if (props.currentScreen === 'Edit') {
      content = (
        <EditScreen
          tempResultData={props.tempResultData}
          setTempResultData={props.setTempResultData}
          editingVisit={props.editingVisit}
          setEditingVisit={props.setEditingVisit}
          editingCustomer={props.editingCustomer}
          setEditingCustomer={props.setEditingCustomer}
          editingVisitTagIds={props.editingVisitTagIds}
          setEditingVisitTagIds={props.setEditingVisitTagIds}
          allVisitTags={props.allVisitTags}
          normalizeRecordWithCustomer={props.normalizeRecordWithCustomer}
          setResultData={props.setResultData}
          setVisits={props.setVisits}
          setCustomers={props.setCustomers}
          setCurrentScreen={props.setCurrentScreen}
          setSelectedCustomerId={props.setSelectedCustomerId}
          isEditingVisitTagPickerOpen={props.isEditingVisitTagPickerOpen}
          setIsEditingVisitTagPickerOpen={props.setIsEditingVisitTagPickerOpen}
          TagPickerModal={props.TagPickerModal}
        />
      );
    } else if (props.currentScreen === 'EditCustomer') {
      content = (
        <EditCustomerScreen
          editCustomerName={props.editCustomerName}
          setEditCustomerName={props.setEditCustomerName}
          editCustomerPhone={props.editCustomerPhone}
          setEditCustomerPhone={props.setEditCustomerPhone}
          editCustomerTags={props.editCustomerTags}
          setEditCustomerTags={props.setEditCustomerTags}
          editCustomerTagIds={props.editCustomerTagIds}
          setEditCustomerTagIds={props.setEditCustomerTagIds}
          editCustomerMemo={props.editCustomerMemo}
          setEditCustomerMemo={props.setEditCustomerMemo}
          newTag={props.newTag}
          setNewTag={props.setNewTag}
          selectedCustomerId={props.selectedCustomerId}
          allCustomerTags={props.allCustomerTags}
          isEditCustomerTagPickerOpen={props.isEditCustomerTagPickerOpen}
          setIsEditCustomerTagPickerOpen={props.setIsEditCustomerTagPickerOpen}
          CustomerTagPickerModal={props.CustomerTagPickerModal}
          setCustomers={props.setCustomers}
          setVisits={props.setVisits}
          setCurrentScreen={props.setCurrentScreen}
          setSelectedCustomerId={props.setSelectedCustomerId}
          saveToLocalStorage={props.saveToLocalStorage}
        />
      );
    } else if (props.currentScreen === 'History') {
      // allRecords 계산
      const allRecords = calculateAllRecords();
      
      content = (
        <HistoryScreen
          allRecords={allRecords}
          selectedDate={props.selectedDate}
          setSelectedDate={props.setSelectedDate}
          currentTheme={props.currentTheme}
          setCurrentScreen={props.setCurrentScreen}
          setSelectedCustomerId={props.setSelectedCustomerId}
          setEditingVisit={props.setEditingVisit}
          setEditingCustomer={props.setEditingCustomer}
          // 추가로 필요한 props들
          customers={props.customers}
          getTodayDateString={props.getTodayDateString}
          extractServiceDateFromSummary={props.extractServiceDateFromSummary}
          extractServiceDateTimeLabel={props.extractServiceDateTimeLabel}
          formatRecordDateTime={props.formatRecordDateTime}
          setActiveTab={props.setActiveTab}
          expandedHistoryIds={props.expandedHistoryIds}
          setExpandedHistoryIds={props.setExpandedHistoryIds}
        />
      );
    } else if (props.currentScreen === 'Profile') {
      content = (
        <ProfileScreen
          currentScreen={props.currentScreen}
          setCurrentScreen={props.setCurrentScreen}
          userProfile={props.userProfile}
          setUserProfile={props.setUserProfile}
          notificationEnabled={props.notificationEnabled}
          setNotificationEnabled={props.setNotificationEnabled}
          isAutoTaggingEnabled={props.isAutoTaggingEnabled}
          setIsAutoTaggingEnabled={props.setIsAutoTaggingEnabled}
          editProfileName={props.editProfileName}
          setEditProfileName={props.setEditProfileName}
          editProfileEmail={props.editProfileEmail}
          setEditProfileEmail={props.setEditProfileEmail}
          editProfilePhone={props.editProfilePhone}
          setEditProfilePhone={props.setEditProfilePhone}
        />
      );
    } else if (props.currentScreen === 'profile-edit') {
      content = (
        <ProfileEditScreen
          editProfileName={props.editProfileName}
          setEditProfileName={props.setEditProfileName}
          editProfileEmail={props.editProfileEmail}
          setEditProfileEmail={props.setEditProfileEmail}
          editProfilePhone={props.editProfilePhone}
          setEditProfilePhone={props.setEditProfilePhone}
          setUserProfile={props.setUserProfile}
          setCurrentScreen={props.setCurrentScreen}
        />
      );
    } else if (props.currentScreen === 'TagSettings') {
      content = (
        <TagSettingsScreen
          currentScreen={props.currentScreen}
          setCurrentScreen={props.setCurrentScreen}
          visitTags={props.visitTags}
          setVisitTags={props.setVisitTags}
          customerTags={props.customerTags}
          setCustomerTags={props.setCustomerTags}
          tagSettingsMainTab={props.tagSettingsMainTab}
          setTagSettingsMainTab={props.setTagSettingsMainTab}
          tagSettingsSubTab={props.tagSettingsSubTab}
          setTagSettingsSubTab={props.setTagSettingsSubTab}
          newManagedTag={props.newManagedTag}
          setNewManagedTag={props.setNewManagedTag}
          isTagEditing={props.isTagEditing}
          setIsTagEditing={props.setIsTagEditing}
        />
      );
    } else {
      content = <div className="p-8 text-center text-red-600">알 수 없는 화면: {String(props.currentScreen)}</div>;
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

  return content;
}

export default ScreenRouter;

