const fs = require('fs');
let content = fs.readFileSync('src/pages/Credit.tsx', 'utf8');

const regex = /<div className="relative">\s*<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">\s*<Search className="h-4 w-4 text-slate-400" \/>\s*<\/div>\s*<Input[\s\S]*?className="pl-10 bg-white border-slate-200"\s*\/>\s*<\/div>/;

const replacement = `<div className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <Input 
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-slate-200"
            />
          </div>
          <Button 
            className="bg-orange-600 hover:bg-orange-700 text-white shrink-0 h-10"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Customer</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/pages/Credit.tsx', content);
