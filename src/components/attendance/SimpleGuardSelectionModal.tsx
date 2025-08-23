import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Guard {
  id: string;
  name: string;
  badge_number: string;
  status: string;
}

interface SimpleGuardSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  guards: Guard[];
  onGuardSelect: (guardId: string) => void;
  title?: string;
}

const SimpleGuardSelectionModal: React.FC<SimpleGuardSelectionModalProps> = ({
  isOpen,
  onClose,
  guards,
  onGuardSelect,
  title = "Select Guard"
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter available guards (active status)
  const availableGuards = useMemo(() => {
    return guards.filter(guard => guard.status === 'active');
  }, [guards]);

  // Filter guards based on search
  const filteredGuards = useMemo(() => {
    return availableGuards.filter(guard =>
      guard.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guard.badge_number.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableGuards, searchTerm]);

  const handleGuardSelect = (guardId: string) => {
    onGuardSelect(guardId);
    setSearchTerm('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Select a guard to assign to this slot
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or badge number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Guards List */}
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {filteredGuards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No guards found matching your search</p>
              </div>
            ) : (
              filteredGuards.map(guard => (
                <div
                  key={guard.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleGuardSelect(guard.id)}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {guard.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{guard.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {guard.badge_number}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Status: {guard.status}
                    </p>
                  </div>
                  
                  <Button variant="outline" size="sm">
                    Select
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SimpleGuardSelectionModal;