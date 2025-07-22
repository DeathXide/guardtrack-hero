import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Calendar as CalendarIcon, CheckCircle2, Clock, Building, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getAttendanceOverview } from "@/lib/attendanceOverviewApi";
import { PageLoader } from "@/components/ui/loader";

interface AttendanceOverviewProps {
  onSiteSelect: (siteId: string) => void;
}

const AttendanceOverview: React.FC<AttendanceOverviewProps> = ({ onSiteSelect }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const formattedDate = format(selectedDate, "yyyy-MM-dd");

  // Single optimized query instead of 3 separate ones
  const { data: overviewData, isLoading } = useQuery({
    queryKey: ["attendance-overview", formattedDate],
    queryFn: () => getAttendanceOverview(formattedDate),
    staleTime: 30000, // Cache for 30 seconds
  });

  // Memoized filtered sites to prevent unnecessary re-calculations
  const filteredSites = useMemo(() => {
    if (!overviewData?.sites) return [];
    if (activeFilters.length === 0) return overviewData.sites;
    return overviewData.sites.filter(site => activeFilters.includes(site.status));
  }, [overviewData?.sites, activeFilters]);

  const toggleFilter = (status: string) => {
    setActiveFilters(prev => 
      prev.includes(status) 
        ? prev.filter(f => f !== status)
        : [...prev, status]
    );
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
          <CardTitle>Attendance Overview</CardTitle>
          <CardDescription>
            View attendance status across all sites for the selected date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-64 justify-start text-left font-normal"
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSites.map((site) => (
              <Card key={site.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{site.site_name}</CardTitle>
                      <CardDescription>{site.address}</CardDescription>
                    </div>
                    {getStatusBadge(site.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span>Capacity:</span>
                      </div>
                      <span className="font-medium">{site.daySlots + site.nightSlots} slots</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>Assigned:</span>
                      </div>
                      <span className="font-medium">{site.dayAssigned + site.nightAssigned} guards</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span>Present:</span>
                      <span className="font-medium text-green-600">
                        {site.dayPresent + site.nightPresent} / {site.dayAssigned + site.nightAssigned}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="text-center p-2 bg-amber-50 rounded">
                        <div className="text-xs text-amber-700">Day Shift</div>
                        <div className="font-medium text-amber-800">
                          {site.dayPresent} / {site.dayAssigned}
                        </div>
                      </div>
                      <div className="text-center p-2 bg-blue-50 rounded">
                        <div className="text-xs text-blue-700">Night Shift</div>
                        <div className="font-medium text-blue-800">
                          {site.nightPresent} / {site.nightAssigned}
                        </div>
                      </div>
                    </div>

                    <Button 
                      className="w-full mt-4" 
                      size="sm"
                      onClick={() => onSiteSelect(site.id)}
                    >
                      Mark Attendance
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceOverview;