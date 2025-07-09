import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, User } from 'lucide-react';
import { Shift, Guard } from '@/types';
import { formatCurrency } from '@/lib/localService';

interface TemporarySlotManagerProps {
  title: string;
  shiftType: 'day' | 'night';
  temporarySlots: Shift[];
  guards: Guard[];
  presentGuards: string[];
  onEditSlot: (slot: Shift) => void;
  onDeleteSlot: (slotId: string) => void;
  onAssignGuard: (slotId: string) => void;
  onGuardSelect: (guardId: string) => void;
}

export default function TemporarySlotManager({
  title,
  shiftType,
  temporarySlots,
  guards,
  presentGuards,
  onEditSlot,
  onDeleteSlot,
  onAssignGuard,
  onGuardSelect
}: TemporarySlotManagerProps) {
  if (temporarySlots.length === 0) return null;

  const getGuardName = (guardId: string) => {
    const guard = guards.find(g => g.id === guardId);
    return guard?.name || 'Unassigned';
  };

  const isGuardPresent = (guardId: string) => presentGuards.includes(guardId);

  return (
    <Card className="border-dashed border-2 border-orange-200 bg-orange-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <span>Temporary {title} ({temporarySlots.length})</span>
            <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
              Temp
            </Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {temporarySlots.map((slot) => {
            const hasGuard = slot.guardId && slot.guardId !== '';
            const isPresent = hasGuard && isGuardPresent(slot.guardId);
            
            return (
              <div 
                key={slot.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-white"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-sm">
                        {slot.temporaryRole}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {hasGuard ? getGuardName(slot.guardId) : 'Unassigned'}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {formatCurrency(slot.temporaryPayRate || 0)}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-2">
                  {hasGuard && (
                    <Button
                      size="sm"
                      variant={isPresent ? "default" : "outline"}
                      className={`h-7 px-2 text-xs ${
                        isPresent ? 'bg-green-500 hover:bg-green-600' : ''
                      }`}
                      onClick={() => onGuardSelect(slot.guardId)}
                    >
                      {isPresent ? 'Present' : 'Mark Present'}
                    </Button>
                  )}
                  
                  {!hasGuard && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={() => onAssignGuard(slot.id)}
                    >
                      Assign Guard
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => onEditSlot(slot)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => onDeleteSlot(slot.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}