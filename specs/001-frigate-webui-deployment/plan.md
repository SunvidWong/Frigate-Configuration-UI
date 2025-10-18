# Implementation Plan: Frigate 配置与部署 WebUI

**Branch**: `001-frigate-webui-deployment` | **Date**: 2025-10-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-frigate-webui-deployment/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

提供中文 WebUI 界面，通过三步向导（硬件配置、摄像头配置、复核部署）一键部署 Frigate 实例。父容器（frigate-config-deploy）通过 Docker socket 管理子容器（frigate-instance-*），支持硬件加速（CPU/NVIDIA/Hailo）、双镜头摄像机、多实例管理、ONVIF 发现、RTSP 连通性测试与故障快速诊断。技术路线：Python 3.11+ + FastAPI（WebUI/API）+ Docker SDK + python-onvif-zeep + PyYAML，遵循测试优先与最小必填原则，部署通过 Docker Compose 完成。

## Technical Context

**Language/Version**: Python 3.11+（Docker SDK 需 3.7+，FastAPI 推荐 3.11+）
**Primary Dependencies**: FastAPI（WebUI/API）、Docker SDK for Python（容器管理）、python-onvif-zeep（ONVIF 设备发现）、PyYAML（配置渲染）、Pydantic（数据校验）
**Storage**: 文件系统（YAML 配置文件 + 实例元数据 JSON，可选 SQLite 用于实例状态持久化）
**Testing**: pytest（单元/集成测试）+ docker-compose fixtures（端到端测试）+ YAML schema validation
**Target Platform**: Linux 容器（Docker 20.10+），宿主机需 Docker Compose v2
**Project Type**: Web application（backend API + frontend WebUI）
**Performance Goals**: 错误显示 <3 秒（SC-008）、部署启动 <5 秒、ONVIF 扫描 <10 秒（SC-007）、单机支持 10+ 并发实例（SC-002）
**Constraints**: 必须挂载 /var/run/docker.sock、禁用 --privileged 模式、所有 UI 文案中文（SC-006）、父容器 restart=no（快速失败）
**Scale/Scope**: 单宿主机部署、10–50 个 Frigate 实例典型场景、父容器内存 <100MB、子容器按 Frigate 官方需求（1–4GB 视配置）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I - 测试优先与 CI 门槛
- ✅ **PASS**: 规格要求所有功能通过 pytest 测试，CI 包含构建/lint/单元测试/集成测试/docker-compose 自检
- ✅ **PASS**: Technical Context 明确 pytest + docker-compose fixtures，符合先测试后实现原则

### Principle II - 最小必填原则
- ✅ **PASS**: FR-008 要求所有非必填字段提供默认值（时区 UTC、镜像 stable、录像保留 14 天）
- ✅ **PASS**: FR-011 要求硬件不可用时自动降级为 CPU 模式

### Principle III - 中文优先界面
- ✅ **PASS**: FR-007 明确所有用户可见文案使用中文，SC-006 要求 100% 中文 UI
- ✅ **PASS**: 导出 YAML 配置键名保持英文（不翻译），符合宪法要求

### Principle IV - 安全边界
- ✅ **PASS**: FR-001/FR-002 仅通过 Docker API 检测硬件，不扫描宿主驱动
- ✅ **PASS**: FR-039 要求日志中脱敏摄像头密码
- ✅ **PASS**: 宪法要求禁用 --privileged，Technical Context 已约束

### Principle V - 仅 Docker 部署
- ✅ **PASS**: FR-003 要求父容器 restart=no（快速失败），所有操作通过 WebUI 完成
- ✅ **PASS**: FR-001 要求预检 Docker socket 可用性，失败快速退出

### Principle VI - 自动化与无人值守开发
- ✅ **PASS**: 计划遵循自动化 CI/CD 流程（main→latest、release→stable）
- ✅ **PASS**: 测试优先策略支持无人值守开发

### 合规性总结
**Status**: ✅ **ALL GATES PASSED** - 无违规项，无需填写 Complexity Tracking 表

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
backend/
├── src/
│   ├── models/           # 数据模型（Instance, Camera, HardwareMode, PortBlock, RTSPTemplate）
│   ├── services/         # 业务逻辑（DockerManager, ConfigRenderer, ONVIFScanner, PortAllocator）
│   ├── api/              # FastAPI 路由（/instances, /cameras, /hardware, /onvif）
│   ├── validators/       # Pydantic 校验器（name format, port range, RTSP URL）
│   ├── templates/        # RTSP 品牌模板（Hikvision, Dahua, Reolink）
│   └── utils/            # 工具函数（日志脱敏、错误码生成、时区校验）
└── tests/
    ├── contract/         # API 契约测试（OpenAPI schema validation）
    ├── integration/      # 集成测试（Docker socket + YAML 渲染 + 端口分配）
    └── unit/             # 单元测试（模型/校验器/工具函数）

frontend/
├── src/
│   ├── components/       # 通用组件（WizardStep, CameraForm, InstanceCard, ErrorAlert）
│   ├── pages/            # 页面（Dashboard, WizardFlow, InstanceDetails, Logs）
│   ├── services/         # API 客户端（axios + TypeScript types）
│   ├── i18n/             # 中文本地化文件（zh-CN.json）
│   └── utils/            # 前端工具（时区列表、品牌枚举、端口计算）
└── tests/
    ├── unit/             # 组件单元测试（Jest/Vitest）
    └── e2e/              # 端到端测试（Playwright/Cypress）

docker/
├── Dockerfile.backend    # Python 3.11 + FastAPI + Docker SDK
├── Dockerfile.frontend   # Node.js build + Nginx serve
└── docker-compose.yml    # 父容器编排（WebUI + API + Docker socket 挂载）

data/                     # 持久化数据目录（挂载到容器）
├── instances/            # 各实例配置与数据（/data/instances/<name>/config.yml）
├── metadata.json         # 实例元数据（名称、端口、状态、创建时间）
└── logs/                 # 父容器日志

docs/
├── quickstart.md         # 快速开始指南（Phase 1 生成）
└── api-reference.md      # API 文档（OpenAPI 自动生成）
```

**Structure Decision**: 选择 Web application 结构（Option 2）。理由：
1. 明确分离前后端职责（backend 负责 Docker 管理与配置渲染，frontend 负责 WebUI 交互）
2. 支持独立开发与测试（前端可 mock API，后端可独立运行）
3. 便于容器化部署（前后端分别构建镜像，通过 docker-compose 编排）
4. 符合规格要求的三步向导交互模式（frontend）与容器生命周期管理（backend）

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

