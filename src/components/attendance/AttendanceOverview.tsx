
import React, { useState } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Calendar as CalendarIcon, CheckCircle2, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AttendanceDataTable } from "./AttendanceDataTable";
import { 
  fetchAttendanceByDate, 
  fetchSiteMonthlyEarnings,
  formatCurrency
} from "@/lib/localService";
import { sitesApi } from "@/lib/sitesApi";
import { shiftsApi } from "@/lib/shiftsApi";
import { Site, AttendanceRecord, Shift, SiteEarnings } from "@/types";
import { useNavigate } from "react-router-dom";

interface AttendanceOverviewProps {
  onSiteSelect: (siteId: string) => void;
}

const AttendanceOverview: React.FC<AttendanceOverviewProps> = ({ onSiteSelect }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const navigate = useNavigate();
  const formattedDate = format(selectedDate, "yyyy-MM-dd");
  const currentMonth = format(selectedDate, "yyyy-MM");

  const { data: sitesData = [], isLoading: sitesLoading } = useQuery({
    queryKey: ["sites"],
    queryFn: sitesApi.getAllSites
  });

  // Transform Supabase site data to match the expected Site interface
  const sites = sitesData.map(site => ({
    id: site.id,
    name: site.site_name,
    organizationName: site.organization_name,
    gstNumber: site.gst_number,
    addressLine1: site.address,
    addressLine2: "",
    addressLine3: "",
    gstType: site.gst_type as 'GST' | 'NGST' | 'RCM' | 'PERSONAL',
    siteType: site.site_category,
    staffingSlots: site.staffing_requirements?.map(req => ({
      id: req.id,
      role: req.role_type as 'Security Guard' | 'Supervisor' | 'Housekeeping',
      budgetPerSlot: req.budget_per_slot,
      daySlots: req.day_slots,
      nightSlots: req.night_slots
    })) || []
  }));

  const { data: attendanceRecords = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ["attendance", formattedDate],
    queryFn: () => fetchAttendanceByDate(formattedDate)
  });

  const { data: allShifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ["all-shifts"],
    queryFn: async () => {
      const allShiftsData = await shiftsApi.getAllShifts();
      // Transform to match expected interface
      return allShiftsData.map(shift => ({
        id: shift.id,
        siteId: shift.site_id,
        type: shift.type as 'day' | 'night',
        guardId: shift.guard_id
      }));
    }
  });

  const handleSiteClick = (siteId: string) => {
    onSiteSelect(siteId);
  };

  // Get attendance status for each site
  const getSiteAttendanceStatus = (site: Site) => {
    const siteShifts = allShifts.filter(shift => shift.siteId === site.id);
    
    // No shifts for this site
    if (siteShifts.length === 0) {
      return { status: "no-shifts", dayStatus: "no-shifts", nightStatus: "no-shifts" };
    }

    const dayShifts = siteShifts.filter(shift => shift.type === "day" && shift.guardId);
    const nightShifts = siteShifts.filter(shift => shift.type === "night" && shift.guardId);
    
    // Get attendance records for this site's shifts
    const siteShiftIds = siteShifts.map(shift => shift.id);
    const siteAttendance = attendanceRecords.filter(
      record => siteShiftIds.includes(record.shiftId) && record.date === formattedDate
    );

    const dayAttendance = siteAttendance.filter(record => {
      const shift = allShifts.find(s => s.id === record.shiftId);
      return shift && shift.type === "day";
    });
    
    const nightAttendance = siteAttendance.filter(record => {
      const shift = allShifts.find(s => s.id === record.shiftId);
      return shift && shift.type === "night";
    });

    const getDayStatus = () => {
      if (dayShifts.length === 0) return "no-shifts";
      if (dayAttendance.length === 0) return "not-marked";
      if (dayAttendance.length < dayShifts.length) return "partially-marked";
      return "fully-marked";
    };

    const getNightStatus = () => {
      if (nightShifts.length === 0) return "no-shifts";
      if (nightAttendance.length === 0) return "not-marked";
      if (nightAttendance.length < nightShifts.length) return "partially-marked";
      return "fully-marked";
    };

    const dayStatus = getDayStatus();
    const nightStatus = getNightStatus();

    // Overall site status
    let status: string;
    if (dayStatus === "fully-marked" && nightStatus === "fully-marked") {
      status = "fully-marked";
    } else if (dayStatus === "no-shifts" && nightStatus === "no-shifts") {
      status = "no-shifts";
    } else if (dayStatus === "not-marked" && nightStatus === "not-marked") {
      status = "not-marked";
    } else if (
      (dayStatus === "fully-marked" && nightStatus === "no-shifts") ||
      (dayStatus === "no-shifts" && nightStatus === "fully-marked")
    ) {
      status = "fully-marked";
    } else {
      status = "partially-marked";
    }

    return { status, dayStatus, nightStatus };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "fully-marked":
        return <Badge className="bg-green-500">Marked</Badge>;
      case "partially-marked":
        return <Badge className="bg-amber-500">Partially Marked</Badge>;
      case "not-marked":
        return <Badge variant="outline" className="border-red-200 text-red-500">Not Marked</Badge>;
      case "no-shifts":
        return <Badge variant="outline" className="border-gray-200 text-gray-500">No Shifts</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getShiftStatusBadge = (status: string) => {
    switch (status) {
      case "fully-marked":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Marked</Badge>;
      case "partially-marked":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Partial</Badge>;
      case "not-marked":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Not Marked</Badge>;
      case "no-shifts":
        return <Badge variant="outline" className="text-gray-400">N/A</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Fetch site earnings data
  const { data: siteEarningsMap = {}, isLoading: earningsLoading } = useQuery({
    queryKey: ["site-earnings", currentMonth],
    queryFn: async () => {
      const earningsMap: Record<string, SiteEarnings> = {};
      for (const site of sites) {
        try {
          const earnings = await fetchSiteMonthlyEarnings(site.id, currentMonth);
          earningsMap[site.id] = earnings;
        } catch (error) {
          console.error(`Error fetching earnings for site ${site.id}:`, error);
          earningsMap[site.id] = {
            totalShifts: 0,
            allocatedAmount: 0,
            guardCosts: 0,
            netEarnings: 0
          };
        }
      }
      return earningsMap;
    },
    enabled: sites.length > 0
  });

  const toggleFilter = (status: string) => {
    setActiveFilters(prev => 
      prev.includes(status) 
        ? prev.filter(f => f !== status)
        : [...prev, status]
    );
  };

  const getFilteredSites = () => {
    if (activeFilters.length === 0) return sites;
    
    return sites.filter(site => {
      const siteStatus = getSiteAttendanceStatus(site);
      return activeFilters.includes(siteStatus.status);
    });
  };

  if (sitesLoading || attendanceLoading || shiftsLoading || earningsLoading) {
    return <div className="flex items-center justify-center h-64">Loading attendance data...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Overview</CardTitle>
        <CardDescription>
          View and manage attendance status and earnings for all sites
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-start text-left font-normal"
                  >
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
            <div className="flex items-center gap-4">
              <button
                onClick={() => toggleFilter('fully-marked')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
                  activeFilters.includes('fully-marked')
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'hover:bg-gray-100'
                }`}
              >
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm">Marked</span>
              </button>
              <button
                onClick={() => toggleFilter('partially-marked')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
                  activeFilters.includes('partially-marked')
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'hover:bg-gray-100'
                }`}
              >
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-sm">Partial</span>
              </button>
              <button
                onClick={() => toggleFilter('not-marked')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
                  activeFilters.includes('not-marked')
                    ? 'bg-red-100 text-red-800 border border-red-300'
                    : 'hover:bg-gray-100'
                }`}
              >
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm">Not Marked</span>
              </button>
              {activeFilters.length > 0 && (
                <button
                  onClick={() => setActiveFilters([])}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {sites.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No sites available</AlertTitle>
              <AlertDescription>
                Please add sites and allocate guards to shifts before marking attendance
              </AlertDescription>
            </Alert>
          ) : (
            <AttendanceDataTable
              sites={getFilteredSites()}
              siteEarningsMap={siteEarningsMap}
              getSiteAttendanceStatus={getSiteAttendanceStatus}
              onSiteClick={handleSiteClick}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceOverview;
