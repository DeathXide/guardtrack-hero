import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  UserPlus, 
  User, 
  MoreVertical, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Trash2,
  RefreshCw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DailyAttendanceSlot } from '@/lib/dailyAttendanceSlotsApi';

interface Guard {
  id: string;
  name: string;
  badge_number: string;
  status: string;
}

interface ModernSlotCardProps {
  slot: DailyAttendanceSlot;
  assignedGuard?: Guard;
  onAssignGuard: (slotId: string, shiftType: 'day' | 'night', roleType: string) => void;
  onUnassignGuard: (slotId: string) => void;
  onReplaceGuard: (slotId: string, shiftType: 'day' | 'night', roleType: string, originalGuardId: string) => void;
  onMarkAttendance: (slotId: string, isPresent: boolean) => void;
  isLoading?: boolean;
}

const ModernSlotCard: React.FC<ModernSlotCardProps> = ({
  slot,
  assignedGuard,
  onAssignGuard,
  onUnassignGuard,
  onReplaceGuard,
  onMarkAttendance,
  isLoading = false
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const getSlotStatus = () => {
    if (!assignedGuard) return 'empty';
    if (slot.is_present === true) return 'present';
    if (slot.is_present === false) return 'absent';
    return 'assigned';
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      empty: {
        badge: { text: 'Empty', variant: 'secondary' as const, className: 'text-gray-600 bg-gray-100 dark:bg-gray-800' },
        icon: UserPlus,
        iconColor: 'text-gray-400',
        cardClass: 'status-empty hover:border-primary/30'
      },
      assigned: {
        badge: { text: 'Assigned', variant: 'default' as const, className: 'text-blue-600 bg-blue-100 dark:bg-blue-900' },
        icon: User,
        iconColor: 'text-blue-500',
        cardClass: 'status-assigned hover:border-blue-300'
      },
      present: {
        badge: { text: 'Present', variant: 'default' as const, className: 'text-green-600 bg-green-100 dark:bg-green-900' },
        icon: CheckCircle,
        iconColor: 'text-green-500',
        cardClass: 'status-present hover:border-green-300'
      },
      absent: {
        badge: { text: 'Absent', variant: 'destructive' as const, className: 'text-red-600 bg-red-100 dark:bg-red-900' },
        icon: XCircle,
        iconColor: 'text-red-500',
        cardClass: 'status-absent hover:border-red-300'
      }
    };
    return configs[status] || configs.empty;
  };

  const status = getSlotStatus();
  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.icon;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <Card 
      className={`attendance-card hover-lift transition-all duration-200 ${statusConfig.cardClass} ${
        isLoading ? 'opacity-60' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg bg-background/50 ${statusConfig.iconColor}`}>
              <StatusIcon className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-medium text-foreground">
              Slot {slot.slot_number}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <Badge className={`text-xs ${statusConfig.badge.className}`}>
              {statusConfig.badge.text}
            </Badge>
            {slot.is_temporary && (
              <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                Temp
              </Badge>
            )}
          </div>
        </div>

        {/* Role Badge */}
        <div className="mb-3">
          <Badge variant="outline" className="text-xs font-medium">
            {slot.role_type}
          </Badge>
        </div>

        {/* Guard Information or Assignment Button */}
        {assignedGuard ? (
          <div className="space-y-3">
            {/* Guard Info */}
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                  {getInitials(assignedGuard.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">
                  {assignedGuard.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Badge: {assignedGuard.badge_number}
                </p>
              </div>
              
              {/* Quick Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem
                    onClick={() => onReplaceGuard(slot.id, slot.shift_type, slot.role_type, assignedGuard.id)}
                    className="text-sm"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Replace
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onUnassignGuard(slot.id)}
                    className="text-sm text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Attendance Actions */}
            {status === 'absent' ? (
              <div className="space-y-2">
                <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded border border-red-200 dark:border-red-800">
                  <AlertCircle className="h-3 w-3 inline mr-1" />
                  Guard marked absent
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onReplaceGuard(slot.id, slot.shift_type, slot.role_type, assignedGuard.id)}
                    className="text-xs h-8"
                    disabled={isLoading}
                  >
                    Replace
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onMarkAttendance(slot.id, true)}
                    className="text-xs h-8 bg-green-600 hover:bg-green-700"
                    disabled={isLoading}
                  >
                    Mark Present
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant={status === 'present' ? "default" : "outline"}
                  onClick={() => onMarkAttendance(slot.id, true)}
                  className={`text-xs h-8 transition-all ${
                    status === 'present' 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'hover:bg-green-50 hover:text-green-700 hover:border-green-300'
                  }`}
                  disabled={isLoading}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Present
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onMarkAttendance(slot.id, false)}
                  className="text-xs h-8 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-all"
                  disabled={isLoading}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Absent
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAssignGuard(slot.id, slot.shift_type, slot.role_type)}
            className="w-full text-xs h-10 border-dashed hover:border-solid hover:bg-primary/5 hover:border-primary/50 transition-all"
            disabled={isLoading}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Assign Guard
          </Button>
        )}

        {/* Pay Rate */}
        {slot.pay_rate && (
          <div className="mt-3 pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Pay: ₹{slot.pay_rate}/day
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ModernSlotCard;