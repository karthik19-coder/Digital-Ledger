const fs = require('fs');

let content = fs.readFileSync('src/pages/CustomerDetails.tsx', 'utf8');

content = content.replace(/CustomerDetails/g, 'VendorDetails');
content = content.replace(/CustomerTransaction/g, 'VendorTransaction');
content = content.replace(/Customer Credit/g, 'Vendor Credit');
content = content.replace(/customerService/g, 'vendorService');
content = content.replace(/Customer/g, 'Vendor');
content = content.replace(/customer/g, 'vendor');

// Imports
content = content.replace(
  "import { Vendor } from '../services/vendor.service';",
  "import { vendorService } from '../services/vendor.service';\nimport { Vendor, VendorTransaction } from '../types/vendor';"
);

// We need to fix the imports since we did replace globally
content = content.replace(
  "import { vendorService } from '../services/vendor.service';\nimport { vendorService } from '../services/vendor.service';\nimport { Vendor, VendorTransaction } from '../types/vendor';",
  "import { vendorService } from '../services/vendor.service';\nimport { Vendor, VendorTransaction } from '../types/vendor';"
);

content = content.replace(/total_credit/g, 'total_due');

// The action buttons and labels
content = content.replace(/Add Credit/g, 'Add Purchase');
content = content.replace(/Add Purchase Amount/g, 'Purchase Amount');
content = content.replace(/isAddingCredit/g, 'isAddingPurchase');
content = content.replace(/setIsCreditModalOpen/g, 'setIsPurchaseModalOpen');
content = content.replace(/isCreditModalOpen/g, 'isPurchaseModalOpen');
content = content.replace(/creditAmount/g, 'purchaseAmount');
content = content.replace(/setCreditAmount/g, 'setPurchaseAmount');
content = content.replace(/handleAddCredit/g, 'handleAddPurchase');
content = content.replace(/credit_sales/g, 'purchases');

// Replaces related to Payment
content = content.replace(/Record Payment/g, 'Pay Vendor');
// the Payment label inside modal
content = content.replace(/Record Payment/g, 'Pay Vendor'); 
// "Payment Amount" is already good

// Replacing the text for transactions
content = content.replace(/tx\.type === 'credit'/g, "tx.type === 'purchase'");
content = content.replace(/tx\.type === 'payment'/g, "tx.type === 'payment'");
content = content.replace(/Sale on Credit/g, "Purchase");
content = content.replace(/vendor\.total_due - paymentAmount < 0/g, "vendor.total_due - paymentAmount < 0");

// The button label
content = content.replace(/>\s*Pay Vendor\s*</g, ">Pay Vendor<");
content = content.replace(/>\s*Save Credit\s*</g, ">Save Purchase<");

// Replaces in handleAddCredit -> handleAddPurchase
content = content.replace(/vendorService\.addCredit/g, "vendorService.addPurchase");

fs.writeFileSync('src/pages/VendorDetails.tsx', content);

console.log("Created VendorDetails.tsx");
