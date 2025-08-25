import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Plus, Edit, Trash, Search, Filter, MoreVertical, Trash2, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { sitesApi } from '@/lib/sitesApi';
import { useToast } from '@/hooks/use-toast';
import { PageLoader } from '@/components/ui/loader';

// Type for the actual database site structure
interface DatabaseSite {
  id: string;
  site_name: string;
  organization_name: string;
  address: string;
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

const SitesTable: React.FC<SitesTableProps> = ({ onCreateSite, onEditSite }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [gstFilter, setGstFilter] = useState<string>('all');
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

  // Filter sites based on search and filters
  const filteredSites = (sites as DatabaseSite[]).filter((site: DatabaseSite) => {
    const matchesSearch = site.site_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.organization_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.address?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || site.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || site.site_category === categoryFilter;
    const matchesGst = gstFilter === 'all' || site.gst_type === gstFilter;
    
    return matchesSearch && matchesStatus && matchesCategory && matchesGst;
  });

  // Get unique values for filters
  const categories = [...new Set((sites as DatabaseSite[]).map((site: DatabaseSite) => site.site_category).filter(Boolean))];
  const gstTypes = [...new Set((sites as DatabaseSite[]).map((site: DatabaseSite) => site.gst_type).filter(Boolean))];

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
      setSelectedSites(new Set(filteredSites.map(site => site.id)));
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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search sites..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
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

            <div className="space-y-2">
              <label className="text-sm font-medium">GST Type</label>
              <Select value={gstFilter} onValueChange={setGstFilter}>
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
          Showing {filteredSites.length} of {sites.length} sites
        </p>
        {(searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' || gstFilter !== 'all') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setCategoryFilter('all');
              setGstFilter('all');
            }}
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
                    checked={filteredSites.length > 0 && selectedSites.size === filteredSites.length}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all sites"
                  />
                </TableHead>
                <TableHead>Site Name</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>GST Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No sites found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredSites.map((site: DatabaseSite) => (
                  <TableRow 
                    key={site.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(site.id)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedSites.has(site.id)}
                        onCheckedChange={(checked) => handleSelectSite(site.id, checked as boolean)}
                        aria-label={`Select ${site.site_name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{site.site_name}</TableCell>
                    <TableCell>{site.organization_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{site.site_category}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{site.address}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{site.gst_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={site.status === 'active' ? 'default' : 'secondary'}
                      >
                        {site.status}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(site.id);
                          }}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => handleEditClick(site, e)}
                          title="Edit Site"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={(e) => handleDeleteClick(site.id, e)}
                          title="Delete Site"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
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