import puppeteer from 'puppeteer';

async function findOverflowSource() {
  console.log('🔍 寻找溢出源头...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    await page.setViewport({ width: 320, height: 568 });
    await page.goto('http://localhost:5550/', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 逐个检查每个元素的精确位置和尺寸
    const detailedAnalysis = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      const results = [];
      
      allElements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        
        // 检查任何可能导致溢出的情况
        const hasIssue = 
          rect.right > 320 || 
          rect.width > 320 || 
          el.scrollWidth > 320 ||
          parseFloat(style.marginRight) > 0 ||
          parseFloat(style.paddingRight) > 10 ||
          parseFloat(style.borderRightWidth) > 0;
        
        const className = el.className || '';
        if (hasIssue || el.tagName === 'BODY' || el.tagName === 'HTML' || 
            (typeof className === 'string' && (className.includes('dashboard') || className.includes('flex')))) {
          
          results.push({
            index,
            tagName: el.tagName,
            className: className,
            id: el.id,
            textContent: el.textContent ? el.textContent.substring(0, 50) + '...' : '',
            rect: {
              width: Math.round(rect.width * 100) / 100,
              height: Math.round(rect.height * 100) / 100,
              left: Math.round(rect.left * 100) / 100,
              right: Math.round(rect.right * 100) / 100,
              top: Math.round(rect.top * 100) / 100
            },
            computed: {
              width: style.width,
              minWidth: style.minWidth,
              maxWidth: style.maxWidth,
              marginLeft: style.marginLeft,
              marginRight: style.marginRight,
              paddingLeft: style.paddingLeft,
              paddingRight: style.paddingRight,
              borderLeftWidth: style.borderLeftWidth,
              borderRightWidth: style.borderRightWidth,
              boxSizing: style.boxSizing,
              overflow: style.overflow,
              overflowX: style.overflowX
            },
            dimensions: {
              scrollWidth: el.scrollWidth,
              clientWidth: el.clientWidth,
              offsetWidth: el.offsetWidth
            },
            hasIssue,
            issueType: rect.right > 320 ? 'right-overflow' : 
                      rect.width > 320 ? 'width-overflow' : 
                      el.scrollWidth > 320 ? 'scroll-overflow' : 'other'
          });
        }
      });
      
      return results.sort((a, b) => {
        if (a.hasIssue && !b.hasIssue) return -1;
        if (!a.hasIssue && b.hasIssue) return 1;
        return b.rect.right - a.rect.right;
      });
    });
    
    console.log(`📊 发现 ${detailedAnalysis.length} 个相关元素:`);
    
    detailedAnalysis.slice(0, 15).forEach((el, index) => {
      console.log(`\n${index + 1}. ${el.tagName}${el.className ? '.' + el.className.split(' ').slice(0, 3).join('.') : ''}${el.id ? '#' + el.id : ''}`);
      
      if (el.hasIssue) {
        console.log(`   ❌ 问题类型: ${el.issueType}`);
      }
      
      console.log(`   📐 位置: left=${el.rect.left}, right=${el.rect.right}, width=${el.rect.width}`);
      console.log(`   📏 尺寸: scroll=${el.dimensions.scrollWidth}, client=${el.dimensions.clientWidth}, offset=${el.dimensions.offsetWidth}`);
      console.log(`   🎨 样式: width=${el.computed.width}, box-sizing=${el.computed.boxSizing}`);
      console.log(`   📦 边距: margin-right=${el.computed.marginRight}, padding-right=${el.computed.paddingRight}`);
      console.log(`   🔲 边框: border-right=${el.computed.borderRightWidth}`);
      
      if (el.rect.right > 320) {
        console.log(`   ⚠️  右边界超出: ${(el.rect.right - 320).toFixed(2)}px`);
      }
      if (el.dimensions.scrollWidth > 320) {
        console.log(`   ⚠️  滚动宽度超出: ${el.dimensions.scrollWidth - 320}px`);
      }
      
      if (el.textContent && el.textContent.trim()) {
        console.log(`   📝 内容: ${el.textContent}`);
      }
    });
    
  } catch (error) {
    console.error('❌ 分析过程中出现错误:', error.message);
  } finally {
    await browser.close();
    console.log('\n🔚 溢出源头分析完成');
  }
}

findOverflowSource().catch(console.error);