
import { User, Site, Guard, Shift, AttendanceRecord, MonthlyEarning, PaymentRecord, SiteEarnings } from '@/types';

// Demo Users with different roles
export const users: User[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@secureguard.com',
    role: 'admin'
  },
  {
    id: '2',
    name: 'Site Supervisor',
    email: 'supervisor@secureguard.com',
    role: 'supervisor'
  },
  {
    id: '3',
    name: 'Security Guard',
    email: 'guard@secureguard.com',
    role: 'guard'
  }
];

// Sample Sites with local data
export let sites: Site[] = [
  {
    id: '1',
    name: 'Corporate Tower A',
    organizationName: 'Alpha Technologies',
    gstNumber: '07AAECA1234M1ZX',
    addressLine1: 'B-4, Sector 62',
    addressLine2: 'Industrial Area',
    addressLine3: 'Noida, UP - 201309',
    gstType: 'GST',
    siteType: 'Corporate Office',
    location: 'Business District, Mumbai',
    daySlots: 2,
    nightSlots: 3,
    payRate: 15000,
    staffingSlots: [
      {
        id: '1',
        role: 'Security Guard',
        daySlots: 2,
        nightSlots: 3,
        budgetPerSlot: 3000
      }
    ]
  },
  {
    id: '2',
    name: 'Shopping Mall Central',
    organizationName: 'Plaza Enterprises',
    gstNumber: '07BBFCA5678N2YZ',
    addressLine1: 'Block A, Connaught Place',
    addressLine2: 'Central Delhi',
    addressLine3: 'New Delhi - 110001',
    gstType: 'GST',
    siteType: 'Corporate Office',
    location: 'Central Mumbai',
    daySlots: 4,
    nightSlots: 2,
    payRate: 20000,
    
    staffingSlots: [
      {
        id: '2',
        role: 'Security Guard',
        daySlots: 4,
        nightSlots: 2,
        budgetPerSlot: 3333
      }
    ]
  }
];

// Sample Guards
export let guards: Guard[] = [
  // Original guards
  { id: 'g1', name: 'Rajesh Kumar', phone: '+91-9876543210', badgeNumber: 'SG001', status: 'active', type: 'permanent', payRate: 25000, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g2', name: 'Priya Sharma', phone: '+91-9876543211', badgeNumber: 'SG002', status: 'active', type: 'permanent', payRate: 22000, gender: 'female', languagesSpoken: ['Hindi', 'English', 'Marathi'] },
  { id: 'g3', name: 'Amit Singh', phone: '+91-9876543212', badgeNumber: 'SG003', status: 'active', type: 'contract', payRate: 20000, gender: 'male', languagesSpoken: ['Hindi', 'English', 'Punjabi'] },
  { id: 'g4', name: 'Sunita Devi', phone: '+91-9876543213', badgeNumber: 'SG004', status: 'active', type: 'permanent', payRate: 24000, gender: 'female', languagesSpoken: ['Hindi', 'English', 'Bengali'] },
  
  // Additional guards (96 more)
  { id: 'g5', name: 'Vikram Patel', phone: '+91-9876543214', badgeNumber: 'SG005', status: 'active', type: 'permanent', payRate: 23000, gender: 'male', languagesSpoken: ['Hindi', 'English', 'Gujarati'] },
  { id: 'g6', name: 'Anita Reddy', phone: '+91-9876543215', badgeNumber: 'SG006', status: 'active', type: 'contract', payRate: 21000, gender: 'female', languagesSpoken: ['Hindi', 'English', 'Telugu'] },
  { id: 'g7', name: 'Suresh Gupta', phone: '+91-9876543216', badgeNumber: 'SG007', status: 'inactive', type: 'permanent', payRate: 26000, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g8', name: 'Kavita Joshi', phone: '+91-9876543217', badgeNumber: 'SG008', status: 'active', type: 'permanent', payRate: 24500, gender: 'female', languagesSpoken: ['Hindi', 'English', 'Marathi'] },
  { id: 'g9', name: 'Rohit Verma', phone: '+91-9876543218', badgeNumber: 'SG009', status: 'active', type: 'contract', payRate: 19500, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g10', name: 'Deepika Rao', phone: '+91-9876543219', badgeNumber: 'SG010', status: 'active', type: 'permanent', payRate: 22500, gender: 'female', languagesSpoken: ['Hindi', 'English', 'Kannada'] },
  
  { id: 'g11', name: 'Manoj Tiwari', phone: '+91-9876543220', badgeNumber: 'SG011', status: 'active', type: 'permanent', payRate: 25500, gender: 'male', languagesSpoken: ['Hindi', 'English', 'Bhojpuri'] },
  { id: 'g12', name: 'Pooja Agarwal', phone: '+91-9876543221', badgeNumber: 'SG012', status: 'active', type: 'contract', payRate: 20500, gender: 'female', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g13', name: 'Arjun Nair', phone: '+91-9876543222', badgeNumber: 'SG013', status: 'inactive', type: 'permanent', payRate: 27000, gender: 'male', languagesSpoken: ['Hindi', 'English', 'Malayalam'] },
  { id: 'g14', name: 'Sita Mishra', phone: '+91-9876543223', badgeNumber: 'SG014', status: 'active', type: 'permanent', payRate: 23500, gender: 'female', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g15', name: 'Karan Mehta', phone: '+91-9876543224', badgeNumber: 'SG015', status: 'active', type: 'contract', payRate: 18500, gender: 'male', languagesSpoken: ['Hindi', 'English', 'Gujarati'] },
  { id: 'g16', name: 'Ritu Singh', phone: '+91-9876543225', badgeNumber: 'SG016', status: 'active', type: 'permanent', payRate: 24000, gender: 'female', languagesSpoken: ['Hindi', 'English', 'Punjabi'] },
  { id: 'g17', name: 'Sanjay Kumar', phone: '+91-9876543226', badgeNumber: 'SG017', status: 'active', type: 'permanent', payRate: 26500, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g18', name: 'Meera Jain', phone: '+91-9876543227', badgeNumber: 'SG018', status: 'active', type: 'contract', payRate: 21500, gender: 'female', languagesSpoken: ['Hindi', 'English', 'Rajasthani'] },
  { id: 'g19', name: 'Ravi Sharma', phone: '+91-9876543228', badgeNumber: 'SG019', status: 'active', type: 'permanent', payRate: 25000, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g20', name: 'Neha Kapoor', phone: '+91-9876543229', badgeNumber: 'SG020', status: 'inactive', type: 'permanent', payRate: 22000, gender: 'female', languagesSpoken: ['Hindi', 'English', 'Punjabi'] },
  
  { id: 'g21', name: 'Ajay Yadav', phone: '+91-9876543230', badgeNumber: 'SG021', status: 'active', type: 'contract', payRate: 19000, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g22', name: 'Shweta Pandey', phone: '+91-9876543231', badgeNumber: 'SG022', status: 'active', type: 'permanent', payRate: 23000, gender: 'female', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g23', name: 'Dinesh Choudhary', phone: '+91-9876543232', badgeNumber: 'SG023', status: 'active', type: 'permanent', payRate: 24500, gender: 'male', languagesSpoken: ['Hindi', 'English', 'Rajasthani'] },
  { id: 'g24', name: 'Lakshmi Iyer', phone: '+91-9876543233', badgeNumber: 'SG024', status: 'active', type: 'contract', payRate: 20000, gender: 'female', languagesSpoken: ['Hindi', 'English', 'Tamil'] },
  { id: 'g25', name: 'Prakash Thakur', phone: '+91-9876543234', badgeNumber: 'SG025', status: 'active', type: 'permanent', payRate: 25500, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g26', name: 'Rashmi Sinha', phone: '+91-9876543235', badgeNumber: 'SG026', status: 'active', type: 'permanent', payRate: 22500, gender: 'female', languagesSpoken: ['Hindi', 'English', 'Bengali'] },
  { id: 'g27', name: 'Vishal Bansal', phone: '+91-9876543236', badgeNumber: 'SG027', status: 'inactive', type: 'contract', payRate: 18000, gender: 'male', languagesSpoken: ['Hindi', 'English', 'Punjabi'] },
  { id: 'g28', name: 'Swati Kulkarni', phone: '+91-9876543237', badgeNumber: 'SG028', status: 'active', type: 'permanent', payRate: 24000, gender: 'female', languagesSpoken: ['Hindi', 'English', 'Marathi'] },
  { id: 'g29', name: 'Ganesh Pillai', phone: '+91-9876543238', badgeNumber: 'SG029', status: 'active', type: 'permanent', payRate: 26000, gender: 'male', languagesSpoken: ['Hindi', 'English', 'Malayalam'] },
  { id: 'g30', name: 'Priyanka Das', phone: '+91-9876543239', badgeNumber: 'SG030', status: 'active', type: 'contract', payRate: 21000, gender: 'female', languagesSpoken: ['Hindi', 'English', 'Bengali'] },
  
  { id: 'g31', name: 'Anil Saxena', phone: '+91-9876543240', badgeNumber: 'SG031', status: 'active', type: 'permanent', payRate: 25000, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g32', name: 'Vandana Chopra', phone: '+91-9876543241', badgeNumber: 'SG032', status: 'active', type: 'permanent', payRate: 23500, gender: 'female', languagesSpoken: ['Hindi', 'English', 'Punjabi'] },
  { id: 'g33', name: 'Ramesh Bhat', phone: '+91-9876543242', badgeNumber: 'SG033', status: 'active', type: 'contract', payRate: 19500, gender: 'male', languagesSpoken: ['Hindi', 'English', 'Kannada'] },
  { id: 'g34', name: 'Nisha Arora', phone: '+91-9876543243', badgeNumber: 'SG034', status: 'inactive', type: 'permanent', payRate: 22000, gender: 'female', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g35', name: 'Mahesh Jha', phone: '+91-9876543244', badgeNumber: 'SG035', status: 'active', type: 'permanent', payRate: 26500, gender: 'male', languagesSpoken: ['Hindi', 'English', 'Bhojpuri'] },
  { id: 'g36', name: 'Geeta Srivastava', phone: '+91-9876543245', badgeNumber: 'SG036', status: 'active', type: 'contract', payRate: 20500, gender: 'female', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g37', name: 'Ashok Tripathi', phone: '+91-9876543246', badgeNumber: 'SG037', status: 'active', type: 'permanent', payRate: 24500, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g38', name: 'Mamta Gupta', phone: '+91-9876543247', badgeNumber: 'SG038', status: 'active', type: 'permanent', payRate: 23000, gender: 'female', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g39', name: 'Naveen Chandra', phone: '+91-9876543248', badgeNumber: 'SG039', status: 'active', type: 'contract', payRate: 18500, gender: 'male', languagesSpoken: ['Hindi', 'English', 'Telugu'] },
  { id: 'g40', name: 'Bharti Sharma', phone: '+91-9876543249', badgeNumber: 'SG040', status: 'active', type: 'permanent', payRate: 22500, gender: 'female', languagesSpoken: ['Hindi', 'English'] },
  
  { id: 'g41', name: 'Yogesh Dubey', phone: '+91-9876543250', badgeNumber: 'SG041', status: 'active', type: 'permanent', payRate: 25500, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g42', name: 'Rekha Agarwal', phone: '+91-9876543251', badgeNumber: 'SG042', status: 'inactive', type: 'contract', payRate: 19000, gender: 'female', languagesSpoken: ['Hindi', 'English', 'Marathi'] },
  { id: 'g43', name: 'Hemant Singh', phone: '+91-9876543252', badgeNumber: 'SG043', status: 'active', type: 'permanent', payRate: 26000, gender: 'male', languagesSpoken: ['Hindi', 'English', 'Punjabi'] },
  { id: 'g44', name: 'Sunaina Yadav', phone: '+91-9876543253', badgeNumber: 'SG044', status: 'active', type: 'permanent', payRate: 24000, gender: 'female', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g45', name: 'Kapil Mishra', phone: '+91-9876543254', badgeNumber: 'SG045', status: 'active', type: 'contract', payRate: 20000, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g46', name: 'Anjali Khanna', phone: '+91-9876543255', badgeNumber: 'SG046', status: 'active', type: 'permanent', payRate: 23500, gender: 'female', languagesSpoken: ['Hindi', 'English', 'Punjabi'] },
  { id: 'g47', name: 'Santosh Kumar', phone: '+91-9876543256', badgeNumber: 'SG047', status: 'active', type: 'permanent', payRate: 25000, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g48', name: 'Kiran Bala', phone: '+91-9876543257', badgeNumber: 'SG048', status: 'active', type: 'contract', payRate: 21500, gender: 'female', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g49', name: 'Lalit Mohan', phone: '+91-9876543258', badgeNumber: 'SG049', status: 'active', type: 'permanent', payRate: 24500, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g50', name: 'Usha Devi', phone: '+91-9876543259', badgeNumber: 'SG050', status: 'inactive', type: 'permanent', payRate: 22000, gender: 'female', languagesSpoken: ['Hindi', 'English', 'Bengali'] },
  
  { id: 'g51', name: 'Sachin Jain', phone: '+91-9876543260', badgeNumber: 'SG051', status: 'active', type: 'contract', payRate: 19500, gender: 'male', languagesSpoken: ['Hindi', 'English', 'Rajasthani'] },
  { id: 'g52', name: 'Sarita Bhardwaj', phone: '+91-9876543261', badgeNumber: 'SG052', status: 'active', type: 'permanent', payRate: 23000, gender: 'female', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g53', name: 'Brijesh Pandey', phone: '+91-9876543262', badgeNumber: 'SG053', status: 'active', type: 'permanent', payRate: 26500, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g54', name: 'Sheetal Rawat', phone: '+91-9876543263', badgeNumber: 'SG054', status: 'active', type: 'contract', payRate: 20500, gender: 'female', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g55', name: 'Pankaj Soni', phone: '+91-9876543264', badgeNumber: 'SG055', status: 'active', type: 'permanent', payRate: 25000, gender: 'male', languagesSpoken: ['Hindi', 'English', 'Rajasthani'] },
  { id: 'g56', name: 'Manisha Tomar', phone: '+91-9876543265', badgeNumber: 'SG056', status: 'active', type: 'permanent', payRate: 22500, gender: 'female', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g57', name: 'Sunil Chauhan', phone: '+91-9876543266', badgeNumber: 'SG057', status: 'inactive', type: 'contract', payRate: 18000, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g58', name: 'Archana Mittal', phone: '+91-9876543267', badgeNumber: 'SG058', status: 'active', type: 'permanent', payRate: 24000, gender: 'female', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g59', name: 'Deepak Shukla', phone: '+91-9876543268', badgeNumber: 'SG059', status: 'active', type: 'permanent', payRate: 25500, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g60', name: 'Kavita Saxena', phone: '+91-9876543269', badgeNumber: 'SG060', status: 'active', type: 'contract', payRate: 21000, gender: 'female', languagesSpoken: ['Hindi', 'English'] },
  
  { id: 'g61', name: 'Raman Goel', phone: '+91-9876543270', badgeNumber: 'SG061', status: 'active', type: 'permanent', payRate: 26000, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g62', name: 'Sudha Rani', phone: '+91-9876543271', badgeNumber: 'SG062', status: 'active', type: 'permanent', payRate: 23500, gender: 'female', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g63', name: 'Nitin Bansal', phone: '+91-9876543272', badgeNumber: 'SG063', status: 'active', type: 'contract', payRate: 19000, gender: 'male', languagesSpoken: ['Hindi', 'English', 'Punjabi'] },
  { id: 'g64', name: 'Poonam Verma', phone: '+91-9876543273', badgeNumber: 'SG064', status: 'active', type: 'permanent', payRate: 24500, gender: 'female', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g65', name: 'Mukesh Agarwal', phone: '+91-9876543274', badgeNumber: 'SG065', status: 'inactive', type: 'permanent', payRate: 27000, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g66', name: 'Radha Kumari', phone: '+91-9876543275', badgeNumber: 'SG066', status: 'active', type: 'contract', payRate: 20000, gender: 'female', languagesSpoken: ['Hindi', 'English', 'Bengali'] },
  { id: 'g67', name: 'Alok Singh', phone: '+91-9876543276', badgeNumber: 'SG067', status: 'active', type: 'permanent', payRate: 25000, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g68', name: 'Seema Gupta', phone: '+91-9876543277', badgeNumber: 'SG068', status: 'active', type: 'permanent', payRate: 22000, gender: 'female', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g69', name: 'Vinod Kumar', phone: '+91-9876543278', badgeNumber: 'SG069', status: 'active', type: 'contract', payRate: 18500, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g70', name: 'Nidhi Sharma', phone: '+91-9876543279', badgeNumber: 'SG070', status: 'active', type: 'permanent', payRate: 23000, gender: 'female', languagesSpoken: ['Hindi', 'English'] },
  
  { id: 'g71', name: 'Harish Chandra', phone: '+91-9876543280', badgeNumber: 'SG071', status: 'active', type: 'permanent', payRate: 24000, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g72', name: 'Sunita Rani', phone: '+91-9876543281', badgeNumber: 'SG072', status: 'active', type: 'contract', payRate: 21500, gender: 'female', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g73', name: 'Rajeev Gupta', phone: '+91-9876543282', badgeNumber: 'SG073', status: 'inactive', type: 'permanent', payRate: 26500, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g74', name: 'Anuja Patel', phone: '+91-9876543283', badgeNumber: 'SG074', status: 'active', type: 'permanent', payRate: 22500, gender: 'female', languagesSpoken: ['Hindi', 'English', 'Gujarati'] },
  { id: 'g75', name: 'Mohan Lal', phone: '+91-9876543284', badgeNumber: 'SG075', status: 'active', type: 'contract', payRate: 19500, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g76', name: 'Shanti Devi', phone: '+91-9876543285', badgeNumber: 'SG076', status: 'active', type: 'permanent', payRate: 23500, gender: 'female', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g77', name: 'Praveen Kumar', phone: '+91-9876543286', badgeNumber: 'SG077', status: 'active', type: 'permanent', payRate: 25500, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g78', name: 'Madhuri Singh', phone: '+91-9876543287', badgeNumber: 'SG078', status: 'active', type: 'contract', payRate: 20500, gender: 'female', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g79', name: 'Jagdish Prasad', phone: '+91-9876543288', badgeNumber: 'SG079', status: 'active', type: 'permanent', payRate: 24500, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g80', name: 'Lata Kumari', phone: '+91-9876543289', badgeNumber: 'SG080', status: 'active', type: 'permanent', payRate: 22000, gender: 'female', languagesSpoken: ['Hindi', 'English'] },
  
  { id: 'g81', name: 'Bhupendra Yadav', phone: '+91-9876543290', badgeNumber: 'SG081', status: 'inactive', type: 'contract', payRate: 18000, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g82', name: 'Pinki Devi', phone: '+91-9876543291', badgeNumber: 'SG082', status: 'active', type: 'permanent', payRate: 23000, gender: 'female', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g83', name: 'Gyanendra Singh', phone: '+91-9876543292', badgeNumber: 'SG083', status: 'active', type: 'permanent', payRate: 26000, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g84', name: 'Babita Sharma', phone: '+91-9876543293', badgeNumber: 'SG084', status: 'active', type: 'contract', payRate: 21000, gender: 'female', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g85', name: 'Devendra Kumar', phone: '+91-9876543294', badgeNumber: 'SG085', status: 'active', type: 'permanent', payRate: 25000, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g86', name: 'Kamala Devi', phone: '+91-9876543295', badgeNumber: 'SG086', status: 'active', type: 'permanent', payRate: 22500, gender: 'female', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g87', name: 'Narendra Prasad', phone: '+91-9876543296', badgeNumber: 'SG087', status: 'active', type: 'contract', payRate: 19000, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g88', name: 'Shakuntala Devi', phone: '+91-9876543297', badgeNumber: 'SG088', status: 'active', type: 'permanent', payRate: 24000, gender: 'female', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g89', name: 'Surendra Singh', phone: '+91-9876543298', badgeNumber: 'SG089', status: 'inactive', type: 'permanent', payRate: 27500, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g90', name: 'Pushpa Rani', phone: '+91-9876543299', badgeNumber: 'SG090', status: 'active', type: 'contract', payRate: 20000, gender: 'female', languagesSpoken: ['Hindi', 'English'] },
  
  { id: 'g91', name: 'Jitendra Kumar', phone: '+91-9876543300', badgeNumber: 'SG091', status: 'active', type: 'permanent', payRate: 25500, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g92', name: 'Urmila Devi', phone: '+91-9876543301', badgeNumber: 'SG092', status: 'active', type: 'permanent', payRate: 23500, gender: 'female', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g93', name: 'Indrajeet Singh', phone: '+91-9876543302', badgeNumber: 'SG093', status: 'active', type: 'contract', payRate: 18500, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g94', name: 'Saraswati Kumari', phone: '+91-9876543303', badgeNumber: 'SG094', status: 'active', type: 'permanent', payRate: 24500, gender: 'female', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g95', name: 'Rakesh Tiwari', phone: '+91-9876543304', badgeNumber: 'SG095', status: 'active', type: 'permanent', payRate: 26000, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g96', name: 'Manju Agarwal', phone: '+91-9876543305', badgeNumber: 'SG096', status: 'inactive', type: 'contract', payRate: 19500, gender: 'female', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g97', name: 'Shyam Sundar', phone: '+91-9876543306', badgeNumber: 'SG097', status: 'active', type: 'permanent', payRate: 25000, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g98', name: 'Renu Sharma', phone: '+91-9876543307', badgeNumber: 'SG098', status: 'active', type: 'permanent', payRate: 22000, gender: 'female', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g99', name: 'Bal Krishna', phone: '+91-9876543308', badgeNumber: 'SG099', status: 'active', type: 'contract', payRate: 20500, gender: 'male', languagesSpoken: ['Hindi', 'English'] },
  { id: 'g100', name: 'Savita Kumari', phone: '+91-9876543309', badgeNumber: 'SG100', status: 'active', type: 'permanent', payRate: 23000, gender: 'female', languagesSpoken: ['Hindi', 'English'] }
];

// Sample Shifts
export let shifts: Shift[] = [
  {
    id: 's1',
    siteId: '1',
    type: 'day',
    guardId: 'g1'
  },
  {
    id: 's2',
    siteId: '1',
    type: 'day',
    guardId: 'g2'
  },
  {
    id: 's3',
    siteId: '1',
    type: 'night',
    guardId: 'g3'
  },
  {
    id: 's4',
    siteId: '2',
    type: 'day',
    guardId: 'g4'
  }
];

// Sample Attendance Records
export let attendanceRecords: AttendanceRecord[] = [];

// Sample Payment Records
export let paymentRecords: PaymentRecord[] = [];

// Function to generate dates
const getDateString = (daysAgo: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
};

// Local CRUD operations for Sites
export const fetchSites = async (): Promise<Site[]> => {
  return Promise.resolve([...sites]);
};

export const fetchSite = async (id: string): Promise<Site | null> => {
  const site = sites.find(s => s.id === id);
  return Promise.resolve(site || null);
};

export const createSite = async (site: Partial<Site>): Promise<Site> => {
  const newSite: Site = {
    ...site,
    id: Math.random().toString(36).substring(2, 15)
  } as Site;
  sites.push(newSite);
  return Promise.resolve(newSite);
};

export const updateSite = async (id: string, updates: Partial<Site>): Promise<Site> => {
  const index = sites.findIndex(site => site.id === id);
  if (index === -1) throw new Error('Site not found');
  
  sites[index] = { ...sites[index], ...updates };
  return Promise.resolve(sites[index]);
};

export const deleteSite = async (id: string): Promise<void> => {
  const index = sites.findIndex(site => site.id === id);
  if (index === -1) throw new Error('Site not found');
  
  sites.splice(index, 1);
  return Promise.resolve();
};

// Local CRUD operations for Guards
export const fetchGuards = async (): Promise<Guard[]> => {
  return Promise.resolve([...guards]);
};

export const fetchGuard = async (id: string): Promise<Guard | null> => {
  const guard = guards.find(g => g.id === id);
  return Promise.resolve(guard || null);
};

export const createGuard = async (guard: Partial<Guard>): Promise<Guard> => {
  const newGuard: Guard = {
    ...guard,
    id: Math.random().toString(36).substring(2, 15)
  } as Guard;
  guards.push(newGuard);
  return Promise.resolve(newGuard);
};

export const updateGuard = async (id: string, updates: Partial<Guard>): Promise<Guard> => {
  const index = guards.findIndex(guard => guard.id === id);
  if (index === -1) throw new Error('Guard not found');
  
  guards[index] = { ...guards[index], ...updates };
  return Promise.resolve(guards[index]);
};

export const deleteGuard = async (id: string): Promise<void> => {
  const index = guards.findIndex(guard => guard.id === id);
  if (index === -1) throw new Error('Guard not found');
  
  guards.splice(index, 1);
  return Promise.resolve();
};

// Local CRUD operations for Shifts
export const fetchShifts = async (): Promise<Shift[]> => {
  return Promise.resolve([...shifts]);
};

export const fetchShiftsBySite = async (siteId: string): Promise<Shift[]> => {
  const siteShifts = shifts.filter(shift => shift.siteId === siteId);
  return Promise.resolve(siteShifts);
};

export const createShift = async (shift: Partial<Shift>): Promise<Shift> => {
  const newShift: Shift = {
    ...shift,
    id: Math.random().toString(36).substring(2, 15)
  } as Shift;
  shifts.push(newShift);
  return Promise.resolve(newShift);
};

export const updateShift = async (id: string, updates: Partial<Shift>): Promise<Shift> => {
  const index = shifts.findIndex(shift => shift.id === id);
  if (index === -1) throw new Error('Shift not found');
  
  shifts[index] = { ...shifts[index], ...updates };
  return Promise.resolve(shifts[index]);
};

export const deleteShift = async (id: string): Promise<void> => {
  const index = shifts.findIndex(shift => shift.id === id);
  if (index === -1) throw new Error('Shift not found');
  
  shifts.splice(index, 1);
  return Promise.resolve();
};

// Local CRUD operations for Attendance
export const fetchAttendanceRecords = async (): Promise<AttendanceRecord[]> => {
  return Promise.resolve([...attendanceRecords]);
};

export const fetchAttendanceByDate = async (date: string): Promise<AttendanceRecord[]> => {
  const records = attendanceRecords.filter(record => record.date === date);
  return Promise.resolve(records);
};

export const fetchAttendanceByGuard = async (guardId: string): Promise<AttendanceRecord[]> => {
  const records = attendanceRecords.filter(record => 
    record.guardId === guardId || record.replacementGuardId === guardId
  );
  return Promise.resolve(records);
};

export const fetchAttendanceByShift = async (shiftId: string): Promise<AttendanceRecord[]> => {
  const records = attendanceRecords.filter(record => record.shiftId === shiftId);
  return Promise.resolve(records);
};

export const createAttendanceRecord = async (record: Partial<AttendanceRecord>): Promise<AttendanceRecord> => {
  // Check if record already exists for this shift and date
  if (record.shiftId && record.date) {
    const existingIndex = attendanceRecords.findIndex(existing => 
      existing.shiftId === record.shiftId && 
      existing.date === record.date && 
      existing.guardId === record.guardId
    );
    
    if (existingIndex !== -1) {
      // Update existing record
      attendanceRecords[existingIndex] = { ...attendanceRecords[existingIndex], ...record };
      return Promise.resolve(attendanceRecords[existingIndex]);
    }
  }

  const newRecord: AttendanceRecord = {
    ...record,
    id: Math.random().toString(36).substring(2, 15)
  } as AttendanceRecord;
  attendanceRecords.push(newRecord);
  return Promise.resolve(newRecord);
};

export const updateAttendanceRecord = async (id: string, updates: Partial<AttendanceRecord>): Promise<AttendanceRecord> => {
  const index = attendanceRecords.findIndex(record => record.id === id);
  if (index === -1) throw new Error('Attendance record not found');
  
  attendanceRecords[index] = { ...attendanceRecords[index], ...updates };
  return Promise.resolve(attendanceRecords[index]);
};

export const deleteAttendanceRecord = async (id: string): Promise<void> => {
  const index = attendanceRecords.findIndex(record => record.id === id);
  if (index === -1) throw new Error('Attendance record not found');
  
  attendanceRecords.splice(index, 1);
  return Promise.resolve();
};

// Helper function to check if guard is marked present elsewhere
export const isGuardMarkedPresentElsewhere = async (
  guardId: string, 
  date: string, 
  shiftType: 'day' | 'night', 
  excludeSiteId?: string
): Promise<boolean> => {
  const dateRecords = await fetchAttendanceByDate(date);
  
  // Get all shifts for the given shift type
  const relevantShifts = shifts.filter(shift => shift.type === shiftType);
  
  // Check if the guard is marked present or reassigned in any other site for this date and shift type
  return dateRecords.some(record => {
    // Find the shift for this record
    const shift = relevantShifts.find(s => s.id === record.shiftId);
    
    // Skip if shift is not found or is for the excluded site
    if (!shift || (excludeSiteId && shift.siteId === excludeSiteId)) {
      return false;
    }
    
    // Check if the guard is marked present or is a replacement at this site
    return (record.guardId === guardId && (record.status === 'present' || record.status === 'reassigned')) || 
           (record.replacementGuardId === guardId && record.status === 'replaced');
  });
};

// Site earnings calculation
export const fetchSiteMonthlyEarnings = async (siteId: string, month: string): Promise<SiteEarnings> => {
  const site = sites.find(s => s.id === siteId);
  if (!site) {
    return Promise.resolve({
      totalShifts: 0,
      allocatedAmount: 0,
      guardCosts: 0,
      netEarnings: 0
    });
  }

  // Get all shifts for this site
  const siteShifts = shifts.filter(s => s.siteId === siteId);
  
  // Calculate total shifts worked in the month
  const monthStart = new Date(month + '-01');
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();
  
  // For simplicity, assume each shift works every day
  const totalShifts = siteShifts.length * daysInMonth;
  
  // Calculate allocated amount (site pay rate for the month)
  const allocatedAmount = site.payRate || 0;
  
  // Calculate guard costs
  let guardCosts = 0;
  siteShifts.forEach(shift => {
    if (shift.guardId) {
      const guard = guards.find(g => g.id === shift.guardId);
      if (guard && guard.payRate) {
        guardCosts += guard.payRate;
      }
    }
  });
  
  const netEarnings = allocatedAmount - guardCosts;
  
  return Promise.resolve({
    totalShifts,
    allocatedAmount,
    guardCosts,
    netEarnings
  });
};

// Payment Records
export const fetchPaymentRecords = async (): Promise<PaymentRecord[]> => {
  return Promise.resolve([...paymentRecords]);
};

export const fetchPaymentsByGuard = async (guardId: string): Promise<PaymentRecord[]> => {
  const records = paymentRecords.filter(record => record.guardId === guardId);
  return Promise.resolve(records);
};

export const fetchPaymentsByMonth = async (month: string): Promise<PaymentRecord[]> => {
  const records = paymentRecords.filter(record => record.month === month);
  return Promise.resolve(records);
};

export const createPaymentRecord = async (record: Partial<PaymentRecord> & { guardId: string }): Promise<PaymentRecord> => {
  const newRecord: PaymentRecord = {
    ...record,
    id: Math.random().toString(36).substring(2, 15)
  } as PaymentRecord;
  paymentRecords.push(newRecord);
  return Promise.resolve(newRecord);
};

export const updatePaymentRecord = async (id: string, updates: Partial<PaymentRecord>): Promise<PaymentRecord> => {
  const index = paymentRecords.findIndex(record => record.id === id);
  if (index === -1) throw new Error('Payment record not found');
  
  paymentRecords[index] = { ...paymentRecords[index], ...updates };
  return Promise.resolve(paymentRecords[index]);
};

export const deletePaymentRecord = async (id: string): Promise<void> => {
  const index = paymentRecords.findIndex(record => record.id === id);
  if (index === -1) throw new Error('Payment record not found');
  
  paymentRecords.splice(index, 1);
  return Promise.resolve();
};

// Helper Functions
export const getSiteById = (id: string): Site | undefined => {
  return sites.find(site => site.id === id);
};

export const getGuardById = (id: string): Guard | undefined => {
  return guards.find(guard => guard.id === id);
};

export const getShiftsBySite = (siteId: string): Shift[] => {
  return shifts.filter(shift => shift.siteId === siteId);
};

export const getAttendanceByDate = (date: string): AttendanceRecord[] => {
  return attendanceRecords.filter(record => record.date === date);
};

export const getAttendanceByGuard = (guardId: string): AttendanceRecord[] => {
  return attendanceRecords.filter(
    record => record.guardId === guardId || record.replacementGuardId === guardId
  );
};

export const getAttendanceBySite = (siteId: string): AttendanceRecord[] => {
  const siteShiftIds = shifts.filter(shift => shift.siteId === siteId).map(shift => shift.id);
  return attendanceRecords.filter(record => siteShiftIds.includes(record.shiftId));
};

// Calculate attendance percentage for a guard
export const calculateGuardAttendance = (guardId: string): number => {
  const records = getAttendanceByGuard(guardId);
  if (records.length === 0) return 0;
  
  const presentCount = records.filter(r => 
    (r.guardId === guardId && r.status === 'present') || 
    (r.replacementGuardId === guardId)
  ).length;
  
  return (presentCount / records.length) * 100;
};

// Calculate staffing percentage for a site
export const calculateSiteStaffing = (siteId: string): number => {
  const site = getSiteById(siteId);
  if (!site) return 0;
  
  const records = getAttendanceBySite(siteId);
  if (records.length === 0) return 0;
  
  const filledShifts = records.filter(r => 
    r.status === 'present' || r.status === 'replaced'
  ).length;
  
  return (filledShifts / records.length) * 100;
};

// Calculate guard's daily earnings
export const calculateGuardDailyEarnings = (guardId: string, date: string): number => {
  const guard = getGuardById(guardId);
  if (!guard || !guard.payRate) return 0;
  
  const dateRecords = getAttendanceByDate(date);
  
  // Count shifts where the guard was present or was a replacement
  const shiftsWorked = dateRecords.filter(record => 
    (record.guardId === guardId && record.status === 'present') ||
    (record.replacementGuardId === guardId && record.status === 'replaced')
  ).length;
  
  // Calculate daily rate from monthly pay rate
  const daysInMonth = new Date().getDate();
  const dailyRate = guard.payRate / daysInMonth;
  
  return shiftsWorked * dailyRate;
};

// Currency formatting
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const fetchGuardMonthlyStats = async (guardId: string, month: string): Promise<{ totalShifts: number, earnings: number, bonuses: number, deductions: number, netAmount: number }> => {
  const guard = guards.find(g => g.id === guardId);
  if (!guard) {
    return { totalShifts: 0, earnings: 0, bonuses: 0, deductions: 0, netAmount: 0 };
  }

  // For simplicity, calculate based on shifts worked in the month
  const monthStart = new Date(month + '-01');
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();
  
  // Count attendance records for this guard in the month
  const monthRecords = attendanceRecords.filter(record => {
    const recordDate = new Date(record.date);
    return recordDate >= monthStart && recordDate <= monthEnd &&
           ((record.guardId === guardId && record.status === 'present') ||
            (record.replacementGuardId === guardId && record.status === 'replaced'));
  });
  
  const totalShifts = monthRecords.length;
  const dailyRate = guard.payRate ? guard.payRate / daysInMonth : 0;
  const earnings = totalShifts * dailyRate;
  
  // Calculate bonuses and deductions for the month
  const monthPayments = paymentRecords.filter(record => 
    record.guardId === guardId && record.month === month
  );
  
  const bonuses = monthPayments
    .filter(payment => payment.type === 'bonus')
    .reduce((sum, payment) => sum + payment.amount, 0);
    
  const deductions = monthPayments
    .filter(payment => payment.type === 'deduction')
    .reduce((sum, payment) => sum + payment.amount, 0);
  
  const netAmount = earnings + bonuses - deductions;
  
  return { totalShifts, earnings, bonuses, deductions, netAmount };
};

// Legacy functions for compatibility
export const addSite = (site: Partial<Site>): Site => {
  const newSite: Site = {
    id: Math.random().toString(36).substring(2, 15),
    name: site.name || '',
    organizationName: site.organizationName || '',
    gstNumber: site.gstNumber || '',
    addressLine1: site.addressLine1 || site.location || '',
    addressLine2: site.addressLine2 || '',
    addressLine3: site.addressLine3 || '',
    gstType: site.gstType || 'GST',
    siteType: site.siteType || '',
    
    staffingSlots: site.staffingSlots || [],
    // Legacy compatibility
    location: site.location || site.addressLine1 || '',
    daySlots: site.daySlots || 0,
    nightSlots: site.nightSlots || 0,
    payRate: site.payRate || 0,
    ...site
  };
  sites.push(newSite);
  return newSite;
};

export const updateSiteLocal = (id: string, updates: Partial<Site>): Site | null => {
  const index = sites.findIndex(site => site.id === id);
  if (index === -1) return null;
  
  sites[index] = { ...sites[index], ...updates };
  return sites[index];
};

export const deleteSiteLocal = (id: string): boolean => {
  const index = sites.findIndex(site => site.id === id);
  if (index === -1) return false;
  
  sites.splice(index, 1);
  return true;
};
