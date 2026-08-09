const fs = require('fs');
let content = fs.readFileSync('src/pages/Credit.tsx', 'utf8');

const target = '        <div className="relative">\n          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">\n            <Search className="h-4 w-4 text-slate-400" />\n          </div>\n          <Input\n            type="text"\n            placeholder="Search customers..."\n            value={searchQuery}\n            onChange={(e) => setSearchQuery(e.target.value)}\n            className="pl-10 bg-white border-slate-200"\n          />\n        </div>';

const replacement = `        <div className="flex gap-2">
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

content = content.replace(target, replacement);
fs.writeFileSync('src/pages/Credit.tsx', content);
