import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Calendar as CalendarIcon, Search, ArrowUpDown, ChevronUp, ChevronDown, CheckCircle2, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getAttendanceOverview } from "@/lib/attendanceOverviewApi";
import { PageLoader } from "@/components/ui/loader";

interface AttendanceOverviewProps {
  onSiteSelect: (siteId: string) => void;
}

const AttendanceOverview: React.FC<AttendanceOverviewProps> = ({ onSiteSelect }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string>("site_name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const formattedDate = format(selectedDate, "yyyy-MM-dd");

  // Single optimized query instead of 3 separate ones
  const { data: overviewData, isLoading } = useQuery({
    queryKey: ["attendance-overview", formattedDate],
    queryFn: () => getAttendanceOverview(formattedDate),
    staleTime: 30000, // Cache for 30 seconds
  });

  // Memoized filtered and sorted sites
  const processedSites = useMemo(() => {
    if (!overviewData?.sites) return [];
    
    let filtered = overviewData.sites;
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(site => 
        site.site_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        site.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Status filter (attendance-based)
    if (activeFilters.length > 0) {
      filtered = filtered.filter(site => activeFilters.includes(site.status));
    }
    
    // Slot status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(site => {
        const totalSlots = site.daySlots + site.nightSlots;
        const filledSlots = site.dayAssigned + site.nightAssigned;
        
        switch (statusFilter) {
          case "fully-filled":
            return filledSlots === totalSlots && totalSlots > 0;
          case "partially-filled":
            return filledSlots > 0 && filledSlots < totalSlots;
          case "unfilled":
            return filledSlots === 0 && totalSlots > 0;
          case "no-slots":
            return totalSlots === 0;
          default:
            return true;
        }
      });
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortField as keyof typeof a];
      let bVal: any = b[sortField as keyof typeof b];
      
      if (sortField === "fillPercentage") {
        const aTotalSlots = a.daySlots + a.nightSlots;
        const aFilledSlots = a.dayAssigned + a.nightAssigned;
        aVal = aTotalSlots > 0 ? (aFilledSlots / aTotalSlots) * 100 : 0;
        
        const bTotalSlots = b.daySlots + b.nightSlots;
        const bFilledSlots = b.dayAssigned + b.nightAssigned;
        bVal = bTotalSlots > 0 ? (bFilledSlots / bTotalSlots) * 100 : 0;
      }
      
      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (sortDirection === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
    
    return filtered;
  }, [overviewData?.sites, searchTerm, statusFilter, activeFilters, sortField, sortDirection]);

  const toggleFilter = (status: string) => {
    setActiveFilters(prev => 
      prev.includes(status) 
        ? prev.filter(f => f !== status)
        : [...prev, status]
    );
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSlotStatus = (site: any) => {
    const totalSlots = site.daySlots + site.nightSlots;
    const filledSlots = site.dayAssigned + site.nightAssigned;
    
    if (totalSlots === 0) return { status: "no-slots", label: "No Slots", variant: "secondary" as const };
    if (filledSlots === totalSlots) return { status: "fully-filled", label: "Fully Filled", variant: "default" as const };
    if (filledSlots > 0) return { status: "partially-filled", label: "Partially Filled", variant: "destructive" as const };
    return { status: "unfilled", label: "Unfilled", variant: "outline" as const };
  };

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field ? (
          sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-50" />
        )}
      </div>
    </TableHead>
  );

  if (isLoading) {
    return <PageLoader text="Loading attendance overview..." />;
  }

  if (!overviewData?.sites || overviewData.sites.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No sites available</AlertTitle>
        <AlertDescription>
          Please create sites first before viewing attendance overview. Go to Sites page to add a new site.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Site Slot Management</CardTitle>
          <CardDescription>
            View and manage guard slot allocation across all sites
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Top Controls */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full sm:w-64 justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, 'PPP')}
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

              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search sites..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  <SelectItem value="fully-filled">Fully Filled</SelectItem>
                  <SelectItem value="partially-filled">Partially Filled</SelectItem>
                  <SelectItem value="unfilled">Unfilled</SelectItem>
                  <SelectItem value="no-slots">No Slots</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Attendance Filter buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">Attendance:</span>
              <button
                onClick={() => toggleFilter('fully-marked')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors text-sm ${
                  activeFilters.includes('fully-marked')
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'hover:bg-muted'
                }`}
              >
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Marked</span>
              </button>
              <button
                onClick={() => toggleFilter('partially-marked')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors text-sm ${
                  activeFilters.includes('partially-marked')
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'hover:bg-muted'
                }`}
              >
                <Clock className="h-4 w-4 text-amber-500" />
                <span>Partial</span>
              </button>
              <button
                onClick={() => toggleFilter('not-marked')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors text-sm ${
                  activeFilters.includes('not-marked')
                    ? 'bg-red-100 text-red-800 border border-red-300'
                    : 'hover:bg-muted'
                }`}
              >
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span>Not Marked</span>
              </button>
              {activeFilters.length > 0 && (
                <button
                  onClick={() => setActiveFilters([])}
                  className="text-xs text-muted-foreground hover:text-foreground underline ml-2"
                >
                  Clear attendance filters
                </button>
              )}
            </div>
          </div>

          {/* Results Summary */}
          <div className="mb-4 text-sm text-muted-foreground">
            Showing {processedSites.length} of {overviewData?.sites?.length || 0} sites
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader field="site_name">Site Name</SortableHeader>
                <SortableHeader field="address">Address</SortableHeader>
                <TableHead>Status</TableHead>
                <SortableHeader field="daySlots">Total Slots</SortableHeader>
                <SortableHeader field="dayAssigned">Filled Slots</SortableHeader>
                <SortableHeader field="fillPercentage">Fill %</SortableHeader>
                <TableHead>Day Shift</TableHead>
                <TableHead>Night Shift</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedSites.map((site) => {
                const totalSlots = site.daySlots + site.nightSlots;
                const filledSlots = site.dayAssigned + site.nightAssigned;
                const fillPercentage = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;
                const slotStatus = getSlotStatus(site);
                
                return (
                  <TableRow key={site.id}>
                    <TableCell className="font-medium">{site.site_name}</TableCell>
                    <TableCell>{site.address}</TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium ${
                        slotStatus.status === 'fully-filled' ? 'bg-green-100 text-green-800 border border-green-300' :
                        slotStatus.status === 'partially-filled' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                        slotStatus.status === 'unfilled' ? 'bg-red-100 text-red-800 border border-red-300' :
                        'bg-gray-100 text-gray-800 border border-gray-300'
                      }`}>
                        {slotStatus.label}
                      </div>
                    </TableCell>
                    <TableCell>{totalSlots}</TableCell>
                    <TableCell>
                      <span className={`font-medium ${
                        fillPercentage === 100 ? 'text-green-600' : 
                        fillPercentage > 0 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {filledSlots}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-muted rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              fillPercentage === 100 ? 'bg-green-500' : 
                              fillPercentage > 0 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${fillPercentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{fillPercentage}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {site.dayAssigned} / {site.daySlots}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {site.nightAssigned} / {site.nightSlots}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onSiteSelect(site.id)}
                      >
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {processedSites.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No sites found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceOverview;
