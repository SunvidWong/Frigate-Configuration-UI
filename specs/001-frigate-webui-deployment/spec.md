# Feature Specification: Frigate 配置与部署 WebUI

**Feature Branch**: `001-frigate-webui-deployment`
**Created**: 2025-10-18
**Status**: Draft
**Input**: User description: "Frigate Configuration UI with WebUI-based deployment"

## Clarifications

### Session 2025-10-18

- Q: 当用户克隆实例但未修改实例名称时，系统如何处理名称冲突？ → A: 自动追加后缀（如 `-copy-1`, `-copy-2`），允许克隆继续
- Q: 当 ONVIF 返回的流信息不完整导致主/子配对逻辑失败时，系统如何降级处理？ → A: 提示用户手动选择主/子流，显示可用流列表与已知参数（码率/帧率/编码）

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 基础部署单摄像头实例 (Priority: P1)

初级用户通过 WebUI 完成最基础的 Frigate 实例部署：使用默认硬件模式（CPU），从品牌模板选择摄像头，一键部署单个实例并访问 Frigate 界面。

**Why this priority**: 这是系统的核心价值——降低 Frigate 部署门槛。如果用户无法快速完成基础部署，整个系统失去存在意义。这是最小可行产品（MVP）。

**Independent Test**: 可通过以下步骤独立测试：启动父容器 → 打开 WebUI → 选择品牌模板填写摄像头信息 → 部署 → 访问 Frigate 实例链接，验证能看到实时画面。

**Acceptance Scenarios**:

1. **Given** 用户已通过 docker-compose 启动父容器，**When** 用户在浏览器访问 localhost:9888，**Then** 显示中文 WebUI 欢迎界面与三步向导入口
2. **Given** 用户进入向导步骤 1，**When** 用户保持默认选项（CPU、stable 镜像、UTC 时区），**Then** 系统自动填充默认值并允许进入步骤 2
3. **Given** 用户进入步骤 2，**When** 用户选择"海康威视"品牌并填写摄像头 IP/用户名/密码，**Then** 系统自动生成 RTSP 地址模板（如 rtsp://用户名:密码@IP:554/Streaming/Channels/101）
4. **Given** 用户完成步骤 2，**When** 用户进入步骤 3 并点击"一键部署"，**Then** 系统创建 Frigate 子容器，显示实例链接（如 http://localhost:5200），状态显示为"healthy"
5. **Given** 实例部署成功，**When** 用户点击实例链接，**Then** 打开 Frigate 原生界面，可看到摄像头实时画面与录像回放

---

### User Story 2 - 硬件加速与多摄像头配置 (Priority: P2)

进阶用户在部署时选择硬件加速模式（NVIDIA/Hailo），配置多个摄像头（包括双镜头摄像机），并进行 RTSP 连通性测试，确保配置正确后再部署。

**Why this priority**: 硬件加速与多摄像头是用户扩展监控范围与提升性能的关键需求。双镜头支持是差异化功能，满足高端用户需求。

**Independent Test**: 可独立测试：进入向导步骤 1 选择 NVIDIA 模式（若可用）→ 步骤 2 添加 3 个摄像头（包括 1 个双镜头）→ 启用 RTSP 测试 → 部署后验证所有摄像头画面正常。

**Acceptance Scenarios**:

1. **Given** 宿主机有 NVIDIA GPU 与 Docker Runtime，**When** 用户进入步骤 1 选择"NVIDIA"硬件模式，**Then** 系统检测通过并允许继续
2. **Given** 宿主机无 GPU 但用户选择 NVIDIA，**When** 系统检测硬件不可用，**Then** 显示 [WARN][HW_UNAVAILABLE] 提示并自动降级为 CPU 模式
3. **Given** 用户在步骤 2 添加双镜头摄像头（如 Reolink Duo），**When** 用户启用"ONVIF 扫描"或选择品牌"Reolink Duo"，**Then** 系统自动创建 2 个 camera 配置（<name>-ch1 与 <name>-ch2），主/子码流自动配对
4. **Given** ONVIF 返回的流信息不完整（如缺少分辨率），**When** 主/子配对逻辑失败，**Then** 系统显示可用流列表（含码率/帧率/编码信息）并提示用户手动选择主/子流
5. **Given** 用户配置完 3 个摄像头，**When** 用户启用"RTSP 连通性测试（3–5 秒）"，**Then** 系统逐个测试 RTSP 地址，成功显示"✓"，失败显示 [WARN][RTSP_TEST_FAIL] 并提示可能原因（账号/网络/模板错误）
6. **Given** RTSP 测试部分失败但用户选择继续，**When** 用户点击"一键部署"，**Then** 系统仍允许部署，并在实例状态中标记失败摄像头的连接问题

---

### User Story 3 - 多实例管理与蓝绿部署 (Priority: P3)

运维用户管理多个 Frigate 实例（如前门、后院、车库），支持实例的启动/停止/克隆/删除操作，以及蓝绿式部署（克隆现有实例修改配置后部署，验证无误后删除旧实例）。

**Why this priority**: 多实例管理是企业级用户与高级玩家的需求，但不影响基础用户使用。蓝绿部署提升运维安全性。

**Independent Test**: 可独立测试：部署 2 个实例（前门、后院）→ 停止"前门"实例 → 克隆"后院"实例为"车库"并修改摄像头配置 → 验证 3 个实例端口不冲突。

**Acceptance Scenarios**:

1. **Given** 用户已部署 1 个实例"前门"（端口 5200–5209），**When** 用户创建第 2 个实例"后院"，**Then** 系统自动分配端口块 5210–5219，避免冲突
2. **Given** 用户有 2 个运行中的实例，**When** 用户点击"前门"实例的"停止"按钮，**Then** 该实例状态变为"stopped"，但"后院"实例不受影响继续运行
3. **Given** 用户点击"后院"实例的"克隆"按钮，**When** 用户修改克隆实例名称为"车库"并调整摄像头配置，**Then** 系统创建新实例"车库"，配置继承自"后院"但摄像头地址已更新
4. **Given** 用户有 3 个实例，**When** 用户点击"前门"实例的"删除"按钮并确认，**Then** 该实例容器被删除，端口块 5200–5209 被释放，其他实例不受影响
5. **Given** 用户导出"后院"实例配置，**When** 用户点击"导出配置"，**Then** 下载 YAML 文件，包含完整的 Frigate 配置（cameras、detectors、record 等）
6. **Given** 用户克隆实例"前门"但未修改名称，**When** 系统检测到名称冲突，**Then** 自动追加后缀"-copy-1"创建新实例"前门-copy-1"，再次克隆同名则递增为"-copy-2"

---

### User Story 4 - 故障快速诊断与恢复 (Priority: P4)

用户在部署失败或实例异常时，可通过 WebUI 查看清晰的错误日志（含错误码与修复建议），并根据提示快速修复问题（如修正 RTSP 地址、更换端口、重新挂载 Docker socket）。

**Why this priority**: 故障诊断是用户体验的重要环节，但不影响基础功能。可通过日志聚合与错误码体系逐步完善。

**Independent Test**: 可独立测试：故意不挂载 /var/run/docker.sock 启动父容器 → 查看日志显示 [ERROR][DOCKER_SOCKET] 与修复建议 → 修复后重启验证成功。

**Acceptance Scenarios**:

1. **Given** 父容器启动时未挂载 /var/run/docker.sock，**When** 系统执行预检，**Then** 日志显示"[ERROR][DOCKER_SOCKET] 未挂载 /var/run/docker.sock。请在 docker-compose.yml 中添加 volumes: - /var/run/docker.sock:/var/run/docker.sock"，容器退出
2. **Given** 用户配置实例时选择的端口 5200 已被占用，**When** 用户点击部署，**Then** 显示 [ERROR][PORT_CONFLICT] 提示，建议更换端口或启用自动分配，阻止部署
3. **Given** 用户填写的摄像头名称包含大写字母（如"FrontDoor"），**When** 用户保存配置，**Then** 显示 [ERROR][NAME_INVALID] 提示"摄像头名称必须符合 ^[a-z][a-z0-9-]{2,31}$ 格式"
4. **Given** 实例部署后状态变为"failed"，**When** 用户点击"查看日志"，**Then** 显示 Frigate 容器日志摘要（中文），并高亮错误行（如 RTSP 连接超时）
5. **Given** 用户镜像拉取失败但本地有缓存，**When** 系统检测到本地缓存镜像，**Then** 显示 [WARN][IMAGE_CACHE] 提示"拉取失败，使用本地缓存继续部署"，允许继续

---

### Edge Cases

**注意**: 以下边缘案例已识别但**不在 v1.0 范围内**，将在后续版本中处理：

- **Docker socket 权限不足**: 当挂载了 /var/run/docker.sock 但用户权限不足时，系统如何提示用户修改权限或加入 docker 组？（**v1.1 计划**）
- **ONVIF 扫描超时**: 当网络复杂或摄像头响应慢导致 ONVIF 扫描超时时，系统是否允许用户手动跳过并使用品牌模板？（**部分覆盖**: FR-023 已支持手动跳过，但需增强超时提示）
- **端口块耗尽**: 当用户创建大量实例导致端口从 5200 递增至系统上限（如 65535），系统如何处理？是否提示用户清理未使用实例或自定义端口范围?（**已覆盖**: FR-028 限制最多 100 次尝试）
- **时区与夏令时**: 当用户选择的时区存在夏令时切换时，系统是否正确传递 TZ 环境变量给 Frigate 容器，避免录像时间戳错误？（**已覆盖**: FR-030 传递 TZ 变量，依赖 Frigate 官方处理夏令时）
- **容器网络隔离**: 当用户宿主机有多个 Docker 网络（如自定义 bridge），系统是否允许用户选择网络，或默认使用 bridge？（**v2.0 计划**）
- **配置文件迁移**: 当 Frigate 官方升级配置格式（如从 v0.12 到 v0.13）时，系统如何处理旧配置的兼容性？（**v2.0 计划**）

## Requirements *(mandatory)*

### Functional Requirements

#### 系统启动与预检

- **FR-001**: 父容器启动时，系统 MUST 在 30 秒内检查 /var/run/docker.sock 是否挂载且可访问，失败则输出 [ERROR][DOCKER_SOCKET] 并退出
- **FR-002**: 父容器启动时，系统 MUST 检查 Docker daemon 是否可达（通过 Docker API），失败则输出 [ERROR][DOCKER_DAEMON] 并退出
- **FR-003**: 父容器启动时，系统 MUST 设置 restart 策略为"no"，确保失败时不自动重启（快速失败原则）
- **FR-004**: 系统 MUST 在预检失败时输出中文错误日志，包含错误码、问题描述与修复建议

#### WebUI 界面与交互

- **FR-005**: 系统 MUST 提供中文 WebUI 界面，默认监听 9888 端口（可通过环境变量 WEB_PORT 配置）
- **FR-006**: WebUI MUST 提供三步向导：步骤 1（硬件与镜像）、步骤 2（摄像头配置）、步骤 3（复核与部署）
- **FR-007**: 所有用户可见的文案、提示、错误信息 MUST 使用中文，导出的 Frigate 配置文件键名 MUST 保持英文（不翻译）
- **FR-008**: 系统 MUST 为所有非必填字段提供合理默认值（如时区默认 UTC，镜像默认 stable，录像保留默认 14 天）

#### 硬件与镜像配置（步骤 1）

- **FR-009**: 系统 MUST 提供硬件模式选择：CPU（默认）、NVIDIA、Hailo 8L，三者互斥单选
- **FR-010**: 系统 MUST 通过 Docker API 检测硬件可用性（如 NVIDIA runtime 是否存在），不可用的选项 MUST 被禁用或显示降级提示
- **FR-011**: 当用户选择的硬件模式不可用时，系统 MUST 自动降级为 CPU 模式，并显示 [WARN][HW_UNAVAILABLE] 提示
- **FR-012**: 系统 MUST 提供 Frigate 镜像 tag 选择（stable/latest/自定义），tag 格式 MUST 符合 ^[A-Za-z0-9._-]+$
- **FR-013**: 系统 MUST 优先检查本地是否有指定 tag 的镜像缓存，无缓存时尝试拉取，拉取失败且无缓存则输出 [ERROR][IMAGE_PULL]。如果使用本地缓存，系统 SHOULD 检查镜像创建时间，若超过 30 天则显示 [WARN][IMAGE_CACHE_OLD] 提示用户镜像可能已过期
- **FR-014**: 系统 MUST 提供时区选择（IANA 时区列表），默认 UTC，校验时区名称是否合法

#### 摄像头配置（步骤 2）

- **FR-015**: 系统 MUST 支持通过品牌模板（海康、大华、Reolink Duo 等）或 ONVIF 自动发现配置摄像头
- **FR-016**: 用户选择品牌模板时，系统 MUST 提供预定义的 RTSP 路径模板（如海康 /Streaming/Channels/101）
- **FR-017**: 用户填写摄像头 IP、用户名、密码后，系统 MUST 自动生成完整 RTSP URL（如 rtsp://用户名:密码@IP:554/路径），密码 MUST 进行 URL 编码
- **FR-018**: 系统 MUST 支持双镜头摄像机配置，将 1 台物理摄像机建模为 2 个 Frigate camera（<name>-ch1、<name>-ch2）
- **FR-019**: 对于双镜头摄像机，系统 MUST 自动配对主/子码流（优先级：分辨率 > 码率 > 帧率 > 编码），子流像素比 MUST < 0.6。像素比计算公式：像素比 = (子流宽度 × 子流高度) / (主流宽度 × 主流高度)
- **FR-019a**: 当 ONVIF 返回的流信息不完整导致主/子配对逻辑失败时，系统 MUST 显示可用流列表（包含已知的码率/帧率/编码参数）并提示用户手动选择主/子流
- **FR-020**: 系统 MUST 校验摄像头与实例名称：(a) 格式必须符合 ^[a-z][a-z0-9-]{2,31}$，不符合显示 [ERROR][NAME_INVALID]；(b) 必须唯一，重复显示 [ERROR][NAME_DUP]；(c) 禁止使用保留名称（frigate-config-deploy、frigate），违反显示 [ERROR][NAME_RESERVED]
- **FR-023**: 系统 MUST 提供可选的 RTSP 连通性测试（超时 5 秒），测试失败显示 [WARN][RTSP_TEST_FAIL] 但不阻断部署
- **FR-024**: 当 RTSP 测试失败时，系统 MUST 给出分类型提示（鉴权失败/超时/路径不匹配）

#### 复核与部署（步骤 3）

- **FR-025**: 系统 MUST 在步骤 3 显示配置摘要，包括硬件模式、镜像 tag、摄像头数量、端口映射
- **FR-026**: 用户点击"一键部署"后，系统 MUST 创建 Frigate 子容器（名称 frigate-instance-<name>），数据目录隔离（/data/<instance-name>）
- **FR-027**: 系统 MUST 为每个实例分配独立端口块（大小 10，起始 5200，按实例顺延），默认仅映射 Frigate UI 端口
- **FR-028**: 当端口冲突时，系统 MUST 整体顺延端口块（如 5200–5209 冲突则尝试 5210–5219），最多尝试 100 次。如果 100 次尝试后仍无法找到可用端口块，系统 MUST 输出 [ERROR][PORT_EXHAUSTED] 并终止部署
- **FR-029**: 系统 MUST 根据硬件模式生成对应的 hwaccel_args 配置（如 NVIDIA 使用 preset-nvidia-h264）
- **FR-030**: 系统 MUST 将时区通过 TZ 环境变量传递给 Frigate 容器
- **FR-031**: 部署成功后，系统 MUST 显示实例访问链接（如 http://localhost:5200）与当前状态（starting/healthy/failed）

#### 实例生命周期管理

- **FR-032**: 系统 MUST 支持实例状态查询（created/starting/healthy/failed/stopped/deleted）
- **FR-033**: 系统 MUST 支持实例操作：启动（start）、停止（stop）、重启（restart）、删除（delete）
- **FR-034**: 系统 MUST 支持实例克隆（clone），克隆时继承配置但允许修改摄像头与名称
- **FR-034a**: 当用户克隆实例但未修改实例名称时，系统 MUST 自动追加后缀"-copy-N"（N 从 1 开始，按源实例名称独立递增），确保名称唯一性。例如：克隆"door"两次生成"door-copy-1"和"door-copy-2"
- **FR-035**: 系统 MUST 支持实例配置导出（export），导出格式为 Frigate 标准 YAML 配置文件
- **FR-036**: 删除实例时，系统 MUST 释放对应端口块与数据目录（或提示用户手动清理数据目录）
- **FR-037**: 多实例操作（启动/停止/删除）MUST 互不影响，一个实例失败不应影响其他实例

#### 错误处理与日志

- **FR-038**: 所有错误 MUST 包含错误码（如 [ERROR][DOCKER_SOCKET]）、中文描述、修复建议
- **FR-039**: 系统 MUST 在日志中脱敏敏感信息（摄像头密码显示为 ***，仅保留 IP 与用户名）
- **FR-040**: 实例失败时，系统 MUST 提供日志查询功能，显示 Frigate 容器日志摘要（中文翻译关键错误）

### Key Entities

- **父容器（frigate-config-deploy）**: WebUI 与 API 服务，负责配置渲染、实例管理、Docker socket 交互。属性：监听端口（默认 9888）、Docker socket 路径、数据存储根目录（默认 /data）
- **子容器（frigate-instance-<name>）**: 用户部署的 Frigate 实例，每个实例独立运行。属性：实例名称（唯一）、端口块（起始端口+块大小）、数据目录、状态（created/starting/healthy/failed/stopped/deleted）、配置（YAML）
- **摄像头配置（Camera）**: 用户添加的摄像头，对应 Frigate 配置中的 cameras[] 条目。属性：名称（唯一，符合正则）、RTSP URL（主/子码流）、流角色（detect/record/snapshots）、检测/录像/快照开关、目标类别、区域/遮罩
- **硬件模式（Hardware Mode）**: 用户选择的推理与解码硬件。选项：CPU（默认）、NVIDIA、Hailo 8L。每个模式对应不同的 hwaccel_args 与 detectors 配置
- **端口块（Port Block）**: 为每个实例预留的连续端口范围。属性：起始端口、块大小（默认 10）、分配状态（已占用/空闲）
- **RTSP 模板（RTSP Template）**: 品牌摄像头的预定义 RTSP 路径模板。属性：品牌名称、通道映射（CH1/CH2）、主/子码流路径、端口（默认 554）

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 初级用户可在 5 分钟内完成从启动父容器到部署第一个 Frigate 实例（包括配置 1 个摄像头）
- **SC-002**: 系统支持同时管理至少 10 个 Frigate 实例，端口自动分配无冲突
- **SC-003**: 90% 的常见部署失败场景（Docker socket 未挂载、端口冲突、RTSP 地址错误）可通过日志错误码与修复建议自助解决，无需查阅文档
- **SC-004**: 双镜头摄像机的主/子码流配对准确率达到 95%（基于常见品牌如海康、Reolink Duo 的测试）
- **SC-005**: 硬件加速模式检测准确率 100%（能正确识别 NVIDIA/Hailo 硬件不可用并降级）
- **SC-006**: 所有用户可见文案（UI、提示、日志摘要）100% 使用中文，导出的 YAML 配置键名 100% 保持英文
- **SC-007**: ONVIF 设备发现超时控制在 10 秒内，失败时用户可立即切换到品牌模板，不阻塞流程
- **SC-008**: 实例部署失败时，错误日志 MUST 在 3 秒内显示在 WebUI，包含错误码与至少 1 条修复建议
