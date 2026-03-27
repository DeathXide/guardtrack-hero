import React, { useState } from 'react';
import { Helmet } from "react-helmet";
import AllSitesAttendanceDashboard from '@/components/attendance/AllSitesAttendanceDashboard';
import ModernSlotBasedAttendance from '@/components/attendance/ModernSlotBasedAttendance';

const Attendance: React.FC = () => {
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  return (
    <>
      <Helmet>
        <title>Attendance Management - Security Agency</title>
        <meta name="description" content="Manage attendance and guard allocation for security sites with slot-based system" />
      </Helmet>
      {selectedSiteId ? (
        <div>
          <div className="container mx-auto p-6 pb-0">
            <button
              onClick={() => setSelectedSiteId(null)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 flex items-center gap-1"
            >
              &larr; Back to All Sites
            </button>
          </div>
          <ModernSlotBasedAttendance preselectedSiteId={selectedSiteId} />
        </div>
      ) : (
        <AllSitesAttendanceDashboard
          onViewSiteDetails={(siteId) => setSelectedSiteId(siteId)}
        />
      )}
    </>
  );
};

export default Attendance;