const fs = require('fs');
let credit = fs.readFileSync('src/pages/Credit.tsx', 'utf8');
if (!credit.includes('ArrowLeft,')) {
    credit = credit.replace("import { ArrowLeft, Search, Plus", "import { ArrowLeft, Search, Plus"); // wait, maybe the replace didn't work previously because ArrowLeft was already replaced?
    if (!credit.includes('ArrowLeft,')) {
        credit = credit.replace("Search, Plus,", "ArrowLeft, Search, Plus,");
    }
}
fs.writeFileSync('src/pages/Credit.tsx', credit);

let vendors = fs.readFileSync('src/pages/Vendors.tsx', 'utf8');
if (!vendors.includes('ArrowLeft,')) {
    vendors = vendors.replace("import { ArrowLeft, IndianRupee,", "import { ArrowLeft, IndianRupee,");
    if (!vendors.includes('ArrowLeft,')) {
        vendors = vendors.replace("IndianRupee, Search, Plus,", "ArrowLeft, IndianRupee, Search, Plus,");
    }
}
fs.writeFileSync('src/pages/Vendors.tsx', vendors);
console.log("ArrowLeft fixed");
