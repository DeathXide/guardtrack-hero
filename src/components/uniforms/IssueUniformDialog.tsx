import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { guardsApi } from '@/lib/guardsApi';
import { uniformItemsApi, type UniformItem } from '@/lib/uniformsApi';

interface IssuanceRow {
  itemId: string;
  quantity: number;
  costPerUnit: number;
  condition: 'new' | 'used';
  notes: string;
}

const emptyRow = (): IssuanceRow => ({
  itemId: '',
  quantity: 1,
  costPerUnit: 0,
  condition: 'new',
  notes: '',
});

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

interface IssueUniformDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (guardId: string, rows: IssuanceRow[]) => void;
  isSubmitting: boolean;
  preselectedGuardId?: string;
}

export const IssueUniformDialog: React.FC<IssueUniformDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  preselectedGuardId,
}) => {
  const [selectedGuardId, setSelectedGuardId] = useState('');
  const [guardSearch, setGuardSearch] = useState('');
  const [rows, setRows] = useState<IssuanceRow[]>([emptyRow()]);

  const { data: guards = [] } = useQuery({
    queryKey: ['guards-active'],
    queryFn: () => guardsApi.getGuardsByStatus('active'),
  });

  const { data: uniformItems = [] } = useQuery({
    queryKey: ['uniform-items'],
    queryFn: () => uniformItemsApi.getActiveItems(),
  });

  useEffect(() => {
    if (open) {
      setSelectedGuardId(preselectedGuardId || '');
      setGuardSearch('');
      setRows([emptyRow()]);
    }
  }, [open, preselectedGuardId]);

  const filteredGuards = guards.filter(g =>
    g.name.toLowerCase().includes(guardSearch.toLowerCase()) ||
    g.badge_number.toLowerCase().includes(guardSearch.toLowerCase())
  );

  const updateRow = (index: number, field: keyof IssuanceRow, value: any) => {
    setRows(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // Auto-fill cost when item is selected
      if (field === 'itemId') {
        const item = uniformItems.find(i => i.id === value);
        if (item) {
          updated[index].costPerUnit = Number(item.default_cost);
        }
      }

      return updated;
    });
  };

  const addRow = () => setRows(prev => [...prev, emptyRow()]);

  const removeRow = (index: number) => {
    if (rows.length > 1) {
      setRows(prev => prev.filter((_, i) => i !== index));
    }
  };

  const runningTotal = rows.reduce((sum, r) => sum + r.quantity * r.costPerUnit, 0);

  const isValid = selectedGuardId && rows.every(r => r.itemId && r.quantity > 0 && r.costPerUnit >= 0);

  const handleSubmit = () => {
    if (isValid) {
      onSubmit(selectedGuardId, rows);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Issue Uniform</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Guard selector */}
          <div className="space-y-2">
            <Label>Guard</Label>
            {preselectedGuardId ? (
              <div className="text-sm font-medium p-2 rounded border bg-muted">
                {guards.find(g => g.id === preselectedGuardId)?.name || 'Loading...'}
              </div>
            ) : (
              <div className="space-y-1">
                <Input
                  placeholder="Search guard by name or badge..."
                  value={guardSearch}
                  onChange={e => setGuardSearch(e.target.value)}
                />
                <Select value={selectedGuardId} onValueChange={setSelectedGuardId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a guard" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredGuards.map(guard => (
                      <SelectItem key={guard.id} value={guard.id}>
                        {guard.name} ({guard.badge_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Item rows */}
          <div className="space-y-3">
            <Label>Items</Label>
            {rows.map((row, index) => (
              <div key={index} className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Item {index + 1}</span>
                  {rows.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeRow(index)} className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Item Type</Label>
                    <Select value={row.itemId} onValueChange={v => updateRow(index, 'itemId', v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniformItems.map(item => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.item_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Condition</Label>
                    <Select value={row.condition} onValueChange={v => updateRow(index, 'condition', v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="used">Used</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      type="number"
                      min={1}
                      value={row.quantity}
                      onChange={e => updateRow(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Cost per Unit</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.costPerUnit}
                      onChange={e => updateRow(index, 'costPerUnit', parseFloat(e.target.value) || 0)}
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(row.quantity * row.costPerUnit)}</span>
                </div>
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={addRow} className="w-full">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add another item
            </Button>
          </div>

          {/* Running total */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border">
            <span className="text-sm font-medium">Total Cost</span>
            <span className="text-lg font-bold">{formatCurrency(runningTotal)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting ? 'Issuing...' : 'Issue Uniform'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
