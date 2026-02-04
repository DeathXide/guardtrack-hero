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
      @media screen {
        #${elementId} {
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
        }
        #${elementId} * {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
          text-align: inherit !important;
          font-family: inherit !important;
          line-height: inherit !important;
        }
        #${elementId} .text-right {
          text-align: right !important;
        }
        #${elementId} .text-left {
          text-align: left !important;
        }
        #${elementId} .text-center {
          text-align: center !important;
        }
        #${elementId} .justify-end {
          justify-content: flex-end !important;
        }
        #${elementId} .justify-start {
          justify-content: flex-start !important;
        }
        #${elementId} .justify-between {
          justify-content: space-between !important;
        }
      }
    `;
    document.head.appendChild(printStyles);

    // Give time for styles to apply
    await new Promise(resolve => setTimeout(resolve, 100));

    // Generate canvas from HTML element with proper A4 scaling
    const canvas = await html2canvas(element, {
      scale: 3, // Higher scale for better quality
      useCORS: true,
      allowTaint: true,
      width: element.scrollWidth,
      height: element.scrollHeight,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      scrollX: 0,
      scrollY: 0,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 0
    });

    // Remove temporary styles
    document.head.removeChild(printStyles);

    // A4 dimensions in mm
    const a4Width = 210;
    const a4Height = 297;
    const margin = 6; // Smaller margins to maximize content area
    const contentWidth = a4Width - (2 * margin);
    const contentHeight = a4Height - (2 * margin);

    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    // Calculate scaling to fit BOTH width and height within content area
    // Use the canvas scale factor (3) to convert back to actual dimensions
    const canvasScale = 3;
    const actualWidth = imgWidth / canvasScale;
    const actualHeight = imgHeight / canvasScale;
    
    const scaleX = contentWidth / actualWidth;
    const scaleY = contentHeight / actualHeight;
    
    // Use the smaller scale to ensure content fits entirely on one page
    const scale = Math.min(scaleX, scaleY, 1); // Cap at 1 to avoid scaling up
    
    const scaledWidth = actualWidth * scale;
    const scaledHeight = actualHeight * scale;
    
    // Center horizontally, start from top margin
    const x = margin + (contentWidth - scaledWidth) / 2;
    const y = margin;

    pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight);
    pdf.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};