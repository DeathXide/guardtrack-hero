import React from 'react';
import SlotBasedAttendanceMarking from '@/components/attendance/SlotBasedAttendanceMarking';

const AttendanceSlotBased: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <SlotBasedAttendanceMarking />
    </div>
  );
};

export default AttendanceSlotBased;