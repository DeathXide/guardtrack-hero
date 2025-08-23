import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  User, 
  Filter,
  Star,
  Clock,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';

interface Guard {
  id: string;
  name: string;
  badge_number: string;
  status: string;
  role?: string;
  phone?: string;
  email?: string;
  experience_years?: number;
  skills?: string[];
}

interface EnhancedGuardSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  guards: Guard[];
  onGuardSelect: (guardId: string) => void;
  title?: string;
  excludeGuardIds?: string[];
  preferredRole?: string;
}

const EnhancedGuardSelectionModal: React.FC<EnhancedGuardSelectionModalProps> = ({
  isOpen,
  onClose,
  guards,
  onGuardSelect,
  title = "Select Guard",
  excludeGuardIds = [],
  preferredRole
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [experienceFilter, setExperienceFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('all');

  // Filter available guards
  const availableGuards = useMemo(() => {
    return guards.filter(guard => 
      guard.status === 'active' && 
      !excludeGuardIds.includes(guard.id)
    );
  }, [guards, excludeGuardIds]);

  // Get unique roles for filtering
  const uniqueRoles = useMemo(() => {
    const roles = new Set(availableGuards.map(guard => guard.role).filter(Boolean));
    return Array.from(roles);
  }, [availableGuards]);

  // Categorize guards
  const categorizedGuards = useMemo(() => {
    let filtered = availableGuards;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(guard =>
        guard.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guard.badge_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guard.role?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(guard => guard.role === roleFilter);
    }

    // Apply experience filter
    if (experienceFilter !== 'all') {
      if (experienceFilter === 'experienced') {
        filtered = filtered.filter(guard => (guard.experience_years || 0) >= 2);
      } else if (experienceFilter === 'new') {
        filtered = filtered.filter(guard => (guard.experience_years || 0) < 2);
      }
    }

    // Categorize
    const recommended = filtered.filter(guard => 
      guard.role === preferredRole || 
      (guard.experience_years || 0) >= 3
    );
    
    const available = filtered.filter(guard => 
      !recommended.includes(guard)
    );

    return {
      all: filtered,
      recommended,
      available
    };
  }, [availableGuards, searchTerm, roleFilter, experienceFilter, preferredRole]);

  const handleGuardSelect = (guardId: string) => {
    onGuardSelect(guardId);
    setSearchTerm('');
    setRoleFilter('all');
    setExperienceFilter('all');
    setActiveTab('all');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getExperienceBadge = (years: number) => {
    if (years >= 5) return { text: 'Expert', className: 'bg-purple-100 text-purple-700' };
    if (years >= 2) return { text: 'Experienced', className: 'bg-blue-100 text-blue-700' };
    return { text: 'New', className: 'bg-green-100 text-green-700' };
  };

  const GuardCard: React.FC<{ guard: Guard }> = ({ guard }) => {
    const experienceBadge = getExperienceBadge(guard.experience_years || 0);
    const isRecommended = categorizedGuards.recommended.includes(guard);

    return (
      <div
        className={`group relative p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-all duration-200 hover:shadow-md ${
          isRecommended ? 'border-primary/30 bg-primary/5' : 'border-border'
        }`}
        onClick={() => handleGuardSelect(guard.id)}
      >
        {isRecommended && (
          <div className="absolute top-2 right-2">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
          </div>
        )}
        
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {getInitials(guard.name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm truncate">{guard.name}</h4>
              {isRecommended && (
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                  Recommended
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {guard.badge_number}
              </span>
              {guard.experience_years !== undefined && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {guard.experience_years}y exp
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {guard.role && (
                <Badge variant="outline" className="text-xs">
                  {guard.role}
                </Badge>
              )}
              <Badge className={`text-xs ${experienceBadge.className}`}>
                {experienceBadge.text}
              </Badge>
            </div>

            {(guard.phone || guard.email) && (
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                {guard.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {guard.phone}
                  </div>
                )}
                {guard.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {guard.email}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <Button variant="outline" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
            Select
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Select a guard to assign to this slot. Recommended guards are highlighted.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden">
          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, badge, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {uniqueRoles.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={experienceFilter} onValueChange={setExperienceFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Experience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Experience</SelectItem>
                  <SelectItem value="experienced">Experienced (2+ years)</SelectItem>
                  <SelectItem value="new">New (Under 2 years)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabs for different categories */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all" className="text-xs">
                All ({categorizedGuards.all.length})
              </TabsTrigger>
              <TabsTrigger value="recommended" className="text-xs">
                Recommended ({categorizedGuards.recommended.length})
              </TabsTrigger>
              <TabsTrigger value="available" className="text-xs">
                Available ({categorizedGuards.available.length})
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 mt-3">
              <TabsContent value="all" className="h-full mt-0">
                <div className="h-[400px] overflow-y-auto space-y-3 pr-2">
                  {categorizedGuards.all.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No guards found matching your criteria</p>
                    </div>
                  ) : (
                    categorizedGuards.all.map(guard => (
                      <GuardCard key={guard.id} guard={guard} />
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="recommended" className="h-full mt-0">
                <div className="h-[400px] overflow-y-auto space-y-3 pr-2">
                  {categorizedGuards.recommended.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No recommended guards available</p>
                    </div>
                  ) : (
                    categorizedGuards.recommended.map(guard => (
                      <GuardCard key={guard.id} guard={guard} />
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="available" className="h-full mt-0">
                <div className="h-[400px] overflow-y-auto space-y-3 pr-2">
                  {categorizedGuards.available.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No other guards available</p>
                    </div>
                  ) : (
                    categorizedGuards.available.map(guard => (
                      <GuardCard key={guard.id} guard={guard} />
                    ))
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedGuardSelectionModal;