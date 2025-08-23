import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function generateInvoicePDF(invoiceElement: HTMLElement, invoiceNumber: string) {
  try {
    // Create canvas from the printable invoice element
    const canvas = await html2canvas(invoiceElement, {
      scale: 2, // Higher resolution
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 794, // A4 width in pixels (210mm at 96 DPI)
      height: 1123 // A4 height in pixels (297mm at 96 DPI)
    });

    // Calculate dimensions for A4
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // If content is longer than one page, we need to handle pagination
    let heightLeft = imgHeight;
    let position = 0;
    
    // Add first page
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    // Add additional pages if needed
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    // Download the PDF
    pdf.save(`Invoice_${invoiceNumber}.pdf`);
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

export function printInvoice() {
  // Simple print function for browser print
  const printContent = document.querySelector('.printable-invoice');
  if (!printContent) return;
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice</title>
        <style>
          @page { 
            size: A4; 
            margin: 15mm; 
          }
          body { 
            margin: 0; 
            font-family: Arial, sans-serif; 
            font-size: 11px; 
            line-height: 1.4;
            color: black;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          table { 
            border-collapse: collapse; 
            width: 100%; 
          }
          .bg-gray-100 { background-color: #f3f4f6 !important; }
          .bg-gray-50 { background-color: #f9fafb !important; }
          .bg-blue-50 { background-color: #eff6ff !important; }
          .bg-yellow-100 { background-color: #fef3c7 !important; }
          .bg-blue-100 { background-color: #dbeafe !important; }
          .bg-green-100 { background-color: #dcfce7 !important; }
        </style>
      </head>
      <body>
        ${printContent.outerHTML}
      </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
}