import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePersistedFilters } from '@/hooks/usePersistedFilters';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash, Search, Filter, Trash2, Eye, Building2, Users, IndianRupee, ArrowUpDown, ArrowUp, ArrowDown, MapPin } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { sitesApi } from '@/lib/sitesApi';
import { useToast } from '@/hooks/use-toast';
import { PageLoader } from '@/components/ui/loader';

// Type for the actual database site structure
interface DatabaseSite {
  id: string;
  site_name: string;
  organization_name: string;
  address: string;
  address_line1?: string;
  address_line2?: string;
  address_line3?: string;
  site_category: string;
  gst_type: string;
  gst_number?: string;
  status: string;
  created_at: string;
  updated_at: string;
  staffing_requirements?: any[];
}

interface SitesTableProps {
  onCreateSite: () => void;
  onEditSite: (site: any) => void;
}

type SortField = 'site_name' | 'budget' | 'slots' | 'status' | 'created_at';
type SortDirection = 'asc' | 'desc';

const SitesTable: React.FC<SitesTableProps> = ({ onCreateSite, onEditSite }) => {
  const filterDefaults = useMemo(() => ({
    search: '',
    status: 'all',
    category: 'all',
    gst: 'all',
    sort: 'site_name',
    dir: 'asc',
  }), []);
  const { values: filters, setFilter, resetFilters } = usePersistedFilters(filterDefaults);
  const searchTerm = filters.search;
  const statusFilter = filters.status;
  const categoryFilter = filters.category;
  const gstFilter = filters.gst;
  const sortField = (filters.sort || 'site_name') as SortField;
  const sortDirection = (filters.dir || 'asc') as SortDirection;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [selectedSites, setSelectedSites] = useState<Set<string>>(new Set());
  const [bulkStatusUpdate, setBulkStatusUpdate] = useState<'active' | 'inactive' | 'temp' | ''>('');

  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: sitesApi.getAllSites
  });

  const deleteSiteMutation = useMutation({
    mutationFn: sitesApi.deleteSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast({
        title: "Site Deleted",
        description: "The site has been successfully deleted",
      });
      setDeleteDialogOpen(false);
      setSelectedSiteId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete site: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (siteIds: string[]) => {
      await Promise.all(siteIds.map(id => sitesApi.deleteSite(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast({
        title: "Sites Deleted",
        description: `Successfully deleted ${selectedSites.size} sites`,
      });
      setBulkDeleteDialogOpen(false);
      setSelectedSites(new Set());
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete sites: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const bulkStatusUpdateMutation = useMutation({
    mutationFn: async ({ siteIds, status }: { siteIds: string[], status: 'active' | 'inactive' | 'temp' }) => {
      const sitesToUpdate = sites.filter(site => siteIds.includes(site.id));
      await Promise.all(
        sitesToUpdate.map(site =>
          sitesApi.updateSite({
            id: site.id,
            site_name: site.site_name,
            organization_name: site.organization_name,
            gst_number: site.gst_number || '',
            gst_type: site.gst_type as 'GST' | 'NGST' | 'RCM' | 'PERSONAL',
            address_line1: site.address_line1 || '',
            address_line2: site.address_line2 || '',
            address_line3: site.address_line3 || '',
            site_category: site.site_category,
            personal_billing_name: site.personal_billing_name || '',
            status: status,
            staffing_requirements: site.staffing_requirements || []
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast({
        title: "Status Updated",
        description: `Successfully updated status for ${selectedSites.size} sites`,
      });
      setSelectedSites(new Set());
      setBulkStatusUpdate('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update status: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Calculate helpers
  const calculateSiteBudget = (site: DatabaseSite) => {
    if (!site.staffing_requirements) return 0;
    return site.staffing_requirements.reduce((total: number, req: any) =>
      total + (req.budget_per_slot * (req.day_slots + req.night_slots)), 0
    );
  };

  const calculateDaySlots = (site: DatabaseSite) => {
    if (!site.staffing_requirements) return 0;
    return site.staffing_requirements.reduce((total: number, req: any) => total + req.day_slots, 0);
  };

  const calculateNightSlots = (site: DatabaseSite) => {
    if (!site.staffing_requirements) return 0;
    return site.staffing_requirements.reduce((total: number, req: any) => total + req.night_slots, 0);
  };

  const calculateTotalSlots = (site: DatabaseSite) => calculateDaySlots(site) + calculateNightSlots(site);

  // Filter sites
  const filteredAndSortedSites = useMemo(() => {
    const filtered = (sites as DatabaseSite[]).filter((site: DatabaseSite) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = site.site_name?.toLowerCase().includes(searchLower) ||
        site.organization_name?.toLowerCase().includes(searchLower) ||
        site.address_line1?.toLowerCase().includes(searchLower) ||
        site.address_line2?.toLowerCase().includes(searchLower) ||
        site.address?.toLowerCase().includes(searchLower);

      const matchesStatus = statusFilter === 'all' || site.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || site.site_category === categoryFilter;
      const matchesGst = gstFilter === 'all' || site.gst_type === gstFilter;

      return matchesSearch && matchesStatus && matchesCategory && matchesGst;
    });

    // Sort
    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'site_name':
          cmp = a.site_name.localeCompare(b.site_name);
          break;
        case 'budget':
          cmp = calculateSiteBudget(a) - calculateSiteBudget(b);
          break;
        case 'slots':
          cmp = calculateTotalSlots(a) - calculateTotalSlots(b);
          break;
        case 'status':
          cmp = (a.status || '').localeCompare(b.status || '');
          break;
        case 'created_at':
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        default:
          cmp = a.site_name.localeCompare(b.site_name);
      }
      return sortDirection === 'desc' ? -cmp : cmp;
    });

    return filtered;
  }, [sites, searchTerm, statusFilter, categoryFilter, gstFilter, sortField, sortDirection]);

  // Get unique values for filters
  const categories = [...new Set((sites as DatabaseSite[]).map((site: DatabaseSite) => site.site_category).filter(Boolean))].sort();
  const gstTypes = [...new Set((sites as DatabaseSite[]).map((site: DatabaseSite) => site.gst_type).filter(Boolean))].sort();

  // Summary stats
  const summaryStats = useMemo(() => {
    const allSites = sites as DatabaseSite[];
    const activeSites = allSites.filter(s => s.status === 'active');
    const totalDaySlots = allSites.reduce((sum, s) => sum + calculateDaySlots(s), 0);
    const totalNightSlots = allSites.reduce((sum, s) => sum + calculateNightSlots(s), 0);
    const totalBudget = allSites.reduce((sum, s) => sum + calculateSiteBudget(s), 0);
    return {
      total: allSites.length,
      active: activeSites.length,
      inactive: allSites.filter(s => s.status === 'inactive').length,
      temp: allSites.filter(s => s.status === 'temp').length,
      daySlots: totalDaySlots,
      nightSlots: totalNightSlots,
      totalBudget,
    };
  }, [sites]);

  // Sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setFilter('dir', sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setFilter('sort', field);
      setFilter('dir', 'asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // Status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100 border-gray-200">Inactive</Badge>;
      case 'temp':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">Temporary</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Row styling based on status
  const getRowClassName = (site: DatabaseSite) => {
    const base = 'cursor-pointer hover:bg-muted/50 transition-colors';
    if (site.status === 'inactive') return `${base} opacity-60`;
    if (site.status === 'temp') return `${base} border-l-2 border-l-amber-400`;
    return base;
  };

  const handleDeleteClick = (siteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSiteId(siteId);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (site: DatabaseSite, e: React.MouseEvent) => {
    e.stopPropagation();
    onEditSite(site);
  };

  const confirmDelete = () => {
    if (selectedSiteId) {
      deleteSiteMutation.mutate(selectedSiteId);
    }
  };

  const handleRowClick = (siteId: string) => {
    navigate(`/sites/${siteId}`);
  };

  const handleSelectSite = (siteId: string, checked: boolean) => {
    const newSelection = new Set(selectedSites);
    if (checked) {
      newSelection.add(siteId);
    } else {
      newSelection.delete(siteId);
    }
    setSelectedSites(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSites(new Set(filteredAndSortedSites.map(site => site.id)));
    } else {
      setSelectedSites(new Set());
    }
  };

  const handleBulkStatusUpdate = () => {
    if (bulkStatusUpdate && (bulkStatusUpdate === 'active' || bulkStatusUpdate === 'inactive' || bulkStatusUpdate === 'temp') && selectedSites.size > 0) {
      bulkStatusUpdateMutation.mutate({
        siteIds: Array.from(selectedSites),
        status: bulkStatusUpdate
      });
    }
  };

  const handleBulkDelete = () => {
    setBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate(Array.from(selectedSites));
  };

  if (isLoading) {
    return <PageLoader />;
  }

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' || gstFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sites Management</h1>
          <p className="text-muted-foreground">
            Manage all your security sites and their configurations
          </p>
        </div>
        <Button onClick={onCreateSite}>
          <Plus className="h-4 w-4 mr-2" />
          Add Site
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sites</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">{summaryStats.total}</p>
                  {summaryStats.inactive > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({summaryStats.inactive} inactive)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Building2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Sites</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-emerald-600">{summaryStats.active}</p>
                  {summaryStats.temp > 0 && (
                    <span className="text-xs text-amber-600">
                      +{summaryStats.temp} temp
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Slots</p>
                <p className="text-2xl font-bold">
                  <span className="text-blue-600">{summaryStats.daySlots}</span>
                  <span className="text-xs font-normal text-muted-foreground mx-1">D</span>
                  <span className="text-indigo-600">{summaryStats.nightSlots}</span>
                  <span className="text-xs font-normal text-muted-foreground ml-1">N</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <IndianRupee className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Budget</p>
                <p className="text-2xl font-bold text-orange-600">
                  {summaryStats.totalBudget >= 100000
                    ? `₹${(summaryStats.totalBudget / 100000).toFixed(1)}L`
                    : `₹${summaryStats.totalBudget.toLocaleString()}`
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, org, address..."
                  defaultValue={searchTerm}
                  onChange={(e) => setFilter('search', e.target.value, 300)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={(v) => setFilter('status', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="temp">Temporary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Category</label>
              <Select value={categoryFilter} onValueChange={(v) => setFilter('category', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">GST Type</label>
              <Select value={gstFilter} onValueChange={(v) => setFilter('gst', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All GST types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All GST Types</SelectItem>
                  {gstTypes.map(gstType => (
                    <SelectItem key={gstType} value={gstType}>
                      {gstType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedSites.size > 0 && (
        <Card className="bg-accent/50 border-accent">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="font-medium">
                  {selectedSites.size} sites selected
                </span>
                <div className="flex items-center gap-2">
                  <Select value={bulkStatusUpdate} onValueChange={(value) => setBulkStatusUpdate(value as 'active' | 'inactive' | 'temp' | '')}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="temp">Temporary</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleBulkStatusUpdate}
                    disabled={!bulkStatusUpdate || bulkStatusUpdateMutation.isPending}
                    size="sm"
                  >
                    Update Status
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleBulkDelete}
                  variant="destructive"
                  size="sm"
                  disabled={bulkDeleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
                <Button
                  onClick={() => setSelectedSites(new Set())}
                  variant="outline"
                  size="sm"
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredAndSortedSites.length} of {sites.length} sites
        </p>
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Sites Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={filteredAndSortedSites.length > 0 && selectedSites.size === filteredAndSortedSites.length}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all sites"
                  />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort('site_name')}
                >
                  <div className="flex items-center">
                    Site
                    <SortIcon field="site_name" />
                  </div>
                </TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Category</TableHead>
                <TableHead
                  className="cursor-pointer select-none text-center"
                  onClick={() => handleSort('slots')}
                >
                  <div className="flex items-center justify-center">
                    Slots
                    <SortIcon field="slots" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort('budget')}
                >
                  <div className="flex items-center">
                    Budget
                    <SortIcon field="budget" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">
                    Status
                    <SortIcon field="status" />
                  </div>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedSites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No sites found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedSites.map((site: DatabaseSite) => {
                  const daySlots = calculateDaySlots(site);
                  const nightSlots = calculateNightSlots(site);
                  const budget = calculateSiteBudget(site);

                  return (
                    <TableRow
                      key={site.id}
                      className={getRowClassName(site)}
                      onClick={() => handleRowClick(site.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedSites.has(site.id)}
                          onCheckedChange={(checked) => handleSelectSite(site.id, checked as boolean)}
                          aria-label={`Select ${site.site_name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{site.site_name}</span>
                          {site.address_line1 && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {site.address_line1}
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{site.organization_name}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{site.site_category}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 text-sm">
                          <span className="font-medium">{daySlots}</span>
                          <span className="text-muted-foreground text-xs">D</span>
                          <span className="text-muted-foreground">/</span>
                          <span className="font-medium">{nightSlots}</span>
                          <span className="text-muted-foreground text-xs">N</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        ₹{budget.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(site.status)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRowClick(site.id);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Details</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => handleEditClick(site, e)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit Site</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={(e) => handleDeleteClick(site.id, e)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete Site</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the site and all associated records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteSiteMutation.isPending}
            >
              {deleteSiteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedSites.size} Sites?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all selected sites and their associated records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? 'Deleting...' : `Delete ${selectedSites.size} Sites`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SitesTable;
