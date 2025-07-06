import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Filter, Users, IndianRupee } from 'lucide-react';
import { Guard } from '@/types';
import { formatCurrency } from '@/lib/localService';

interface GuardSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  guards: Guard[];
  selectedGuards: string[];
  onSelectionChange: (guardIds: string[]) => void;
  onConfirm: () => void;
  maxSelections?: number;
  title: string;
  unavailableGuards?: string[];
}

const GuardSelectionModal: React.FC<GuardSelectionModalProps> = ({
  isOpen,
  onClose,
  guards,
  selectedGuards,
  onSelectionChange,
  onConfirm,
  maxSelections,
  title,
  unavailableGuards = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const filteredGuards = useMemo(() => {
    return guards.filter(guard => {
      const matchesSearch = guard.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           guard.badgeNumber.toLowerCase().includes(searchTerm.toLowerCase());
      
      const isAvailable = !unavailableGuards.includes(guard.id);
      
      if (showAvailableOnly && !isAvailable) {
        return false;
      }
      
      return matchesSearch;
    });
  }, [guards, searchTerm, showAvailableOnly, unavailableGuards]);

  const handleGuardToggle = (guardId: string) => {
    const isSelected = selectedGuards.includes(guardId);
    
    if (isSelected) {
      onSelectionChange(selectedGuards.filter(id => id !== guardId));
    } else {
      if (maxSelections && selectedGuards.length >= maxSelections) {
        return; // Don't allow more selections than max
      }
      onSelectionChange([...selectedGuards, guardId]);
    }
  };

  const handleSelectAll = () => {
    const availableGuards = filteredGuards
      .filter(guard => !unavailableGuards.includes(guard.id))
      .map(guard => guard.id);
    
    const maxToSelect = maxSelections 
      ? availableGuards.slice(0, maxSelections - selectedGuards.length)
      : availableGuards;
      
    onSelectionChange([...selectedGuards, ...maxToSelect]);
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const getGuardStatus = (guardId: string) => {
    if (unavailableGuards.includes(guardId)) {
      return 'unavailable';
    }
    if (selectedGuards.includes(guardId)) {
      return 'selected';
    }
    return 'available';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'selected':
        return <Badge className="bg-green-500">Selected</Badge>;
      case 'unavailable':
        return <Badge variant="destructive">Unavailable</Badge>;
      default:
        return <Badge variant="outline">Available</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search guards by name or badge number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="available-only"
                  checked={showAvailableOnly}
                  onCheckedChange={(checked) => setShowAvailableOnly(checked === true)}
                />
                <label htmlFor="available-only" className="text-sm">
                  Show available only
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {selectedGuards.length} selected
                  {maxSelections && ` / ${maxSelections} max`}
                </span>
                <Button variant="outline" size="sm" onClick={handleClearAll}>
                  Clear All
                </Button>
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  Select Available
                </Button>
              </div>
            </div>
          </div>

          {/* Guards List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {filteredGuards.map((guard) => {
              const status = getGuardStatus(guard.id);
              const isDisabled = status === 'unavailable' || 
                                (maxSelections && selectedGuards.length >= maxSelections && status !== 'selected');
              
              return (
                <div
                  key={guard.id}
                  className={`
                    flex items-center justify-between p-3 rounded-lg border cursor-pointer
                    transition-all duration-200 hover:shadow-sm
                    ${status === 'selected' ? 'bg-green-50 border-green-200' : 'bg-card'}
                    ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/30'}
                  `}
                  onClick={() => !isDisabled && handleGuardToggle(guard.id)}
                >
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={status === 'selected'}
                      disabled={isDisabled}
                      onCheckedChange={() => handleGuardToggle(guard.id)}
                    />
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={guard.avatar} alt={guard.name} />
                      <AvatarFallback>
                        {getInitials(guard.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium">{guard.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Badge: {guard.badgeNumber}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <IndianRupee className="h-3 w-3 mr-1" />
                        {formatCurrency(guard.payRate || 0)}/month
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(status)}
                </div>
              );
            })}
            
            {filteredGuards.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No guards found matching your criteria</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={selectedGuards.length === 0}>
            Confirm Selection ({selectedGuards.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GuardSelectionModal;