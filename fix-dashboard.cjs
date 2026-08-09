const fs = require('fs');

const dashStr = fs.readFileSync('src/services/dashboard.service.ts', 'utf8');
const custStr = fs.readFileSync('src/services/customer.service.ts', 'utf8');

