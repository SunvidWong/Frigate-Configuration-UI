import puppeteer from 'puppeteer';

async function checkButtonSizes() {
  console.log('🔍 检查按钮尺寸...');
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5550/', { waitUntil: 'networkidle0' });
    
    const viewports = [
      { width: 320, height: 568, name: 'Small Mobile' },
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' }
    ];
    
    for (const viewport of viewports) {
      console.log(`\n📱 检查 ${viewport.name} (${viewport.width}x${viewport.height}):`);
      
      await page.setViewport(viewport);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const buttonInfo = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        const buttonData = [];
        
        buttons.forEach((btn, index) => {
          const rect = btn.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(btn);
          
          buttonData.push({
            index: index + 1,
            text: btn.textContent.trim().substring(0, 20),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            minHeight: computedStyle.minHeight,
            padding: computedStyle.padding,
            className: btn.className,
            meets44px: rect.width >= 44 && rect.height >= 44
          });
        });
        
        return buttonData;
      });
      
      buttonInfo.forEach(btn => {
        const status = btn.meets44px ? '✅' : '❌';
        console.log(`  ${status} 按钮${btn.index}: "${btn.text}" - ${btn.width}x${btn.height}px (min-height: ${btn.minHeight})`);
        if (!btn.meets44px) {
          console.log(`    类名: ${btn.className}`);
          console.log(`    内边距: ${btn.padding}`);
        }
      });
      
      const smallButtons = buttonInfo.filter(btn => !btn.meets44px);
      if (smallButtons.length > 0) {
        console.log(`  ⚠️  发现 ${smallButtons.length} 个小于44px的按钮`);
      } else {
        console.log(`  🎉 所有按钮都符合44px标准`);
      }
    }
    
  } catch (error) {
    console.error('❌ 检查过程中出错:', error);
  } finally {
    await browser.close();
    console.log('\n🔚 检查完成');
  }
}

checkButtonSizes().catch(console.error);