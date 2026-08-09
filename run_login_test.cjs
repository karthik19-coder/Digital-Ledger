const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    // Attempt to log out the text or the argument properties
    const type = msg.type();
    // Only capture log types to avoid clutter
    if (['log', 'info', 'error', 'warn'].includes(type)) {
      Promise.all(msg.args().map(arg => arg.jsonValue()))
        .then(args => {
          if (args.length > 0) {
            console.log(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '));
          } else {
            console.log(msg.text());
          }
        })
        .catch(() => console.log(msg.text()));
    }
  });

  try {
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    
    await page.waitForSelector('#email');
    await page.type('#email', 'bhusimk@gmail.com');
    await page.type('#password', 'Shop@12345');
    
    await page.click('button[type="submit"]');
    
    // Wait for Access Denied page to mount
    await page.waitForSelector('h2', { timeout: 10000 });
    
    // Wait a few seconds to let any async profile requests finish and log
    await new Promise(r => setTimeout(r, 2000));
    
  } catch (err) {
    console.error("TEST SCRIPT ERROR:", err);
  } finally {
    await browser.close();
  }
})();
