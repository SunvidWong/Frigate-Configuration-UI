# 错误截图管理规范

## 概述
为了保持项目目录的整洁性和开发流程的规范性，所有错误截图必须按照本规范进行管理和清理。

## 固定路径要求
**强制路径**: `/Users/sunvid/Documents/GitHub/claude/erro`

## 截图保存规范

### 命名规范
- **格式**: `问题类型-日期-时间.png`
- **示例**: `layout-2025-10-06-14-30-25.png`
- **要求**: 使用英文命名，避免空格和特殊字符

### 保存规则
1. **所有错误截图**必须保存到指定目录
2. **禁止**保存到项目其他位置
3. **确保**目录存在，如不存在需创建

## 截图清理流程

### 清理时机
- ✅ 每次查看完错误截图后**立即清理**
- ✅ 问题解决后**立即清理**
- ✅ 每日开发结束前**检查清理**

### 清理步骤

#### 1. 基础清理命令
```bash
# 清理所有PNG截图
rm -f /Users/sunvid/Documents/GitHub/claude/erro/*.png

# 清理所有截图文件
rm -f /Users/sunvid/Documents/GitHub/claude/erro/*.*
```

#### 2. 确认清理
```bash
# 检查目录是否为空
ls -la /Users/sunvid/Documents/GitHub/claude/erro/

# 预期输出应该只有.和..条目
total 0
drwxr-xr-x  2 username  staff   64 Jan 1 12:00 .
drwxr-xr-x  4 username  staff  128 Jan 1 12:00 ..
```

#### 3. 创建清理脚本（可选）
创建 `/Users/sunvid/Documents/GitHub/claude/clean-screenshots.sh`：
```bash
#!/bin/bash
echo "清理错误截图..."
rm -f /Users/sunvid/Documents/GitHub/claude/erro/*.png
echo "清理完成！"
ls -la /Users/sunvid/Documents/GitHub/claude/erro/
```

使用方法：
```bash
chmod +x /Users/sunvid/Documents/GitHub/claude/clean-screenshots.sh
/Users/sunvid/Documents/GitHub/claude/clean-screenshots.sh
```

## 质量保证

### 定期检查
- **每日检查**: 确保erro目录为空
- **每周审核**: 检查是否有遗漏的截图文件
- **月度报告**: 统计截图管理和清理情况

### 违规处理
- **首次违规**: 口头警告
- **二次违规**: 书面警告
- **多次违规**: 影响绩效评估

## 常见问题解答

### Q: 为什么要清理截图？
A: 保持项目目录整洁，避免历史截图干扰开发，确保磁盘空间有效利用。

### Q: 如果需要保留某些截图怎么办？
A: 如需保留，请移动到文档目录下的相应位置，并添加说明文档。

### Q: 截图清理后如何追溯问题？
A: 重要问题应该在代码提交记录中详细描述，截图仅作为临时辅助工具。

### Q: 团队成员如何遵守这个规范？
A: 所有开发人员必须阅读并签署本规范，纳入入职培训和定期考核。

## 监控与审计

### 自动监控（可选）
创建监控脚本 `/Users/sunvid/Documents/GitHub/claude/monitor-screenshots.sh`：
```bash
#!/bin/bash
COUNT=$(find /Users/sunvid/Documents/GitHub/claude/erro -name "*.png" | wc -l)
if [ $COUNT -gt 0 ]; then
    echo "警告: 发现 $COUNT 个未清理的截图文件"
    echo "请立即清理: rm -f /Users/sunvid/Documents/GitHub/claude/erro/*.png"
    # 可以添加邮件或消息通知
fi
```

### 定期审计
- **每周**: 审计erro目录状态
- **每月**: 统计合规率
- **季度**: 评估规范执行效果

---

**最后更新**: 2025年10月6日
**负责人**: 开发团队
**审批状态**: 已批准