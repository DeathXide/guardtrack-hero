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
import { Plus, Edit, Trash, Search, Filter } from 'lucide-react';
import { fetchSites, deleteSite } from '@/lib/supabaseService';
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
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: fetchSites
  });

  const deleteSiteMutation = useMutation({
    mutationFn: deleteSite,
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

  // Filter sites based on search and filters
  const filteredSites = (sites as any[]).filter((site: any) => {
    const matchesSearch = site.site_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.organization_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.address?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || site.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || site.site_category === categoryFilter;
    const matchesGst = gstFilter === 'all' || site.gst_type === gstFilter;
    
    return matchesSearch && matchesStatus && matchesCategory && matchesGst;
  });

  // Get unique values for filters
  const categories = [...new Set((sites as any[]).map((site: any) => site.site_category).filter(Boolean))];
  const gstTypes = [...new Set((sites as any[]).map((site: any) => site.gst_type).filter(Boolean))];

  const handleDeleteClick = (siteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSiteId(siteId);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (site: any, e: React.MouseEvent) => {
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
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No sites found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredSites.map((site: any) => (
                  <TableRow 
                    key={site.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(site.id)}
                  >
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
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => handleEditClick(site, e)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={(e) => handleDeleteClick(site.id, e)}
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
    </div>
  );
};

export default SitesTable;