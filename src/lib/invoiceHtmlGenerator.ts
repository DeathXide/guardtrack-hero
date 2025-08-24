import { Invoice } from '@/types/invoice';
import { formatCurrency } from './invoiceUtils';
import { numberToWords } from './numberToWords';

interface CompanySettings {
  company_name?: string;
  company_motto?: string;
  gst_number?: string;
  company_address_line1?: string;
  company_address_line2?: string;
  company_address_line3?: string;
  company_phone?: string;
  company_email?: string;
  company_seal_image_url?: string;
}

export function generateInvoiceHTML(invoice: Invoice, companySettings?: CompanySettings): string {
  const fromDate = new Date(invoice.periodFrom);
  const toDate = new Date(invoice.periodTo);
  const timeDiff = toDate.getTime() - fromDate.getTime();
  const baseDaysInPeriod = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

  const lineItemsHTML = invoice.lineItems.map((item, index) => {
    const daysInPeriod = baseDaysInPeriod;
    const manDays = daysInPeriod * item.quantity;
    const backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';
    
    return `
      <tr style="background-color: ${backgroundColor};">
        <td style="padding: 12px 8px; text-align: center; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0;">${index + 1}</td>
        <td style="padding: 12px 8px; font-weight: 500; font-size: 14px; border-bottom: 1px solid #e2e8f0;">${item.description}</td>
        <td style="padding: 12px 8px; text-align: center; font-weight: 500; font-size: 14px; border-bottom: 1px solid #e2e8f0;">${item.quantity}</td>
        <td style="padding: 12px 8px; text-align: center; font-weight: 500; font-size: 14px; border-bottom: 1px solid #e2e8f0;">${manDays}</td>
        <td style="padding: 12px 8px; text-align: right; font-family: monospace; font-size: 14px; border-bottom: 1px solid #e2e8f0;">${formatCurrency(item.ratePerSlot)}</td>
        <td style="padding: 12px 8px; text-align: right; font-family: monospace; font-weight: 600; font-size: 14px; border-bottom: 1px solid #e2e8f0;">${formatCurrency(item.lineTotal)}</td>
      </tr>
    `;
  }).join('');

  const gstBreakdownHTML = () => {
    if (invoice.gstType === 'GST') {
      return `
        <div style="border-left: 2px solid #e2e8f0; padding-left: 12px; margin: 8px 0;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
            <span style="color: #64748b;">CGST (${(invoice.cgstRate || 0).toFixed(1)}%)</span>
            <span style="font-family: monospace;">${formatCurrency(invoice.cgstAmount || 0)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span style="color: #64748b;">SGST (${(invoice.sgstRate || 0).toFixed(1)}%)</span>
            <span style="font-family: monospace;">${formatCurrency(invoice.sgstAmount || 0)}</span>
          </div>
        </div>
      `;
    }
    
    if (invoice.gstType === 'IGST') {
      return `
        <div style="border-left: 2px solid #e2e8f0; padding-left: 12px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">IGST (${(invoice.igstRate || 0).toFixed(1)}%)</span>
            <span style="font-family: monospace;">${formatCurrency(invoice.igstAmount || 0)}</span>
          </div>
        </div>
      `;
    }
    
    if (invoice.gstType === 'RCM') {
      return `
        <div style="background-color: #eff6ff; border: 1px solid #dbeafe; border-radius: 6px; padding: 8px; margin: 8px 0;">
          <div style="font-size: 12px; font-weight: 500; color: #1e3a8a; margin-bottom: 4px;">Tax Payable by Recipient</div>
          <div style="font-size: 12px;">
            <div style="display: flex; justify-content: space-between; color: #1e40af; margin-bottom: 2px;">
              <span>CGST (${(invoice.cgstRate || 0).toFixed(1)}%)</span>
              <span style="font-family: monospace;">${formatCurrency(invoice.subtotal * (invoice.cgstRate || 0) / 100)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; color: #1e40af;">
              <span>SGST (${(invoice.sgstRate || 0).toFixed(1)}%)</span>
              <span style="font-family: monospace;">${formatCurrency(invoice.subtotal * (invoice.sgstRate || 0) / 100)}</span>
            </div>
          </div>
        </div>
      `;
    }
    
    if (invoice.gstType === 'NGST' || invoice.gstType === 'PERSONAL') {
      return `
        <div style="border-left: 2px solid #e2e8f0; padding-left: 12px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">GST (${(invoice.gstRate || 0).toFixed(1)}%)</span>
            <span style="font-family: monospace;">${formatCurrency(invoice.gstAmount || 0)}</span>
          </div>
        </div>
      `;
    }
    
    return '';
  };

  const rcmNoticeHTML = invoice.gstType === 'RCM' ? `
    <div style="flex: 1; max-width: 400px;">
      <div style="background-color: #f0f9ff; border: 1px solid #e0f2fe; border-radius: 8px; padding: 16px;">
        <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
          <div style="color: #0284c7; margin-top: 2px;">ℹ️</div>
          <div>
            <p style="font-size: 12px; font-weight: 500; color: #0c4a6e; line-height: 1.3; margin: 0 0 4px 0;">Reverse Charge Mechanism</p>
            <p style="font-size: 12px; color: #0369a1; margin: 0;">Security Services - Notification No.29/2018</p>
          </div>
        </div>
        <p style="font-size: 12px; color: #0c4a6e; line-height: 1.4; margin: 0;">
          Recipient liable for CGST (${(invoice.cgstRate || 0).toFixed(1)}%) & SGST (${(invoice.sgstRate || 0).toFixed(1)}%) 
          totaling ${formatCurrency(invoice.subtotal * (invoice.cgstRate || 0) / 100 + invoice.subtotal * (invoice.sgstRate || 0) / 100)}
        </p>
      </div>
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; 
      background: white;
    }
    .invoice-container { 
      width: 794px; 
      margin: 0 auto; 
      background: white; 
      min-height: 1123px; 
      display: flex; 
      flex-direction: column;
      padding: 0;
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div style="background: linear-gradient(to right, #f8fafc, #f1f5f9); padding: 16px; margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="margin-right: 24px;">
          <h1 style="font-size: 48px; font-weight: 300; color: #0f172a; letter-spacing: 0.02em; margin-bottom: 12px;">
            ${companySettings?.company_name || invoice.companyName}
          </h1>
          ${companySettings?.company_motto ? `
            <p style="font-size: 14px; font-style: italic; color: #64748b; margin-top: 4px; margin-bottom: 12px;">
              ${companySettings.company_motto}
            </p>
          ` : ''}
          <div style="color: #64748b; font-family: monospace; margin-bottom: 4px;">
            ${(companySettings?.gst_number || invoice.companyGst) ? `
              <p style="margin-bottom: 4px;">GST: ${companySettings?.gst_number || invoice.companyGst}</p>
            ` : ''}
            ${companySettings?.company_address_line1 ? `
              <p style="font-size: 12px; line-height: 1.5; margin-bottom: 8px;">
                ${[companySettings.company_address_line1, companySettings.company_address_line2, companySettings.company_address_line3].filter(Boolean).join(', ')}
              </p>
            ` : ''}
            <div style="display: flex; flex-wrap: wrap; gap: 16px; font-size: 12px;">
              ${companySettings?.company_phone ? `
                <div style="display: flex; align-items: center; gap: 4px;">
                  📞 <span>${companySettings.company_phone}</span>
                </div>
              ` : ''}
              ${companySettings?.company_email ? `
                <div style="display: flex; align-items: center; gap: 4px;">
                  ✉️ <span>${companySettings.company_email}</span>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);">
          <h2 style="font-size: 18px; font-weight: 500; color: #0f172a; margin-bottom: 12px;">INVOICE</h2>
          <div style="font-size: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 32px; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 4px; color: #64748b;">
                #️⃣ <span>Number:</span>
              </div>
              <span style="font-family: monospace; font-weight: 500;">${invoice.invoiceNumber}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 32px; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 4px; color: #64748b;">
                📅 <span>Date:</span>
              </div>
              <span style="font-family: monospace;">${new Date(invoice.invoiceDate).toLocaleDateString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 32px;">
              <div style="display: flex; align-items: center; gap: 4px; color: #64748b;">
                📅 <span>Period:</span>
              </div>
              <span style="font-family: monospace; font-size: 12px;">
                ${new Date(invoice.periodFrom).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })} - ${new Date(invoice.periodTo).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Client Info -->
    <div style="padding: 0 16px; margin-bottom: 24px;">
      <div style="background-color: rgba(249, 250, 251, 0.5); border-radius: 8px; padding: 16px; max-width: 448px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          🏢 <h3 style="font-size: 14px; font-weight: 500; color: #64748b;">BILL TO</h3>
        </div>
        <div>
          <p style="font-weight: 500; color: #0f172a; margin-bottom: 8px;">${invoice.siteName}</p>
          <div style="display: flex; align-items: flex-start; gap: 4px; margin-bottom: 8px;">
            📍 <p style="font-size: 14px; color: #64748b; line-height: 1.5;">${invoice.clientAddress.split(', ').filter(Boolean).join(', ')}</p>
          </div>
          ${invoice.siteGst ? `
            <p style="font-size: 12px; color: #64748b; font-family: monospace; margin-top: 8px;">
              <span style="font-weight: 500;">GST:</span> ${invoice.siteGst}
            </p>
          ` : ''}
        </div>
      </div>
    </div>

    <!-- Content Area -->
    <div style="flex: 1;">
      <!-- Line Items -->
      <div style="padding: 0 16px; margin-bottom: 24px;">
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: rgba(248, 250, 252, 0.5);">
                <th style="padding: 12px 8px; text-align: center; font-weight: 500; font-size: 12px; color: #374151; width: 48px;">No.</th>
                <th style="padding: 12px 8px; text-align: left; font-weight: 500; font-size: 12px; color: #374151; min-width: 200px;">Description</th>
                <th style="padding: 12px 8px; text-align: center; font-weight: 500; font-size: 12px; color: #374151; width: 64px;">Qty</th>
                <th style="padding: 12px 8px; text-align: center; font-weight: 500; font-size: 12px; color: #374151; width: 80px;">Days</th>
                <th style="padding: 12px 8px; text-align: right; font-weight: 500; font-size: 12px; color: #374151; width: 96px;">Rate</th>
                <th style="padding: 12px 8px; text-align: right; font-weight: 500; font-size: 12px; color: #374151; width: 112px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${lineItemsHTML}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Totals -->
      <div style="padding: 0 16px; margin-bottom: 24px;">
        <div style="display: ${invoice.gstType === 'RCM' ? 'flex' : 'block'}; ${invoice.gstType === 'RCM' ? 'justify-content: space-between; align-items: flex-start; gap: 32px;' : 'text-align: right;'}">
          ${rcmNoticeHTML}
          
          <div style="width: 288px; ${invoice.gstType !== 'RCM' ? 'margin-left: auto;' : ''}">
            <div style="font-size: 14px;">
              <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                <span style="color: #64748b;">Subtotal</span>
                <span style="font-family: monospace; font-weight: 500;">${formatCurrency(invoice.subtotal)}</span>
              </div>
              
              ${gstBreakdownHTML()}
              
              <div style="background-color: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 8px; padding: 16px; margin-top: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-weight: 500; color: rgb(59, 130, 246);">Total Amount</span>
                  <span style="font-size: 20px; font-family: monospace; font-weight: bold; color: rgb(59, 130, 246);">${formatCurrency(invoice.totalAmount || 0)}</span>
                </div>
              </div>
              
              <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
                <p style="font-size: 12px; color: #64748b; font-weight: 500;">
                  Amount in Words: <span style="font-weight: 400; font-style: italic;">${numberToWords(invoice.totalAmount || 0)}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Payment Terms -->
      <div style="padding: 0 16px; margin-bottom: 24px;">
        <div style="background-color: rgba(248, 250, 252, 0.2); border: 1px solid rgba(226, 232, 240, 0.5); border-radius: 6px; padding: 12px;">
          <h4 style="font-size: 12px; font-weight: 500; color: #64748b; margin-bottom: 8px;">Payment Terms</h4>
          <div style="font-size: 12px; color: #64748b; line-height: 1.4;">
            <p style="margin-bottom: 4px;">Kindly release the payment towards the bill on or before the 3rd of this month.</p>
            <p>Interest at 24% per annum will be charged on all outstanding amounts beyond the due date.</p>
          </div>
        </div>
      </div>

      <!-- Authorized Signatory -->
      <div style="padding: 0 16px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: flex-start;">
          <div style="text-align: left;">
            <div style="margin-bottom: 16px;">
              <p style="font-size: 14px; font-weight: 500; color: #0f172a;">For ${invoice.companyName}</p>
            </div>
            <div style="height: 48px; width: 128px; display: flex; align-items: flex-end; justify-content: flex-end; margin-bottom: 16px;">
              ${companySettings?.company_seal_image_url ? `
                <img src="${companySettings.company_seal_image_url}" alt="Company Seal" style="height: 96px; width: auto; object-fit: contain; opacity: 0.8; margin-left: auto;" />
              ` : ''}
            </div>
            <div>
              <p style="font-size: 12px; color: #64748b; margin-top: 4px;">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>

      ${invoice.notes ? `
        <!-- Notes -->
        <div style="padding: 0 16px; margin-bottom: 24px;">
          <div style="background-color: rgba(249, 250, 251, 0.3); border-radius: 8px; padding: 16px;">
            <h4 style="font-size: 14px; font-weight: 500; color: #64748b; margin-bottom: 8px;">Notes</h4>
            <p style="font-size: 14px; color: #0f172a; line-height: 1.5;">${invoice.notes}</p>
          </div>
        </div>
      ` : ''}
    </div>
  </div>
</body>
</html>
  `;
}