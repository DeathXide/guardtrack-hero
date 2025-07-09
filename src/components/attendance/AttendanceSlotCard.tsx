import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Users, Clock, UserPlus } from 'lucide-react';
import { Guard, Shift } from '@/types';
import { formatCurrency } from '@/lib/localService';
import TemporarySlotManager from './TemporarySlotManager';

interface AttendanceSlotCardProps {
  title: string;
  shiftType: 'day' | 'night';
  totalSlots: number;
  assignedGuards: Guard[];
  presentGuards: string[];
  unavailableGuards?: string[];
  payRatePerShift: number;
  temporarySlots?: Shift[];
  guards: Guard[];
  onGuardSelect: (guardId: string) => void;
  onAddGuard: () => void;
  onAddTemporarySlot: () => void;
  onEditTemporarySlot: (slot: Shift) => void;
  onDeleteTemporarySlot: (slotId: string) => void;
  onAssignGuardToTempSlot: (slotId: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const AttendanceSlotCard: React.FC<AttendanceSlotCardProps> = ({
  title,
  shiftType,
  totalSlots,
  assignedGuards,
  presentGuards,
  unavailableGuards = [],
  payRatePerShift,
  temporarySlots = [],
  guards,
  onGuardSelect,
  onAddGuard,
  onAddTemporarySlot,
  onEditTemporarySlot,
  onDeleteTemporarySlot,
  onAssignGuardToTempSlot,
  isExpanded,
  onToggleExpand,
}) => {
  const filledSlots = presentGuards.length;
  const completionPercentage = totalSlots > 0 ? (filledSlots / totalSlots) * 100 : 0;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const getSlotStatus = (index: number) => {
    if (index < filledSlots) return 'filled';
    if (index < assignedGuards.length) return 'assigned';
    return 'empty';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'filled': return 'bg-green-500 border-green-600';
      case 'assigned': return 'bg-blue-500 border-blue-600';
      default: return 'bg-muted border-muted-foreground/20';
    }
  };

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader 
        className="cursor-pointer" 
        onClick={onToggleExpand}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-lg">{title}</CardTitle>
            </div>
            <Badge variant="outline" className="capitalize">
              {shiftType}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Badge 
              variant={completionPercentage === 100 ? "default" : "secondary"}
              className="px-2 py-1"
            >
              {filledSlots}/{totalSlots}
            </Badge>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2 mt-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{completionPercentage.toFixed(0)}% filled</span>
          <div className="flex items-center">
            <span>{formatCurrency(payRatePerShift)}/shift</span>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Header with Add Guard Button */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Assigned Guards ({assignedGuards.length})</span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onAddTemporarySlot}
                className="h-8"
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Add Temp Slot
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onAddGuard}
                className="h-8"
              >
                <Plus className="h-3 w-3 mr-1" />
                Manage Guards
              </Button>
            </div>
          </div>

          {/* Assigned Guards List */}
          {assignedGuards.length > 0 ? (
            <div className="space-y-2">
              {assignedGuards.map((guard) => {
                const isPresent = presentGuards.includes(guard.id);
                const isUnavailable = unavailableGuards.includes(guard.id);
                const getStatus = () => {
                  if (isUnavailable) return 'unavailable';
                  if (isPresent) return 'present';
                  return 'absent';
                };
                
                const status = getStatus();
                
                return (
                  <div 
                    key={guard.id}
                    className={`
                      flex items-center justify-between p-2 rounded-lg border cursor-pointer
                      transition-all duration-200 hover:shadow-sm
                      ${status === 'present' ? 'bg-green-50 border-green-200' : 
                        status === 'unavailable' ? 'bg-red-50 border-red-200' : 'bg-muted/30'}
                      ${isUnavailable ? 'opacity-75 cursor-not-allowed' : ''}
                    `}
                    onClick={() => !isUnavailable && onGuardSelect(guard.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={guard.avatar} alt={guard.name} />
                        <AvatarFallback className="text-xs">
                          {getInitials(guard.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{guard.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {guard.badgeNumber}
                        </div>
                      </div>
                    </div>
                    <Badge 
                      variant={status === 'present' ? "default" : status === 'unavailable' ? "destructive" : "outline"}
                      className={status === 'present' ? "bg-green-500" : status === 'unavailable' ? "bg-red-500" : ""}
                    >
                      {status === 'unavailable' ? 'Unavailable' : status === 'present' ? 'Present' : 'Absent'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No guards assigned to this shift</p>
              <p className="text-xs">Click "Manage Guards" to assign guards</p>
            </div>
          )}

          {/* Temporary Slots Section */}
          <TemporarySlotManager
            title={title}
            shiftType={shiftType}
            temporarySlots={temporarySlots}
            guards={guards}
            presentGuards={presentGuards}
            onEditSlot={onEditTemporarySlot}
            onDeleteSlot={onDeleteTemporarySlot}
            onAssignGuard={onAssignGuardToTempSlot}
            onGuardSelect={onGuardSelect}
          />
        </CardContent>
      )}
    </Card>
  );
};

export default AttendanceSlotCard;