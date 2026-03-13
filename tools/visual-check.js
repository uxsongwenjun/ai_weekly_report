import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  console.log('Navigating to http://localhost:3001 ...');
  try {
    await page.goto('http://localhost:3001', { timeout: 30000 });
  } catch (e) {
    console.error('Failed to load page:', e.message);
    await browser.close();
    process.exit(1);
  }
  
  // Wait for network idle to ensure content is loaded
  try {
    await page.waitForLoadState('networkidle', { timeout: 10000 });
  } catch (e) {
    console.log('Network idle timeout, proceeding anyway...');
  }
  
  // Scroll to bottom to trigger lazy loading
  console.log('Scrolling to load lazy components...');
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 50);
    });
  });

  // Wait a bit more for lazy loaded components to render
  await page.waitForTimeout(2000);

  const sections = [
    { id: '#industry', name: 'Industry News' },
    { id: '#design-tools', name: 'Design Tools' },
    { id: '#opensource', name: 'Open Source Picks' },
    { id: '#hot-topics', name: 'Hot Topics' }
  ];

  console.log('\n--- Visual Consistency Audit ---\n');

  for (const section of sections) {
    const cardSelector = `${section.id} .card`;
    try {
      if (await page.$(cardSelector)) {
        const styles = await page.$eval(cardSelector, (el) => {
          const computed = window.getComputedStyle(el);
          return {
            padding: computed.padding,
            borderRadius: computed.borderRadius,
            backgroundColor: computed.backgroundColor,
            border: `${computed.borderTopWidth} ${computed.borderTopStyle} ${computed.borderTopColor}`,
            boxShadow: computed.boxShadow,
            minHeight: computed.minHeight
          };
        });
        
        console.log(`[${section.name}]`);
        console.log(`  Padding: ${styles.padding}`);
        console.log(`  Border Radius: ${styles.borderRadius}`);
        console.log(`  Background: ${styles.backgroundColor}`);
        console.log(`  Border: ${styles.border}`);
        console.log(`  Box Shadow: ${styles.boxShadow}`);
        console.log(`  Min Height: ${styles.minHeight}`);
        console.log('');
      } else {
         console.log(`[${section.name}] - Card selector "${cardSelector}" not found`);
      }
      
    } catch (e) {
      console.log(`[${section.name}] - Error: ${e.message}`);
    }
  }

  await browser.close();
})();
