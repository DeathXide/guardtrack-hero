
import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AttendanceMarkingEnhanced from "@/components/attendance/AttendanceMarkingEnhanced";
import ShiftAllocation from "@/components/attendance/ShiftAllocation";
import AttendanceOverview from "@/components/attendance/AttendanceOverview";

export default function Attendance() {
  const [selectedSite, setSelectedSite] = useState<string>("");

  const handleSiteSelect = (siteId: string) => {
    setSelectedSite(siteId);
  };

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

      <Tabs defaultValue="overview" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Attendance Overview</TabsTrigger>
          <TabsTrigger value="mark-attendance">Mark Attendance</TabsTrigger>
          <TabsTrigger value="shift-allocation">Shift Allocation</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <AttendanceOverview onSiteSelect={handleSiteSelect} />
        </TabsContent>
        <TabsContent value="mark-attendance">
          <AttendanceMarkingEnhanced preselectedSiteId={selectedSite} />
        </TabsContent>
        <TabsContent value="shift-allocation">
          <ShiftAllocation />
        </TabsContent>
      </Tabs>
    </div>
  );
}
