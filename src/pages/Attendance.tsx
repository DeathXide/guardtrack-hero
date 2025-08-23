import React from 'react';
import { Helmet } from "react-helmet";
import ModernSlotBasedAttendance from '@/components/attendance/ModernSlotBasedAttendance';

const Attendance: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Attendance Management - Security Agency</title>
        <meta name="description" content="Manage attendance and guard allocation for security sites with slot-based system" />
      </Helmet>
      <ModernSlotBasedAttendance />
    </>
  );
};

export default Attendance;