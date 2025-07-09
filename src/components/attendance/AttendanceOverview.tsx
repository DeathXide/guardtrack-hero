
import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Calendar as CalendarIcon, CheckCircle2, Clock, IndianRupee, Search, Filter } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  fetchSites, 
  fetchAttendanceByDate, 
  fetchShiftsBySite,
  fetchSiteMonthlyEarnings,
  formatCurrency
} from "@/lib/localService";
import { Site, AttendanceRecord, Shift, SiteEarnings } from "@/types";
import { useNavigate } from "react-router-dom";

interface AttendanceOverviewProps {
  onSiteSelect: (siteId: string) => void;
}

const AttendanceOverview: React.FC<AttendanceOverviewProps> = ({ onSiteSelect }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const navigate = useNavigate();
  const formattedDate = format(selectedDate, "yyyy-MM-dd");
  const currentMonth = format(selectedDate, "yyyy-MM");

  const { data: sites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ["sites"],
    queryFn: fetchSites
  });

  const { data: attendanceRecords = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ["attendance", formattedDate],
    queryFn: () => fetchAttendanceByDate(formattedDate)
  });

  const { data: allShifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ["all-shifts"],
    queryFn: async () => {
      const allShiftsData: Shift[] = [];
      for (const site of sites) {
        const siteShifts = await fetchShiftsBySite(site.id);
        allShiftsData.push(...siteShifts);
      }
      return allShiftsData;
    },
    enabled: sites.length > 0
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

  // Filter and search logic
  const filteredSites = useMemo(() => {
    let filtered = sites;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(site =>
        site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(site => {
        const { status } = getSiteAttendanceStatus(site);
        return status === statusFilter;
      });
    }

    return filtered;
  }, [sites, searchQuery, statusFilter, allShifts, attendanceRecords, formattedDate]);

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
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm">Marked</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-sm">Partial</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm">Not Marked</span>
              </div>
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sites by name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="fully-marked">Fully Marked</SelectItem>
                  <SelectItem value="partially-marked">Partially Marked</SelectItem>
                  <SelectItem value="not-marked">Not Marked</SelectItem>
                  <SelectItem value="no-shifts">No Shifts</SelectItem>
                </SelectContent>
              </Select>
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Site Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Day Shift</TableHead>
                    <TableHead>Night Shift</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Monthly Earnings</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                 <TableBody>
                   {filteredSites.length === 0 ? (
                     <TableRow>
                       <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                         {searchQuery || statusFilter !== "all" 
                           ? "No sites match your search criteria" 
                           : "No sites available"
                         }
                       </TableCell>
                     </TableRow>
                   ) : (
                     filteredSites.map((site) => {
                       const { status, dayStatus, nightStatus } = getSiteAttendanceStatus(site);
                       const earnings = siteEarningsMap[site.id] || {
                         totalShifts: 0,
                         allocatedAmount: 0,
                         guardCosts: 0,
                         netEarnings: 0
                       };
                       
                       return (
                         <TableRow key={site.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleSiteClick(site.id)}>
                           <TableCell className="font-medium">{site.name}</TableCell>
                           <TableCell>{site.location}</TableCell>
                           <TableCell>{getShiftStatusBadge(dayStatus)}</TableCell>
                           <TableCell>{getShiftStatusBadge(nightStatus)}</TableCell>
                           <TableCell>{getStatusBadge(status)}</TableCell>
                           <TableCell>
                             <div className="flex items-center">
                               <IndianRupee className="h-3 w-3 mr-1" />
                               <span className={earnings.netEarnings > 0 ? "text-green-600" : 
                                             earnings.netEarnings < 0 ? "text-red-600" : ""}>
                                 {formatCurrency(earnings.netEarnings)}
                               </span>
                             </div>
                           </TableCell>
                           <TableCell className="text-right">
                             <Button size="sm" variant="outline" onClick={(e) => {
                               e.stopPropagation();
                               handleSiteClick(site.id);
                             }}>
                               Mark Attendance
                             </Button>
                           </TableCell>
                         </TableRow>
                       );
                     })
                   )}
                 </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceOverview;
