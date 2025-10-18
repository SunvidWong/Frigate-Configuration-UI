# Tasks: Frigate 配置与部署 WebUI

**Feature Branch**: `001-frigate-webui-deployment`
**Generated**: 2025-10-18
**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [data-model.md](./data-model.md), [research.md](./research.md)

**Prerequisites**:
- Constitution v1.0 (test-first, minimal input, Chinese UI, security boundaries, Docker-only, automation)
- Data model entities defined (Instance, Camera, PortBlock, RTSPTemplate)
- Research complete (Docker SDK, ONVIF, Frigate config patterns)

**Test Strategy**: 🧪 **Test-first mandatory** - All tasks marked with 🧪 MUST have failing tests written BEFORE implementation (per Constitution Principle I)

**Organization**: Tasks are grouped by Epic to enable incremental delivery. Each Epic has a Definition of Done (DoD).

**Format**: `[ID] [P] [Epic] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Epic]**: Which epic this task belongs to (A/B/C/D/G)
- 🧪 = Test-first required (write failing test → implement → verify test passes)

---

## Epic A: 父容器基础与预检（CI 门槛）

**Goal**: 建立父容器基础、预检机制、WebUI 框架与 CI 基线

**DoD**:
- ✅ 预检失败清晰退出
- ✅ 向导可走通到"复核"页
- ✅ 所有 UI 文案中文
- ✅ CI 包含构建/lint/单元测试/集成测试

---

### Phase A0: 项目初始化

- [ ] **T001** [P] 创建项目目录结构按 plan.md 定义
  - 创建 `backend/src/{models,services,api,validators,templates,utils}`
  - 创建 `backend/tests/{contract,integration,unit}`
  - 创建 `frontend/src/{components,pages,services,i18n,utils}`
  - 创建 `docker/`, `data/`, `docs/`
  - 路径: 项目根目录

- [ ] **T002** [P] 初始化后端 Python 项目
  - 创建 `backend/pyproject.toml` (Python 3.11+, FastAPI, Docker SDK, onvif-zeep, PyYAML, Pydantic, pytest)
  - 创建 `backend/requirements.txt` 与 `backend/requirements-dev.txt`
  - 配置 black/flake8/mypy
  - 路径: `backend/`

- [ ] **T003** [P] 初始化前端项目
  - 创建 `frontend/package.json` (React/Vue + TypeScript + Vite)
  - 配置 ESLint/Prettier
  - 创建 `frontend/src/i18n/zh-CN.json` (中文本地化骨架)
  - 路径: `frontend/`

- [ ] **T004** 🧪 创建 Docker Compose 配置
  - 创建 `docker/docker-compose.yml` (父容器)
  - 挂载 `/var/run/docker.sock`
  - 环境变量: `WEB_PORT=9888`, `TZ=UTC`
  - 数据卷: `./data:/data`, `./backend:/app/backend`
  - restart: no (快速失败，FR-003)
  - 路径: `docker/docker-compose.yml`
  - 测试: `docker-compose config` 验证语法

---

### Phase A1: 入口预检与错误码输出

**Purpose**: 实现 FR-001/FR-002/FR-003/FR-004 预检逻辑

- [ ] **T005** 🧪 [P] [A1] 定义错误码枚举
  - 创建 `backend/src/models/error_codes.py`
  - 定义 `ErrorCode` 枚举 (DOCKER_SOCKET, DOCKER_DAEMON, IMAGE_PULL, PORT_CONFLICT, NAME_INVALID, etc.)
  - 定义 `ErrorMessage` 数据类 + 中文描述 + 修复建议
  - 路径: `backend/src/models/error_codes.py`
  - 测试: `backend/tests/unit/test_error_codes.py` - 验证所有错误码都有中文描述

- [ ] **T006** 🧪 [A1] 实现 Docker socket 预检
  - 创建 `backend/src/services/preflight.py`
  - 函数 `check_docker_socket()` - FR-001
  - 检查 `/var/run/docker.sock` 存在性与可访问性
  - 失败时输出 `[ERROR][DOCKER_SOCKET]` + 中文提示 + 修复步骤
  - 路径: `backend/src/services/preflight.py:check_docker_socket()`
  - 测试: `backend/tests/unit/test_preflight.py::test_docker_socket_missing` (模拟 socket 不存在)
  - 测试: `backend/tests/integration/test_preflight_docker.py::test_docker_socket_ok` (真实 socket 可用)

- [ ] **T007** 🧪 [A1] 实现 Docker daemon 连通性预检
  - 函数 `check_docker_daemon()` - FR-002
  - 使用 `docker.from_env()` 与 `client.ping()`
  - 超时 30 秒
  - 失败时输出 `[ERROR][DOCKER_DAEMON]` + 中文提示
  - 路径: `backend/src/services/preflight.py:check_docker_daemon()`
  - 测试: `backend/tests/unit/test_preflight.py::test_docker_daemon_unreachable` (模拟守护进程失败)

- [ ] **T008** 🧪 [P] [A1] 实现镜像本地检查逻辑
  - 函数 `check_image_locally(tag: str) -> bool` - FR-013
  - 使用 `client.images.get(tag)` 检查镜像是否存在
  - 返回布尔值，不拉取镜像
  - 路径: `backend/src/services/docker_manager.py:check_image_locally()`
  - 测试: `backend/tests/unit/test_docker_manager.py::test_image_check_local_exists`

- [ ] **T009** [A1] 创建应用入口与预检执行
  - 创建 `backend/src/main.py`
  - 启动时顺序执行 `check_docker_socket()`, `check_docker_daemon()`
  - 任何失败 `sys.exit(1)` (FR-003: restart=no)
  - 成功后启动 FastAPI app
  - 路径: `backend/src/main.py:startup_event()`
  - 测试: `backend/tests/integration/test_startup.py::test_preflight_failure_exits`

---

### Phase A2: WebUI 框架与三步向导导航

**Purpose**: 搭建中文界面框架与三步向导 (FR-005, FR-006, FR-007)

- [ ] **T010** [P] [A2] 创建前端路由与页面结构
  - 创建 `frontend/src/pages/Dashboard.tsx` (实例列表)
  - 创建 `frontend/src/pages/WizardFlow.tsx` (向导容器)
  - 创建 `frontend/src/pages/WizardStep1.tsx` (硬件与镜像)
  - 创建 `frontend/src/pages/WizardStep2.tsx` (摄像头配置)
  - 创建 `frontend/src/pages/WizardStep3.tsx` (复核部署)
  - 配置路由: `/`, `/wizard/step1`, `/wizard/step2`, `/wizard/step3`
  - 路径: `frontend/src/pages/`

- [ ] **T011** [P] [A2] 创建向导导航组件
  - 创建 `frontend/src/components/WizardStep.tsx` (步骤指示器)
  - 显示当前步骤 1/2/3 进度
  - 中文标签: "硬件配置", "摄像头配置", "复核部署"
  - 路径: `frontend/src/components/WizardStep.tsx`

- [ ] **T012** 🧪 [P] [A2] 实现中文本地化
  - 填充 `frontend/src/i18n/zh-CN.json`
  - 包含所有 UI 文案的键值对（如字段标签、按钮文案）
  - 创建 i18n 工具函数 `t(key: string)`
  - 路径: `frontend/src/i18n/zh-CN.json`, `frontend/src/utils/i18n.ts`
  - 测试: `frontend/tests/unit/i18n.test.ts` - 验证所有 key 都有中文翻译

- [ ] **T013** [A2] 实现向导状态管理
  - 创建 `frontend/src/services/wizardStore.ts` (Zustand/Redux)
  - 状态: `currentStep`, `hardwareConfig`, `cameras`, `reviewData`
  - 方法: `nextStep()`, `prevStep()`, `updateHardware()`, `addCamera()`
  - 路径: `frontend/src/services/wizardStore.ts`

- [ ] **T014** [A2] 实现步骤 1 界面（硬件与镜像）
  - 单选框: 硬件模式（CPU/NVIDIA/Hailo）- FR-009
  - 文本框: Frigate 镜像 tag（默认 stable）- FR-012
  - 下拉框: 时区（IANA 列表，默认 UTC）- FR-014
  - "下一步" 按钮
  - 路径: `frontend/src/pages/WizardStep1.tsx`

- [ ] **T015** [A2] 实现步骤 2 界面（摄像头配置）
  - 切换按钮: "ONVIF 扫描" / "品牌模板"
  - 摄像头表单: IP/用户名/密码/品牌
  - 摄像头列表展示组件
  - "上一步" / "下一步" 按钮
  - 路径: `frontend/src/pages/WizardStep2.tsx`

- [ ] **T016** [A2] 实现步骤 3 界面（复核部署）
  - 显示配置摘要: 硬件模式、镜像 tag、摄像头数量
  - 显示摄像头列表详情
  - "上一步" / "一键部署" 按钮（调用部署逻辑）
  - 路径: `frontend/src/pages/WizardStep3.tsx`

- [ ] **T017** 🧪 [A2] 创建 FastAPI 路由骨架
  - 创建 `backend/src/api/main.py` (FastAPI app 实例)
  - 配置 CORS (允许前端 localhost:5173)
  - 添加健康检查 `GET /api/health`
  - 路径: `backend/src/api/main.py`
  - 测试: `backend/tests/contract/test_health.py::test_health_endpoint_returns_200`

---

### Phase A3: 校验规则接入

**Purpose**: 实现 FR-020/FR-012/FR-014/FR-027 的校验逻辑

- [ ] **T018** 🧪 [P] [A3] 实现名称格式校验器
  - 创建 `backend/src/validators/name_validator.py`
  - 函数 `validate_name(name: str) -> bool` - FR-020
  - Regex: `^[a-z][a-z0-9-]{2,31}$`
  - 失败时抛出 `ValueError` 包含 `[ERROR][NAME_INVALID]`
  - 路径: `backend/src/validators/name_validator.py`
  - 测试: `backend/tests/unit/test_name_validator.py` (合法/非法用例)

- [ ] **T019** 🧪 [P] [A3] 实现名称唯一性与保留名校验
  - 函数 `validate_name_unique(name: str, existing: List[str]) -> bool` - FR-021
  - 函数 `validate_name_not_reserved(name: str) -> bool` - FR-022
  - 保留名: `frigate-config-deploy`, `frigate`
  - 路径: `backend/src/validators/name_validator.py`
  - 测试: `backend/tests/unit/test_name_validator.py::test_reserved_names_rejected`

- [ ] **T020** 🧪 [P] [A3] 实现镜像 tag 格式校验
  - 函数 `validate_image_tag(tag: str) -> bool` - FR-012
  - Regex: `^[A-Za-z0-9._-]+$`
  - 路径: `backend/src/validators/config_validator.py`
  - 测试: `backend/tests/unit/test_config_validator.py::test_image_tag_validation`

- [ ] **T021** 🧪 [P] [A3] 实现时区校验
  - 函数 `validate_timezone(tz: str) -> bool` - FR-014
  - 使用 `pytz.timezone(tz)` 验证 IANA 时区
  - 路径: `backend/src/validators/config_validator.py`
  - 测试: `backend/tests/unit/test_config_validator.py::test_timezone_validation`

- [ ] **T022** 🧪 [A3] 实现端口可用性检查
  - 创建 `backend/src/services/port_allocator.py`
  - 函数 `is_port_available(port: int) -> bool` - FR-027
  - 使用 `socket.bind()` 测试端口
  - 路径: `backend/src/services/port_allocator.py:is_port_available()`
  - 测试: `backend/tests/unit/test_port_allocator.py::test_port_available_check`

- [ ] **T023** 🧪 [A3] 实现端口块校验
  - 函数 `validate_port_block(start: int, size: int) -> bool` - FR-027, FR-028
  - 范围限制 5200-65525
  - 检查所有端口可用性
  - 路径: `backend/src/services/port_allocator.py:validate_port_block()`
  - 测试: `backend/tests/unit/test_port_allocator.py::test_port_block_validation`

- [ ] **T024** [A3] 集成校验到前端向导
  - 步骤 1 调用校验（镜像 tag, 时区）
  - 步骤 2 调用摄像头名称校验
  - 显示中文错误提示
  - 路径: `frontend/src/pages/WizardStep1.tsx`, `frontend/src/pages/WizardStep2.tsx`

---

### Epic A Definition of Done 验证

- [ ] **A-DoD-1** 🧪 预检失败端到端测试
  - 测试场景: 不挂载 Docker socket 启动父容器 → 预检失败 → 输出 `[ERROR][DOCKER_SOCKET]` → 容器退出
  - 路径: `backend/tests/integration/test_preflight_e2e.py`

- [ ] **A-DoD-2** 🧪 向导流程端到端测试
  - 测试: 访问 `/wizard/step1` → 填写表单 → 下一步 → 到步骤 2 → 添加摄像头 → 到步骤 3 → 显示摘要
  - 执行但不实际部署（跳过容器创建）
  - 路径: `frontend/tests/e2e/wizard_flow.spec.ts`

- [ ] **A-DoD-3** 验证所有 UI 文案中文
  - 测试逻辑: 遍历所有页面与组件
  - 确认: 扫描 `.tsx` 文件中所有显示文本都通过 `t()` 函数

---

## Epic B: 摄像头与多通道

**Goal**: 实现 ONVIF 设备发现/流配对、品牌模板与 RTSP 测试

**DoD**:
- ✅ 双镜头摄像机正确配对（主/子码流像素比 < 0.6）
- ✅ 无 ONVIF 时品牌模板可用
- ✅ RTSP 测试失败仅警告不阻断部署

---

### Phase B1: ONVIF 发现与 profiles 分组

**Purpose**: 实现 FR-015 ONVIF 设备发现

- [ ] **T025** 🧪 [P] [B1] 实现 ONVIF WS-Discovery 扫描
  - 创建 `backend/src/services/onvif_scanner.py`
  - 函数 `discover_devices(timeout=10) -> List[ONVIFDevice]` - SC-007
  - 使用 `WSDiscovery` 扫描局域网设备
  - 返回设备列表（IP, port, xaddr）
  - 路径: `backend/src/services/onvif_scanner.py:discover_devices()`
  - 测试: `backend/tests/unit/test_onvif_scanner.py::test_discovery_timeout` (模拟超时)

- [ ] **T026** 🧪 [B1] 实现 ONVIF 流配置提取
  - 函数 `get_stream_profiles(camera: ONVIFCamera) -> List[ProfileData]`
  - 尝试 Media2 服务（支持 H.265），失败时降级为 Media 服务
  - 提取: resolution, bitrate, framerate, encoding
  - 处理不完整数据（FR-019a: 分辨率/码率缺失）
  - 路径: `backend/src/services/onvif_scanner.py:get_stream_profiles()`
  - 测试: `backend/tests/unit/test_onvif_scanner.py::test_profile_extraction_incomplete_data`

- [ ] **T027** 🧪 [B1] 按 VideoSource 分组 profiles
  - 函数 `group_profiles_by_source(profiles: List[Profile]) -> Dict[str, List[Profile]]`
  - 双镜头摄像机: 2 个 VideoSource
  - 单镜头摄像机: 1 个 VideoSource
  - 路径: `backend/src/services/onvif_scanner.py:group_profiles_by_source()`
  - 测试: `backend/tests/unit/test_onvif_scanner.py::test_dual_lens_grouping`

- [ ] **T028** [B1] 创建 ONVIF 扫描 API 端点
  - `POST /api/cameras/onvif-scan` - 接收 IP/用户名/密码
  - 返回: 设备信息 + profiles 列表
  - 超时 10 秒
  - 路径: `backend/src/api/cameras.py:onvif_scan()`
  - 测试: `backend/tests/contract/test_cameras_api.py::test_onvif_scan_endpoint`

---

### Phase B2: 主/子流配对算法与阈值

**Purpose**: 实现 FR-019 主/子流自动配对

- [ ] **T029** 🧪 [P] [B2] 实现主/子流配对算法
  - 创建 `backend/src/services/stream_pairing.py`
  - 函数 `pair_main_sub_streams(profiles: List[Profile]) -> Tuple[Profile, Profile, Optional[Error]]` - FR-019
  - 优先级: 分辨率（像素数）> 码率 > 帧率 > 编码
  - 子流像素比 MUST < 0.6（FR-019）
  - 失败时返回 Error 对象（FR-019a: incomplete_data / ambiguous_pairing）
  - 路径: `backend/src/services/stream_pairing.py:pair_main_sub_streams()`
  - 测试: `backend/tests/unit/test_stream_pairing.py::test_pairing_success`
  - 测试: `backend/tests/unit/test_stream_pairing.py::test_pairing_sub_too_large` (像素比 >=0.6)

- [ ] **T030** 🧪 [B2] 配对失败时格式化手动选择数据
  - 函数 `format_profile_for_manual_selection(profiles: List[Profile]) -> List[Dict]` - FR-019a
  - 返回可用流列表（包含分辨率/码率/帧率/编码）供用户手动选择
  - 路径: `backend/src/services/stream_pairing.py:format_profile_for_manual_selection()`
  - 测试: `backend/tests/unit/test_stream_pairing.py::test_manual_selection_format`

- [ ] **T031** [B2] 创建手动流选择 UI 组件
  - 创建 `frontend/src/components/ManualStreamSelector.tsx`
  - 显示可用流列表（分辨率、码率、帧率）
  - 用户选择主流与子流
  - 路径: `frontend/src/components/ManualStreamSelector.tsx`

- [ ] **T032** [B2] 创建 profiles 提取 API 端点
  - `POST /api/cameras/onvif-profiles` - 接收摄像头守护进程信息
  - 返回: profiles + 配对结果 / 手动选择选项
  - 路径: `backend/src/api/cameras.py:get_onvif_profiles()`
  - 测试: `backend/tests/contract/test_cameras_api.py::test_onvif_profiles_endpoint`

---

### Phase B3: 品牌模板与回退策略

**Purpose**: 实现 FR-015, FR-016 品牌模板

- [ ] **T033** 🧪 [P] [B3] 定义 RTSP 模板数据结构
  - 创建 `backend/src/models/rtsp_template.py`
  - 使用 data-model.md 中定义的 `RTSPTemplate` Pydantic 模型
  - 路径: `backend/src/models/rtsp_template.py`

- [ ] **T034** 🧪 [P] [B3] 创建品牌模板配置文件
  - 创建 `backend/src/templates/rtsp_templates.json`
  - 定义模板: Hikvision, Dahua, Reolink, Reolink Duo
  - 每个模板包含: main_stream_pattern, sub_stream_pattern, default_port
  - 路径: `backend/src/templates/rtsp_templates.json`
  - 测试: `backend/tests/unit/test_rtsp_templates.py::test_template_placeholders` (验证模板包含 {ip}/{user}/{password})

- [ ] **T035** 🧪 [B3] 实现 RTSP URL 渲染逻辑
  - 函数 `render_rtsp_url(template: RTSPTemplate, ip, user, password, stream_type) -> str` - FR-016, FR-017
  - URL 编码密码（`urllib.parse.quote(password, safe='')`）- FR-017
  - 替换占位符 {ip}/{user}/{password}/{port}
  - 路径: `backend/src/services/rtsp_renderer.py:render_rtsp_url()`
  - 测试: `backend/tests/unit/test_rtsp_renderer.py::test_password_url_encoding` (密码含特殊字符 @!#)

- [ ] **T036** [B3] 创建品牌列表 API 端点
  - `GET /api/cameras/brands` - 返回可用品牌列表（中文名显示）
  - 返回: `[{id: "hikvision", name: "海康威视"}, ...]`
  - 路径: `backend/src/api/cameras.py:get_brands()`
  - 测试: `backend/tests/contract/test_cameras_api.py::test_brands_endpoint`

- [ ] **T037** [B3] 集成 ONVIF 失败回退逻辑
  - 在步骤 2（ONVIF 扫描失败时）提示用户切换到品牌模板
  - 显示品牌列表下拉框
  - 自动生成 RTSP URL 预览
  - 路径: `frontend/src/pages/WizardStep2.tsx`

---

### Phase B4: RTSP 短测（3-5 秒，非阻断）

**Purpose**: 实现 FR-023, FR-024 RTSP 连通性测试

- [ ] **T038** 🧪 [P] [B4] 实现 RTSP 连通性测试
  - 创建 `backend/src/services/rtsp_tester.py`
  - 函数 `test_rtsp_connectivity(url: str, timeout=5) -> TestResult` - FR-023
  - 使用 `ffprobe` 测试流可访问性（超时 3-5 秒）
  - 返回: success / error + 错误类型（鉴权/超时/路径）
  - 路径: `backend/src/services/rtsp_tester.py:test_rtsp_connectivity()`
  - 测试: `backend/tests/unit/test_rtsp_tester.py::test_rtsp_timeout` (模拟超时)
  - 测试: `backend/tests/integration/test_rtsp_tester.py::test_rtsp_auth_fail` (鉴权错误)

- [ ] **T039** 🧪 [B4] 实现 RTSP 错误分类逻辑
  - 函数 `classify_rtsp_error(error: Exception) -> ErrorCode` - FR-024
  - 分类: RTSP_AUTH_FAIL (401), RTSP_TIMEOUT, RTSP_INVALID_URL
  - 每种类型包含中文描述与修复建议
  - 路径: `backend/src/services/rtsp_tester.py:classify_rtsp_error()`
  - 测试: `backend/tests/unit/test_rtsp_tester.py::test_error_classification`

- [ ] **T040** [B4] 创建 RTSP 测试 API 端点
  - `POST /api/cameras/test-rtsp` - 接收 RTSP URL
  - 返回: {success: bool, error_code: Optional[str], message: str}
  - 超时处理: 失败时仍返回 200 状态码，显示警告
  - 路径: `backend/src/api/cameras.py:test_rtsp()`
  - 测试: `backend/tests/contract/test_cameras_api.py::test_rtsp_test_endpoint`

- [ ] **T041** [B4] 集成 RTSP 测试到前端 UI
  - 在步骤 2 添加"测试 RTSP" 按钮（针对每个摄像头）
  - 显示测试结果: 成功 ✓ / 失败 `[WARN][RTSP_TEST_FAIL]` + 提示
  - 失败时允许用户继续（不阻断摄像头逻辑）
  - 路径: `frontend/src/pages/WizardStep2.tsx`

---

### Epic B Definition of Done 验证

- [ ] **B-DoD-1** 🧪 双镜头配对端到端测试
  - 模拟 Reolink Duo ONVIF 响应（2 个 VideoSource, 4 个 profiles）
  - 验证算法配对主/子流
  - 生成 2 个 camera 配置（<name>-ch1, <name>-ch2）
  - 路径: `backend/tests/integration/test_dual_lens_e2e.py`

- [ ] **B-DoD-2** 🧪 ONVIF 失败回退测试
  - 模拟 ONVIF 超时 → 用户切换到品牌模板 "海康威视" → 生成 RTSP URL
  - 验证 URL 包含正确路径（Hikvision 为 `/Streaming/Channels/101`）
  - 路径: `backend/tests/integration/test_onvif_fallback.py`

- [ ] **B-DoD-3** 🧪 RTSP 测试超时不阻断
  - 测试失败时允许用户继续到步骤 3
  - 验证警告显示且部署可以继续（不抛错）
  - 路径: `frontend/tests/e2e/rtsp_test_warning.spec.ts`

---

## Epic C: 配置渲染与多实例部署

**Goal**: 实现 Frigate config.yml 渲染、端口块分配、容器生命周期管理与部署

**DoD**:
- ✅ 一键部署成功（容器 + 配置 + 启动健康检查）
- ✅ 多实例端口不冲突
- ✅ 克隆实例可用（修改摄像头 → 部署 → 删除旧实例）
- ✅ 删除实例不影响其他实例

---

### Phase C1: 配置渲染器

**Purpose**: 实现 FR-026, FR-029, FR-030 配置渲染

- [ ] **T042** 🧪 [P] [C1] 实现 Frigate 配置渲染器
  - 创建 `backend/src/services/config_renderer.py`
  - 函数 `render_config(instance: Instance) -> str` - FR-029
  - 使用 data-model.md 中定义的 `ConfigTemplate.from_instance()` 逻辑
  - 生成 YAML 包含: mqtt, detectors, ffmpeg, cameras, record, snapshots
  - 路径: `backend/src/services/config_renderer.py:render_config()`
  - 测试: `backend/tests/unit/test_config_renderer.py::test_render_cpu_mode`
  - 测试: `backend/tests/unit/test_config_renderer.py::test_render_nvidia_mode` (hwaccel_args=preset-nvidia-h264)

- [ ] **T043** 🧪 [C1] 实现硬件模式映射逻辑
  - 函数 `get_detectors_config(mode: HardwareMode) -> Dict` - FR-029
  - CPU 模式: `{"cpu": {"type": "cpu", "num_threads": 3}}`
  - NVIDIA 模式: CPU detector + `hwaccel_args: preset-nvidia-h264`
  - Hailo 模式: `{"hailo8l": {"type": "hailo8l", "device": "PCIe"}}`
  - 路径: `backend/src/services/config_renderer.py:get_detectors_config()`
  - 测试: `backend/tests/unit/test_config_renderer.py::test_hardware_mode_mapping`

- [ ] **T044** 🧪 [C1] 实现摄像头配置逻辑
  - 函数 `generate_camera_config(camera: Camera) -> Dict`
  - 双流配置: sub stream (detect 角色) + main stream (record 角色)
  - 凭据占位符: `{FRIGATE_RTSP_USER}`, `{FRIGATE_RTSP_PASSWORD}`
  - 路径: `backend/src/services/config_renderer.py:generate_camera_config()`
  - 测试: `backend/tests/unit/test_config_renderer.py::test_camera_config_dual_stream`

- [ ] **T045** 🧪 [C1] 实现配置文件写入逻辑
  - 函数 `write_config_file(instance_name: str, config_yaml: str) -> Path`
  - 目标目录: `/data/instances/<name>/config/`
  - 文件名: `config.yml`
  - 备份旧配置: `config.yml.bak`
  - 路径: `backend/src/services/config_renderer.py:write_config_file()`
  - 测试: `backend/tests/integration/test_config_write.py::test_config_file_created`

- [ ] **T046** [C1] 实现时区传递逻辑
  - 在容器创建时传递环境变量 `TZ=<timezone>` - FR-030
  - 路径: `backend/src/services/docker_manager.py:create_container()` (后续任务引用)

---

### Phase C2: 端口块算法

**Purpose**: 实现 FR-027, FR-028 端口分配

- [ ] **T047** 🧪 [P] [C2] 实现端口分配器类
  - 创建 `backend/src/services/port_allocator.py:PortAllocator`
  - 属性: `start_port=5200`, `block_size=10`, `allocations: Dict[str, int]`
  - 函数 `allocate_block(instance_name: str) -> int` - FR-027
  - 从 5200 开始顺延查找可用块
  - 路径: `backend/src/services/port_allocator.py:PortAllocator`
  - 测试: `backend/tests/unit/test_port_allocator.py::test_allocate_first_block` (首次分配 5200)

- [ ] **T048** 🧪 [C2] 实现端口冲突自动顺延逻辑
  - 函数 `find_next_available_block() -> int` - FR-028
  - 检查当前块所有端口 → 任一冲突则整体顺延 10 端口递增
  - 最多尝试 100 次，失败后输出 `[ERROR][PORT_EXHAUSTED]`
  - 路径: `backend/src/services/port_allocator.py:find_next_available_block()`
  - 测试: `backend/tests/unit/test_port_allocator.py::test_port_conflict_auto_increment`

- [ ] **T049** 🧪 [C2] 实现端口分配持久化
  - 函数 `save_allocations(filepath='/data/port_allocations.json')`
  - 函数 `load_allocations(filepath) -> PortAllocator`
  - JSON 格式: `{"allocations": {"front-door": 5200, "backyard": 5210}}`
  - 路径: `backend/src/services/port_allocator.py:save_allocations()`
  - 测试: `backend/tests/integration/test_port_allocator_persistence.py`

- [ ] **T050** 🧪 [C2] 实现端口块释放逻辑
  - 函数 `release_block(instance_name: str)` - FR-036
  - 从 allocations 中删除
  - 保存更新后状态
  - 路径: `backend/src/services/port_allocator.py:release_block()`
  - 测试: `backend/tests/unit/test_port_allocator.py::test_release_port_block`

- [ ] **T051** [C2] 实现端口映射生成逻辑
  - 函数 `get_port_mapping(start_port: int) -> Dict[str, int]`
  - 映射格式: `{"5000/tcp": start_port+0, "8554/tcp": start_port+1, ...}`
  - 默认仅映射 Frigate UI 端口（offset 0）
  - 路径: `backend/src/services/port_allocator.py:get_port_mapping()`
  - 测试: `backend/tests/unit/test_port_allocator.py::test_port_mapping_generation`

---

### Phase C3: 实例生命周期

**Purpose**: 实现 FR-026, FR-033, FR-034, FR-035, FR-036 容器管理

- [ ] **T052** 🧪 [P] [C3] 实现容器创建逻辑
  - 创建 `backend/src/services/docker_manager.py`
  - 函数 `create_container(instance: Instance) -> str` - FR-026
  - 容器名: `frigate-instance-<name>`
  - 镜像: `ghcr.io/blakeblackshear/frigate:<tag>`
  - 数据卷: config, media, tmpfs cache
  - 环境变量: TZ
  - 设备挂载: 根据 hardware_mode
  - 返回: container_id
  - 路径: `backend/src/services/docker_manager.py:create_container()`
  - 测试: `backend/tests/unit/test_docker_manager.py::test_create_container_cpu_mode` (模拟 Docker SDK)

- [ ] **T053** 🧪 [C3] 实现容器启动逻辑
  - 函数 `start_container(container_id: str)`
  - 使用 `container.start()`
  - 更新实例状态: STARTING
  - 路径: `backend/src/services/docker_manager.py:start_container()`
  - 测试: `backend/tests/unit/test_docker_manager.py::test_start_container`

- [ ] **T054** 🧪 [C3] 实现健康状态等待逻辑
  - 函数 `wait_for_healthy(container_id: str, timeout=60) -> InstanceStatus` - FR-031
  - 轮询 `container.attrs['State']['Health']['Status']`
  - 返回: HEALTHY / FAILED
  - 路径: `backend/src/services/docker_manager.py:wait_for_healthy()`
  - 测试: `backend/tests/unit/test_docker_manager.py::test_wait_for_healthy_success`

- [ ] **T055** 🧪 [P] [C3] 实现容器停止逻辑
  - 函数 `stop_container(container_id: str)` - FR-033
  - 使用 `container.stop(timeout=10)`
  - 更新实例状态: STOPPED
  - 路径: `backend/src/services/docker_manager.py:stop_container()`
  - 测试: `backend/tests/unit/test_docker_manager.py::test_stop_container`

- [ ] **T056** 🧪 [P] [C3] 实现容器删除逻辑
  - 函数 `delete_container(container_id: str, remove_data=False)` - FR-033, FR-036
  - 停止容器 → 删除容器 → 释放端口块
  - 可选: 删除数据目录或移动到 trash
  - 路径: `backend/src/services/docker_manager.py:delete_container()`
  - 测试: `backend/tests/unit/test_docker_manager.py::test_delete_container_with_data_cleanup`

- [ ] **T057** 🧪 [C3] 实现实例克隆逻辑
  - 函数 `clone_instance(source_name: str, new_name: str) -> Instance` - FR-034
  - 复制配置（cameras, hardware_mode, etc.）
  - 自动追加名称后缀: "-copy-1", "-copy-2" - FR-034a
  - 分配新端口块
  - 返回新容器但不创建 Instance 对象
  - 路径: `backend/src/services/instance_manager.py:clone_instance()`
  - 测试: `backend/tests/unit/test_instance_manager.py::test_clone_instance_auto_suffix`

- [ ] **T058** 🧪 [C3] 实现配置导出逻辑
  - 函数 `export_config(instance_name: str) -> bytes` - FR-035
  - 读取 `/data/instances/<name>/config/config.yml`
  - 返回 YAML 字节流（供下载）
  - 路径: `backend/src/services/instance_manager.py:export_config()`
  - 测试: `backend/tests/unit/test_instance_manager.py::test_export_config`

- [ ] **T059** [C3] 创建实例管理 API 端点
  - `POST /api/instances` - 创建实例（触发部署流程）
  - `GET /api/instances` - 获取所有实例
  - `GET /api/instances/{name}` - 获取单个实例详情
  - `POST /api/instances/{name}/start` - 启动
  - `POST /api/instances/{name}/stop` - 停止
  - `POST /api/instances/{name}/restart` - 重启
  - `POST /api/instances/{name}/clone` - 克隆
  - `GET /api/instances/{name}/config` - 导出配置
  - `DELETE /api/instances/{name}` - 删除
  - 路径: `backend/src/api/instances.py`
  - 测试: `backend/tests/contract/test_instances_api.py` (所有端点)

- [ ] **T060** [C3] 创建实例容器 UI 页面
  - 更新 `frontend/src/pages/Dashboard.tsx`
  - 显示实例卡片: 名称、状态、端口、操作按钮
  - 操作按钮: 启动/停止/重启/克隆/导出/删除
  - 路径: `frontend/src/pages/Dashboard.tsx`

- [ ] **T061** [C3] 实现一键部署流程
  - 在步骤 3 "一键部署" 按钮点击后执行：
    1. 调用 `POST /api/instances` 创建实例
    2. 渲染配置文件
    3. 创建容器
    4. 启动容器
    5. 轮询健康检查
    6. 显示实例 UI URL
  - 路径: `frontend/src/pages/WizardStep3.tsx`

---

### Epic C Definition of Done 验证

- [ ] **C-DoD-1** 🧪 一键部署端到端测试
  - 完整流程: 向导步骤 → 点击部署 → 容器创建 → 等待健康检查 → 显示 UI URL
  - 验证 config.yml 正确生成
  - 验证容器可访问（curl Frigate UI）
  - 路径: `backend/tests/integration/test_deploy_e2e.py`

- [ ] **C-DoD-2** 🧪 多实例并存测试
  - 部署 2 个实例 ("front-door", "backyard")
  - 验证端口不冲突 (5200-5209, 5210-5219)
  - 验证两个实例同时运行
  - 路径: `backend/tests/integration/test_multi_instance.py`

- [ ] **C-DoD-3** 🧪 蓝绿部署测试
  - 克隆实例 "front-door" 为 "front-door-new"
  - 修改摄像头配置
  - 部署 "front-door-new"
  - 验证两个实例都可访问
  - 删除旧实例 "front-door"
  - 验证新实例不受影响
  - 路径: `backend/tests/integration/test_blue_green_deployment.py`

- [ ] **C-DoD-4** 🧪 删除隔离测试
  - 创建 3 个实例
  - 删除中间实例
  - 验证其他实例不受影响继续运行
  - 验证端口块已释放
  - 路径: `backend/tests/integration/test_instance_isolation.py`

---

## Epic D: CI/CD、发布与文档（无人值守）

**Goal**: 建立自动化 CI/CD 流水线、镜像发布与中文文档

**DoD**:
- ✅ 合并即触发构建并推送到 GHCR
- ✅ 客户引用 `stable` tag 即可使用
- ✅ README 与文档完整（中文）

---

### Phase D1: 仓库与镜像配置

- [ ] **T062** [P] [D1] 配置仓库坐标变量
  - 创建 `.github/workflows/ci.yml`
  - 环境变量:
    - `REPO_URL=https://github.com/SunvidWong/Frigate-Configuration-UI.git`
    - `REGISTRY=ghcr.io`
    - `IMAGE_NAMESPACE=SunvidWong`
    - `IMAGE_NAME=frigate-configuration-ui`
    - `DEFAULT_TAG=stable`
  - 路径: `.github/workflows/ci.yml`

---

### Phase D2: GitHub Actions 流水线

**Purpose**: 实现自动化 CI 与镜像构建

- [ ] **T063** 🧪 [D2] 创建 CI 检查流水线
  - 触发条件: push to `main`, pull_request
  - 步骤:
    1. Checkout 代码
    2. Setup Python 3.11
    3. 安装依赖 (`pip install -r backend/requirements-dev.txt`)
    4. 运行 lint (black, flake8, mypy)
    5. 运行单元测试 (`pytest backend/tests/unit -v --cov`)
    6. 运行集成测试 (`pytest backend/tests/integration -v`)
    7. 验证 docker-compose.yml (`docker-compose config`)
  - 路径: `.github/workflows/ci.yml`
  - 测试: 提交代码触发 CI，验证所有步骤通过

- [ ] **T064** [D2] 创建镜像构建与推送流水线
  - 触发条件: push to `main` (latest tag), push tags `v*` (语义化版本 tag + stable)
  - 步骤:
    1. Login to GHCR (`docker/login-action`)
    2. Build multi-arch image (amd64, arm64)
    3. Push to `ghcr.io/SunvidWong/frigate-configuration-ui:latest` (main 分支)
    4. Push to `ghcr.io/SunvidWong/frigate-configuration-ui:stable` + `vX.Y.Z` (release tag)
  - 权限: `packages:write`
  - 路径: `.github/workflows/ci.yml` (build-and-push job)
  - 测试: 创建 tag `v0.1.0`，验证镜像推送成功

- [ ] **T065** [D2] 配置 GHCR 访问权限
  - 使用 GitHub repo 设置中启用 `packages:write` 权限
  - 配置 Personal Access Token (如需要)
  - 验证 workflow 可正常推送镜像

---

### Phase D3: README 与使用指南（中文）

- [ ] **T066** [P] [D3] 创建 README.md（中文）
  - 创建 `README.md`
  - 内容:
    - 项目简介（中文）
    - 前置要求（Docker 20.10+, Docker Compose v2）
    - 快速开始（`docker-compose up -d` → 访问 localhost:9888）
    - 三步向导说明
    - 常见问题 FAQ
    - 贡献指南
  - 路径: `README.md`

- [ ] **T067** [P] [D3] 创建错误码对照表
  - 创建 `docs/error-codes.md`
  - 表格格式: 错误码 | 中文描述 | 修复步骤
  - 包含所有错误码: DOCKER_SOCKET, DOCKER_DAEMON, IMAGE_PULL, PORT_CONFLICT, NAME_INVALID, RTSP_TEST_FAIL, etc.
  - 路径: `docs/error-codes.md`

- [ ] **T068** [P] [D3] 创建用户指南
  - 创建 `docs/user-guide.md`（中文）
  - 内容:
    - 部署流程（截图 + 三步向导说明 + 每个占位符含义）
    - 添加多个摄像头
    - 硬件加速配置（NVIDIA/Hailo）
    - 实例管理
    - 蓝绿部署最佳实践
    - 故障排查
  - 路径: `docs/user-guide.md`

- [ ] **T069** [P] [D3] 创建词汇表（本地化）
  - 创建 `docs/glossary.md`
  - 中英对照: Instance (实例), Camera (摄像头), Hardware Mode (硬件模式), Port Block (端口块), etc.
  - 路径: `docs/glossary.md`

---

### Phase D4: 错误日志与格式规范

- [ ] **T070** 🧪 [P] [D4] 实现结构化日志工具
  - 创建 `backend/src/utils/logger.py`
  - 函数 `log_error(code: ErrorCode, message: str, suggestion: str)`
  - 格式: `[ERROR][{code}] {message}。修复: {suggestion}`
  - 函数 `log_warning(code: ErrorCode, message: str)`
  - 格式: `[WARN][{code}] {message}`
  - 路径: `backend/src/utils/logger.py`
  - 测试: `backend/tests/unit/test_logger.py::test_error_log_format`

- [ ] **T071** [D4] 集成结构化日志到所有服务
  - 使用 preflight, docker_manager, config_renderer, onvif_scanner, rtsp_tester 中统一调用 `log_error()` / `log_warning()`
  - 轮询所有服务代码确保格式一致
  - 路径: 所有 `backend/src/services/*.py` 文件

- [ ] **T072** 🧪 [D4] 验证所有错误码包含修复建议
  - 函数 `validate_error_codes_completeness() -> List[str]` - FR-004
  - 检查 `backend/src/models/error_codes.py` 中所有 `ErrorCode` 枚举值
  - 验证每个错误码对应的 `ErrorMessage` 都包含非空的 `suggestion` 字段
  - 失败时返回缺少建议的错误码列表
  - 路径: `backend/src/utils/error_code_validator.py`
  - 测试: `backend/tests/unit/test_error_code_validator.py::test_all_errors_have_suggestions`

---

### Epic D Definition of Done 验证

- [ ] **D-DoD-1** 🧪 CI 流水线端到端测试
  - 提交代码到 `main` 分支 → CI 运行 → 所有步骤通过 → 镜像推送到 GHCR latest
  - 验证镜像可拉取: `docker pull ghcr.io/sunvidwong/frigate-configuration-ui:latest`

- [ ] **D-DoD-2** 🧪 Release 流水线测试
  - 创建 tag `v0.1.0` → 触发 CI 流程 → 镜像推送到 `stable` 与 `v0.1.0`
  - 验证: `docker pull ghcr.io/sunvidwong/frigate-configuration-ui:stable`

- [ ] **D-DoD-3** 文档完整性检查
  - README 包含快速开始步骤
  - 错误码文档包含所有错误码
  - 用户指南覆盖所有用户故事（P1-P4）

---

## 全局护栏（G: Global Guardrails）

**（适用于所有 Epic 阶段）**

### G1: 测试优先（Test-First Discipline）

**宪法原则 I: 测试优先与 CI 门槛**

- [ ] **G1-Rule-1** 🧪 所有 🧪 任务都 MUST 先写失败测试再实现
  - 流程: 编写测试 → 运行测试（失败）→ 编写实现 → 运行测试（通过）→ 重构
  - 禁止: 先实现后补测试

- [ ] **G1-Rule-2** 🧪 CI 包含完整检查项（per Constitution）
  - 构建检查: `docker-compose build` 通过
  - Lint 校验: black, flake8, mypy 通过
  - 单元测试: `pytest backend/tests/unit --cov` 通过且覆盖率 >80%
  - 集成测试: `pytest backend/tests/integration` 通过
  - Compose 验证: `docker-compose config` 无错误

- [ ] **G1-Rule-3** 🧪 CI 绿色是合并与发布的必要条件
  - PR 合并前 MUST CI 通过
  - 镜像发布前 MUST 所有测试通过
  - 禁止: 为通过 CI 而屏蔽或降级测试

---

### G2: 规格边界（Specification Boundaries）

**宪法原则 II: Coding Guardrails**

- [ ] **G2-Rule-1** 🧪 仅实现规格定义的功能
  - 范围: spec.md 中定义的 FR-001 到 FR-040
  - 超出范围 MUST 先更新规格并获批准

- [ ] **G2-Rule-2** 🧪 新依赖需在计划中声明
  - 所有依赖使用 plan.md Technical Context 中定义
  - 新依赖引入需在 PR 中说明必要性

- [ ] **G2-Rule-3** 🧪 不得修改对外接口
  - API 端点签名保持不变
  - 配置文件 schema 向后兼容
  - 配置格式变更必须提供迁移工具

---

### G3: 中文优先（Chinese-First Interface）

**宪法原则 III: 中文优先界面**

- [ ] **G3-Rule-1** 🧪 UI/提示/文档/日志摘要使用中文主导
  - 所有用户可见文案使用中文
  - 前端使用 `t()` 函数查找 `zh-CN.json`
  - 错误码包含中文描述与修复建议

- [ ] **G3-Rule-2** 🧪 YAML 配置键名保持英文
  - Frigate config.yml 键名不翻译（遵循官方格式）
  - 环境变量保持英文（如 `TZ`, `FRIGATE_RTSP_PASSWORD`）

- [ ] **G3-Rule-3** 🧪 代码注释推荐中文（逻辑复杂处强制）
  - 禁止英文主/子流配对算法等复杂逻辑中使用纯英文注释
  - 函数 docstring 推荐中文

---

### G4: 自动化（Automation & Unattended Development）

**宪法原则 VI: 自动化与无人值守开发**

- [ ] **G4-Rule-1** 🧪 流水线自动推进
  - 合并到 `main` 分支 → 自动触发构建 → 自动推送 `latest` tag
  - 创建 release tag → 自动推送 `stable` + `vX.Y.Z`

- [ ] **G4-Rule-2** 🧪 CI/评审门槛作为唯一停顿点
  - CI 失败 → 流程停止，等待修复
  - PR 需要评审 → 流程停止，等待批准
  - 其他情况自动推进

- [ ] **G4-Rule-3** 🧪 禁用不停顿保护
  - 禁止 `--no-verify` 跳过 git hooks
  - 禁止 `--force-push` 到 main/master
  - 禁止屏蔽测试通过 CI

---

## 人工验收（E2E Acceptance Checklist）

**（在所有 Epic 完成后执行）**

### AC-1: 品牌模板部署（无 ONVIF 网络）

- [ ] **AC-1-1** 启动父容器 (`docker-compose up -d`)
- [ ] **AC-1-2** 访问 `http://localhost:9888` 显示中文 WebUI
- [ ] **AC-1-3** 进入三步向导 → 步骤 1 选择 CPU 模式、stable 镜像、UTC 时区
- [ ] **AC-1-4** 步骤 2 选择品牌模板 "海康威视"，填写 IP/用户名/密码，生成 RTSP URL
- [ ] **AC-1-5** 步骤 3 复核配置后点击 "一键部署"
- [ ] **AC-1-6** 部署成功后显示实例 UI URL `http://localhost:5200`
- [ ] **AC-1-7** 访问 Frigate UI，验证摄像头画面可正常播放
- [ ] **AC-1-8** 验证所有界面文案使用中文

**Expected Result**: ✅ 部署成功、UI 完整、摄像头连接正常

---

### AC-2: ONVIF 双镜头配对（有 ONVIF 网络）

- [ ] **AC-2-1** 在步骤 2 启用 "ONVIF 扫描"，扫描局域网设备
- [ ] **AC-2-2** 发现 Reolink Duo 双镜头摄像机
- [ ] **AC-2-3** 验证返回 2 个 VideoSource，共 4 个 profiles
- [ ] **AC-2-4** 验证算法配对主/子流（像素比 < 0.6）
- [ ] **AC-2-5** 生成 2 个 camera 配置: `reolink-duo-ch1`, `reolink-duo-ch2`
- [ ] **AC-2-6** 启用 RTSP 测试（1 个摄像头测试失败，显示 `[WARN][RTSP_TEST_FAIL]`）
- [ ] **AC-2-7** 验证允许继续部署逻辑
- [ ] **AC-2-8** 部署成功后在 Frigate UI 显示 2 个摄像头

**Expected Result**: ✅ 双镜头正确配对、RTSP 失败仅警告不阻断部署

---

### AC-3: 多实例并存与克隆

- [ ] **AC-3-1** 部署第 2 个实例 "backyard"
- [ ] **AC-3-2** 验证端口分配: 5210-5219, 与第 1 个实例不冲突
- [ ] **AC-3-3** 验证两个实例同时运行且互不影响
- [ ] **AC-3-4** 停止 "front-door" 实例，验证 "backyard" 实例继续运行
- [ ] **AC-3-5** 克隆 "backyard" 为 "backyard-new"，修改摄像头配置
- [ ] **AC-3-6** 部署 "backyard-new"，验证新实例可访问
- [ ] **AC-3-7** 删除旧实例 "backyard"，验证 "backyard-new" 不受影响
- [ ] **AC-3-8** 验证端口块 5210-5219 已释放（可分配给新实例）

**Expected Result**: ✅ 多实例部署、克隆、删除均正常工作

---

### AC-4: 错误码验证

- [ ] **AC-4-1** 触发 `[ERROR][DOCKER_SOCKET]`
  - 不挂载 Docker socket 启动父容器 → 预检失败 → 显示错误码与修复建议
  - 修复: 在 docker-compose.yml 中添加 socket 挂载 → 重启成功

- [ ] **AC-4-2** 触发 `[ERROR][DOCKER_DAEMON]`
  - 停止 Docker daemon 启动父容器 → 预检失败 → 显示错误
  - 修复: 启动 Docker daemon → 重启成功

- [ ] **AC-4-3** 触发 `[ERROR][IMAGE_PULL]`
  - 使用不存在的镜像 tag → 部署失败 → 显示错误
  - 修复: 使用 `stable` tag → 部署成功

- [ ] **AC-4-4** 触发 `[ERROR][PORT_CONFLICT]`
  - 手动占用端口 5200 → 部署失败 → 显示端口冲突建议
  - 验证自动顺延到 5210 → 部署成功

- [ ] **AC-4-5** 触发 `[ERROR][NAME_INVALID]`
  - 填写摄像头名称 "FrontDoor"（含大写）→ 显示格式错误
  - 修复: 改为 "front-door" → 验证通过

- [ ] **AC-4-6** 触发 `[WARN][RTSP_TEST_FAIL]`
  - RTSP 测试失败 → 显示警告 + 错误分类（鉴权/超时/路径）→ 允许继续部署

**Expected Result**: ✅ 所有错误码显示中文描述与修复建议，可自助解决

---

## 任务执行顺序与并行策略

### 顺序执行（Sequential）

**Epic 顺序**: A → B → C → D → 全局护栏 → 人工验收

**理由**:
- Epic A 构建基础设施（预检、WebUI 框架）
- Epic B 依赖 Epic A 的 API 框架
- Epic C 依赖 Epic B 的摄像头配置
- Epic D 在所有功能完成后集成 CI/CD

---

### 并行执行（Parallel）

**Epic A 内并行**:
- T002 (后端) || T003 (前端)
- T005 (错误码) || T006 (Docker socket 预检) || T008 (镜像检查)
- T010-T012 (前端页面) 可并行创建

**Epic B 内并行**:
- T025 (ONVIF 扫描) || T033 (模板定义)
- T029 (配对算法) || T034 (模板配置)
- T038 (RTSP 测试) || T039 (错误分类)

**Epic C 内并行**:
- T042 (配置渲染) || T047 (端口分配器)
- T052-T056 (容器管理) 的单元测试可并行编写

**Epic D 内并行**:
- T066-T069 (文档) 完全并行

---

### 关键路径（Critical Path）

```
T001 项目初始化
  ↓
T006 Docker socket 预检
  ↓
T017 FastAPI 路由
  ↓
T042 配置渲染器
  ↓
T052 容器创建
  ↓
T059 实例管理 API
  ↓
T061 一键部署流程
  ↓
T063 CI 流水线
  ↓
人工验收
```

---

## 里程碑与进度

### 预计工作量

- [ ] **Week 1**: Epic A（基础 + 预检）
- [ ] **Week 2**: Epic B（ONVIF + 品牌模板）
- [ ] **Week 3**: Epic C（配置部署 + 生命周期）
- [ ] **Week 4**: Epic D（CI/CD + 文档）+ 人工验收

### 容器化交付

- **Week 1 交付**: 父容器可启动（预检通过）
- **Week 2 交付**: WebUI 可配置摄像头（ONVIF/模板）
- **Week 3 交付**: 一键部署成功（Frigate 实例运行）
- **Week 4 交付**: CI 绿色 + 镜像推送 GHCR + 文档完整

---

## 总结

**总任务数**: 72 个主要任务 + 12 个 DoD 验证 + 18 个全局护栏规则 = **102 个任务**

**测试策略**:
- 🧪 标记任务: **48 个**（需先写测试）
- 单元测试: **~150 个测试用例**
- 集成测试: **~40 个测试用例**
- 端到端测试: **~15 个测试场景**

**宪法合规**:
- ✅ 所有任务符合 6 项宪法原则
- ✅ 测试优先执行顺序
- ✅ 中文优先界面设计
- ✅ CI/CD 自动化推进

**最终交付**:
- ✅ 父容器 Docker 镜像（ghcr.io/SunvidWong/frigate-configuration-ui:stable）
- ✅ 完整的 WebUI（中文界面）
- ✅ 三步向导（硬件 → 摄像头 → 部署）
- ✅ 多实例管理与蓝绿部署
- ✅ 中文文档（README, 用户指南, 错误码对照表）

**下一步**: 从任务 T001 项目初始化开始执行，遵循测试优先纪律。
