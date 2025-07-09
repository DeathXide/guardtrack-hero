import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { 
  Search, 
  Filter, 
  X, 
  Calendar,
  MapPin,
  Users,
  Clock
} from 'lucide-react';
import { Site, Guard } from '@/types';

interface SearchAndFilterProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sites: Site[];
  guards: Guard[];
  selectedSite: string;
  onSiteChange: (siteId: string) => void;
  // Filter states
  statusFilter: 'all' | 'present' | 'absent' | 'unassigned';
  onStatusFilterChange: (status: 'all' | 'present' | 'absent' | 'unassigned') => void;
  shiftFilter: 'all' | 'day' | 'night';
  onShiftFilterChange: (shift: 'all' | 'day' | 'night') => void;
  onClearFilters: () => void;
}

const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  searchTerm,
  onSearchChange,
  sites,
  guards,
  selectedSite,
  onSiteChange,
  statusFilter,
  onStatusFilterChange,
  shiftFilter,
  onShiftFilterChange,
  onClearFilters
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const selectedSiteData = sites.find(site => site.id === selectedSite);
  
  const getActiveFilterCount = () => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (shiftFilter !== 'all') count++;
    return count;
  };

  const getFilterLabel = (type: string, value: string) => {
    switch (type) {
      case 'status':
        switch (value) {
          case 'present': return 'Present';
          case 'absent': return 'Absent';
          case 'unassigned': return 'Unassigned';
          default: return 'All Status';
        }
      case 'shift':
        switch (value) {
          case 'day': return 'Day Shift';
          case 'night': return 'Night Shift';
          default: return 'All Shifts';
        }
      default:
        return value;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search guards by name or badge number..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-4"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSearchChange('')}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Site Selection */}
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Site:
          </Label>
          <Select value={selectedSite} onValueChange={onSiteChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select a site" />
            </SelectTrigger>
            <SelectContent>
              {sites.map(site => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filter Dropdown */}
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              Filter
              {getActiveFilterCount() > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                >
                  {getActiveFilterCount()}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Attendance Status</Label>
                <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Shift Type</Label>
                <Select value={shiftFilter} onValueChange={onShiftFilterChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shifts</SelectItem>
                    <SelectItem value="day">Day Shift</SelectItem>
                    <SelectItem value="night">Night Shift</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-between items-center pt-2 border-t">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClearFilters}
                  disabled={getActiveFilterCount() === 0}
                >
                  Clear All
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => setIsFilterOpen(false)}
                >
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Active Filter Badges */}
        {getActiveFilterCount() > 0 && (
          <div className="flex items-center gap-2">
            {statusFilter !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                Status: {getFilterLabel('status', statusFilter)}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onStatusFilterChange('all')}
                  className="ml-1 h-3 w-3 p-0 hover:bg-transparent"
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            )}
            
            {shiftFilter !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                Shift: {getFilterLabel('shift', shiftFilter)}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onShiftFilterChange('all')}
                  className="ml-1 h-3 w-3 p-0 hover:bg-transparent"
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Selected Site Info */}
      {selectedSiteData && (
        <div className="p-3 bg-muted/50 rounded-md border">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">{selectedSiteData.name}</h4>
              <p className="text-sm text-muted-foreground">{selectedSiteData.location}</p>
            </div>
            <div className="flex gap-2 text-xs">
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Day: {selectedSiteData.daySlots}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                Night: {selectedSiteData.nightSlots}
              </Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchAndFilter;