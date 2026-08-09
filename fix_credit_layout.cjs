const fs = require('fs');
let content = fs.readFileSync('src/pages/Credit.tsx', 'utf8');

const oldHeader = `        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Customer Credit</h1>
          <Button 
            size="sm" 
            className="bg-orange-600 hover:bg-orange-700 text-white rounded-full px-4"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>`;

const newHeader = `        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Customer Credit</h1>
        </div>`;

const oldSearch = `        <div className="relative">
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
        </div>`;

const newSearch = `        <div className="flex gap-2">
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

content = content.replace(oldHeader, newHeader).replace(oldSearch, newSearch);

fs.writeFileSync('src/pages/Credit.tsx', content);
