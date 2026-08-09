const fs = require('fs');

let vendors = fs.readFileSync('src/pages/Vendors.tsx', 'utf8');
vendors = vendors.replace(/total_vendors/g, 'total_due');
fs.writeFileSync('src/pages/Vendors.tsx', vendors);

let vendorDetails = fs.readFileSync('src/pages/VendorDetails.tsx', 'utf8');
vendorDetails = vendorDetails.replace(/getVendor\(/g, 'getVendorById(');
// The Receive Payment needs to change to Pay Vendor if not already
vendorDetails = vendorDetails.replace(/Receive Payment/g, 'Pay Vendor');
vendorDetails = vendorDetails.replace(/Customer/g, 'Vendor');
vendorDetails = vendorDetails.replace(/customer/g, 'vendor');
// Fix missing FileText import?
// Check if FileText is imported in VendorDetails.tsx
if (!vendorDetails.includes('FileText,')) {
    vendorDetails = vendorDetails.replace(
        "Search, ArrowLeft, Plus, IndianRupee, Loader2, X, AlertCircle } from 'lucide-react';",
        "Search, ArrowLeft, Plus, IndianRupee, Loader2, X, AlertCircle, FileText } from 'lucide-react';"
    );
}

fs.writeFileSync('src/pages/VendorDetails.tsx', vendorDetails);

let vendorService = fs.readFileSync('src/services/vendor.service.ts', 'utf8');
vendorService = vendorService.replace(/getVendorById/g, 'getVendorById');
// Let's make sure it's exported
fs.writeFileSync('src/services/vendor.service.ts', vendorService);
