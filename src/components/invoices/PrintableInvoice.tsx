import { Invoice } from '@/types/invoice';
import { formatCurrency } from '@/lib/invoiceUtils';

interface PrintableInvoiceProps {
  invoice: Invoice;
  companyLogo?: string;
}

export default function PrintableInvoice({ invoice, companyLogo }: PrintableInvoiceProps) {
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

  return (
    <div className="printable-invoice bg-white text-black" style={{ 
      width: '210mm', 
      minHeight: '297mm', 
      margin: '0 auto',
      padding: '20mm',
      fontSize: '11px',
      lineHeight: '1.4',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
          {companyLogo && (
            <img src={companyLogo} alt="Company Logo" className="h-16 mb-2" />
          )}
          <h1 className="text-2xl font-bold mb-1">{invoice.companyName}</h1>
          {invoice.companyGst && (
            <p className="text-sm text-gray-600">GST: {invoice.companyGst}</p>
          )}
          {invoice.companyPhone && (
            <p className="text-sm text-gray-600">Phone: {invoice.companyPhone}</p>
          )}
          {invoice.companyEmail && (
            <p className="text-sm text-gray-600">Email: {invoice.companyEmail}</p>
          )}
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-blue-700">INVOICE</h2>
          <p className="text-sm"><strong>Invoice #:</strong> {invoice.invoiceNumber}</p>
          <p className="text-sm"><strong>Date:</strong> {new Date(invoice.invoiceDate).toLocaleDateString()}</p>
          <p className="text-sm"><strong>GST Type:</strong> {getGstTypeDescription(invoice.gstType)}</p>
        </div>
      </div>

      {/* Bill To & Service Period */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="font-bold text-gray-700 mb-2 border-b border-gray-300 pb-1">BILL TO:</h3>
          <p className="font-semibold">{invoice.clientName}</p>
          <p className="text-sm text-gray-600">{invoice.clientAddress}</p>
          <p className="text-sm"><strong>Site:</strong> {invoice.siteName}</p>
        </div>
        <div>
          <h3 className="font-bold text-gray-700 mb-2 border-b border-gray-300 pb-1">SERVICE PERIOD:</h3>
          <p className="text-sm">
            <strong>From:</strong> {new Date(invoice.periodFrom).toLocaleDateString()}
          </p>
          <p className="text-sm">
            <strong>To:</strong> {new Date(invoice.periodTo).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="mb-6">
        <table className="w-full border-collapse border border-gray-400 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 p-2 text-left font-semibold">S.No.</th>
              <th className="border border-gray-400 p-2 text-left font-semibold">Description of Services</th>
              <th className="border border-gray-400 p-2 text-center font-semibold">Qty</th>
              <th className="border border-gray-400 p-2 text-right font-semibold">Rate (₹)</th>
              <th className="border border-gray-400 p-2 text-right font-semibold">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((item, index) => (
              <tr key={item.id}>
                <td className="border border-gray-400 p-2 text-center">{index + 1}</td>
                <td className="border border-gray-400 p-2">{item.description}</td>
                <td className="border border-gray-400 p-2 text-center">{item.quantity}</td>
                <td className="border border-gray-400 p-2 text-right">{item.ratePerSlot.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="border border-gray-400 p-2 text-right">{item.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div className="flex justify-end mb-6">
        <div className="w-80">
          <table className="w-full border-collapse border border-gray-400 text-sm">
            <tbody>
              <tr>
                <td className="border border-gray-400 p-2 font-semibold bg-gray-50">Subtotal:</td>
                <td className="border border-gray-400 p-2 text-right">{invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
              
              {/* GST Breakdown */}
              {invoice.gstType === 'GST' && (
                <>
                  <tr>
                    <td className="border border-gray-400 p-2">CGST ({(invoice.cgstRate || 0).toFixed(1)}%):</td>
                    <td className="border border-gray-400 p-2 text-right">{(invoice.cgstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-400 p-2">SGST ({(invoice.sgstRate || 0).toFixed(1)}%):</td>
                    <td className="border border-gray-400 p-2 text-right">{(invoice.sgstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </>
              )}
              
              {invoice.gstType === 'IGST' && (
                <tr>
                  <td className="border border-gray-400 p-2">IGST ({(invoice.igstRate || 0).toFixed(1)}%):</td>
                  <td className="border border-gray-400 p-2 text-right">{(invoice.igstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              )}
              
              {invoice.gstType === 'RCM' && (
                <>
                  <tr>
                    <td className="border border-gray-400 p-2">CGST ({(invoice.cgstRate || 0).toFixed(1)}%) - Reverse Charge:</td>
                    <td className="border border-gray-400 p-2 text-right">0.00</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-400 p-2">SGST ({(invoice.sgstRate || 0).toFixed(1)}%) - Reverse Charge:</td>
                    <td className="border border-gray-400 p-2 text-right">0.00</td>
                  </tr>
                </>
              )}
              
              {(invoice.gstType === 'NGST' || invoice.gstType === 'PERSONAL') && (
                <tr>
                  <td className="border border-gray-400 p-2">GST ({(invoice.gstRate || 0).toFixed(1)}%):</td>
                  <td className="border border-gray-400 p-2 text-right">{(invoice.gstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              )}
              
              <tr className="bg-blue-50">
                <td className="border border-gray-400 p-2 font-bold text-lg">Total Amount:</td>
                <td className="border border-gray-400 p-2 text-right font-bold text-lg">₹ {(invoice.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes Section */}
      {invoice.notes && (
        <div className="mb-6">
          <h3 className="font-bold text-gray-700 mb-2 border-b border-gray-300 pb-1">NOTES:</h3>
          <p className="text-sm text-gray-600">{invoice.notes}</p>
        </div>
      )}

      {/* Tax Information */}
      <div className="mb-6">
        {invoice.gstType === 'RCM' && (
          <div className="bg-yellow-100 border border-yellow-300 p-3 rounded text-sm">
            <p><strong>Important:</strong> This invoice is under Reverse Charge Mechanism. 
            The recipient is liable to pay CGST ({(invoice.cgstRate || 0).toFixed(1)}%) and SGST ({(invoice.sgstRate || 0).toFixed(1)}%) directly to the government.</p>
          </div>
        )}

        {invoice.gstType === 'GST' && (
          <div className="bg-blue-100 border border-blue-300 p-3 rounded text-sm">
            <p><strong>Tax Details:</strong> Intra-state supply - CGST ({(invoice.cgstRate || 0).toFixed(1)}%) + SGST ({(invoice.sgstRate || 0).toFixed(1)}%) = Total GST ({(invoice.gstRate || 0).toFixed(1)}%)</p>
          </div>
        )}

        {invoice.gstType === 'IGST' && (
          <div className="bg-green-100 border border-green-300 p-3 rounded text-sm">
            <p><strong>Tax Details:</strong> Inter-state supply - IGST ({(invoice.igstRate || 0).toFixed(1)}%)</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-300 pt-4 text-center text-sm text-gray-600">
        <p>Thank you for your business!</p>
        <p className="text-xs mt-1">This is a computer-generated invoice.</p>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .printable-invoice {
            margin: 0;
            padding: 15mm;
            box-shadow: none;
            border: none;
          }
          
          @page {
            size: A4;
            margin: 0;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}