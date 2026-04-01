import React, { useState } from 'react';
import { Helmet } from "react-helmet";
import AllSitesAttendanceDashboard from '@/components/attendance/AllSitesAttendanceDashboard';
import ModernSlotBasedAttendance from '@/components/attendance/ModernSlotBasedAttendance';

const Attendance: React.FC = () => {
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [sharedDate, setSharedDate] = useState<Date>(new Date());

  return (
    <>
      <Helmet>
        <title>Attendance Management - Security Agency</title>
        <meta name="description" content="Manage attendance and guard allocation for security sites with slot-based system" />
      </Helmet>
      {selectedSiteId ? (
        <ModernSlotBasedAttendance
          preselectedSiteId={selectedSiteId}
          initialDate={sharedDate}
          onBack={() => setSelectedSiteId(null)}
          onDateChange={setSharedDate}
        />
      ) : (
        <AllSitesAttendanceDashboard
          onViewSiteDetails={(siteId) => setSelectedSiteId(siteId)}
          selectedDate={sharedDate}
          onDateChange={setSharedDate}
        />
      )}
    </>
  );
};

export default Attendance;
