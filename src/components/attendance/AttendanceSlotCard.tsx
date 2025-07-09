import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Users, Clock, IndianRupee } from 'lucide-react';
import { Guard } from '@/types';
import { formatCurrency } from '@/lib/localService';

interface AttendanceSlotCardProps {
  title: string;
  shiftType: 'day' | 'night';
  totalSlots: number;
  assignedGuards: Guard[];
  presentGuards: string[];
  payRatePerShift: number;
  onGuardSelect: (guardId: string) => void;
  onAddGuard: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const AttendanceSlotCard: React.FC<AttendanceSlotCardProps> = ({
  title,
  shiftType,
  totalSlots,
  assignedGuards,
  presentGuards,
  payRatePerShift,
  onGuardSelect,
  onAddGuard,
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
            <IndianRupee className="h-3 w-3 mr-1" />
            <span>{formatCurrency(payRatePerShift)}/shift</span>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Visual Slots */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Positions</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onAddGuard}
                className="h-8"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Guard
              </Button>
            </div>
            
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {Array.from({ length: totalSlots }).map((_, index) => {
                const status = getSlotStatus(index);
                const guard = index < assignedGuards.length ? assignedGuards[index] : null;
                const isPresent = guard ? presentGuards.includes(guard.id) : false;
                
                return (
                  <div
                    key={index}
                    className={`
                      relative aspect-square rounded-lg border-2 flex items-center justify-center
                      cursor-pointer transition-all duration-200 hover:scale-105
                      ${getStatusColor(status)}
                      ${guard ? 'hover:shadow-lg' : ''}
                    `}
                    onClick={() => guard && onGuardSelect(guard.id)}
                  >
                    {guard ? (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={guard.avatar} alt={guard.name} />
                        <AvatarFallback className="text-xs bg-background/50">
                          {getInitials(guard.name)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <Users className="h-4 w-4 text-muted-foreground/50" />
                    )}
                    
                    {/* Status indicator */}
                    {guard && (
                      <div 
                        className={`
                          absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-background
                          ${isPresent ? 'bg-green-500' : 'bg-gray-400'}
                        `}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Assigned Guards List */}
          {assignedGuards.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Assigned Guards</span>
              <div className="space-y-2">
                {assignedGuards.map((guard) => {
                  const isPresent = presentGuards.includes(guard.id);
                  return (
                    <div 
                      key={guard.id}
                      className={`
                        flex items-center justify-between p-2 rounded-lg border cursor-pointer
                        transition-all duration-200 hover:shadow-sm
                        ${isPresent ? 'bg-green-50 border-green-200' : 'bg-muted/30'}
                      `}
                      onClick={() => onGuardSelect(guard.id)}
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
                        variant={isPresent ? "default" : "outline"}
                        className={isPresent ? "bg-green-500" : ""}
                      >
                        {isPresent ? 'Present' : 'Absent'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default AttendanceSlotCard;