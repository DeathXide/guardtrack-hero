import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Download, Send, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getInvoiceById, updateInvoice } from '@/lib/invoiceData';
import { formatCurrency } from '@/lib/invoiceUtils';
import { generatePDF } from '@/lib/pdfUtils';
import { Invoice } from '@/types/invoice';
import { toast } from 'sonner';

export default function InvoiceView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadInvoice(id);
    }
  }, [id]);

  const loadInvoice = (invoiceId: string) => {
    setLoading(true);
    try {
      const data = getInvoiceById(invoiceId);
      if (data) {
        setInvoice(data);
      } else {
        toast.error('Invoice not found');
        navigate('/invoices');
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
      toast.error('Failed to load invoice');
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!invoice) return;

    try {
      const updatedInvoice = updateInvoice(invoice.id, { status: newStatus as any });
      if (updatedInvoice) {
        setInvoice(updatedInvoice);
        toast.success('Invoice status updated');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'sent': return 'secondary';
      case 'overdue': return 'destructive';
      case 'draft': return 'outline';
      default: return 'outline';
    }
  };

  const handleDownloadPDF = async () => {
    try {
      await generatePDF('invoice-content', `Invoice-${invoice?.invoiceNumber}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const getGstTypeDescription = (gstType: string) => {
    switch (gstType) {
      case 'GST': return 'Intra-State GST';
      case 'IGST': return 'Inter-State GST';
      case 'NGST': return 'No GST';
      case 'RCM': return 'Reverse Charge Mechanism';
      case 'PERSONAL': return 'Personal Billing';
      default: return gstType;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Invoice Not Found</h2>
          <Button onClick={() => navigate('/invoices')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/invoices')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Invoice {invoice.invoiceNumber}</h1>
            <p className="text-muted-foreground">
              Created on {new Date(invoice.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusBadgeVariant(invoice.status)}>
            {invoice.status.toUpperCase()}
          </Badge>
          <Select value={invoice.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => navigate(`/invoices/${invoice.id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button>
            <Send className="h-4 w-4 mr-2" />
            Send Invoice
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Content */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent id="invoice-content" className="p-8">
              {/* Header */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{invoice.companyName}</h2>
                  {invoice.companyGst && (
                    <p className="text-muted-foreground">GST: {invoice.companyGst}</p>
                  )}
                </div>
                <div className="text-right">
                  <h3 className="text-xl font-semibold">INVOICE</h3>
                  <p className="text-muted-foreground">#{invoice.invoiceNumber}</p>
                  <p className="text-muted-foreground">Date: {new Date(invoice.invoiceDate).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Bill To */}
              <div className="mb-8">
                <h4 className="font-semibold mb-2">Bill To:</h4>
                <div className="text-muted-foreground">
                  <p className="font-medium text-foreground">{invoice.clientName}</p>
                  <p>{invoice.clientAddress.split(', ').filter(Boolean).join(', ')}</p>
                </div>
              </div>

              {/* Service Period */}
              <div className="mb-8">
                <h4 className="font-semibold mb-2">Service Period:</h4>
                <p className="text-muted-foreground">
                  {new Date(invoice.periodFrom).toLocaleDateString()} - {new Date(invoice.periodTo).toLocaleDateString()}
                </p>
                <p className="text-muted-foreground">Site: {invoice.siteName}</p>
              </div>

              {/* Line Items */}
              <div className="mb-8">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">W.E.F</TableHead>
                      <TableHead className="text-center">Quantity</TableHead>
                      <TableHead className="text-center">Man Days</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.lineItems.map((item) => {
                      // Calculate days in the billing period
                      const fromDate = new Date(invoice.periodFrom);
                      const toDate = new Date(invoice.periodTo);
                      const timeDiff = toDate.getTime() - fromDate.getTime();
                      const daysInPeriod = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
                      const manDays = daysInPeriod * item.quantity;

                      return (
                        <TableRow key={item.id}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell className="text-center text-sm">
                            {new Date(invoice.periodFrom).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })} to {new Date(invoice.periodTo).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-center">{manDays}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.ratePerSlot)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.lineTotal)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-80 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    
                    {/* GST Breakdown */}
                    {invoice.gstType === 'GST' && (
                      <>
                        <div className="flex justify-between">
                          <span>CGST ({(invoice.cgstRate || 0).toFixed(1)}%):</span>
                          <span>{formatCurrency(invoice.cgstAmount || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>SGST ({(invoice.sgstRate || 0).toFixed(1)}%):</span>
                          <span>{formatCurrency(invoice.sgstAmount || 0)}</span>
                        </div>
                      </>
                    )}
                    
                    {invoice.gstType === 'IGST' && (
                      <div className="flex justify-between">
                        <span>IGST ({(invoice.igstRate || 0).toFixed(1)}%):</span>
                        <span>{formatCurrency(invoice.igstAmount || 0)}</span>
                      </div>
                    )}
                    
                    {invoice.gstType === 'RCM' && (
                      <>
                        <div className="flex justify-between">
                          <span>CGST ({(invoice.cgstRate || 0).toFixed(1)}%) - Reverse Charge:</span>
                          <span>₹ 0.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span>SGST ({(invoice.sgstRate || 0).toFixed(1)}%) - Reverse Charge:</span>
                          <span>₹ 0.00</span>
                        </div>
                      </>
                    )}
                    
                    {(invoice.gstType === 'NGST' || invoice.gstType === 'PERSONAL') && (
                      <div className="flex justify-between">
                        <span>GST ({(invoice.gstRate || 0).toFixed(1)}%):</span>
                        <span>{formatCurrency(invoice.gstAmount || 0)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total Amount:</span>
                      <span>{formatCurrency(invoice.totalAmount || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {invoice.notes && (
                <div className="mt-8 pt-4 border-t">
                  <h4 className="font-semibold mb-2">Notes:</h4>
                  <p className="text-muted-foreground">{invoice.notes}</p>
                </div>
              )}

              {/* Authorized Signatory */}
              <div className="mt-12 pt-8 border-t">
                <div className="text-right">
                  <div className="space-y-8">
                    <div className="h-16"></div> {/* Space for signature */}
                    <div>
                      <p className="font-medium">For {invoice.companyName}</p>
                      <p className="text-sm text-muted-foreground mt-1">Authorized Signatory</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* RCM Notice */}
              {invoice.gstType === 'RCM' && (
                <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> This invoice is under Reverse Charge Mechanism. 
                    The recipient is liable to pay CGST ({(invoice.cgstRate || 0).toFixed(1)}%) and SGST ({(invoice.sgstRate || 0).toFixed(1)}%) directly to the government.
                  </p>
                </div>
              )}

              {/* GST Type Information */}
              {invoice.gstType === 'GST' && (
                <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Tax Details:</strong> Intra-state supply - CGST ({(invoice.cgstRate || 0).toFixed(1)}%) + SGST ({(invoice.sgstRate || 0).toFixed(1)}%) = Total GST ({(invoice.gstRate || 0).toFixed(1)}%)
                  </p>
                </div>
              )}

              {invoice.gstType === 'IGST' && (
                <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Tax Details:</strong> Inter-state supply - IGST ({(invoice.igstRate || 0).toFixed(1)}%)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Status:</span>
                <Badge variant={getStatusBadgeVariant(invoice.status)}>
                  {invoice.status.toUpperCase()}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-semibold">{formatCurrency(invoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST Type:</span>
                <span>{getGstTypeDescription(invoice.gstType)}</span>
              </div>
              <div className="flex justify-between">
                <span>Created:</span>
                <span>{new Date(invoice.created_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full">
                <Send className="h-4 w-4 mr-2" />
                Send via Email
              </Button>
              <Button variant="outline" className="w-full" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate(`/invoices/${invoice.id}/edit`)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Invoice
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}