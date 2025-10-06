import puppeteer from 'puppeteer';

console.log('🚀 开始UI检查...');

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

console.log('✅ 浏览器启动成功');

const page = await browser.newPage();
console.log('✅ 新页面创建成功');

try {
  console.log('🔍 正在访问页面: http://localhost:5550/');
  await page.goto('http://localhost:5550/', { 
    waitUntil: 'networkidle2',
    timeout: 10000 
  });
  console.log('✅ 页面加载完成');

  // 基础检查
  const title = await page.title();
  console.log(`📄 页面标题: ${title}`);

  // 检查dashboard容器
  const dashboardContainer = await page.$('.dashboard-container');
  if (dashboardContainer) {
    console.log('✅ 找到dashboard容器');
    
    // 获取容器信息
    const containerInfo = await page.evaluate(() => {
      const container = document.querySelector('.dashboard-container');
      if (!container) return null;
      
      const rect = container.getBoundingClientRect();
      const style = window.getComputedStyle(container);
      
      return {
        width: rect.width,
        height: rect.height,
        display: style.display,
        gridTemplateColumns: style.gridTemplateColumns,
        gap: style.gap,
        childrenCount: container.children.length
      };
    });
    
    console.log('📊 容器信息:', containerInfo);
  } else {
    console.log('❌ 未找到dashboard容器');
  }

  // 检查卡片
  const cards = await page.$$('.dashboard-card');
  console.log(`📋 找到 ${cards.length} 个卡片`);

  // 检查按钮
  const buttons = await page.$$('button');
  console.log(`🔘 找到 ${buttons.length} 个按钮`);

  // 检查是否有JavaScript错误
  const errors = [];
  page.on('pageerror', error => {
    errors.push(error.message);
  });

  // 等待一下看是否有错误
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  if (errors.length > 0) {
    console.log('❌ 发现JavaScript错误:');
    errors.forEach(error => console.log(`  - ${error}`));
  } else {
    console.log('✅ 未发现JavaScript错误');
  }

  // 检查响应式
  console.log('📱 检查响应式布局...');
  
  const viewports = [
    { width: 375, height: 667, name: 'Mobile' },
    { width: 768, height: 1024, name: 'Tablet' },
    { width: 1920, height: 1080, name: 'Desktop' }
  ];

  for (const viewport of viewports) {
    await page.setViewport(viewport);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    
    const gridColumns = await page.evaluate(() => {
      const container = document.querySelector('.dashboard-container');
      if (!container) return 'N/A';
      return window.getComputedStyle(container).gridTemplateColumns;
    });
    
    console.log(`  ${viewport.name} (${viewport.width}x${viewport.height}): 网格列=${gridColumns}, 水平滚动=${hasHorizontalScroll ? '是' : '否'}`);
  }

  console.log('🎉 UI检查完成！');

} catch (error) {
  console.error('❌ 检查过程中出现错误:', error.message);
} finally {
  await browser.close();
  console.log('🔚 浏览器已关闭');
}