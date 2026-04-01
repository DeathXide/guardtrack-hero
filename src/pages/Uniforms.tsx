import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { m } from 'motion/react';
import { Shirt, Package, Users, IndianRupee, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  uniformIssuancesApi,
  uniformItemsApi,
  type UniformIssuanceWithDetails,
} from '@/lib/uniformsApi';
import { IssueUniformDialog } from '@/components/uniforms/IssueUniformDialog';
import { format } from 'date-fns';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

const conditionColors: Record<string, string> = {
  new: 'bg-green-500/10 text-green-600 border-green-200',
  used: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
  returned: 'bg-blue-500/10 text-blue-600 border-blue-200',
  damaged: 'bg-red-500/10 text-red-600 border-red-200',
};

export default function Uniforms() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [itemFilter, setItemFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [groupByGuard, setGroupByGuard] = useState(false);

  // Queries
  const { data: issuances = [], isLoading } = useQuery({
    queryKey: ['uniform-issuances'],
    queryFn: () => uniformIssuancesApi.getAll(),
  });

  const { data: summary } = useQuery({
    queryKey: ['uniform-summary'],
    queryFn: () => uniformIssuancesApi.getSummary(),
  });

  const { data: uniformItems = [] } = useQuery({
    queryKey: ['uniform-items'],
    queryFn: () => uniformItemsApi.getActiveItems(),
  });

  // Mutations
  const issueMutation = useMutation({
    mutationFn: ({ guardId, rows }: { guardId: string; rows: any[] }) =>
      uniformIssuancesApi.createBatch(
        rows.map((r: any) => ({
          guard_id: guardId,
          item_id: r.itemId,
          quantity: r.quantity,
          cost_per_unit: r.costPerUnit,
          condition: r.condition,
        }))
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uniform-issuances'] });
      queryClient.invalidateQueries({ queryKey: ['uniform-summary'] });
      queryClient.invalidateQueries({ queryKey: ['guards'] });
      setIssueDialogOpen(false);
      toast({ title: 'Uniform issued successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateConditionMutation = useMutation({
    mutationFn: ({ id, condition, guardId }: { id: string; condition: string; guardId: string }) =>
      uniformIssuancesApi.updateCondition(id, condition, guardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uniform-issuances'] });
      queryClient.invalidateQueries({ queryKey: ['uniform-summary'] });
      queryClient.invalidateQueries({ queryKey: ['guards'] });
      toast({ title: 'Condition updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, guardId }: { id: string; guardId: string }) =>
      uniformIssuancesApi.delete(id, guardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uniform-issuances'] });
      queryClient.invalidateQueries({ queryKey: ['uniform-summary'] });
      queryClient.invalidateQueries({ queryKey: ['guards'] });
      toast({ title: 'Issuance deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Filtering
  const filtered = useMemo(() => {
    return issuances.filter(i => {
      if (searchQuery) {
        const guardName = i.guards?.name?.toLowerCase() || '';
        const badge = i.guards?.badge_number?.toLowerCase() || '';
        const q = searchQuery.toLowerCase();
        if (!guardName.includes(q) && !badge.includes(q)) return false;
      }
      if (itemFilter !== 'all' && i.item_id !== itemFilter) return false;
      if (conditionFilter !== 'all' && i.condition !== conditionFilter) return false;
      return true;
    });
  }, [issuances, searchQuery, itemFilter, conditionFilter]);

  // Group by guard
  const grouped = useMemo(() => {
    if (!groupByGuard) return null;
    const groups: Record<string, { guardName: string; badge: string; items: UniformIssuanceWithDetails[]; totalCost: number }> = {};
    filtered.forEach(i => {
      const gid = i.guard_id;
      if (!groups[gid]) {
        groups[gid] = {
          guardName: i.guards?.name || 'Unknown',
          badge: i.guards?.badge_number || '',
          items: [],
          totalCost: 0,
        };
      }
      groups[gid].items.push(i);
      groups[gid].totalCost += Number(i.total_cost);
    });
    return Object.entries(groups).sort(([, a], [, b]) => a.guardName.localeCompare(b.guardName));
  }, [filtered, groupByGuard]);

  const summaryCards = [
    { label: 'Total Items Issued', value: summary?.totalIssued ?? 0, icon: Package, color: 'text-blue-600' },
    { label: 'Total Cost', value: formatCurrency(summary?.totalCost ?? 0), icon: IndianRupee, color: 'text-green-600' },
    { label: 'Guards with Uniforms', value: summary?.guardsWithUniform ?? 0, icon: Users, color: 'text-violet-600' },
    { label: 'Guards without Uniforms', value: summary?.guardsWithoutUniform ?? 0, icon: Users, color: 'text-orange-600' },
  ];

  const renderIssuanceRow = (issuance: UniformIssuanceWithDetails, showGuard = true) => (
    <TableRow key={issuance.id}>
      {showGuard && (
        <TableCell className="font-medium">
          <div>{issuance.guards?.name}</div>
          <div className="text-xs text-muted-foreground">{issuance.guards?.badge_number}</div>
        </TableCell>
      )}
      <TableCell>{issuance.uniform_items?.item_name}</TableCell>
      <TableCell className="text-center">{issuance.quantity}</TableCell>
      <TableCell className="text-right">{formatCurrency(Number(issuance.cost_per_unit))}</TableCell>
      <TableCell className="text-right font-medium">{formatCurrency(Number(issuance.total_cost))}</TableCell>
      <TableCell>{format(new Date(issuance.issued_date), 'dd MMM yyyy')}</TableCell>
      <TableCell>
        <Select
          value={issuance.condition}
          onValueChange={v =>
            updateConditionMutation.mutate({ id: issuance.id, condition: v, guardId: issuance.guard_id })
          }
        >
          <SelectTrigger className="h-7 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="used">Used</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
            <SelectItem value="damaged">Damaged</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive">
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Issuance</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this uniform issuance record. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteMutation.mutate({ id: issuance.id, guardId: issuance.guard_id })}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Uniform Management</h1>
          <p className="text-muted-foreground text-sm">Track and manage uniform issuances</p>
        </div>
        <Button onClick={() => setIssueDialogOpen(true)}>
          <Shirt className="h-4 w-4 mr-2" />
          Issue Uniform
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <m.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted ${card.color}`}>
                    <card.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                    <p className="text-lg font-bold">{card.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </m.div>
        ))}
      </div>

      {/* Filters */}
      <m.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.2 }}
        className="flex flex-wrap items-center gap-3"
      >
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by guard name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={itemFilter} onValueChange={setItemFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-3.5 w-3.5 mr-1" />
            <SelectValue placeholder="Item type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            {uniformItems.map(item => (
              <SelectItem key={item.id} value={item.id}>{item.item_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={conditionFilter} onValueChange={setConditionFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Conditions</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="used">Used</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
            <SelectItem value="damaged">Damaged</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch checked={groupByGuard} onCheckedChange={setGroupByGuard} id="group-by-guard" />
          <Label htmlFor="group-by-guard" className="text-sm cursor-pointer">Group by Guard</Label>
        </div>
      </m.div>

      {/* Table */}
      <m.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.3 }}
      >
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Loading uniform records...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">No uniform records found</p>
            <p className="text-sm mt-1">Issue uniforms to guards to get started</p>
          </div>
        ) : groupByGuard && grouped ? (
          <div className="space-y-6">
            {grouped.map(([guardId, group]) => (
              <Card key={guardId}>
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <div>
                    <span className="font-semibold">{group.guardName}</span>
                    <span className="text-xs text-muted-foreground ml-2">{group.badge}</span>
                  </div>
                  <Badge variant="secondary">{formatCurrency(group.totalCost)}</Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Cost/Unit</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map(i => renderIssuanceRow(i, false))}
                  </TableBody>
                </Table>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guard</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Cost/Unit</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(i => renderIssuanceRow(i, true))}
              </TableBody>
            </Table>
          </Card>
        )}
      </m.div>

      {/* Issue Uniform Dialog */}
      <IssueUniformDialog
        open={issueDialogOpen}
        onOpenChange={setIssueDialogOpen}
        onSubmit={(guardId, rows) => issueMutation.mutate({ guardId, rows })}
        isSubmitting={issueMutation.isPending}
      />
    </div>
  );
}
