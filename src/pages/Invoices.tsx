import { useState, useEffect, useMemo } from 'react';
import { Search, Filter, FileText, Eye, Edit, Trash2, Wand2, Download, Calendar, IndianRupee, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import AutoGenerateInvoices from '@/components/invoices/AutoGenerateInvoices';
import { fetchInvoicesFromDB, deleteInvoiceFromDB, updateInvoiceInDB } from '@/lib/supabaseInvoiceApiNew';
import { formatCurrency } from '@/lib/invoiceUtils';
import { generatePDF, generatePDFFromHTML } from '@/lib/pdfUtils';
import { Invoice } from '@/types/invoice';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { usePersistedFilters } from '@/hooks/usePersistedFilters';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PageHeader } from '@/components/layout/PageHeader';

export default function Invoices() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const defaultMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const filterDefaults = useMemo(() => ({
    search: '',
    status: 'all',
    gst: 'all',
    month: defaultMonth,
  }), [defaultMonth]);
  const { values: filters, setFilter, resetFilters } = usePersistedFilters(filterDefaults);
  const searchTerm = filters.search;
  const statusFilter = filters.status;
  const gstTypeFilter = filters.gst;
  const selectedMonth = filters.month;
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [autoGenerateOpen, setAutoGenerateOpen] = useState(false);
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const data = await fetchInvoicesFromDB();
      setInvoices(data);

      // If the current month has no invoices, fall back to the most recent month that does
      const currentMonth = defaultMonth;
      const hasCurrentMonth = data.some(inv => {
        const d = new Date(inv.periodFrom);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === currentMonth;
      });

      if (!hasCurrentMonth && data.length > 0 && !searchParams.get('month')) {
        // Find the most recent month with invoices
        const sorted = [...data].sort((a, b) => new Date(b.periodFrom).getTime() - new Date(a.periodFrom).getTime());
        const latest = new Date(sorted[0].periodFrom);
        const latestMonth = `${latest.getFullYear()}-${String(latest.getMonth() + 1).padStart(2, '0')}`;
        setFilter('month', latestMonth);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    try {
      await deleteInvoiceFromDB(id);
      setInvoices(invoices.filter(inv => inv.id !== id));
      toast.success('Invoice deleted successfully');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const validStatuses = ['draft', 'sent', 'paid', 'overdue'];
      if (!validStatuses.includes(newStatus)) {
        toast.error('Invalid status');
        return;
      }
      
      await updateInvoiceInDB(id, { status: newStatus as 'draft' | 'sent' | 'paid' | 'overdue' });
      setInvoices(invoices.map(inv => 
        inv.id === id ? { ...inv, status: newStatus as 'draft' | 'sent' | 'paid' | 'overdue' } : inv
      ));
      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  // Bulk operations
  const toggleInvoiceSelection = (invoiceId: string) => {
    const newSelection = new Set(selectedInvoices);
    if (newSelection.has(invoiceId)) {
      newSelection.delete(invoiceId);
    } else {
      newSelection.add(invoiceId);
    }
    setSelectedInvoices(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedInvoices.size === filteredInvoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(filteredInvoices.map(inv => inv.id)));
    }
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedInvoices.size === 0) {
      toast.error('Please select invoices to update');
      return;
    }

    setBulkActionLoading(true);
    try {
      const updatePromises = Array.from(selectedInvoices).map(id => 
        updateInvoiceInDB(id, { status: newStatus as 'draft' | 'sent' | 'paid' | 'overdue' })
      );
      
      await Promise.all(updatePromises);
      
      setInvoices(invoices.map(inv => 
        selectedInvoices.has(inv.id) ? { ...inv, status: newStatus as 'draft' | 'sent' | 'paid' | 'overdue' } : inv
      ));
      
      setSelectedInvoices(new Set());
      toast.success(`Updated ${selectedInvoices.size} invoice(s) status to ${newStatus}`);
    } catch (error) {
      console.error('Error updating invoices:', error);
      toast.error('Failed to update invoices');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedInvoices.size === 0) {
      toast.error('Please select invoices to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedInvoices.size} invoice(s)? This action cannot be undone.`)) {
      return;
    }

    setBulkActionLoading(true);
    try {
      const deletePromises = Array.from(selectedInvoices).map(id => deleteInvoiceFromDB(id));
      await Promise.all(deletePromises);
      
      setInvoices(invoices.filter(inv => !selectedInvoices.has(inv.id)));
      setSelectedInvoices(new Set());
      toast.success(`Deleted ${selectedInvoices.size} invoice(s) successfully`);
    } catch (error) {
      console.error('Error deleting invoices:', error);
      toast.error('Failed to delete invoices');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk download: fetch HTML from edge function, convert each to PDF client-side, zip & download
  const handleBulkDownload = async () => {
    if (filteredInvoices.length === 0) {
      toast.error('No invoices to download');
      return;
    }

    setBulkDownloading(true);
    setBulkProgress({ done: 0, total: 0 });

    try {
      // Step 1: Get HTML files from edge function
      toast.success('Fetching invoice data...');
      const invoiceIds = filteredInvoices.map(invoice => invoice.id);
      const response = await fetch(`https://yntbkgrkgicddwmhqimy.supabase.co/functions/v1/bulk-invoice-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate invoices');
      }

      // Step 2: Extract HTML files from the ZIP
      const zipBlob = await response.blob();
      const htmlZip = await JSZip.loadAsync(zipBlob);

      const htmlFiles = Object.entries(htmlZip.files).filter(
        ([name, file]) => !file.dir && name.endsWith('.html')
      );

      setBulkProgress({ done: 0, total: htmlFiles.length });

      // Step 3: Convert each HTML to PDF
      const pdfZip = new JSZip();
      let completed = 0;

      for (const [path, file] of htmlFiles) {
        try {
          const htmlContent = await file.async('string');
          const pdfBuffer = await generatePDFFromHTML(htmlContent);
          const pdfPath = path.replace('.html', '.pdf');
          pdfZip.file(pdfPath, pdfBuffer);
        } catch (err) {
          console.error(`Failed to generate PDF for ${path}:`, err);
        }
        completed++;
        setBulkProgress({ done: completed, total: htmlFiles.length });
      }

      // Step 4: Download ZIP of PDFs
      const finalBlob = await pdfZip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoices-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Downloaded ${completed} invoice PDFs`);
    } catch (error) {
      console.error('Error during bulk download:', error);
      toast.error(`Failed to download invoices: ${error.message}`);
    } finally {
      setBulkDownloading(false);
      setBulkProgress({ done: 0, total: 0 });
    }
  };

  const handleInvoicesCreated = () => {
    loadInvoices();
    setAutoGenerateOpen(false);
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.siteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.clientAddress || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    const matchesGstType = gstTypeFilter === 'all' || invoice.gstType === gstTypeFilter;
    
    // Filter by selected month
    const invoiceMonth = new Date(invoice.periodFrom);
    const invoiceMonthKey = `${invoiceMonth.getFullYear()}-${String(invoiceMonth.getMonth() + 1).padStart(2, '0')}`;
    const matchesMonth = invoiceMonthKey === selectedMonth;
    
    return matchesSearch && matchesStatus && matchesGstType && matchesMonth;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'success' as const;
      case 'sent': return 'info' as const;
      case 'overdue': return 'warning' as const;
      case 'draft': return 'outline' as const;
      default: return 'outline' as const;
    }
  };

  const totalInvoices = filteredInvoices.length;
  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const paidAmount = filteredInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0);
  const pendingAmount = totalAmount - paidAmount;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <div className="flex gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-48" />
            </div>
          </CardHeader>
          <CardContent>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">Manage your billing and invoices</p>
        </div>
        <div className="flex items-center gap-2">
          {filteredInvoices.length > 0 && (
            <Button 
              variant="outline" 
              onClick={handleBulkDownload}
              disabled={bulkDownloading}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {bulkDownloading
                ? (bulkProgress.total > 0
                  ? `PDF ${bulkProgress.done}/${bulkProgress.total}...`
                  : 'Fetching...')
                : `Download All (${filteredInvoices.length})`}
            </Button>
          )}
          <Dialog open={autoGenerateOpen} onOpenChange={setAutoGenerateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Wand2 className="h-4 w-4" />
                Auto Generate
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] p-0">
              <DialogHeader className="px-6 pt-6">
                <DialogTitle>Auto Generate Invoices</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[calc(90vh-6rem)] px-6 pb-6">
                <AutoGenerateInvoices onInvoicesCreated={handleInvoicesCreated} selectedMonth={selectedMonth} />
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvoices}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <IndianRupee className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(paidAmount)}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(pendingAmount)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                defaultValue={searchTerm}
                onChange={(e) => setFilter('search', e.target.value, 300)}
                className="pl-10 h-11"
              />
            </div>
            <Select value={selectedMonth} onValueChange={(v) => setFilter('month', v)}>
              <SelectTrigger className="w-full sm:w-48 h-11">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {/* Generate last 12 months */}
                {Array.from({ length: 12 }, (_, i) => {
                  const date = new Date();
                  date.setDate(1); // Avoid month overflow (e.g. March 31 → "February 31" → March 3)
                  date.setMonth(date.getMonth() - i);
                  const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                  const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                  return (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setFilter('status', v)}>
              <SelectTrigger className="w-full sm:w-48 h-11">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Select value={gstTypeFilter} onValueChange={(v) => setFilter('gst', v)}>
              <SelectTrigger className="w-full sm:w-48 h-11">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by GST type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All GST Types</SelectItem>
                <SelectItem value="GST">Standard GST</SelectItem>
                <SelectItem value="IGST">Inter-State GST</SelectItem>
                <SelectItem value="NGST">No GST</SelectItem>
                <SelectItem value="RCM">Reverse Charge</SelectItem>
                <SelectItem value="PERSONAL">Personal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {/* Bulk Actions */}
          {selectedInvoices.size > 0 && (
            <div className="mb-4 p-4 bg-muted rounded-lg">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">
                  {selectedInvoices.size} invoice(s) selected
                </span>
                <div className="flex gap-2">
                  <Select onValueChange={handleBulkStatusUpdate} disabled={bulkActionLoading}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Update Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Set to Draft</SelectItem>
                      <SelectItem value="sent">Set to Sent</SelectItem>
                      <SelectItem value="paid">Set to Paid</SelectItem>
                      <SelectItem value="overdue">Set to Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleBulkDelete}
                    disabled={bulkActionLoading}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Selected
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSelectedInvoices(new Set())}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto -mx-6 px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={filteredInvoices.length > 0 && selectedInvoices.size === filteredInvoices.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Site Name</TableHead>
                <TableHead>GST Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedInvoices.has(invoice.id)}
                      onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
                      aria-label={`Select ${invoice.invoiceNumber}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{invoice.invoiceNumber}</TableCell>
                  <TableCell>
                    <div className="font-medium">{invoice.siteName}</div>
                    {invoice.clientAddress && (
                      <p className="text-xs text-muted-foreground truncate max-w-[250px] mt-0.5">{invoice.clientAddress}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {invoice.gstType === 'GST' ? 'Standard GST' :
                       invoice.gstType === 'IGST' ? 'Inter-State GST' :
                       invoice.gstType === 'NGST' ? 'No GST' :
                       invoice.gstType === 'RCM' ? 'Reverse Charge' :
                       invoice.gstType === 'PERSONAL' ? 'Personal' :
                       invoice.gstType}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">{formatCurrency(invoice.totalAmount)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(invoice.status)} className="capitalize">
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10"
                            onClick={() => navigate(`/invoices/${invoice.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10"
                            onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10"
                            onClick={() => setDeleteConfirmId(invoice.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
          {filteredInvoices.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">
                {searchTerm || statusFilter !== 'all' || gstTypeFilter !== 'all' ? 'No invoices match your filters' : 'No invoices found for this month'}
              </p>
              <p className="text-sm mt-1">
                {searchTerm || statusFilter !== 'all' || gstTypeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create a new invoice or auto-generate from sites'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the invoice.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirmId) {
                  handleDeleteInvoice(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}