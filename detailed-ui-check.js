import puppeteer from 'puppeteer';

async function detailedUICheck() {
  console.log('🔍 启动详细UI检查...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // 设置视口
    await page.setViewport({ width: 1920, height: 1080 });
    
    // 访问页面
    console.log('📄 访问页面...');
    await page.goto('http://localhost:5550/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // 等待页面完全加载
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 检查页面基本信息
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        readyState: document.readyState,
        bodyClass: document.body.className,
        bodyStyle: window.getComputedStyle(document.body),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      };
    });
    
    console.log('📊 页面基本信息:');
    console.log(`  标题: ${pageInfo.title}`);
    console.log(`  URL: ${pageInfo.url}`);
    console.log(`  状态: ${pageInfo.readyState}`);
    console.log(`  视口: ${pageInfo.viewport.width}x${pageInfo.viewport.height}`);
    
    // 检查是否有错误信息
    const errors = await page.evaluate(() => {
      const errorElements = document.querySelectorAll('[class*="error"], .error, [data-testid*="error"]');
      return Array.from(errorElements).map(el => ({
        tagName: el.tagName,
        className: el.className,
        textContent: el.textContent.trim(),
        visible: el.offsetParent !== null
      }));
    });
    
    if (errors.length > 0) {
      console.log('❌ 发现错误元素:');
      errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.tagName}.${error.className}: ${error.textContent}`);
      });
    } else {
      console.log('✅ 未发现错误元素');
    }
    
    // 检查主要容器
    const containerInfo = await page.evaluate(() => {
      const containers = [
        '.app',
        '.dashboard-container', 
        '.app-main',
        '.app-header'
      ];
      
      return containers.map(selector => {
        const element = document.querySelector(selector);
        if (!element) return { selector, exists: false };
        
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        
        return {
          selector,
          exists: true,
          rect: {
            width: rect.width,
            height: rect.height,
            x: rect.x,
            y: rect.y
          },
          style: {
            display: style.display,
            position: style.position,
            overflow: style.overflow,
            overflowX: style.overflowX,
            overflowY: style.overflowY,
            width: style.width,
            height: style.height,
            minWidth: style.minWidth,
            maxWidth: style.maxWidth
          },
          scrollWidth: element.scrollWidth,
          scrollHeight: element.scrollHeight,
          clientWidth: element.clientWidth,
          clientHeight: element.clientHeight
        };
      });
    });
    
    console.log('📦 容器信息:');
    containerInfo.forEach(container => {
      if (container.exists) {
        console.log(`  ${container.selector}:`);
        console.log(`    尺寸: ${container.rect.width}x${container.rect.height}`);
        console.log(`    位置: (${container.rect.x}, ${container.rect.y})`);
        console.log(`    显示: ${container.style.display}`);
        console.log(`    溢出: ${container.style.overflow} (X: ${container.style.overflowX}, Y: ${container.style.overflowY})`);
        console.log(`    滚动尺寸: ${container.scrollWidth}x${container.scrollHeight}`);
        console.log(`    客户端尺寸: ${container.clientWidth}x${container.clientHeight}`);
        
        if (container.scrollWidth > container.clientWidth) {
          console.log(`    ⚠️  水平滚动: 内容宽度(${container.scrollWidth}) > 容器宽度(${container.clientWidth})`);
        }
      } else {
        console.log(`  ${container.selector}: 不存在`);
      }
    });
    
    // 检查JavaScript错误
    const jsErrors = [];
    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });
    
    // 等待一下看是否有延迟的错误
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (jsErrors.length > 0) {
      console.log('❌ JavaScript错误:');
      jsErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    } else {
      console.log('✅ 无JavaScript错误');
    }
    
    // 检查网络请求
    const failedRequests = [];
    page.on('requestfailed', request => {
      failedRequests.push({
        url: request.url(),
        failure: request.failure()
      });
    });
    
    if (failedRequests.length > 0) {
      console.log('❌ 失败的网络请求:');
      failedRequests.forEach((req, index) => {
        console.log(`  ${index + 1}. ${req.url}: ${req.failure.errorText}`);
      });
    } else {
      console.log('✅ 所有网络请求成功');
    }
    
    // 检查响应式布局
    const viewports = [
      { name: 'Small Mobile', width: 320, height: 568 },
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];
    
    console.log('📱 检查响应式布局:');
    for (const viewport of viewports) {
      await page.setViewport(viewport);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const layoutInfo = await page.evaluate(() => {
        const body = document.body;
        const html = document.documentElement;
        
        return {
          bodyScrollWidth: body.scrollWidth,
          bodyClientWidth: body.clientWidth,
          htmlScrollWidth: html.scrollWidth,
          htmlClientWidth: html.clientWidth,
          windowWidth: window.innerWidth,
          hasHorizontalScroll: body.scrollWidth > window.innerWidth || html.scrollWidth > window.innerWidth
        };
      });
      
      console.log(`  ${viewport.name} (${viewport.width}x${viewport.height}):`);
      console.log(`    窗口宽度: ${layoutInfo.windowWidth}`);
      console.log(`    Body滚动宽度: ${layoutInfo.bodyScrollWidth}`);
      console.log(`    HTML滚动宽度: ${layoutInfo.htmlScrollWidth}`);
      console.log(`    水平滚动: ${layoutInfo.hasHorizontalScroll ? '是' : '否'}`);
      
      if (layoutInfo.hasHorizontalScroll) {
        console.log(`    ⚠️  检测到水平滚动问题`);
      }
    }
    
  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error.message);
  } finally {
    await browser.close();
    console.log('🔚 详细UI检查完成');
  }
}

detailedUICheck().catch(console.error);