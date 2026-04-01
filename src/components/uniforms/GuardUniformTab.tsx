import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Shirt, Package, Trash2 } from 'lucide-react';
import { uniformIssuancesApi, type UniformIssuanceWithDetails } from '@/lib/uniformsApi';
import { useToast } from '@/hooks/use-toast';
import { m } from 'motion/react';
import { format } from 'date-fns';
import { IssueUniformDialog } from './IssueUniformDialog';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

const conditionColors: Record<string, string> = {
  new: 'bg-green-500/10 text-green-600',
  used: 'bg-yellow-500/10 text-yellow-600',
  returned: 'bg-blue-500/10 text-blue-600',
  damaged: 'bg-red-500/10 text-red-600',
};

interface GuardUniformTabProps {
  guardId: string;
  guardName: string;
}

export const GuardUniformTab: React.FC<GuardUniformTabProps> = ({ guardId, guardName }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);

  const { data: issuances = [], isLoading } = useQuery({
    queryKey: ['guard-uniforms', guardId],
    queryFn: () => uniformIssuancesApi.getByGuardId(guardId),
  });

  const updateConditionMutation = useMutation({
    mutationFn: ({ id, condition }: { id: string; condition: string }) =>
      uniformIssuancesApi.updateCondition(id, condition, guardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guard-uniforms', guardId] });
      queryClient.invalidateQueries({ queryKey: ['guards'] });
      toast({ title: 'Uniform status updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => uniformIssuancesApi.delete(id, guardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guard-uniforms', guardId] });
      queryClient.invalidateQueries({ queryKey: ['guards'] });
      toast({ title: 'Issuance deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const issueMutation = useMutation({
    mutationFn: (rows: { itemId: string; quantity: number; costPerUnit: number; condition: string }[]) =>
      uniformIssuancesApi.createBatch(
        rows.map(r => ({
          guard_id: guardId,
          item_id: r.itemId,
          quantity: r.quantity,
          cost_per_unit: r.costPerUnit,
          condition: r.condition,
        }))
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guard-uniforms', guardId] });
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

  const activeIssuances = issuances.filter(i => i.condition !== 'returned');
  const totalItems = activeIssuances.reduce((sum, i) => sum + i.quantity, 0);
  const totalCost = issuances.reduce((sum, i) => sum + Number(i.total_cost), 0);

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {/* Summary */}
      <div className="flex gap-2">
        <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50 flex-1">
          <span className="text-xs text-muted-foreground">Active Items</span>
          <span className="text-sm font-bold mt-0.5">{totalItems}</span>
        </div>
        <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50 flex-1">
          <span className="text-xs text-muted-foreground">Total Cost</span>
          <span className="text-sm font-bold mt-0.5">{formatCurrency(totalCost)}</span>
        </div>
      </div>

      <Button size="sm" variant="outline" className="w-full" onClick={() => setIssueDialogOpen(true)}>
        <Shirt className="h-3.5 w-3.5 mr-1" />
        Issue Uniform
      </Button>

      {/* Issuance list */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Uniform History
        </h4>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
        ) : issuances.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No uniforms issued yet
          </div>
        ) : (
          <div className="space-y-2">
            {issuances.map(issuance => (
              <div key={issuance.id} className="p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{issuance.uniform_items?.item_name}</span>
                      <Badge variant="outline" className={`text-[10px] ${conditionColors[issuance.condition] || ''}`}>
                        {issuance.condition}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {format(new Date(issuance.issued_date), 'dd MMM yyyy')}
                      {' · '}Qty: {issuance.quantity}
                      {' · '}{formatCurrency(Number(issuance.total_cost))}
                    </div>
                    {issuance.notes && (
                      <div className="text-xs text-muted-foreground mt-1 italic">{issuance.notes}</div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {issuance.condition !== 'returned' && (
                      <Select
                        value={issuance.condition}
                        onValueChange={v => updateConditionMutation.mutate({ id: issuance.id, condition: v })}
                      >
                        <SelectTrigger className="h-7 w-24 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="used">Used</SelectItem>
                          <SelectItem value="returned">Returned</SelectItem>
                          <SelectItem value="damaged">Damaged</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Issuance</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this uniform issuance record? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(issuance.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <IssueUniformDialog
        open={issueDialogOpen}
        onOpenChange={setIssueDialogOpen}
        onSubmit={(_guardId, rows) => issueMutation.mutate(rows)}
        isSubmitting={issueMutation.isPending}
        preselectedGuardId={guardId}
      />
    </m.div>
  );
};
