const fs = require('fs');
let content = fs.readFileSync('src/pages/Vendors.tsx', 'utf8');

if (!content.includes('IndianRupee')) {
  content = content.replace(
    "import { Search, Plus, User, Phone, Loader2, Users, X, MapPin, AlertCircle, CheckCircle2, Edit, Trash2, ChevronRight } from 'lucide-react';",
    "import { IndianRupee, Search, Plus, User, Phone, Loader2, Users, X, MapPin, AlertCircle, CheckCircle2, Edit, Trash2, ChevronRight } from 'lucide-react';"
  );
}

// And fix Vendor Vendors -> Vendor Credit if there's any left
content = content.replace(/Total Vendor Vendors/g, "Total Vendor Due");
content = content.replace(/Vendor Vendors/g, "Vendor Credit");

// Ensure vendorService imported correctly - it should be 'import { vendorService } from '../services/vendor.service';'
// wait, the import in Credit.tsx was `import { customerService } from '../services/customer.service';`
// wait, `import { vendorService, Vendor } from '../services/vendor.service';` Wait, `Vendor` type wasn't exported in `vendor.service.ts` !
// `Vendor` is exported in `../types/vendor`. Let's fix the imports!
content = content.replace(
  "import { vendorService, Vendor } from '../services/vendor.service';",
  "import { vendorService } from '../services/vendor.service';\nimport { Vendor } from '../types/vendor';"
);

fs.writeFileSync('src/pages/Vendors.tsx', content);
console.log("Updated Vendors.tsx");
