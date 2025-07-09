import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldAlert, Users } from 'lucide-react';
import { Guard, Shift } from '@/types';

interface ShiftTableProps {
  shiftType: 'day' | 'night';
  shiftsData: Shift[];
  maxSlots: number;
  guards: Guard[];
  onManageGuards: (shiftType: 'day' | 'night') => void;
}

const ShiftTable: React.FC<ShiftTableProps> = ({
  shiftType,
  shiftsData,
  maxSlots,
  guards,
  onManageGuards
}) => {
  if (maxSlots === 0) {
    return (
      <Alert className="mb-4">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>No slots configured</AlertTitle>
        <AlertDescription>
          This site has no {shiftType} shift slots configured. Please update the site settings to add slots.
        </AlertDescription>
      </Alert>
    );
  }
  
  const filledSlots = shiftsData.filter(shift => shift.guardId).length;
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Badge variant="outline" className={`${filledSlots > maxSlots ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-primary/10 text-primary border-primary/20'}`}>
          {filledSlots} / {maxSlots} Slots Filled {filledSlots > maxSlots && '(Exceeded)'}
        </Badge>
        <Button 
          size="sm"
          onClick={() => onManageGuards(shiftType)}
        >
          <Users className="h-4 w-4 mr-2" />
          Manage Guards
        </Button>
      </div>
      
      {shiftsData.length === 0 ? (
        <p className="text-muted-foreground text-center py-6">
          No guards allocated for this shift. Click "Manage Guards" to allocate guards.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Guard Name</TableHead>
              <TableHead>Badge Number</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shiftsData.map(shift => {
              if (!shift.guardId) return null;
              const guard = guards.find(g => g.id === shift.guardId);
              
              return (
                <TableRow key={shift.id}>
                  <TableCell>{guard?.name || 'Unknown Guard'}</TableCell>
                  <TableCell>{guard?.badgeNumber || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={guard?.status === 'active' ? 'default' : 'outline'}>
                      {guard?.status || 'Unknown'}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default ShiftTable;