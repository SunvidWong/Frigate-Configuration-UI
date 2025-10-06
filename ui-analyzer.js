import puppeteer from 'puppeteer';

class UIAnalyzer {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
  }

  async analyzeUI(url) {
    console.log(`🔍 开始分析页面: ${url}`);
    await this.page.goto(url, { waitUntil: 'networkidle2' });
    
    const results = {
      layoutIssues: await this.checkLayoutIssues(),
      responsiveIssues: await this.checkResponsiveIssues(),
      accessibilityIssues: await this.checkAccessibilityIssues(),
      performanceIssues: await this.checkPerformanceIssues(),
      visualIssues: await this.checkVisualIssues()
    };

    return results;
  }

  // 检查布局问题
  async checkLayoutIssues() {
    const issues = [];
    
    // 检查元素是否溢出容器
    const overflowElements = await this.page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const overflowing = [];
      
      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const parent = el.parentElement;
        if (parent) {
          const parentRect = parent.getBoundingClientRect();
          if (rect.right > parentRect.right + 5 || rect.bottom > parentRect.bottom + 5) {
            overflowing.push({
              tag: el.tagName,
              className: el.className,
              id: el.id,
              overflow: {
                right: rect.right - parentRect.right,
                bottom: rect.bottom - parentRect.bottom
              }
            });
          }
        }
      });
      
      return overflowing;
    });

    if (overflowElements.length > 0) {
      issues.push({
        type: 'overflow',
        severity: 'medium',
        message: `发现 ${overflowElements.length} 个元素溢出容器`,
        elements: overflowElements
      });
    }

    // 检查空白元素
    const emptyElements = await this.page.evaluate(() => {
      const elements = document.querySelectorAll('div, span, p');
      const empty = [];
      
      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          empty.push({
            tag: el.tagName,
            className: el.className,
            id: el.id
          });
        }
      });
      
      return empty;
    });

    if (emptyElements.length > 0) {
      issues.push({
        type: 'empty-elements',
        severity: 'low',
        message: `发现 ${emptyElements.length} 个空白元素`,
        elements: emptyElements
      });
    }

    return issues;
  }

  // 检查响应式问题
  async checkResponsiveIssues() {
    const issues = [];
    const viewports = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ];

    for (const viewport of viewports) {
      await this.page.setViewport(viewport);
      await this.page.waitForTimeout(500);

      // 检查水平滚动条
      const hasHorizontalScroll = await this.page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      if (hasHorizontalScroll) {
        issues.push({
          type: 'horizontal-scroll',
          severity: 'high',
          viewport: viewport.name,
          message: `在 ${viewport.name} 视口下出现水平滚动条`
        });
      }

      // 检查文本是否被截断
      const truncatedText = await this.page.evaluate(() => {
        const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
        const truncated = [];
        
        textElements.forEach(el => {
          const style = window.getComputedStyle(el);
          if (style.textOverflow === 'ellipsis' || style.overflow === 'hidden') {
            if (el.scrollWidth > el.clientWidth) {
              truncated.push({
                tag: el.tagName,
                className: el.className,
                text: el.textContent.substring(0, 50) + '...'
              });
            }
          }
        });
        
        return truncated;
      });

      if (truncatedText.length > 0) {
        issues.push({
          type: 'text-truncation',
          severity: 'medium',
          viewport: viewport.name,
          message: `在 ${viewport.name} 视口下发现 ${truncatedText.length} 个文本被截断`,
          elements: truncatedText
        });
      }
    }

    return issues;
  }

  // 检查可访问性问题
  async checkAccessibilityIssues() {
    const issues = [];

    // 检查缺失的alt属性
    const missingAlt = await this.page.evaluate(() => {
      const images = document.querySelectorAll('img');
      const missing = [];
      
      images.forEach(img => {
        if (!img.alt || img.alt.trim() === '') {
          missing.push({
            src: img.src,
            className: img.className
          });
        }
      });
      
      return missing;
    });

    if (missingAlt.length > 0) {
      issues.push({
        type: 'missing-alt',
        severity: 'medium',
        message: `发现 ${missingAlt.length} 个图片缺失alt属性`,
        elements: missingAlt
      });
    }

    // 检查颜色对比度（简化版）
    const lowContrast = await this.page.evaluate(() => {
      const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, button, a');
      const lowContrastElements = [];
      
      textElements.forEach(el => {
        const style = window.getComputedStyle(el);
        const color = style.color;
        const backgroundColor = style.backgroundColor;
        
        // 简单的对比度检查（实际应该使用WCAG算法）
        if (color === 'rgb(128, 128, 128)' || color === '#808080') {
          lowContrastElements.push({
            tag: el.tagName,
            className: el.className,
            color: color,
            backgroundColor: backgroundColor
          });
        }
      });
      
      return lowContrastElements;
    });

    if (lowContrast.length > 0) {
      issues.push({
        type: 'low-contrast',
        severity: 'medium',
        message: `发现 ${lowContrast.length} 个元素可能存在对比度问题`,
        elements: lowContrast
      });
    }

    return issues;
  }

  // 检查性能问题
  async checkPerformanceIssues() {
    const issues = [];

    // 检查大图片
    const largeImages = await this.page.evaluate(() => {
      const images = document.querySelectorAll('img');
      const large = [];
      
      images.forEach(img => {
        const rect = img.getBoundingClientRect();
        if (img.naturalWidth > rect.width * 2 || img.naturalHeight > rect.height * 2) {
          large.push({
            src: img.src,
            naturalSize: `${img.naturalWidth}x${img.naturalHeight}`,
            displaySize: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
            className: img.className
          });
        }
      });
      
      return large;
    });

    if (largeImages.length > 0) {
      issues.push({
        type: 'oversized-images',
        severity: 'medium',
        message: `发现 ${largeImages.length} 个图片尺寸过大`,
        elements: largeImages
      });
    }

    // 检查未使用的CSS
    const unusedCSS = await this.page.coverage.startCSSCoverage();
    await this.page.reload({ waitUntil: 'networkidle2' });
    const cssCoverage = await this.page.coverage.stopCSSCoverage();
    
    let totalBytes = 0;
    let usedBytes = 0;
    
    cssCoverage.forEach(entry => {
      totalBytes += entry.text.length;
      entry.ranges.forEach(range => {
        usedBytes += range.end - range.start - 1;
      });
    });

    const unusedPercentage = ((totalBytes - usedBytes) / totalBytes * 100).toFixed(1);
    
    if (unusedPercentage > 50) {
      issues.push({
        type: 'unused-css',
        severity: 'low',
        message: `CSS使用率较低: ${(100 - unusedPercentage).toFixed(1)}% (${unusedPercentage}% 未使用)`,
        details: {
          totalBytes,
          usedBytes,
          unusedPercentage
        }
      });
    }

    return issues;
  }

  // 检查视觉问题
  async checkVisualIssues() {
    const issues = [];

    // 检查重叠元素
    const overlappingElements = await this.page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*')).filter(el => {
        const style = window.getComputedStyle(el);
        return style.position === 'absolute' || style.position === 'fixed';
      });
      
      const overlapping = [];
      
      for (let i = 0; i < elements.length; i++) {
        for (let j = i + 1; j < elements.length; j++) {
          const rect1 = elements[i].getBoundingClientRect();
          const rect2 = elements[j].getBoundingClientRect();
          
          if (rect1.left < rect2.right && rect2.left < rect1.right &&
              rect1.top < rect2.bottom && rect2.top < rect1.bottom) {
            overlapping.push({
              element1: {
                tag: elements[i].tagName,
                className: elements[i].className
              },
              element2: {
                tag: elements[j].tagName,
                className: elements[j].className
              }
            });
          }
        }
      }
      
      return overlapping;
    });

    if (overlappingElements.length > 0) {
      issues.push({
        type: 'overlapping-elements',
        severity: 'medium',
        message: `发现 ${overlappingElements.length} 组重叠元素`,
        elements: overlappingElements
      });
    }

    return issues;
  }

  async generateReport(results) {
    console.log('\n📊 UI分析报告');
    console.log('='.repeat(50));
    
    let totalIssues = 0;
    let highSeverityCount = 0;
    let mediumSeverityCount = 0;
    let lowSeverityCount = 0;

    Object.entries(results).forEach(([category, issues]) => {
      if (issues.length > 0) {
        console.log(`\n🔍 ${category.toUpperCase()}:`);
        issues.forEach(issue => {
          totalIssues++;
          const icon = issue.severity === 'high' ? '🔴' : 
                      issue.severity === 'medium' ? '🟡' : '🟢';
          
          if (issue.severity === 'high') highSeverityCount++;
          else if (issue.severity === 'medium') mediumSeverityCount++;
          else lowSeverityCount++;
          
          console.log(`  ${icon} ${issue.message}`);
          
          if (issue.elements && issue.elements.length > 0) {
            console.log(`     影响元素: ${issue.elements.length}个`);
          }
        });
      }
    });

    console.log('\n📈 问题统计:');
    console.log(`  总问题数: ${totalIssues}`);
    console.log(`  🔴 高优先级: ${highSeverityCount}`);
    console.log(`  🟡 中优先级: ${mediumSeverityCount}`);
    console.log(`  🟢 低优先级: ${lowSeverityCount}`);

    if (totalIssues === 0) {
      console.log('\n🎉 恭喜！未发现明显的UI问题！');
    } else {
      console.log('\n💡 建议优先处理高优先级问题');
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// 使用示例
async function main() {
  const analyzer = new UIAnalyzer();
  
  try {
    console.log('🚀 启动UI分析器...');
    await analyzer.init();
    console.log('✅ 浏览器初始化完成');
    const results = await analyzer.analyzeUI('http://localhost:5550/');
    console.log('✅ 页面分析完成');
    await analyzer.generateReport(results);
  } catch (error) {
    console.error('❌ 分析过程中出现错误:', error.message);
    console.error('详细错误:', error);
  } finally {
    await analyzer.close();
    console.log('🔚 分析器已关闭');
  }
}

// 如果直接运行此脚本
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main();
}

export default UIAnalyzer;