const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Bootstrap>
          <Routes>
            <Route path="/setup" element={<Setup />} />
            <Route path="/password" element={<Password />} />
            
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="sales" element={<Sales />} />
              <Route path="credit" element={<Credit />} />
              <Route path="credit/:id" element={<CustomerDetails />} />
              <Route path="stock" element={<Stock />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Bootstrap>
      </BrowserRouter>
    </ErrorBoundary>
  );
}`;

const replacement = `export default function App() {
  // TODO: Re-enable Bootstrap, Setup, Opening Balance and Password flow before production.
  const DEV_MODE_BYPASS = true;

  return (
    <ErrorBoundary>
      <BrowserRouter>
        {DEV_MODE_BYPASS ? (
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="sales" element={<Sales />} />
              <Route path="credit" element={<Credit />} />
              <Route path="credit/:id" element={<CustomerDetails />} />
              <Route path="stock" element={<Stock />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        ) : (
          <Bootstrap>
            <Routes>
              <Route path="/setup" element={<Setup />} />
              <Route path="/password" element={<Password />} />
              
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="sales" element={<Sales />} />
                <Route path="credit" element={<Credit />} />
                <Route path="credit/:id" element={<CustomerDetails />} />
                <Route path="stock" element={<Stock />} />
                <Route path="expenses" element={<Expenses />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Bootstrap>
        )}
      </BrowserRouter>
    </ErrorBoundary>
  );
}`;

content = content.replace(target, replacement);
fs.writeFileSync('src/App.tsx', content);
