const fs = require('fs');
const glob = require('glob'); // wait, node doesn't have glob built-in, I'll just read src/pages directly
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('const formatCurrency =')) {
    // Replace the block
    // It usually starts with `const formatCurrency = (` and ends with `};`
    // We'll use a regex
    content = content.replace(/const formatCurrency = \([^)]+\) => \{[\s\S]*?^\};\n?/m, '');
    
    // Some are formatted like:
    // const formatCurrency = (amount: number) => new Intl.NumberFormat(...).format(amount);
    // Let's check for those too
    content = content.replace(/const formatCurrency = \([^)]+\) => [\s\S]*?\.format\([^)]+\);\n?/g, '');

    // Another format:
    // const formatCurrency = (value: number) => { return new Intl.NumberFormat(...).format(value); };
    content = content.replace(/const formatCurrency = \([^)]+\) => \{[\s\S]*?\.format\([^)]+\);\n  \};\n?/g, '');
    content = content.replace(/const formatCurrency = \([^)]+\) => \{[\s\S]*?\.format\([^)]+\);\n\};\n?/g, '');

    // Inject import
    if (!content.includes('../utils/formatters')) {
      // Find the last import statement
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
