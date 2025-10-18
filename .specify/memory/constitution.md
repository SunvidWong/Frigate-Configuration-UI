<!--
  SYNC IMPACT REPORT
  ==================
  Version Change: [INITIAL] → 1.0.0
  Rationale: Initial constitution creation for Frigate Configuration UI project

  Modified Principles: N/A (initial creation)

  Added Sections:
  - Core Principles (6 principles)
  - Repository & Registry Information
  - Coding Guardrails
  - Test-First & Quality Gates
  - Release Policy
  - Language & Interaction
  - Automation Policy
  - Safety & Boundaries
  - Change Control
  - Governance

  Removed Sections: N/A (initial creation)

  Template Consistency Check:
  ✅ plan-template.md: Constitution Check section aligns with principles
  ✅ spec-template.md: Requirements structure supports constitution constraints
  ✅ tasks-template.md: Test-first workflow matches constitution requirements
  ⚠️ No command files found in .specify/commands/ - will need verification when created

  Follow-up TODOs: None

  Generated: 2025-10-18
-->

# Frigate Configuration UI 项目宪法

## 核心原则

### I. 测试优先与 CI 门槛（Test-First & Quality Gates）

**不可协商**：本项目实行先测试后实现的严格纪律。

- 新增或变更的代码路径**必须**先编写测试，再编写实现；严禁先实现后补测试
- CI 流水线**必须**包含：构建、lint/schema 校验、单元测试、集成测试、示例 Compose 自检
- CI 全绿是合并与发布的**必要条件**；禁止为通过 CI 而屏蔽或降级测试
- 临时跳过测试**必须**附带问题链接与到期时间

**理由**：测试先行保证代码质量与可维护性；CI 门槛防止质量倒退，确保每次发布都是可靠的。

### II. 最小必填原则（Minimal Required Input）

所有配置与交互**必须**遵循"默认值优先、最小必填"原则。

- 系统**必须**为所有非关键参数提供合理默认值
- 不可用的硬件**必须**自动降级为 CPU 模式，并向用户提示
- 用户仅需填写核心必填项（如摄像头 RTSP 地址）即可完成部署

**理由**：降低初级用户的使用门槛，提升用户体验；避免因配置复杂导致的部署失败。

### III. 中文优先界面（Chinese First Interface）

全程使用中文进行用户交互与反馈。

- UI、文案、提示、日志摘要、错误说明**必须**使用中文
- 文档与规格默认中文；英文仅作为回退或引用上游原文时使用
- 导出的配置文件（YAML）键名保持官方英文，不做键名翻译

**理由**：目标用户群体为中文用户；中文界面降低理解成本，提升可用性。

### IV. 安全边界（Security Boundaries）

严格限制系统访问权限与操作范围。

- **禁止**扫描宿主驱动与越权访问宿主系统；仅通过 Docker API 读取硬件可用性信息
- **禁止**擅自访问外网或第三方服务；网络操作需在规格中授权并在计划中列出
- 凭据与敏感信息仅写入授权路径；日志中**不得**泄露敏感信息（如摄像头密码）
- 父容器**必须**映射 `/var/run/docker.sock`，但**不得**使用 `--privileged` 模式

**理由**：保护宿主系统安全；防止敏感信息泄露；遵循最小权限原则。

### V. 仅 Docker 部署（Docker-Only Deployment）

系统仅支持通过 Docker Compose 部署。

- 父容器通过 `docker-compose` 一键启动（WebUI + API）
- 子容器（Frigate 实例）由父容器通过 Docker socket 管理
- 不依赖外部脚本或命令行操作；所有操作通过 WebUI 完成
- 入口仅做必要预检（Docker/socket/镜像可用性）；失败快速退出，日志清晰；不做常驻重试状态机

**理由**：简化部署流程；降低用户技术门槛；确保环境一致性。

### VI. 自动化与无人值守开发（Automation & Unattended Development）

AI 全程无人值守开发，通过自动化流水线完成从实现到发布的闭环。

- 默认通过自动化流水线完成从实现到发布的闭环
- 仅当 CI/评审门槛未通过或需审批的变更出现时，流程暂停并等待人工干预
- 在不违反质量门槛的前提下，合并即触发构建与发布管道（`latest`）
- 发布分支/标签触发 `stable` 与版本标签发布

**理由**：提升开发效率；减少人工干预；确保发布流程的一致性与可靠性。

## Repository & Registry Information

### 代码仓库

**Canonical Repository**: https://github.com/SunvidWong/Frigate-Configuration-UI.git

### 容器镜像仓库

**Registry Coordinates**: ghcr.io/SunvidWong/frigate-configuration-ui

### 发布通道

- **latest**: 对应 `main` 分支的最新构建（开发版本）
- **stable**: 对应正式发布分支（稳定版本）
- **vX.Y.Z**: 语义化版本标签（具体版本）

### 用户使用方式

**Customer Consumption**: `docker-compose.yml` 默认引用 `ghcr.io/SunvidWong/frigate-configuration-ui:stable`

## Coding Guardrails（代码护栏）

### AI 边界约束

AI 生成的代码严格受规格边界约束：

- 超出规格范围的功能**不得**实现
- 未经书面确认，**禁止**引入新的依赖、端口、服务或环境变量
- **禁止**修改对外接口（API、配置格式、端口映射）
- 所有变更**必须**最小化且可回滚

### 变更前置要求

生成实现前，**必须**在计划中记录：

- 变更意图与目标
- 影响范围与依赖关系
- 测试策略
- 回滚方案

变更计划**必须**获评审通过后方可执行。

### 依赖管理

- 新依赖引入需在计划中列出并阐明必要性
- 优先使用标准库与成熟的第三方库
- 避免引入过重或不稳定的依赖

## Test-First & Quality Gates（测试与门槛）

### 先测试后实现

**不可协商**：新增或变更路径**必须**先补测试再写实现。

- 测试**必须**在实现前编写并**失败**
- 遵循 Red-Green-Refactor 循环：编写失败测试 → 实现功能 → 重构优化
- 严禁先实现后补测试

### CI 必须包含的检查项

CI 流水线**必须**包含以下检查项（全绿方可合并与发布）：

1. **构建检查**: 确保代码可编译/构建
2. **Lint/Schema 校验**: 代码风格与配置文件格式校验
3. **单元测试**: 独立模块的逻辑正确性测试
4. **集成测试**: 模块间交互与端到端流程测试
5. **示例 Compose 自检**: 确保 `docker-compose.yml` 可正常启动

### 测试跳过政策

- **禁止**为通过 CI 而屏蔽或降级测试
- 临时跳过测试**必须**附带：
  - 问题跟踪链接（Issue/Ticket）
  - 到期时间（明确修复时间点）
  - 跳过理由说明

## Release Policy（发布策略）

### 发布通道与触发条件

- **`latest` 通道**: `main` 分支合并自动推送
- **`stable` 通道**: 发布分支/打 tag 时推送
- **`vX.Y.Z` 版本标签**: 正式发布时创建语义化版本标签

### 发布要求

- 未经测试验证的功能**不得**在 UI 暴露或对外发布
- 发布**必须**附带：
  - 变更日志（CHANGELOG）
  - 验证记录（测试报告）
  - 升级指南（如有破坏性变更）

### 语义化版本规则

遵循 `MAJOR.MINOR.PATCH` 格式：

- **MAJOR**: 破坏性变更（API 不兼容、配置格式变更）
- **MINOR**: 新功能添加（向后兼容）
- **PATCH**: 问题修复与优化（向后兼容）

## Language & Interaction（语言与交互）

### 中文优先

- UI、文案、提示、日志摘要、错误说明**必须**使用中文
- 文档与规格默认中文；英文作为回退或引用上游原文时使用
- 代码注释推荐中文，但不强制（关键逻辑必须注释）

### 配置文件语言

- 导出的配置文件（如 Frigate 的 `config.yml`）键名保持官方英文
- **不得**对上游官方配置键名进行翻译
- 用户界面中的标签与说明使用中文

## Automation Policy（自动化与无人值守）

### 无人值守开发

AI 全程无人值守开发，默认通过自动化流水线完成从实现到发布的闭环。

### 流程暂停条件

仅在以下情况下流程暂停并等待人工干预：

- CI/评审门槛未通过
- 需要审批的变更出现（如破坏性变更、安全相关变更）
- 测试失败或质量门槛未达标

### 不停顿开发

在不违反质量门槛的前提下：

- 合并即触发构建与发布管道（`latest`）
- 发布分支/标签触发 `stable` 与版本标签发布
- 自动化测试、构建、发布，无需人工干预

## Safety & Boundaries（安全与边界）

### 宿主系统访问限制

- **禁止**扫描宿主驱动
- **禁止**越权访问宿主系统
- 仅通过 Docker API 读取硬件可用性信息（如 GPU 是否可用）

### 网络访问限制

- **禁止**擅自访问外网或第三方服务
- 网络操作需在规格中授权并在计划中列出
- ONVIF 设备发现限于局域网范围

### 敏感信息保护

- 凭据与敏感信息仅写入授权路径
- 日志中**不得**泄露敏感信息（如摄像头密码、API 密钥）
- 密码字段在日志中**必须**脱敏（如显示为 `***`）

## Change Control（变更控制）

### 规格一致性

- 与规格不一致的实现视为**无效输出**
- 任何偏离**必须**在变更说明中阐明并获批准后执行

### 重大变更要求

重大变更（架构/依赖/安全面）需：

- 单独评审与批准
- 回滚方案（如何恢复到变更前状态）
- 影响分析（哪些模块/用户受影响）
- 迁移指南（如何从旧版本升级到新版本）

### Definition of Done (DoD)

完成的定义：

1. ✅ 规格满足：实现符合规格要求
2. ✅ 测试通过：所有测试（单元/集成/端到端）通过
3. ✅ CI 全绿：所有 CI 检查项通过
4. ✅ 文档更新：相关文档（README、CHANGELOG、用户指南）已更新
5. ✅ 可回滚：提供回滚方案或向后兼容

## Governance

### 宪法优先级

本宪法优先级高于所有其他实践与约定：

- 所有 PR/评审**必须**验证是否符合宪法原则
- 复杂性**必须**有充分理由支持（在计划的 Complexity Tracking 表中记录）
- 与宪法冲突的实践**必须**修正或提出宪法修订

### 宪法修订流程

1. 提出修订提案（包含修订理由、影响分析）
2. 团队评审与讨论
3. 获得批准后更新宪法文件
4. 更新版本号（遵循语义化版本规则）
5. 同步更新所有依赖宪法的模板与文档

### 版本控制规则

- **MAJOR**: 破坏性原则变更、原则删除或重新定义
- **MINOR**: 新原则添加或现有原则的实质性扩展
- **PATCH**: 措辞优化、错别字修正、非语义性改进

### 合规性审查

- 每个 PR 合并前**必须**进行宪法合规性审查
- 发布前**必须**确认所有变更符合宪法原则
- 定期审查（建议每季度）宪法的适用性与完备性

**Version**: 1.0.0 | **Ratified**: 2025-10-18 | **Last Amended**: 2025-10-18
