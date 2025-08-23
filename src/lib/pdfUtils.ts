import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generatePDF = async (elementId: string, filename: string) => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Element not found');
    }

    // Add print styles temporarily
    const printStyles = document.createElement('style');
    printStyles.innerHTML = `
      @media print {
        #${elementId} {
          margin: 0 !important;
          padding: 20mm !important;
          background: white !important;
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
        }
        #${elementId} * {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
      }
    `;
    document.head.appendChild(printStyles);

    // Generate canvas from HTML element with proper A4 scaling
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      width: element.scrollWidth,
      height: element.scrollHeight,
      backgroundColor: '#ffffff'
    });

    // Remove temporary styles
    document.head.removeChild(printStyles);

    // A4 dimensions in mm
    const a4Width = 210;
    const a4Height = 297;
    const margin = 10; // 10mm margins on all sides
    const contentWidth = a4Width - (2 * margin);
    const contentHeight = a4Height - (2 * margin);

    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    // Calculate scaling to fit within content area with margins
    const scaleX = contentWidth / (imgWidth / 2); // Divide by 2 because of scale: 2
    const scaleY = contentHeight / (imgHeight / 2);
    const scale = Math.min(scaleX, scaleY);
    
    const scaledWidth = (imgWidth / 2) * scale;
    const scaledHeight = (imgHeight / 2) * scale;
    
    // Position at top with margins, center horizontally only
    const x = margin + (contentWidth - scaledWidth) / 2;
    const y = margin; // Start from top margin instead of centering vertically

    pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight);
    pdf.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};