import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { useShiftAllocation } from '@/hooks/useShiftAllocation';
import ShiftTable from './ShiftTable';
import AllocationDialog from './AllocationDialog';
import UnassignGuardConfirmationDialog from './UnassignGuardConfirmationDialog';

const ShiftAllocation: React.FC = () => {
  const {
    // State
    selectedSite,
    setSelectedSite,
    isAllocationDialogOpen,
    setIsAllocationDialogOpen,
    selectedShiftType,
    selectedGuards,
    guardSearchTerm,
    setGuardSearchTerm,
    showUnassignConfirmation,
    guardsToUnassign,
    
    // Data
    sites,
    guards,
    selectedSiteData,
    daySlots,
    nightSlots,
    dayShifts,
    nightShifts,
    
    // Loading states
    sitesLoading,
    guardsLoading,
    shiftsLoading,
    isSaving,
    
    // Handlers
    handleOpenAllocationDialog,
    handleGuardSelection,
    handleSaveAllocation,
    handleConfirmUnassign,
    handleCancelUnassign,
  } = useShiftAllocation();

  if (sitesLoading || guardsLoading) {
    return <div className="flex items-center justify-center h-64">Loading data...</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Shift Guard Allocation</CardTitle>
        <CardDescription>
          Manage which guards are assigned to each site shift
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <Label htmlFor="site-select">Select Site</Label>
            <Select
              value={selectedSite}
              onValueChange={setSelectedSite}
            >
              <SelectTrigger className="w-full mt-2" id="site-select">
                <SelectValue placeholder="Select a site" />
              </SelectTrigger>
              <SelectContent searchable>
                {sites.map(site => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedSite && (
            <Tabs defaultValue="day" className="mt-6">
              <TabsList className="mb-4">
                <TabsTrigger value="day">Day Shift</TabsTrigger>
                <TabsTrigger value="night">Night Shift</TabsTrigger>
              </TabsList>
              
              <TabsContent value="day">
                {shiftsLoading ? (
                  <div className="flex items-center justify-center h-48">Loading shifts...</div>
                ) : (
                  <ShiftTable
                    shiftType="day"
                    shiftsData={dayShifts}
                    maxSlots={daySlots}
                    guards={guards}
                    onManageGuards={handleOpenAllocationDialog}
                  />
                )}
              </TabsContent>
              
              <TabsContent value="night">
                {shiftsLoading ? (
                  <div className="flex items-center justify-center h-48">Loading shifts...</div>
                ) : (
                  <ShiftTable
                    shiftType="night"
                    shiftsData={nightShifts}
                    maxSlots={nightSlots}
                    guards={guards}
                    onManageGuards={handleOpenAllocationDialog}
                  />
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </CardContent>
      
      <AllocationDialog
        isOpen={isAllocationDialogOpen}
        onClose={() => setIsAllocationDialogOpen(false)}
        shiftType={selectedShiftType}
        daySlots={daySlots}
        nightSlots={nightSlots}
        guards={guards}
        selectedGuards={selectedGuards}
        guardSearchTerm={guardSearchTerm}
        onGuardSearchChange={setGuardSearchTerm}
        onGuardSelection={handleGuardSelection}
        onSave={handleSaveAllocation}
        isSaving={isSaving}
      />
      
      <UnassignGuardConfirmationDialog
        isOpen={showUnassignConfirmation}
        onConfirm={handleConfirmUnassign}
        onCancel={handleCancelUnassign}
        siteName={selectedSiteData?.name || 'Unknown Site'}
        date={new Date()}
        guards={guardsToUnassign.map(info => {
          const guard = guards.find(g => g.id === info.guardId);
          return {
            id: info.guardId,
            name: guard?.name || 'Unknown Guard',
            badgeNumber: guard?.badgeNumber || 'N/A'
          };
        })}
      />
    </Card>
  );
};

export default ShiftAllocation;