import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Camera, Clock, User, Building } from 'lucide-react';
import { useAttendanceMutations, useTodayAttendance, useEmployeeTypes } from '@/hooks/useAttendance';
import { fetchGuards } from '@/lib/localService';
import { fetchSites } from '@/lib/localService';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface AttendanceCheckInOutProps {
  siteId?: string;
  employeeType?: string;
}

const AttendanceCheckInOut: React.FC<AttendanceCheckInOutProps> = ({ 
  siteId: propSiteId, 
  employeeType: propEmployeeType 
}) => {
  const [employeeId, setEmployeeId] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState(propSiteId || '');
  const [selectedEmployeeType, setSelectedEmployeeType] = useState(propEmployeeType || 'guard');
  const [shiftType, setShiftType] = useState<'day' | 'night'>('day');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  const { data: guards = [] } = useQuery({ queryKey: ['guards'], queryFn: fetchGuards });
  const { data: sites = [] } = useQuery({ queryKey: ['sites'], queryFn: fetchSites });
  const { data: employeeTypes = [] } = useEmployeeTypes();
  const { data: todayAttendance = [], refetch: refetchTodayAttendance } = useTodayAttendance(selectedSiteId);
  const { checkIn, checkOut } = useAttendanceMutations();

  // Get current location
  const getCurrentLocation = () => {
    setGettingLocation(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
          });
          setGettingLocation(false);
          toast.success('Location captured successfully');
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Failed to get location. Please enable location access.');
          setGettingLocation(false);
        }
      );
    } else {
      toast.error('Geolocation is not supported by this browser.');
      setGettingLocation(false);
    }
  };

  // Check if employee is already checked in today
  const getEmployeeAttendanceToday = () => {
    return todayAttendance.find(record => 
      record.employee_id === employeeId && 
      record.employee_type === selectedEmployeeType &&
      record.site_id === selectedSiteId &&
      record.shift_type === shiftType
    );
  };

  const handleCheckIn = async () => {
    if (!employeeId || !selectedSiteId) {
      toast.error('Please select an employee and site');
      return;
    }

    const existingRecord = getEmployeeAttendanceToday();
    if (existingRecord && existingRecord.actual_start_time) {
      toast.error('Employee is already checked in for this shift today');
      return;
    }

    try {
      await checkIn.mutateAsync({
        employeeId,
        employeeType: selectedEmployeeType,
        siteId: selectedSiteId,
        shiftType,
        location,
        notes
      });
      
      // Reset form
      setNotes('');
      setLocation(null);
      refetchTodayAttendance();
    } catch (error) {
      console.error('Check-in failed:', error);
    }
  };

  const handleCheckOut = async () => {
    const existingRecord = getEmployeeAttendanceToday();
    if (!existingRecord) {
      toast.error('No check-in record found for today');
      return;
    }

    if (existingRecord.actual_end_time) {
      toast.error('Employee is already checked out');
      return;
    }

    try {
      await checkOut.mutateAsync({
        recordId: existingRecord.id,
        params: {
          location,
          notes
        }
      });
      
      // Reset form
      setNotes('');
      setLocation(null);
      refetchTodayAttendance();
    } catch (error) {
      console.error('Check-out failed:', error);
    }
  };

  const currentRecord = getEmployeeAttendanceToday();
  const isCheckedIn = currentRecord?.actual_start_time && !currentRecord?.actual_end_time;
  const isCheckedOut = currentRecord?.actual_end_time;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Employee Check In/Out
          </CardTitle>
          <CardDescription>
            Manage employee attendance with location tracking and photo verification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Employee Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="employee-type">Employee Type</Label>
              <Select value={selectedEmployeeType} onValueChange={setSelectedEmployeeType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {employeeTypes.map((type) => (
                    <SelectItem key={type.id} value={type.name}>
                      {type.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="employee">Employee</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {guards.map((guard) => (
                    <SelectItem key={guard.id} value={guard.id}>
                      {guard.name} ({guard.badgeNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="site">Site</Label>
              <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="shift">Shift Type</Label>
              <Select value={shiftType} onValueChange={(value: 'day' | 'night') => setShiftType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day Shift</SelectItem>
                  <SelectItem value="night">Night Shift</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Current Status */}
          {currentRecord && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <User className="h-4 w-4" />
                Current Status
              </h3>
              <div className="flex items-center gap-4">
                <Badge variant={isCheckedOut ? 'outline' : isCheckedIn ? 'default' : 'secondary'}>
                  {isCheckedOut ? 'Checked Out' : isCheckedIn ? 'Checked In' : 'Scheduled'}
                </Badge>
                {currentRecord.actual_start_time && (
                  <span className="text-sm text-muted-foreground">
                    Check-in: {format(new Date(currentRecord.actual_start_time), 'HH:mm')}
                  </span>
                )}
                {currentRecord.actual_end_time && (
                  <span className="text-sm text-muted-foreground">
                    Check-out: {format(new Date(currentRecord.actual_end_time), 'HH:mm')}
                  </span>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Location and Notes */}
          <div className="space-y-4">
            <div>
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </Label>
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  onClick={getCurrentLocation}
                  disabled={gettingLocation}
                >
                  {gettingLocation ? 'Getting Location...' : 'Capture Current Location'}
                </Button>
                {location && (
                  <Badge variant="outline" className="px-3 py-1">
                    {location.address}
                  </Badge>
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes..."
                rows={3}
              />
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={handleCheckIn}
              disabled={!employeeId || !selectedSiteId || !!isCheckedIn || !!isCheckedOut || checkIn.isPending}
              size="lg"
              className="flex-1"
            >
              {checkIn.isPending ? 'Checking In...' : 'Check In'}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleCheckOut}
              disabled={!isCheckedIn || !!isCheckedOut || checkOut.isPending}
              size="lg"
              className="flex-1"
            >
              {checkOut.isPending ? 'Checking Out...' : 'Check Out'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceCheckInOut;