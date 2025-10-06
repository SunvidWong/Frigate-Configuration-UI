const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('http://localhost:5550/');
    
    // 等待页面加载完成
    await page.waitForTimeout(2000);
    
    // 获取dashboard容器的样式信息
    const dashboardInfo = await page.evaluate(() => {
      const container = document.querySelector('.dashboard-container');
      if (!container) return { error: 'Dashboard container not found' };
      
      const styles = window.getComputedStyle(container);
      return {
        display: styles.display,
        flexDirection: styles.flexDirection,
        gap: styles.gap,
        padding: styles.padding,
        className: container.className,
        innerHTML: container.innerHTML.substring(0, 200) + '...'
      };
    });
    
    console.log('Dashboard Container Info:', JSON.stringify(dashboardInfo, null, 2));
    
    await browser.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
