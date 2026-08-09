const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('const formatCurrency =')) {
    // Basic regex replacement
    content = content.replace(/const formatCurrency = \([^)]+\) => \{[\s\S]*?^\};\n?/m, '');
    content = content.replace(/const formatCurrency = \([^)]+\) => [\s\S]*?\.format\([^)]+\);\n?/g, '');
    content = content.replace(/const formatCurrency = \([^)]+\) => \{[\s\S]*?\.format\([^)]+\);\n  \};\n?/g, '');
    content = content.replace(/const formatCurrency = \([^)]+\) => \{[\s\S]*?\.format\([^)]+\);\n\};\n?/g, '');

    // Inject import
    if (!content.includes('../utils/formatters')) {
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const nextLineIndex = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, nextLineIndex + 1) + 
                  "import { formatCurrency } from '../utils/formatters';\n" + 
                  content.slice(nextLineIndex + 1);
      } else {
        content = "import { formatCurrency } from '../utils/formatters';\n" + content;
      }
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
