
import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AttendanceMarking from "@/components/attendance/AttendanceMarking";
import SlotBasedAttendanceMarking from "@/components/attendance/SlotBasedAttendanceMarking";
import ShiftAllocation from "@/components/attendance/ShiftAllocation";
import AttendanceOverview from "@/components/attendance/AttendanceOverview";
import { PageLoader } from "@/components/ui/loader";

export default function Attendance() {
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading delay
  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 700);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <PageLoader text="Loading attendance..." />;
  }

  const handleSiteSelect = (siteId: string) => {
    setSelectedSite(siteId);
  };

  const handleSiteClickAndSwitchTab = (siteId: string) => {
    setSelectedSite(siteId);
    setActiveTab("mark-attendance");
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Attendance Overview</TabsTrigger>
          <TabsTrigger value="mark-attendance">Mark Attendance</TabsTrigger>
          <TabsTrigger value="shift-allocation">Guard Allocation</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <AttendanceOverview onSiteSelect={handleSiteClickAndSwitchTab} />
        </TabsContent>
        <TabsContent value="mark-attendance">
          <SlotBasedAttendanceMarking preselectedSiteId={selectedSite} />
        </TabsContent>
        <TabsContent value="shift-allocation">
          <ShiftAllocation />
        </TabsContent>
      </Tabs>
    </div>
  );
}
