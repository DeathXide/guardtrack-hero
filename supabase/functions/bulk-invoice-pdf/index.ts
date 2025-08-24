import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'
import JSZip from 'https://esm.sh/jszip@3.10.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Utility functions (copied from shared template to match exactly)
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR' 
  }).format(amount);
}

function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (num === 0) return 'Zero Rupees Only';
  
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundred = Math.floor((num % 1000) / 100);
  const remainder = num % 100;
  
  let result = '';
  
  if (crore) result += convertToWords(crore) + ' Crore ';
  if (lakh) result += convertToWords(lakh) + ' Lakh ';
  if (thousand) result += convertToWords(thousand) + ' Thousand ';
  if (hundred) result += ones[hundred] + ' Hundred ';
  if (remainder) result += convertToWords(remainder) + ' ';
  
  function convertToWords(n: number): string {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  }
  
  return result.trim() + ' Rupees Only';
}

// SVG icon constants that match Lucide React icons
const ICONS = {
  phone: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  mail: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
  mapPin: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  building2: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v8h20v-8a2 2 0 0 0-2-2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>',
  hash: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>',
  calendar: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>',
  info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>'
};

function generateInvoiceHTML(invoice: any, companySettings?: any): string {
  // Calculate man days for line items
  const fromDate = new Date(invoice.periodFrom);
  const toDate = new Date(invoice.periodTo);
  const timeDiff = toDate.getTime() - fromDate.getTime();
  const daysInPeriod = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
      line-height: 1.6;
      color: #0f172a;
      background: #ffffff;
      font-size: 14px;
    }
    
    .invoice-container {
      width: 794px;
      min-height: 1123px;
      margin: 0 auto;
      padding: 0;
      background: white;
      display: flex;
      flex-direction: column;
    }
    
    .header {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      padding: 16px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    
    .company-info {
      flex: 1;
    }
    
    .company-name {
      font-size: 24px;
      font-weight: 300;
      color: #0f172a;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    
    .company-motto {
      font-size: 12px;
      font-style: italic;
      color: #64748b;
      margin-bottom: 12px;
    }
    
    .company-details {
      font-size: 12px;
      color: #64748b;
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
    }
    
    .company-details > div {
      margin-bottom: 4px;
    }
    
    .contact-row {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 10px;
      margin-top: 8px;
    }
    
    .contact-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .invoice-box {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
      min-width: 200px;
    }
    
    .invoice-title {
      font-size: 18px;
      font-weight: 500;
      color: #0f172a;
      margin-bottom: 12px;
    }
    
    .invoice-detail {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: 12px;
    }
    
    .invoice-detail-label {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #64748b;
    }
    
    .invoice-detail-value {
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
      font-weight: 500;
    }
    
    .period-value {
      font-size: 10px;
    }
    
    .client-section {
      padding: 0 16px;
      margin-bottom: 24px;
    }
    
    .client-box {
      background: rgba(239, 246, 255, 0.3);
      border-radius: 8px;
      padding: 16px;
      max-width: 350px;
    }
    
    .client-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    
    .client-title {
      font-size: 12px;
      font-weight: 500;
      color: #64748b;
    }
    
    .client-name {
      font-weight: 500;
      color: #0f172a;
      margin-bottom: 8px;
    }
    
    .client-address {
      display: flex;
      align-items: flex-start;
      gap: 4px;
      margin-bottom: 8px;
    }
    
    .client-address-text {
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
    }
    
    .client-gst {
      font-size: 10px;
      color: #64748b;
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
      margin-top: 8px;
    }
    
    .content-area {
      flex: 1;
      padding: 0 16px;
    }
    
    .line-items {
      margin-bottom: 24px;
    }
    
    .table-container {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .table-header {
      background: rgba(248, 250, 252, 0.8);
    }
    
    .table-header th {
      padding: 8px;
      font-size: 10px;
      font-weight: 500;
      color: #374151;
      text-align: center;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .table-header .description-col {
      text-align: left;
      min-width: 200px;
    }
    
    .table-header .amount-col {
      text-align: right;
    }
    
    tbody tr:nth-child(even) {
      background: rgba(248, 250, 252, 0.3);
    }
    
    tbody td {
      padding: 8px;
      font-size: 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    
    .row-number {
      text-align: center;
      color: #64748b;
    }
    
    .description {
      font-weight: 500;
    }
    
    .quantity, .days {
      text-align: center;
      font-weight: 500;
    }
    
    .rate, .amount {
      text-align: right;
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
    }
    
    .amount {
      font-weight: 600;
    }
    
    .totals-section {
      margin-bottom: 24px;
      display: flex;
      justify-content: ${invoice.gstType === 'RCM' ? 'space-between' : 'flex-end'};
      align-items: flex-start;
      gap: 32px;
    }
    
    .rcm-notice {
      flex: 1;
      max-width: 350px;
    }
    
    .rcm-box {
      background: rgba(239, 246, 255, 0.3);
      border: 1px solid rgba(59, 130, 246, 0.2);
      border-radius: 8px;
      padding: 16px;
    }
    
    .rcm-header {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 8px;
    }
    
    .rcm-title {
      font-size: 10px;
      font-weight: 500;
      color: #1e40af;
      line-height: 1.2;
    }
    
    .rcm-subtitle {
      font-size: 10px;
      color: #3730a3;
      margin-top: 4px;
    }
    
    .rcm-description {
      font-size: 10px;
      color: #1e3a8a;
      line-height: 1.5;
    }
    
    .totals-box {
      width: 288px;
    }
    
    .totals-content {
      font-size: 12px;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }
    
    .total-label {
      color: #64748b;
    }
    
    .total-value {
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
      font-weight: 500;
    }
    
    .gst-breakdown {
      border-left: 2px solid #e2e8f0;
      padding-left: 12px;
      margin: 4px 0;
    }
    
    .gst-row {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      margin-bottom: 2px;
    }
    
    .gst-label {
      color: #64748b;
    }
    
    .gst-value {
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
    }
    
    .rcm-gst-box {
      background: rgba(239, 246, 255, 0.3);
      border: 1px solid rgba(59, 130, 246, 0.2);
      border-radius: 4px;
      padding: 8px;
    }
    
    .rcm-gst-title {
      font-size: 10px;
      font-weight: 500;
      color: #1e40af;
      margin-bottom: 4px;
    }
    
    .rcm-gst-row {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      margin-bottom: 2px;
      color: #1e3a8a;
    }
    
    .final-total {
      background: rgba(99, 102, 241, 0.05);
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: 8px;
      padding: 16px;
      margin-top: 16px;
    }
    
    .final-total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .final-total-label {
      font-weight: 500;
      color: #6366f1;
    }
    
    .final-total-value {
      font-size: 20px;
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
      font-weight: 700;
      color: #6366f1;
    }
    
    .amount-words {
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      margin-top: 12px;
    }
    
    .amount-words-text {
      font-size: 10px;
      color: #64748b;
      font-weight: 500;
    }
    
    .amount-words-value {
      font-weight: 400;
      font-style: italic;
    }
    
    .payment-terms {
      margin-bottom: 24px;
    }
    
    .payment-terms-box {
      background: rgba(248, 250, 252, 0.3);
      border: 1px solid rgba(226, 232, 240, 0.8);
      border-radius: 4px;
      padding: 12px;
    }
    
    .payment-terms-title {
      font-size: 10px;
      font-weight: 500;
      color: #64748b;
      margin-bottom: 8px;
    }
    
    .payment-terms-content {
      font-size: 10px;
      color: #64748b;
      line-height: 1.4;
    }
    
    .payment-terms-content p {
      margin-bottom: 4px;
    }
    
    .signature-section {
      margin-bottom: 24px;
    }
    
    .signature-content {
      text-align: left;
    }
    
    .signature-company {
      font-size: 12px;
      font-weight: 500;
      color: #0f172a;
      margin-bottom: 16px;
    }
    
    .signature-image-container {
      height: 48px;
      width: 128px;
      display: flex;
      align-items: flex-end;
      justify-content: flex-end;
      margin-bottom: 16px;
    }
    
    .signature-image {
      max-height: 96px;
      width: auto;
      object-fit: contain;
      opacity: 0.8;
      margin-left: auto;
    }
    
    .signature-label {
      font-size: 10px;
      color: #64748b;
    }
    
    .notes-section {
      margin-bottom: 24px;
    }
    
    .notes-box {
      background: rgba(239, 246, 255, 0.5);
      border-radius: 8px;
      padding: 16px;
    }
    
    .notes-title {
      font-size: 12px;
      font-weight: 500;
      color: #64748b;
      margin-bottom: 8px;
    }
    
    .notes-content {
      font-size: 12px;
      color: #0f172a;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div class="company-info">
        <h1 class="company-name">${companySettings?.company_name || invoice.companyName}</h1>
        ${companySettings?.company_motto ? `<p class="company-motto">${companySettings.company_motto}</p>` : ''}
        <div class="company-details">
          ${(companySettings?.gst_number || invoice.companyGst) ? `<div>GST: ${companySettings?.gst_number || invoice.companyGst}</div>` : ''}
          ${companySettings?.company_address_line1 ? `
            <div style="font-size: 10px; line-height: 1.5; margin-top: 4px;">
              ${[companySettings.company_address_line1, companySettings.company_address_line2, companySettings.company_address_line3].filter(Boolean).join(', ')}
            </div>
          ` : ''}
          <div class="contact-row">
            ${companySettings?.company_phone ? `
              <div class="contact-item">
                ${ICONS.phone}
                <span>${companySettings.company_phone}</span>
              </div>
            ` : ''}
            ${companySettings?.company_email ? `
              <div class="contact-item">
                ${ICONS.mail}
                <span>${companySettings.company_email}</span>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
      <div class="invoice-box">
        <h2 class="invoice-title">INVOICE</h2>
        <div class="invoice-detail">
          <div class="invoice-detail-label">
            ${ICONS.hash}
            <span>Number:</span>
          </div>
          <span class="invoice-detail-value">${invoice.invoiceNumber}</span>
        </div>
        <div class="invoice-detail">
          <div class="invoice-detail-label">
            ${ICONS.calendar}
            <span>Date:</span>
          </div>
          <span class="invoice-detail-value">${new Date(invoice.invoiceDate).toLocaleDateString()}</span>
        </div>
        <div class="invoice-detail">
          <div class="invoice-detail-label">
            ${ICONS.calendar}
            <span>Period:</span>
          </div>
          <span class="invoice-detail-value period-value">
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

    <!-- Client Info -->
    <div class="client-section">
      <div class="client-box">
        <div class="client-header">
          ${ICONS.building2}
          <h3 class="client-title">BILL TO</h3>
        </div>
        <p class="client-name">${invoice.siteName}</p>
        <div class="client-address">
          ${ICONS.mapPin}
          <p class="client-address-text">${invoice.clientAddress.split(', ').filter(Boolean).join(', ')}</p>
        </div>
        ${invoice.siteGst ? `
          <p class="client-gst">
            <strong>GST:</strong> ${invoice.siteGst}
          </p>
        ` : ''}
      </div>
    </div>

    <!-- Content Area -->
    <div class="content-area">
      <!-- Line Items -->
      <div class="line-items">
        <div class="table-container">
          <table>
            <thead class="table-header">
              <tr>
                <th style="width: 48px;">No.</th>
                <th class="description-col">Description</th>
                <th style="width: 64px;">Qty</th>
                <th style="width: 80px;">Days</th>
                <th class="amount-col" style="width: 96px;">Rate</th>
                <th class="amount-col" style="width: 112px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.lineItems.map((item: any, index: number) => {
                const isUtility = item.rateType === 'utility';
                
                if (isUtility) {
                  return `
                    <tr>
                      <td class="row-number">${index + 1}</td>
                      <td colspan="4" class="description">${item.description}</td>
                      <td class="amount">${formatCurrency(item.lineTotal)}</td>
                    </tr>
                  `;
                } else {
                  const manDays = item.rateType === 'monthly' ? '-' : (daysInPeriod * item.quantity).toString();
                  const rate = item.rateType === 'monthly' ? (item.monthlyRate || 0) : item.ratePerSlot;
                  
                  return `
                    <tr>
                      <td class="row-number">${index + 1}</td>
                      <td class="description">${item.description}</td>
                      <td class="quantity">${item.quantity}</td>
                      <td class="days">${manDays}</td>
                      <td class="rate">${formatCurrency(rate)}</td>
                      <td class="amount">${formatCurrency(item.lineTotal)}</td>
                    </tr>
                  `;
                }
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Totals -->
      <div class="totals-section">
        ${invoice.gstType === 'RCM' ? `
          <div class="rcm-notice">
            <div class="rcm-box">
              <div class="rcm-header">
                ${ICONS.info}
                <div>
                  <p class="rcm-title">Reverse Charge Mechanism</p>
                  <p class="rcm-subtitle">Security Services - Notification No.29/2018</p>
                </div>
              </div>
              <p class="rcm-description">
                Recipient liable for CGST (${(invoice.cgstRate || 0).toFixed(1)}%) & SGST (${(invoice.sgstRate || 0).toFixed(1)}%) 
                totaling ${formatCurrency(invoice.subtotal * (invoice.cgstRate || 0) / 100 + invoice.subtotal * (invoice.sgstRate || 0) / 100)}
              </p>
            </div>
          </div>
        ` : ''}
        
        <div class="totals-box">
          <div class="totals-content">
            <div class="total-row">
              <span class="total-label">Subtotal</span>
              <span class="total-value">${formatCurrency(invoice.subtotal)}</span>
            </div>
            
            ${invoice.gstType === 'GST' ? `
              <div class="gst-breakdown">
                <div class="gst-row">
                  <span class="gst-label">CGST (${(invoice.cgstRate || 0).toFixed(1)}%)</span>
                  <span class="gst-value">${formatCurrency(invoice.cgstAmount || 0)}</span>
                </div>
                <div class="gst-row">
                  <span class="gst-label">SGST (${(invoice.sgstRate || 0).toFixed(1)}%)</span>
                  <span class="gst-value">${formatCurrency(invoice.sgstAmount || 0)}</span>
                </div>
              </div>
            ` : ''}
            
            ${invoice.gstType === 'IGST' ? `
              <div class="gst-breakdown">
                <div class="gst-row">
                  <span class="gst-label">IGST (${(invoice.igstRate || 0).toFixed(1)}%)</span>
                  <span class="gst-value">${formatCurrency(invoice.igstAmount || 0)}</span>
                </div>
              </div>
            ` : ''}
            
            ${invoice.gstType === 'RCM' ? `
              <div class="rcm-gst-box">
                <div class="rcm-gst-title">Tax Payable by Recipient</div>
                <div class="rcm-gst-row">
                  <span>CGST (${(invoice.cgstRate || 0).toFixed(1)}%)</span>
                  <span style="font-family: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;">${formatCurrency(invoice.subtotal * (invoice.cgstRate || 0) / 100)}</span>
                </div>
                <div class="rcm-gst-row">
                  <span>SGST (${(invoice.sgstRate || 0).toFixed(1)}%)</span>
                  <span style="font-family: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;">${formatCurrency(invoice.subtotal * (invoice.sgstRate || 0) / 100)}</span>
                </div>
              </div>
            ` : ''}
            
            ${(invoice.gstType === 'NGST' || invoice.gstType === 'PERSONAL') ? `
              <div class="gst-breakdown">
                <div class="gst-row">
                  <span class="gst-label">GST (${(invoice.gstRate || 0).toFixed(1)}%)</span>
                  <span class="gst-value">${formatCurrency(invoice.gstAmount || 0)}</span>
                </div>
              </div>
            ` : ''}
            
            <div class="final-total">
              <div class="final-total-row">
                <span class="final-total-label">Total Amount</span>
                <span class="final-total-value">${formatCurrency(invoice.totalAmount || 0)}</span>
              </div>
            </div>
            
            <div class="amount-words">
              <p class="amount-words-text">
                Amount in Words: <span class="amount-words-value">${numberToWords(invoice.totalAmount || 0)}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Payment Terms -->
      <div class="payment-terms">
        <div class="payment-terms-box">
          <h4 class="payment-terms-title">Payment Terms</h4>
          <div class="payment-terms-content">
            <p>Kindly release the payment towards the bill on or before the 3rd of this month.</p>
            <p>Interest at 24% per annum will be charged on all outstanding amounts beyond the due date.</p>
          </div>
        </div>
      </div>

      <!-- Authorized Signatory -->
      <div class="signature-section">
        <div class="signature-content">
          <div class="signature-company">For ${invoice.companyName}</div>
          <div class="signature-image-container">
            ${companySettings?.company_seal_image_url ? `
              <img src="${companySettings.company_seal_image_url}" alt="Company Seal" class="signature-image" />
            ` : ''}
          </div>
          <div class="signature-label">Authorized Signatory</div>
        </div>
      </div>

      <!-- Notes -->
      ${invoice.notes ? `
        <div class="notes-section">
          <div class="notes-box">
            <h4 class="notes-title">Notes</h4>
            <p class="notes-content">${invoice.notes}</p>
          </div>
        </div>
      ` : ''}
    </div>
  </div>
</body>
</html>
  `;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting bulk PDF generation...');
    
    const { invoiceIds } = await req.json();
    
    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      throw new Error('No invoice IDs provided');
    }

    console.log(`Processing ${invoiceIds.length} invoices...`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all invoices
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .in('id', invoiceIds);

    if (invoicesError) {
      throw new Error(`Failed to fetch invoices: ${invoicesError.message}`);
    }

    if (!invoices || invoices.length === 0) {
      throw new Error('No invoices found');
    }

    console.log(`Fetched ${invoices.length} invoices from database`);

    // Fetch company settings
    const { data: companySettings, error: companyError } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1)
      .single();

    if (companyError) {
      console.warn('Failed to fetch company settings:', companyError.message);
    }

    console.log('Fetched company settings');

    // Create ZIP file
    const zip = new JSZip();

    // Generate PDF for each invoice using HTML/CSS to PDF API
    for (const invoice of invoices) {
      try {
        console.log(`Processing invoice ${invoice.invoice_number}...`);
        
        // Convert database record to expected format
        const invoiceData = {
          id: invoice.id,
          invoiceNumber: invoice.invoice_number,
          siteId: invoice.site_id,
          siteName: invoice.site_name,
          siteGst: invoice.site_gst,
          companyName: invoice.company_name,
          companyGst: invoice.company_gst,
          clientName: invoice.client_name,
          clientAddress: invoice.client_address,
          invoiceDate: invoice.invoice_date,
          periodFrom: invoice.period_from,
          periodTo: invoice.period_to,
          lineItems: invoice.line_items,
          subtotal: parseFloat(invoice.subtotal),
          gstType: invoice.gst_type,
          gstRate: parseFloat(invoice.gst_rate),
          gstAmount: parseFloat(invoice.gst_amount),
          cgstRate: parseFloat(invoice.cgst_rate),
          cgstAmount: parseFloat(invoice.cgst_amount),
          sgstRate: parseFloat(invoice.sgst_rate),
          sgstAmount: parseFloat(invoice.sgst_amount),
          igstRate: parseFloat(invoice.igst_rate),
          igstAmount: parseFloat(invoice.igst_amount),
          totalAmount: parseFloat(invoice.total_amount),
          status: invoice.status,
          notes: invoice.notes,
          created_at: invoice.created_at,
        };

        // Generate HTML
        const html = generateInvoiceHTML(invoiceData, companySettings);
        
        // For now, create HTML files with print-optimized styling
        // Users can open these HTML files and use browser's "Print to PDF" feature
        const printOptimizedHtml = html.replace(
          '</head>',
          `
          <style>
            @media print {
              body { margin: 0; }
              .invoice-container { 
                box-shadow: none; 
                width: 100%; 
                max-width: none; 
                margin: 0; 
                padding: 20px;
              }
            }
          </style>
          </head>`
        );
        
        // Create filename with site name and invoice number
        const cleanSiteName = invoice.site_name
          .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
          .replace(/\s+/g, '_') // Replace spaces with underscores
          .substring(0, 30); // Limit length
        
        const filename = `${cleanSiteName}_${invoice.invoice_number}.html`;
        
        // Add HTML file to ZIP (optimized for printing)
        zip.file(filename, printOptimizedHtml);
        
        console.log(`Generated file for invoice ${invoice.invoice_number}`);
      } catch (error) {
        console.log(`Error processing invoice ${invoice.invoice_number}:`, error);
        // Fallback: create HTML file if processing fails
        try {
          const fallbackHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Invoice ${invoice.invoice_number}</title>
  <style>body { font-family: Arial, sans-serif; padding: 20px; }</style>
</head>
<body>
  <h1>Error Processing Invoice</h1>
  <p>Invoice Number: ${invoice.invoice_number}</p>
  <p>Site: ${invoice.site_name}</p>
  <p>Error: Unable to generate invoice content</p>
</body>
</html>`;
          const cleanSiteName = invoice.site_name
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 30);
          const filename = `ERROR_${cleanSiteName}_${invoice.invoice_number}.html`;
          zip.file(filename, fallbackHtml);
        } catch (fallbackError) {
          console.error(`Fallback also failed for ${invoice.invoice_number}:`, fallbackError);
        }
      }
    }

    console.log('Generating ZIP file...');

    // Generate ZIP file
    const zipBlob = await zip.generateAsync({ 
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    console.log(`ZIP file generated successfully. Size: ${zipBlob.length} bytes`);

    // Return ZIP file with HTML files (optimized for printing to PDF)
    return new Response(zipBlob, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="invoice-html-files-${new Date().toISOString().split('T')[0]}.zip"`,
        'Content-Length': zipBlob.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error in bulk PDF generation:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        details: error.stack 
      }), 
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
})