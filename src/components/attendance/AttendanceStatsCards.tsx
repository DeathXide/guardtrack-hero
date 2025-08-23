import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck, UserX, Clock, TrendingUp } from 'lucide-react';
import { DailyAttendanceSlot } from '@/lib/dailyAttendanceSlotsApi';

interface AttendanceStatsCardsProps {
  slots: DailyAttendanceSlot[];
}

const AttendanceStatsCards: React.FC<AttendanceStatsCardsProps> = ({ slots }) => {
  const stats = React.useMemo(() => {
    const totalSlots = slots.length;
    const assignedSlots = slots.filter(slot => slot.assigned_guard_id).length;
    const presentGuards = slots.filter(slot => slot.is_present === true).length;
    const absentGuards = slots.filter(slot => slot.is_present === false).length;
    const unassignedSlots = totalSlots - assignedSlots;
    const pendingMarkings = assignedSlots - presentGuards - absentGuards;
    
    const attendanceRate = assignedSlots > 0 ? Math.round((presentGuards / assignedSlots) * 100) : 0;
    
    return {
      totalSlots,
      assignedSlots,
      presentGuards,
      absentGuards,
      unassignedSlots,
      pendingMarkings,
      attendanceRate
    };
  }, [slots]);

  const statItems = [
    {
      icon: Users,
      label: 'Total Slots',
      value: stats.totalSlots,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      borderColor: 'border-blue-200 dark:border-blue-800'
    },
    {
      icon: UserCheck,
      label: 'Present',
      value: stats.presentGuards,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      borderColor: 'border-green-200 dark:border-green-800'
    },
    {
      icon: UserX,
      label: 'Absent',
      value: stats.absentGuards,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      borderColor: 'border-red-200 dark:border-red-800'
    },
    {
      icon: Clock,
      label: 'Pending',
      value: stats.pendingMarkings,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950/20',
      borderColor: 'border-amber-200 dark:border-amber-800'
    },
    {
      icon: TrendingUp,
      label: 'Attendance Rate',
      value: `${stats.attendanceRate}%`,
      color: stats.attendanceRate >= 80 ? 'text-green-600' : stats.attendanceRate >= 60 ? 'text-amber-600' : 'text-red-600',
      bgColor: stats.attendanceRate >= 80 ? 'bg-green-50 dark:bg-green-950/20' : stats.attendanceRate >= 60 ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-red-50 dark:bg-red-950/20',
      borderColor: stats.attendanceRate >= 80 ? 'border-green-200 dark:border-green-800' : stats.attendanceRate >= 60 ? 'border-amber-200 dark:border-amber-800' : 'border-red-200 dark:border-red-800'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      {statItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <Card key={index} className={`stat-card hover-lift ${item.bgColor} ${item.borderColor}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {item.label}
                  </p>
                  <p className={`text-2xl font-bold ${item.color} mt-1`}>
                    {item.value}
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${item.bgColor}`}>
                  <Icon className={`h-4 w-4 ${item.color}`} />
                </div>
              </div>
              {item.label === 'Attendance Rate' && (
                <div className="mt-2">
                  <div className="w-full bg-muted/30 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        stats.attendanceRate >= 80 ? 'bg-green-500' : 
                        stats.attendanceRate >= 60 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${stats.attendanceRate}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AttendanceStatsCards;