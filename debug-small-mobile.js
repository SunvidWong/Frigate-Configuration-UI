import puppeteer from 'puppeteer';

async function debugSmallMobile() {
  console.log('🔍 启动小屏幕调试...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // 设置小屏幕视口
    await page.setViewport({ width: 320, height: 568 });
    
    // 访问页面
    console.log('📄 访问页面...');
    await page.goto('http://localhost:5550/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // 等待页面完全加载
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 详细分析所有可能导致水平滚动的元素
    const scrollAnalysis = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const problematicElements = [];
      
      elements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        
        // 检查是否超出视口宽度
        if (rect.right > window.innerWidth || rect.width > window.innerWidth) {
          problematicElements.push({
            index,
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            rect: {
              width: rect.width,
              height: rect.height,
              left: rect.left,
              right: rect.right,
              top: rect.top,
              bottom: rect.bottom
            },
            style: {
              width: style.width,
              minWidth: style.minWidth,
              maxWidth: style.maxWidth,
              margin: style.margin,
              padding: style.padding,
              border: style.border,
              boxSizing: style.boxSizing,
              position: style.position,
              overflow: style.overflow,
              overflowX: style.overflowX
            },
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
            offsetWidth: el.offsetWidth
          });
        }
      });
      
      return {
        windowWidth: window.innerWidth,
        bodyScrollWidth: document.body.scrollWidth,
        bodyClientWidth: document.body.clientWidth,
        htmlScrollWidth: document.documentElement.scrollWidth,
        htmlClientWidth: document.documentElement.clientWidth,
        problematicElements: problematicElements.slice(0, 10) // 只显示前10个问题元素
      };
    });
    
    console.log('📊 小屏幕滚动分析结果:');
    console.log(`  窗口宽度: ${scrollAnalysis.windowWidth}px`);
    console.log(`  Body滚动宽度: ${scrollAnalysis.bodyScrollWidth}px`);
    console.log(`  Body客户端宽度: ${scrollAnalysis.bodyClientWidth}px`);
    console.log(`  HTML滚动宽度: ${scrollAnalysis.htmlScrollWidth}px`);
    console.log(`  HTML客户端宽度: ${scrollAnalysis.htmlClientWidth}px`);
    
    if (scrollAnalysis.problematicElements.length > 0) {
      console.log(`\n❌ 发现 ${scrollAnalysis.problematicElements.length} 个可能导致水平滚动的元素:`);
      
      scrollAnalysis.problematicElements.forEach((el, index) => {
        console.log(`\n  ${index + 1}. ${el.tagName}${el.className ? '.' + el.className.split(' ').join('.') : ''}${el.id ? '#' + el.id : ''}`);
        console.log(`     位置: left=${el.rect.left}px, right=${el.rect.right}px`);
        console.log(`     尺寸: width=${el.rect.width}px (style: ${el.style.width})`);
        console.log(`     最小宽度: ${el.style.minWidth}`);
        console.log(`     最大宽度: ${el.style.maxWidth}`);
        console.log(`     盒模型: ${el.style.boxSizing}`);
        console.log(`     溢出: ${el.style.overflow} (X: ${el.style.overflowX})`);
        console.log(`     滚动宽度: ${el.scrollWidth}px`);
        console.log(`     客户端宽度: ${el.clientWidth}px`);
        console.log(`     偏移宽度: ${el.offsetWidth}px`);
        
        if (el.rect.right > scrollAnalysis.windowWidth) {
          console.log(`     ⚠️  右边界超出视口 ${el.rect.right - scrollAnalysis.windowWidth}px`);
        }
        if (el.rect.width > scrollAnalysis.windowWidth) {
          console.log(`     ⚠️  宽度超出视口 ${el.rect.width - scrollAnalysis.windowWidth}px`);
        }
      });
    } else {
      console.log('✅ 未发现超出视口的元素');
    }
    
    // 检查特定的布局容器
    const containerAnalysis = await page.evaluate(() => {
      const containers = [
        'body',
        'html', 
        '.min-h-screen',
        '.dashboard-container',
        '.flex-1',
        '.lg\\:pl-64'
      ];
      
      return containers.map(selector => {
        const elements = document.querySelectorAll(selector);
        return Array.from(elements).map(el => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          
          return {
            selector,
            tagName: el.tagName,
            className: el.className,
            rect: {
              width: rect.width,
              right: rect.right
            },
            style: {
              width: style.width,
              minWidth: style.minWidth,
              maxWidth: style.maxWidth,
              paddingLeft: style.paddingLeft,
              paddingRight: style.paddingRight,
              marginLeft: style.marginLeft,
              marginRight: style.marginRight
            },
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth
          };
        });
      }).flat();
    });
    
    console.log('\n📦 关键容器分析:');
    containerAnalysis.forEach(container => {
      if (container.rect.width > 0) {
        console.log(`  ${container.selector} (${container.tagName}):`);
        console.log(`    宽度: ${container.rect.width}px (style: ${container.style.width})`);
        console.log(`    右边界: ${container.rect.right}px`);
        console.log(`    滚动宽度: ${container.scrollWidth}px`);
        console.log(`    内边距: L=${container.style.paddingLeft}, R=${container.style.paddingRight}`);
        console.log(`    外边距: L=${container.style.marginLeft}, R=${container.style.marginRight}`);
        
        if (container.rect.right > 320) {
          console.log(`    ⚠️  超出视口 ${container.rect.right - 320}px`);
        }
      }
    });
    
  } catch (error) {
    console.error('❌ 调试过程中出现错误:', error.message);
  } finally {
    await browser.close();
    console.log('\n🔚 小屏幕调试完成');
  }
}

debugSmallMobile().catch(console.error);