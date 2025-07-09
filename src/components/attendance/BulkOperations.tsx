import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Copy, 
  RotateCcw,
  CalendarDays
} from 'lucide-react';
import { Guard, Site } from '@/types';
import { format, subDays } from 'date-fns';

interface BulkOperationsProps {
  guards: Guard[];
  sites: Site[];
  selectedDate: Date;
  onBulkMarkAttendance: (guardIds: string[], shiftType: 'day' | 'night', status: 'present' | 'absent') => Promise<void>;
  onCopyFromDate: (fromDate: Date) => Promise<void>;
  onResetAttendance: () => Promise<void>;
  selectedSite: string;
  dayShiftGuards: Guard[];
  nightShiftGuards: Guard[];
  presentDayGuards: string[];
  presentNightGuards: string[];
}

const BulkOperations: React.FC<BulkOperationsProps> = ({
  guards,
  sites,
  selectedDate,
  onBulkMarkAttendance,
  onCopyFromDate,
  onResetAttendance,
  selectedSite,
  dayShiftGuards,
  nightShiftGuards,
  presentDayGuards,
  presentNightGuards
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [operation, setOperation] = useState<'mark' | 'copy' | 'reset'>('mark');
  const [selectedGuards, setSelectedGuards] = useState<string[]>([]);
  const [shiftType, setShiftType] = useState<'day' | 'night'>('day');
  const [status, setStatus] = useState<'present' | 'absent'>('present');
  const [searchTerm, setSearchTerm] = useState('');
  const [copyFromDays, setCopyFromDays] = useState('1');
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedSiteData = sites.find(site => site.id === selectedSite);
  const availableGuards = shiftType === 'day' ? dayShiftGuards : nightShiftGuards;
  const presentGuards = shiftType === 'day' ? presentDayGuards : presentNightGuards;

  const filteredGuards = availableGuards.filter(guard =>
    guard.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guard.badgeNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenDialog = (op: 'mark' | 'copy' | 'reset') => {
    setOperation(op);
    setSelectedGuards([]);
    setSearchTerm('');
    setIsDialogOpen(true);
  };

  const handleSelectAll = () => {
    if (operation === 'mark') {
      const allIds = filteredGuards.map(g => g.id);
      setSelectedGuards(
        selectedGuards.length === allIds.length ? [] : allIds
      );
    }
  };

  const handleGuardToggle = (guardId: string) => {
    setSelectedGuards(prev =>
      prev.includes(guardId)
        ? prev.filter(id => id !== guardId)
        : [...prev, guardId]
    );
  };

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      switch (operation) {
        case 'mark':
          await onBulkMarkAttendance(selectedGuards, shiftType, status);
          break;
        case 'copy':
          const daysBack = parseInt(copyFromDays);
          const fromDate = subDays(selectedDate, daysBack);
          await onCopyFromDate(fromDate);
          break;
        case 'reset':
          await onResetAttendance();
          break;
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Bulk operation failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getDialogContent = () => {
    switch (operation) {
      case 'mark':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Bulk Mark Attendance</DialogTitle>
              <DialogDescription>
                Select guards and mark their attendance status for {selectedSiteData?.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Shift Type</Label>
                  <Select value={shiftType} onValueChange={(value: 'day' | 'night') => {
                    setShiftType(value);
                    setSelectedGuards([]);
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Day Shift</SelectItem>
                      <SelectItem value="night">Night Shift</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(value: 'present' | 'absent') => setStatus(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search guards..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>

              <div className="flex justify-between items-center">
                <Label>Select Guards ({selectedGuards.length} selected)</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedGuards.length === filteredGuards.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              <div className="max-h-60 overflow-y-auto border rounded-md p-2">
                {filteredGuards.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No guards assigned to {shiftType} shift
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredGuards.map(guard => {
                      const isPresent = presentGuards.includes(guard.id);
                      return (
                        <div
                          key={guard.id}
                          className="flex items-center space-x-3 p-2 hover:bg-muted rounded"
                        >
                          <Checkbox
                            checked={selectedGuards.includes(guard.id)}
                            onCheckedChange={() => handleGuardToggle(guard.id)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{guard.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {guard.badgeNumber}
                              </Badge>
                              {isPresent && (
                                <Badge className="bg-green-500 text-xs">
                                  Present
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        );

      case 'copy':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Copy Attendance from Previous Date</DialogTitle>
              <DialogDescription>
                Copy attendance records from a previous date to today
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Copy from how many days ago?</Label>
                <Select value={copyFromDays} onValueChange={setCopyFromDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Yesterday</SelectItem>
                    <SelectItem value="7">1 week ago</SelectItem>
                    <SelectItem value="14">2 weeks ago</SelectItem>
                    <SelectItem value="30">1 month ago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm">
                  This will copy attendance records from{' '}
                  <strong>
                    {format(subDays(selectedDate, parseInt(copyFromDays)), 'PPP')}
                  </strong>{' '}
                  to <strong>{format(selectedDate, 'PPP')}</strong> for{' '}
                  <strong>{selectedSiteData?.name}</strong>.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Only guards who are currently assigned to shifts will be included.
                </p>
              </div>
            </div>
          </>
        );

      case 'reset':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Reset All Attendance</DialogTitle>
              <DialogDescription>
                This will remove all attendance records for {selectedSiteData?.name} on{' '}
                {format(selectedDate, 'PPP')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">
                <strong>Warning:</strong> This action cannot be undone. All attendance records 
                for this site on the selected date will be permanently deleted.
              </p>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Operations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              variant="outline"
              onClick={() => handleOpenDialog('mark')}
              disabled={!selectedSite}
              className="flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Bulk Mark
            </Button>
            
            <Button
              variant="outline"
              onClick={() => handleOpenDialog('copy')}
              disabled={!selectedSite}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy from Date
            </Button>
            
            <Button
              variant="outline"
              onClick={() => handleOpenDialog('reset')}
              disabled={!selectedSite}
              className="flex items-center gap-2 text-destructive hover:text-destructive"
            >
              <RotateCcw className="h-4 w-4" />
              Reset All
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          {getDialogContent()}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={
                isProcessing ||
                (operation === 'mark' && selectedGuards.length === 0)
              }
              variant={operation === 'reset' ? 'destructive' : 'default'}
            >
              {isProcessing ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BulkOperations;