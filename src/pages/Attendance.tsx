
import React from "react";
import { Helmet } from "react-helmet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AttendanceMarking from "@/components/attendance/AttendanceMarking";
import ShiftAllocation from "@/components/attendance/ShiftAllocation";

export default function Attendance() {
  return (
    <div className="container px-4 md:px-6 pb-8">
      <Helmet>
        <title>Attendance - Security Agency Management</title>
      </Helmet>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Attendance Management</h1>
        <p className="text-gray-500">
          Mark attendance and manage guard allocation for sites
        </p>
      </div>

      <Tabs defaultValue="mark-attendance" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="mark-attendance">Mark Attendance</TabsTrigger>
          <TabsTrigger value="shift-allocation">Shift Allocation</TabsTrigger>
          <TabsTrigger value="history">Attendance History</TabsTrigger>
        </TabsList>
        <TabsContent value="mark-attendance">
          <AttendanceMarking />
        </TabsContent>
        <TabsContent value="shift-allocation">
          <ShiftAllocation />
        </TabsContent>
        <TabsContent value="history">
          <div className="flex flex-col items-center justify-center h-64 border rounded-md p-6 text-center">
            <h3 className="text-xl font-medium mb-2">Attendance History</h3>
            <p className="text-gray-500">
              View attendance records for previous days
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
