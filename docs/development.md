# Frigate Configuration UI 开发规则

## 重要说明
⚠️ **端口配置**: 开发阶段必须使用 **5100-5200** 范围内的端口，当前使用 **5150** 端口。详细规范请参考 [开发阶段端口使用规范](./dev-port-policy.md)。

## 开发环境设置

### 端口使用制度
**严格规定（开发阶段）：仅使用 5100-5200 范围内的端口**

#### 强制性要求
1. **开发服务器端口**: 必须使用 5100-5200 范围内的端口（当前：5150）
2. **预览服务器端口**: 必须使用 5100-5200 范围内的端口（当前：5150）

### 错误截图管理制度
**固定路径要求（开发阶段）：所有错误截图必须保存到指定目录**

#### 强制性要求
1. **保存路径**: 所有错误截图必须保存到 `/Users/sunvid/Documents/GitHub/claude/erro` 目录
2. **查看后清理**: 每次查看完错误截图后必须立即清理文件夹内的所有截图图片
3. **截图命名**: 使用有意义的文件名，格式建议为 `问题类型-日期-时间.png`

#### 清理流程
1. **查看截图**: 开发人员查看错误截图后，必须执行清理操作
2. **清理命令**: `rm -f /Users/sunvid/Documents/GitHub/claude/erro/*.png`
3. **确认清理**: 检查目录是否为空：`ls -la /Users/sunvid/Documents/GitHub/claude/erro/`

#### 禁止行为
- ❌ 禁止将错误截图保存到其他目录
- ❌ 禁止查看截图后不执行清理操作
- ❌ 禁止在项目中保留历史错误截图文件

#### 端口使用禁止行为
- ❌ 禁止使用 5100-5200 范围外的端口号
- ❌ 禁止通过命令行参数修改端口 (`--port`)
- ❌ 禁止在配置文件中修改端口设置
- ❌ 禁止在环境变量中覆盖端口配置

#### 配置检查
开发团队必须确保：
- `vite.config.ts` 中端口设置为 5100-5200 范围内的值（当前：5150）
- `package.json` 脚本不包含端口覆盖参数
- 所有文档和说明使用正确的端口号

#### 违规处理
违反端口使用制度的代码将被拒绝合并，必须修正后重新提交。

## 项目架构
- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI 组件库**: 待定 (建议 Ant Design 或 Material-UI)
- **状态管理**: React Context + useReducer (复杂状态可考虑 Zustand)
- **路由**: React Router v6

## 开发规范
### 文件结构
```
src/
├── components/          # 通用组件
├── pages/              # 页面组件
├── hooks/              # 自定义 Hooks
├── services/           # API 服务
├── types/              # TypeScript 类型定义
├── utils/              # 工具函数
├── constants/          # 常量定义
└── styles/             # 样式文件
```

### 命名规范
- **组件**: PascalCase (如 `HardwareAccelerator.tsx`)
- **文件夹**: kebab-case (如 `hardware-accelerator/`)
- **变量/函数**: camelCase (如 `installDriver`)
- **常量**: UPPER_SNAKE_CASE (如 `DEFAULT_PORT`)

### API 接口规范
- **前缀**: `/api`
- **RESTful**: 遵循 REST 规范
- **响应格式**: 
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
```

## 核心功能模块
1. **硬件加速器管理** (`/accelerators`)
   - 检测已安装的硬件加速器
   - 一键安装驱动程序
   - 状态监控和故障排除

2. **摄像头管理** (`/cameras`)
   - go2rtc 集成
   - 本地网络扫描
   - 摄像头配置和测试

3. **模型管理** (`/models`)
   - 模型下载和更新
   - 版本管理
   - 性能测试

4. **系统配置** (`/config`)
   - Frigate 配置生成
   - Docker Compose 配置
   - 远程访问设置

5. **部署管理** (`/deploy`)
   - 一键部署
   - 状态监控
   - 日志查看

## 安全规范
- **权限控制**: 最小权限原则
- **输入验证**: 所有用户输入必须验证
- **错误处理**: 不暴露敏感信息
- **容器安全**: 明确设备映射，避免特权模式

## 开发环境
- **Node.js**: >= 18.0.0
- **包管理器**: npm 或 pnpm
- **代码规范**: ESLint + Prettier
- **类型检查**: TypeScript strict mode

## 构建和部署
- **开发**: `npm run dev` (端口 5150)
- **构建**: `npm run build`
- **预览**: `npm run preview` (端口 5150)
- **容器化**: Docker + Docker Compose

## Git 规范
- **分支**: feature/功能名, fix/修复名
- **提交**: 使用 Conventional Commits 规范
- **示例**: `feat: add hardware accelerator detection`