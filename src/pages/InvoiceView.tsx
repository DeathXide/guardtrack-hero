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
import { numberToWords } from '@/lib/numberToWords';
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
            <CardContent id="invoice-content" className="p-8 font-sans bg-white print:bg-white">
              {/* Header */}
              <div className="grid grid-cols-2 gap-8 mb-6 pb-4 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold mb-1 text-gray-900">{invoice.companyName}</h2>
                  <div className="text-sm text-gray-600 space-y-1">
                    {invoice.companyGst && (
                      <p>GST: {invoice.companyGst}</p>
                    )}
                    <p>Phone: +91 9876543210</p>
                    <p>Email: info@company.com</p>
                  </div>
                </div>
                <div className="text-right">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">INVOICE</h3>
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">Invoice No:</span> #{invoice.invoiceNumber}</p>
                    <p><span className="font-medium">Date:</span> {new Date(invoice.invoiceDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Client Info Section */}
              <div className="grid grid-cols-2 gap-8 mb-6">
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">Bill To:</h4>
                  <div className="text-sm text-gray-700">
                    <p className="font-medium text-gray-900">{invoice.clientName}</p>
                    <p>{invoice.clientAddress.split(', ').filter(Boolean).join(', ')}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">Service Details:</h4>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p><span className="font-medium">Period:</span> {new Date(invoice.periodFrom).toLocaleDateString()} - {new Date(invoice.periodTo).toLocaleDateString()}</p>
                    <p><span className="font-medium">Site:</span> {invoice.siteName}</p>
                    {invoice.siteGst && (
                      <p><span className="font-medium">Site GST:</span> {invoice.siteGst}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="mb-6">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 border-b border-gray-200">
                      <TableHead className="text-center w-16 font-bold text-gray-900">S.No</TableHead>
                      <TableHead className="font-bold text-gray-900">Description</TableHead>
                      <TableHead className="text-center font-bold text-gray-900">W.E.F</TableHead>
                      <TableHead className="text-center font-bold text-gray-900">Quantity</TableHead>
                      <TableHead className="text-center font-bold text-gray-900">Man Days</TableHead>
                      <TableHead className="text-right font-bold text-gray-900">Rate</TableHead>
                      <TableHead className="text-right font-bold text-gray-900">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.lineItems.map((item, index) => {
                      // Calculate days in the billing period
                      const fromDate = new Date(invoice.periodFrom);
                      const toDate = new Date(invoice.periodTo);
                      const timeDiff = toDate.getTime() - fromDate.getTime();
                      const daysInPeriod = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
                      const manDays = daysInPeriod * item.quantity;

                      return (
                        <TableRow key={item.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                          <TableCell className="text-center text-sm">{index + 1}</TableCell>
                          <TableCell className="text-sm">{item.description}</TableCell>
                          <TableCell className="text-center text-xs text-gray-600">
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
                          <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                          <TableCell className="text-center text-sm">{manDays}</TableCell>
                          <TableCell className="text-right text-sm font-medium">{formatCurrency(item.ratePerSlot)}</TableCell>
                          <TableCell className="text-right text-sm font-medium">{formatCurrency(item.lineTotal)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-end">
                  <div className="w-80 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    
                    {/* GST Breakdown */}
                    {invoice.gstType === 'GST' && (
                      <>
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>CGST ({(invoice.cgstRate || 0).toFixed(1)}%):</span>
                          <span className="font-medium">{formatCurrency(invoice.cgstAmount || 0)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>SGST ({(invoice.sgstRate || 0).toFixed(1)}%):</span>
                          <span className="font-medium">{formatCurrency(invoice.sgstAmount || 0)}</span>
                        </div>
                      </>
                    )}
                    
                    {invoice.gstType === 'IGST' && (
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>IGST ({(invoice.igstRate || 0).toFixed(1)}%):</span>
                        <span className="font-medium">{formatCurrency(invoice.igstAmount || 0)}</span>
                      </div>
                    )}
                    
                    {invoice.gstType === 'RCM' && (
                      <>
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>CGST ({(invoice.cgstRate || 0).toFixed(1)}%) - Reverse Charge:</span>
                          <span className="font-medium">₹ 0.00</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>SGST ({(invoice.sgstRate || 0).toFixed(1)}%) - Reverse Charge:</span>
                          <span className="font-medium">₹ 0.00</span>
                        </div>
                      </>
                    )}
                    
                    {(invoice.gstType === 'NGST' || invoice.gstType === 'PERSONAL') && (
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>GST ({(invoice.gstRate || 0).toFixed(1)}%):</span>
                        <span className="font-medium">{formatCurrency(invoice.gstAmount || 0)}</span>
                      </div>
                    )}
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                      <div className="flex justify-between font-bold text-lg text-blue-900">
                        <span>Total Amount:</span>
                        <span>{formatCurrency(invoice.totalAmount || 0)}</span>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-2 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-700">
                        Amount in Words: <span className="font-normal">{numberToWords(invoice.totalAmount || 0)}</span>
                      </p>
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
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex justify-between items-end">
                  <div className="text-center">
                    <p className="text-sm font-medium text-blue-600 italic">"Your Service is Our Priority"</p>
                  </div>
                  <div className="text-right">
                    <div className="space-y-6">
                      <div className="h-12 w-32 border border-dashed border-gray-300 rounded text-xs text-gray-400 flex items-center justify-center">Company Seal</div>
                      <div>
                        <p className="font-medium text-gray-900">For {invoice.companyName}</p>
                        <p className="text-sm text-gray-600 mt-1">Authorized Signatory</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Thank you for your business!</p>
                  <p>Phone: +91 9876543210 | Email: info@company.com | Website: www.company.com</p>
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