
import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MapPin, Users, Clock, Calendar as CalendarIcon, CheckCircle2, AlertCircle, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { fetchSites, fetchAttendanceByDate, fetchShiftsBySite, formatCurrency } from "@/lib/supabaseService";
import AttendanceMarking from "@/components/attendance/AttendanceMarking";
import ShiftAllocation from "@/components/attendance/ShiftAllocation";
import AttendanceOverview from "@/components/attendance/AttendanceOverview";

export default function Attendance() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("sites");
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);

  const formattedDate = format(selectedDate, "yyyy-MM-dd");

  const { data: sites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ["sites"],
    queryFn: fetchSites
  });

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ["attendance", formattedDate],
    queryFn: () => fetchAttendanceByDate(formattedDate)
  });

  const handleSiteSelect = (siteId: string) => {
    setSelectedSite(siteId);
  };

  const handleMarkAttendance = (siteId: string) => {
    setSelectedSite(siteId);
    setAttendanceDialogOpen(true);
  };

  const handleStaffAllocation = (siteId: string) => {
    setSelectedSite(siteId);
    setAllocationDialogOpen(true);
  };

  // Get attendance status for a site
  const getSiteAttendanceStatus = (siteId: string) => {
    // This is a simplified version - you can enhance this based on your needs
    const siteAttendance = attendanceRecords.filter(record => {
      // For local data, we need to find the shift first to get the site
      const shift = record.shiftId; // This would need proper shift lookup
      return record.date === formattedDate;
    });
    
    if (siteAttendance.length === 0) return "not-marked";
    
    const presentCount = siteAttendance.filter(r => r.status === "present").length;
    const totalExpected = siteAttendance.length;
    
    if (presentCount === totalExpected) return "fully-marked";
    if (presentCount > 0) return "partially-marked";
    return "not-marked";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "fully-marked":
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Complete</Badge>;
      case "partially-marked":
        return <Badge className="bg-amber-500 hover:bg-amber-600"><Clock className="h-3 w-3 mr-1" />Partial</Badge>;
      case "not-marked":
        return <Badge variant="outline" className="border-red-200 text-red-500"><AlertCircle className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (sitesLoading) {
    return (
      <div className="container px-4 md:px-6 pb-8">
        <div className="flex items-center justify-center h-64">Loading sites...</div>
      </div>
    );
  }

  return (
    <div className="container px-4 md:px-6 pb-8">
      <Helmet>
        <title>Attendance - Security Agency Management</title>
      </Helmet>
      
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Attendance Management</h1>
        <p className="text-muted-foreground">
          Manage attendance and staff allocation across all sites
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="mb-6">
          <TabsTrigger value="sites">Sites Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed View</TabsTrigger>
        </TabsList>

        <TabsContent value="sites">
          <div className="space-y-6">
            {/* Date Selection */}
            <div className="flex items-center gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Sites Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sites.length === 0 ? (
                <p className="col-span-full text-center py-10 text-muted-foreground">
                  No sites found. Please add sites first.
                </p>
              ) : (
                sites.map(site => {
                  const status = getSiteAttendanceStatus(site.id);
                  return (
                    <Card key={site.id} className="overflow-hidden border border-border/60 hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{site.name}</CardTitle>
                            <CardDescription className="flex items-center mt-1">
                              <MapPin className="h-3 w-3 mr-1" />
                              {site.location || site.addressLine1}
                            </CardDescription>
                          </div>
                          {getStatusBadge(status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Organization:</span>
                            <span className="font-medium">{site.organizationName}</span>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Type:</span>
                            <span className="font-medium">{site.siteType || 'General'}</span>
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-3 border-t border-border/50 space-y-2">
                            <Button 
                              variant="default" 
                              size="sm"
                              className="w-full bg-primary hover:bg-primary/90"
                              onClick={() => handleMarkAttendance(site.id)}
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              Mark Attendance
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="w-full"
                              onClick={() => handleStaffAllocation(site.id)}
                            >
                              <Users className="h-4 w-4 mr-2" />
                              Staff Allocation
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="detailed">
          <AttendanceOverview onSiteSelect={handleSiteSelect} />
        </TabsContent>
      </Tabs>

      {/* Attendance Dialog */}
      <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mark Attendance</DialogTitle>
            <DialogDescription>
              Mark attendance for guards at the selected site
            </DialogDescription>
          </DialogHeader>
          <AttendanceMarking preselectedSiteId={selectedSite} />
        </DialogContent>
      </Dialog>

      {/* Staff Allocation Dialog */}
      <Dialog open={allocationDialogOpen} onOpenChange={setAllocationDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Staff Allocation</DialogTitle>
            <DialogDescription>
              Assign guards to shifts at the selected site
            </DialogDescription>
          </DialogHeader>
          <ShiftAllocation />
        </DialogContent>
      </Dialog>
    </div>
  );
}
