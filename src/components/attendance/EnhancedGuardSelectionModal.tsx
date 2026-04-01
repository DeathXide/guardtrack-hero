import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  Mail,
  UserPlus,
  Building2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { guardsApi, CreateGuardData } from '@/lib/guardsApi';
import GuardForm, { GuardFormData } from '@/components/forms/GuardForm';

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
  assignedElsewhere?: Map<string, string>; // guardId -> siteName
}

const EnhancedGuardSelectionModal: React.FC<EnhancedGuardSelectionModalProps> = ({
  isOpen,
  onClose,
  guards,
  onGuardSelect,
  title = "Select Guard",
  excludeGuardIds = [],
  preferredRole,
  assignedElsewhere = new Map()
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [experienceFilter, setExperienceFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('all');
  const [showGuardForm, setShowGuardForm] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mapFormToSupabase = (formData: GuardFormData): CreateGuardData => ({
    name: formData.name,
    dob: formData.dateOfBirth || null,
    gender: formData.gender,
    languages: formData.languagesSpoken || [],
    guard_photo_url: formData.guardPhoto || null,
    aadhaar_number: formData.aadhaarNumber || null,
    aadhaar_card_photo_url: formData.aadhaarCardPhoto || null,
    pan_card_number: formData.panCard || null,
    phone_number: formData.phone,
    alternate_phone_number: formData.alternatePhone || null,
    current_address: formData.currentAddress || null,
    permanent_address: formData.permanentAddress || null,
    guard_type: formData.type,
    status: formData.status,
    monthly_pay_rate: formData.payType === 'monthly' ? Number(formData.payRate) : null,
    per_shift_rate: formData.payType === 'per_shift' ? Number(formData.perShiftRate) : null,
    bank_name: formData.bankName || null,
    account_number: formData.accountNumber || null,
    ifsc_code: formData.ifscCode || null,
    upi_id: formData.upiId || null,
  });

  const createGuardMutation = useMutation({
    mutationFn: (formData: GuardFormData) => {
      const supabaseData = mapFormToSupabase(formData);
      return guardsApi.createGuard(supabaseData);
    },
  });

  const handleCreateGuard = async (data: GuardFormData) => {
    try {
      const newGuard = await createGuardMutation.mutateAsync(data);
      queryClient.invalidateQueries({ queryKey: ['guards'] });
      setShowGuardForm(false);
      // Auto-select the newly created guard
      onGuardSelect(newGuard.id);
    } catch (error: any) {
      toast({
        title: 'Error creating guard',
        description: error.message,
        variant: 'destructive',
      });
      // Re-throw so GuardForm's await catches it and does NOT show success dialog
      throw error;
    }
  };

  // All active guards (excluding the guard being replaced)
  const allActiveGuards = useMemo(() => {
    return guards.filter(guard =>
      guard.status === 'active' &&
      !excludeGuardIds.includes(guard.id)
    );
  }, [guards, excludeGuardIds]);

  // Available guards (not assigned elsewhere)
  const availableGuards = useMemo(() => {
    return allActiveGuards.filter(guard => !assignedElsewhere.has(guard.id));
  }, [allActiveGuards, assignedElsewhere]);

  // Guards assigned at other sites for this shift
  const assignedElsewhereGuards = useMemo(() => {
    return allActiveGuards.filter(guard => assignedElsewhere.has(guard.id));
  }, [allActiveGuards, assignedElsewhere]);

  // Get unique roles for filtering (from all active guards so search works across both pools)
  const uniqueRoles = useMemo(() => {
    const roles = new Set(allActiveGuards.map(guard => guard.role).filter(Boolean));
    return Array.from(roles);
  }, [allActiveGuards]);

  // Apply shared search/filter logic to any guard list
  const applyFilters = (guardList: Guard[]) => {
    let filtered = guardList;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(guard =>
        guard.name.toLowerCase().includes(term) ||
        guard.badge_number.toLowerCase().includes(term) ||
        guard.role?.toLowerCase().includes(term)
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(guard => guard.role === roleFilter);
    }

    if (experienceFilter !== 'all') {
      if (experienceFilter === 'experienced') {
        filtered = filtered.filter(guard => (guard.experience_years || 0) >= 2);
      } else if (experienceFilter === 'new') {
        filtered = filtered.filter(guard => (guard.experience_years || 0) < 2);
      }
    }

    return filtered;
  };

  // Categorize guards (search/filters applied to both available and assigned-elsewhere)
  const categorizedGuards = useMemo(() => {
    const filtered = applyFilters(availableGuards);
    const filteredElsewhere = applyFilters(assignedElsewhereGuards);

    // Categorize available guards
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
      available,
      elsewhere: filteredElsewhere,
    };
  }, [availableGuards, assignedElsewhereGuards, searchTerm, roleFilter, experienceFilter, preferredRole]);

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

  const GuardCard: React.FC<{ guard: Guard; disabled?: boolean; disabledReason?: string }> = ({ guard, disabled, disabledReason }) => {
    const experienceBadge = getExperienceBadge(guard.experience_years || 0);
    const isRecommended = categorizedGuards.recommended.includes(guard);

    return (
      <div
        className={`group relative p-4 md:p-5 border rounded-lg transition-all duration-200 ${
          disabled
            ? 'opacity-60 cursor-not-allowed bg-muted/30 border-muted'
            : `hover:bg-muted/50 active:bg-muted/70 cursor-pointer hover:shadow-md ${
                isRecommended ? 'border-primary/30 bg-primary/5' : 'border-border'
              }`
        }`}
        onClick={() => !disabled && handleGuardSelect(guard.id)}
      >
        {isRecommended && !disabled && (
          <div className="absolute top-2 right-2">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
          </div>
        )}

        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className={`font-medium ${disabled ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
              {getInitials(guard.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm truncate">{guard.name}</h4>
              {disabledReason && (
                <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800">
                  <Building2 className="h-3 w-3 mr-1" />
                  {disabledReason}
                </Badge>
              )}
              {isRecommended && !disabled && (
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

          {!disabled && (
            <Button variant="outline" size="sm" className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity h-10 px-4">
              Select
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] md:max-w-[760px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Select a guard to assign to this slot. Recommended guards are highlighted.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden">
          {/* Create New Guard */}
          <Button
            variant="outline"
            className="w-full gap-2 h-12 border-dashed border-primary/50 text-primary hover:bg-primary/5 active:bg-primary/10 text-sm"
            onClick={() => setShowGuardForm(true)}
          >
            <UserPlus className="h-5 w-5" />
            Create New Guard
          </Button>

          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, badge, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-11"
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
            <TabsList className={`grid w-full ${categorizedGuards.elsewhere.length > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
              <TabsTrigger value="all" className="text-xs">
                All ({categorizedGuards.all.length + categorizedGuards.elsewhere.length})
              </TabsTrigger>
              <TabsTrigger value="recommended" className="text-xs">
                Recommended ({categorizedGuards.recommended.length})
              </TabsTrigger>
              <TabsTrigger value="available" className="text-xs">
                Available ({categorizedGuards.available.length})
              </TabsTrigger>
              {categorizedGuards.elsewhere.length > 0 && (
                <TabsTrigger value="elsewhere" className="text-xs">
                  At Other Sites ({categorizedGuards.elsewhere.length})
                </TabsTrigger>
              )}
            </TabsList>

            <div className="flex-1 mt-3">
              <TabsContent value="all" className="h-full mt-0">
                <div className="h-[400px] overflow-y-auto space-y-3 pr-2">
                  {categorizedGuards.all.length === 0 && categorizedGuards.elsewhere.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No guards found matching your criteria</p>
                    </div>
                  ) : (
                    <>
                      {/* Available guards first */}
                      {categorizedGuards.all.map(guard => (
                        <GuardCard key={guard.id} guard={guard} />
                      ))}

                      {/* Assigned elsewhere guards at the bottom, with separator */}
                      {categorizedGuards.elsewhere.length > 0 && (
                        <>
                          {categorizedGuards.all.length > 0 && (
                            <div className="flex items-center gap-2 pt-2 pb-1">
                              <div className="flex-1 border-t border-border" />
                              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide shrink-0">
                                Assigned at other sites
                              </span>
                              <div className="flex-1 border-t border-border" />
                            </div>
                          )}
                          {categorizedGuards.all.length === 0 && (
                            <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 mb-1">
                              No available guards match your search. These guards are assigned at other sites:
                            </div>
                          )}
                          {categorizedGuards.elsewhere.map(guard => (
                            <GuardCard
                              key={guard.id}
                              guard={guard}
                              disabled
                              disabledReason={`At ${assignedElsewhere.get(guard.id) || 'another site'}`}
                            />
                          ))}
                        </>
                      )}
                    </>
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

              <TabsContent value="elsewhere" className="h-full mt-0">
                <div className="h-[400px] overflow-y-auto space-y-3 pr-2">
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 mb-2">
                    These guards are already assigned at other sites for this shift. They cannot be selected here.
                  </div>
                  {categorizedGuards.elsewhere.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No guards assigned at other sites</p>
                    </div>
                  ) : (
                    categorizedGuards.elsewhere.map(guard => (
                      <GuardCard
                        key={guard.id}
                        guard={guard}
                        disabled
                        disabledReason={`At ${assignedElsewhere.get(guard.id) || 'another site'}`}
                      />
                    ))
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>

      {/* Nested Guard Creation Dialog */}
      <Dialog open={showGuardForm} onOpenChange={setShowGuardForm}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Guard</DialogTitle>
            <DialogDescription>
              Fill in the guard details. The guard will be automatically assigned to the slot after creation.
            </DialogDescription>
          </DialogHeader>
          <GuardForm
            onSubmit={handleCreateGuard}
            onCancel={() => setShowGuardForm(false)}
            isLoading={createGuardMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default EnhancedGuardSelectionModal;