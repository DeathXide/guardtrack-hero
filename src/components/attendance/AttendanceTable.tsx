import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Clock, Camera, Edit, Eye } from 'lucide-react';
import { format, differenceInHours, differenceInMinutes } from 'date-fns';

interface AttendanceTableProps {
  data: any[];
  showActions?: boolean;
  realTime?: boolean;
  onEdit?: (record: any) => void;
  onView?: (record: any) => void;
}

const AttendanceTable: React.FC<AttendanceTableProps> = ({
  data,
  showActions = false,
  realTime = false,
  onEdit,
  onView
}) => {
  const getStatusBadge = (status: string) => {
    const statusColors = {
      present: 'default',
      absent: 'destructive',
      late: 'secondary',
      early_departure: 'outline',
      on_leave: 'outline',
      scheduled: 'outline',
      overtime: 'default'
    } as const;

    return (
      <Badge variant={statusColors[status as keyof typeof statusColors] || 'outline'}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const calculateWorkedHours = (record: any) => {
    if (!record.actual_start_time) return 'Not started';
    if (!record.actual_end_time) return 'In progress';
    
    const start = new Date(record.actual_start_time);
    const end = new Date(record.actual_end_time);
    const hours = differenceInHours(end, start);
    const minutes = differenceInMinutes(end, start) % 60;
    
    return `${hours}h ${minutes}m`;
  };

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            No attendance records found
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Check In</TableHead>
              <TableHead>Check Out</TableHead>
              <TableHead>Hours Worked</TableHead>
              <TableHead>Location</TableHead>
              {showActions && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((record) => (
              <TableRow key={record.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {record.guards?.name || 'Unknown Employee'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {record.guards?.badge_number || record.employee_id}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {record.employee_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {record.sites?.site_name || 'Unknown Site'}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={record.shift_type === 'day' ? 'default' : 'secondary'}>
                    {record.shift_type.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(record.attendance_date), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  {getStatusBadge(record.status)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {record.actual_start_time ? (
                      <>
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {format(new Date(record.actual_start_time), 'HH:mm')}
                      </>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {record.actual_end_time ? (
                      <>
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {format(new Date(record.actual_end_time), 'HH:mm')}
                      </>
                    ) : realTime && record.actual_start_time ? (
                      <Badge variant="outline" className="text-xs">
                        In Progress
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {calculateWorkedHours(record)}
                    {record.overtime_hours > 0 && (
                      <div className="text-xs text-amber-600">
                        +{record.overtime_hours}h OT
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {record.check_in_location && (
                      <Button variant="ghost" size="sm" className="p-1">
                        <MapPin className="h-3 w-3" />
                      </Button>
                    )}
                    {record.check_in_photo_url && (
                      <Button variant="ghost" size="sm" className="p-1">
                        <Camera className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </TableCell>
                {showActions && (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView?.(record)}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit?.(record)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {realTime && (
        <div className="text-xs text-muted-foreground text-center">
          Data refreshes automatically every 30 seconds
        </div>
      )}
    </div>
  );
};

export default AttendanceTable;