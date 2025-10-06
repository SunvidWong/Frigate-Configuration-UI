import puppeteer from 'puppeteer';

class AdvancedUIAnalyzer {
  constructor() {
    this.issues = [];
  }

  async analyze(url = 'http://localhost:5550/') {
    console.log('🔍 启动高级UI分析器...');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    try {
      // 监听控制台错误
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // 监听页面错误
      const pageErrors = [];
      page.on('pageerror', error => {
        pageErrors.push(error.message);
      });

      console.log('📄 加载页面...');
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });

      // 等待页面完全加载
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('🔍 开始分析...');

      // 1. 检查基础信息
      await this.checkBasicInfo(page);

      // 2. 检查布局问题
      await this.checkLayoutIssues(page);

      // 3. 检查响应式设计
      await this.checkResponsiveDesign(page);

      // 4. 检查可访问性
      await this.checkAccessibility(page);

      // 5. 检查性能问题
      await this.checkPerformance(page);

      // 6. 检查JavaScript错误
      if (consoleErrors.length > 0) {
        this.addIssue('javascript-console-errors', 'medium', 
          `发现 ${consoleErrors.length} 个控制台错误`, { errors: consoleErrors });
      }

      if (pageErrors.length > 0) {
        this.addIssue('javascript-page-errors', 'high', 
          `发现 ${pageErrors.length} 个页面错误`, { errors: pageErrors });
      }

      // 生成报告
      this.generateReport();

    } catch (error) {
      console.error('❌ 分析过程中出现错误:', error.message);
    } finally {
      await browser.close();
    }
  }

  async checkBasicInfo(page) {
    const info = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        elements: {
          total: document.querySelectorAll('*').length,
          buttons: document.querySelectorAll('button').length,
          inputs: document.querySelectorAll('input').length,
          images: document.querySelectorAll('img').length,
          links: document.querySelectorAll('a').length
        }
      };
    });

    console.log('📊 页面基础信息:');
    console.log(`  标题: ${info.title}`);
    console.log(`  视口: ${info.viewport.width}x${info.viewport.height}`);
    console.log(`  元素总数: ${info.elements.total}`);
    console.log(`  按钮: ${info.elements.buttons}, 输入框: ${info.elements.inputs}, 图片: ${info.elements.images}, 链接: ${info.elements.links}`);
  }

  async checkLayoutIssues(page) {
    console.log('🔍 检查布局问题...');

    // 检查元素溢出
    const overflowIssues = await page.evaluate(() => {
      const issues = [];
      const elements = document.querySelectorAll('*');
      
      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const parent = el.parentElement;
        
        if (parent && rect.width > 0 && rect.height > 0) {
          const parentRect = parent.getBoundingClientRect();
          
          // 检查水平溢出
          if (rect.right > parentRect.right + 10) {
            issues.push({
              type: 'horizontal-overflow',
              element: `${el.tagName}${el.className ? '.' + el.className.split(' ')[0] : ''}`,
              overflow: Math.round(rect.right - parentRect.right)
            });
          }
          
          // 检查垂直溢出
          if (rect.bottom > parentRect.bottom + 10) {
            issues.push({
              type: 'vertical-overflow',
              element: `${el.tagName}${el.className ? '.' + el.className.split(' ')[0] : ''}`,
              overflow: Math.round(rect.bottom - parentRect.bottom)
            });
          }
        }
      });
      
      return issues.slice(0, 10); // 限制数量
    });

    if (overflowIssues.length > 0) {
      this.addIssue('element-overflow', 'medium', 
        `发现 ${overflowIssues.length} 个元素溢出问题`, { issues: overflowIssues });
    }

    // 检查隐藏元素
    const hiddenElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      let hiddenCount = 0;
      
      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          hiddenCount++;
        }
      });
      
      return hiddenCount;
    });

    if (hiddenElements > 50) {
      this.addIssue('too-many-hidden-elements', 'low', 
        `发现 ${hiddenElements} 个隐藏元素，可能影响性能`);
    }
  }

  async checkResponsiveDesign(page) {
    console.log('📱 检查响应式设计...');

    const viewports = [
      { width: 320, height: 568, name: 'Small Mobile' },
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1024, height: 768, name: 'Tablet Landscape' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ];

    const responsiveIssues = [];

    for (const viewport of viewports) {
      await page.setViewport(viewport);
      await new Promise(resolve => setTimeout(resolve, 500));

      const issues = await page.evaluate((viewportName) => {
        const problems = [];
        
        // 检查水平滚动
        if (document.documentElement.scrollWidth > document.documentElement.clientWidth) {
          problems.push({
            type: 'horizontal-scroll',
            viewport: viewportName,
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth
          });
        }

        // 检查文本截断
        const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
        let truncatedCount = 0;
        
        textElements.forEach(el => {
          if (el.scrollWidth > el.clientWidth + 5) {
            truncatedCount++;
          }
        });

        if (truncatedCount > 0) {
          problems.push({
            type: 'text-truncation',
            viewport: viewportName,
            count: truncatedCount
          });
        }

        // 检查按钮大小
        const buttons = document.querySelectorAll('button');
        let smallButtons = 0;
        
        buttons.forEach(btn => {
          const rect = btn.getBoundingClientRect();
          if (rect.width < 44 || rect.height < 44) {
            smallButtons++;
          }
        });

        if (smallButtons > 0) {
          problems.push({
            type: 'small-buttons',
            viewport: viewportName,
            count: smallButtons
          });
        }

        return problems;
      }, viewport.name);

      responsiveIssues.push(...issues);
    }

    if (responsiveIssues.length > 0) {
      this.addIssue('responsive-issues', 'high', 
        `发现 ${responsiveIssues.length} 个响应式问题`, { issues: responsiveIssues });
    }
  }

  async checkAccessibility(page) {
    console.log('♿ 检查可访问性...');

    const a11yIssues = await page.evaluate(() => {
      const issues = [];

      // 检查图片alt属性
      const images = document.querySelectorAll('img');
      let missingAlt = 0;
      images.forEach(img => {
        if (!img.alt || img.alt.trim() === '') {
          missingAlt++;
        }
      });

      if (missingAlt > 0) {
        issues.push({
          type: 'missing-alt',
          count: missingAlt,
          total: images.length
        });
      }

      // 检查表单标签
      const inputs = document.querySelectorAll('input, textarea, select');
      let missingLabels = 0;
      inputs.forEach(input => {
        const id = input.id;
        const label = id ? document.querySelector(`label[for="${id}"]`) : null;
        const ariaLabel = input.getAttribute('aria-label');
        
        if (!label && !ariaLabel) {
          missingLabels++;
        }
      });

      if (missingLabels > 0) {
        issues.push({
          type: 'missing-labels',
          count: missingLabels,
          total: inputs.length
        });
      }

      // 检查颜色对比度（简化版）
      const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, button, a');
      let lowContrastCount = 0;
      
      textElements.forEach(el => {
        const style = window.getComputedStyle(el);
        const color = style.color;
        
        // 简单检查灰色文本
        if (color.includes('128') || color.includes('gray') || color.includes('grey')) {
          lowContrastCount++;
        }
      });

      if (lowContrastCount > 0) {
        issues.push({
          type: 'potential-low-contrast',
          count: lowContrastCount
        });
      }

      return issues;
    });

    if (a11yIssues.length > 0) {
      this.addIssue('accessibility-issues', 'medium', 
        `发现 ${a11yIssues.length} 类可访问性问题`, { issues: a11yIssues });
    }
  }

  async checkPerformance(page) {
    console.log('⚡ 检查性能问题...');

    // 检查大图片
    const imageIssues = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      const issues = [];
      
      images.forEach(img => {
        const rect = img.getBoundingClientRect();
        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;
        
        if (naturalWidth > rect.width * 2 || naturalHeight > rect.height * 2) {
          issues.push({
            src: img.src.substring(0, 50) + '...',
            natural: `${naturalWidth}x${naturalHeight}`,
            display: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
            wasteRatio: Math.round((naturalWidth * naturalHeight) / (rect.width * rect.height))
          });
        }
      });
      
      return issues;
    });

    if (imageIssues.length > 0) {
      this.addIssue('oversized-images', 'medium', 
        `发现 ${imageIssues.length} 个过大图片`, { issues: imageIssues });
    }

    // 检查DOM复杂度
    const domComplexity = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      const maxDepth = Math.max(...Array.from(allElements).map(el => {
        let depth = 0;
        let parent = el.parentElement;
        while (parent) {
          depth++;
          parent = parent.parentElement;
        }
        return depth;
      }));

      return {
        totalElements: allElements.length,
        maxDepth: maxDepth
      };
    });

    if (domComplexity.totalElements > 1000) {
      this.addIssue('complex-dom', 'low', 
        `DOM过于复杂: ${domComplexity.totalElements} 个元素，最大深度 ${domComplexity.maxDepth}`);
    }
  }

  addIssue(type, severity, message, details = {}) {
    this.issues.push({
      type,
      severity,
      message,
      details,
      timestamp: new Date().toISOString()
    });
  }

  generateReport() {
    console.log('\n📊 UI分析报告');
    console.log('='.repeat(60));

    if (this.issues.length === 0) {
      console.log('🎉 恭喜！未发现明显的UI问题！');
      return;
    }

    // 按严重程度分组
    const grouped = {
      high: this.issues.filter(i => i.severity === 'high'),
      medium: this.issues.filter(i => i.severity === 'medium'),
      low: this.issues.filter(i => i.severity === 'low')
    };

    console.log(`\n📈 问题统计:`);
    console.log(`  🔴 高优先级: ${grouped.high.length}`);
    console.log(`  🟡 中优先级: ${grouped.medium.length}`);
    console.log(`  🟢 低优先级: ${grouped.low.length}`);
    console.log(`  📊 总计: ${this.issues.length}`);

    // 显示详细问题
    ['high', 'medium', 'low'].forEach(severity => {
      if (grouped[severity].length > 0) {
        const icon = severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '🟢';
        console.log(`\n${icon} ${severity.toUpperCase()} 优先级问题:`);
        
        grouped[severity].forEach((issue, index) => {
          console.log(`  ${index + 1}. ${issue.message}`);
          
          if (issue.details.issues && issue.details.issues.length > 0) {
            console.log(`     详情: 显示前3个问题`);
            issue.details.issues.slice(0, 3).forEach(detail => {
              if (detail.element) {
                console.log(`       - ${detail.element}: ${detail.type}`);
              } else if (detail.viewport) {
                console.log(`       - ${detail.viewport}: ${detail.type}`);
              } else {
                console.log(`       - ${detail.type}: ${detail.count || detail.overflow || '未知'}`);
              }
            });
          }
          
          if (issue.details.errors && issue.details.errors.length > 0) {
            console.log(`     错误信息:`);
            issue.details.errors.slice(0, 2).forEach(error => {
              console.log(`       - ${error.substring(0, 80)}...`);
            });
          }
        });
      }
    });

    console.log('\n💡 建议:');
    if (grouped.high.length > 0) {
      console.log('  1. 优先修复高优先级问题，特别是响应式和JavaScript错误');
    }
    if (grouped.medium.length > 0) {
      console.log('  2. 关注中优先级问题，改善用户体验');
    }
    if (grouped.low.length > 0) {
      console.log('  3. 低优先级问题可在后续版本中优化');
    }

    console.log('\n🔚 分析完成！');
  }
}

// 运行分析
const analyzer = new AdvancedUIAnalyzer();
analyzer.analyze().catch(console.error);