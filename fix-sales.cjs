const fs = require('fs');

let content = fs.readFileSync('src/pages/Sales.tsx', 'utf8');

// I will just replace the {creditSales > 0 && ( ... )} block with nothing.
// Let's find the index of "{creditSales > 0 && ("
const startIndex = content.indexOf('{creditSales > 0 && (');
if (startIndex !== -1) {
  let openBraces = 0;
  let endIndex = -1;
  let inBlock = false;
  
  for (let i = startIndex; i < content.length; i++) {
    if (content[i] === '{') {
      openBraces++;
      inBlock = true;
    } else if (content[i] === '}') {
      openBraces--;
    }
    
    if (inBlock && openBraces === 0) {
      endIndex = i;
      break;
    }
  }
  
  if (endIndex !== -1) {
    content = content.substring(0, startIndex) + content.substring(endIndex + 1);
  }
}

fs.writeFileSync('src/pages/Sales.tsx', content);
