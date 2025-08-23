const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertHundreds(num: number): string {
  let result = '';
  
  if (num >= 100) {
    result += ones[Math.floor(num / 100)] + ' Hundred';
    num %= 100;
    if (num > 0) result += ' ';
  }
  
  if (num >= 20) {
    result += tens[Math.floor(num / 10)];
    num %= 10;
    if (num > 0) result += ' ' + ones[num];
  } else if (num >= 10) {
    result += teens[num - 10];
  } else if (num > 0) {
    result += ones[num];
  }
  
  return result;
}

export function numberToWords(amount: number): string {
  if (amount === 0) return 'Zero Rupees Only';
  
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  
  let result = '';
  
  if (rupees >= 10000000) { // Crores
    const crores = Math.floor(rupees / 10000000);
    result += convertHundreds(crores) + ' Crore';
    const remainder = rupees % 10000000;
    if (remainder > 0) result += ' ';
  }
  
  const remainingAfterCrores = rupees % 10000000;
  if (remainingAfterCrores >= 100000) { // Lakhs
    const lakhs = Math.floor(remainingAfterCrores / 100000);
    result += convertHundreds(lakhs) + ' Lakh';
    const remainder = remainingAfterCrores % 100000;
    if (remainder > 0) result += ' ';
  }
  
  const remainingAfterLakhs = remainingAfterCrores % 100000;
  if (remainingAfterLakhs >= 1000) { // Thousands
    const thousands = Math.floor(remainingAfterLakhs / 1000);
    result += convertHundreds(thousands) + ' Thousand';
    const remainder = remainingAfterLakhs % 1000;
    if (remainder > 0) result += ' ';
  }
  
  const remainingAfterThousands = remainingAfterLakhs % 1000;
  if (remainingAfterThousands > 0) {
    result += convertHundreds(remainingAfterThousands);
  }
  
  if (result) {
    result += ' Rupees';
  }
  
  if (paise > 0) {
    if (result) result += ' and ';
    result += convertHundreds(paise) + ' Paise';
  }
  
  return result + ' Only';
}