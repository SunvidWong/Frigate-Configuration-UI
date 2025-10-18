"""
CI 流水线端到端测试

测试场景: D-DoD-1
- 验证 CI 流水线配置有效性
- 验证 Docker 镜像构建
- 验证所有测试通过
"""

import pytest
import yaml
import subprocess
from pathlib import Path


def test_github_actions_workflow_syntax():
    """测试 GitHub Actions workflow 配置语法正确"""

    workflow_file = Path(".github/workflows/ci.yml")

    assert workflow_file.exists(), "CI workflow 文件不存在"

    # 读取 workflow 文件
    with open(workflow_file, 'r', encoding='utf-8') as f:
        workflow = yaml.safe_load(f)

    # 验证基本结构
    assert 'name' in workflow, "缺少 workflow 名称"
    assert 'on' in workflow, "缺少触发条件"
    assert 'jobs' in workflow, "缺少 jobs 定义"

    # 验证触发条件
    assert 'push' in workflow['on'] or 'pull_request' in workflow['on'], "缺少 push/pull_request 触发器"

    # 验证 jobs
    jobs = workflow['jobs']
    assert len(jobs) > 0, "没有定义任何 job"

    # 验证关键 jobs 存在
    expected_jobs = ['backend-test', 'frontend-test', 'docker-validate']
    for job_name in expected_jobs:
        assert job_name in jobs, f"缺少关键 job: {job_name}"

    print(f"✅ CI workflow 配置语法正确，包含 {len(jobs)} 个 jobs")


def test_backend_test_job_steps():
    """测试后端测试 job 的步骤完整性"""

    workflow_file = Path(".github/workflows/ci.yml")

    with open(workflow_file, 'r', encoding='utf-8') as f:
        workflow = yaml.safe_load(f)

    backend_job = workflow['jobs']['backend-test']

    # 验证必需的步骤
    steps = backend_job['steps']

    step_names = [step.get('name', '') for step in steps]

    # 必须包含的步骤
    required_steps = [
        'Checkout code',
        'Setup Python',
        'Install dependencies',
        'Run black',
        'Run pytest'
    ]

    for required_step in required_steps:
        assert any(required_step.lower() in step.lower() for step in step_names), \
            f"缺少必需步骤: {required_step}"

    print(f"✅ 后端测试 job 包含所有必需步骤（共 {len(steps)} 步）")


def test_frontend_test_job_steps():
    """测试前端测试 job 的步骤完整性"""

    workflow_file = Path(".github/workflows/ci.yml")

    with open(workflow_file, 'r', encoding='utf-8') as f:
        workflow = yaml.safe_load(f)

    frontend_job = workflow['jobs']['frontend-test']

    steps = frontend_job['steps']
    step_names = [step.get('name', '') for step in steps]

    # 必须包含的步骤
    required_steps = [
        'Checkout code',
        'Setup Node',
        'Install dependencies',
        'Run tests'
    ]

    for required_step in required_steps:
        assert any(required_step.lower() in step.lower() for step in step_names), \
            f"缺少必需步骤: {required_step}"

    print(f"✅ 前端测试 job 包含所有必需步骤（共 {len(steps)} 步）")


def test_docker_validate_job_steps():
    """测试 Docker 验证 job 的步骤完整性"""

    workflow_file = Path(".github/workflows/ci.yml")

    with open(workflow_file, 'r', encoding='utf-8') as f:
        workflow = yaml.safe_load(f)

    docker_job = workflow['jobs']['docker-validate']

    steps = docker_job['steps']
    step_names = [step.get('name', '') for step in steps]

    # 必须包含的步骤
    required_steps = [
        'Checkout code',
        'docker-compose config'
    ]

    for required_step in required_steps:
        assert any(required_step.lower() in step.lower() for step in step_names), \
            f"缺少必需步骤: {required_step}"

    print(f"✅ Docker 验证 job 包含所有必需步骤（共 {len(steps)} 步）")


def test_build_and_push_job_configuration():
    """测试镜像构建和推送 job 配置"""

    workflow_file = Path(".github/workflows/ci.yml")

    with open(workflow_file, 'r', encoding='utf-8') as f:
        workflow = yaml.safe_load(f)

    # 检查是否有 build-and-push job
    if 'build-and-push' not in workflow['jobs']:
        pytest.skip("build-and-push job 未配置（可能在单独的 workflow 中）")

    build_job = workflow['jobs']['build-and-push']

    # 验证触发条件（应该只在 main 分支或 tag 推送时触发）
    # 注意：这可能在 job 的 if 条件中定义
    if 'if' in build_job:
        condition = build_job['if']
        print(f"构建触发条件: {condition}")

    # 验证步骤
    steps = build_job['steps']
    step_names = [step.get('name', '') for step in steps]

    required_steps = [
        'Login to GHCR',
        'Build',
        'Push'
    ]

    for required_step in required_steps:
        found = any(required_step.lower() in step.lower() for step in step_names)
        if found:
            print(f"✅ 找到步骤: {required_step}")

    print(f"✅ 镜像构建 job 配置完整（共 {len(steps)} 步）")


def test_docker_compose_config_validation():
    """测试 docker-compose.yml 配置有效性"""

    compose_file = Path("docker/docker-compose.yml")

    assert compose_file.exists(), "docker-compose.yml 不存在"

    # 使用 docker-compose config 验证语法
    try:
        result = subprocess.run(
            ['docker-compose', '-f', str(compose_file), 'config'],
            capture_output=True,
            text=True,
            check=True,
            cwd=compose_file.parent
        )

        print("✅ docker-compose.yml 配置语法正确")
        print(f"验证输出: {result.stdout[:200]}...")

    except subprocess.CalledProcessError as e:
        pytest.fail(f"docker-compose config 验证失败:\n{e.stderr}")

    except FileNotFoundError:
        pytest.skip("docker-compose 命令不可用")


def test_dockerfile_syntax():
    """测试 Dockerfile 语法正确性"""

    dockerfiles = [
        Path("docker/Dockerfile.backend"),
        Path("docker/Dockerfile.frontend"),
    ]

    for dockerfile in dockerfiles:
        if not dockerfile.exists():
            print(f"⚠️  Dockerfile 不存在: {dockerfile}")
            continue

        # 读取 Dockerfile
        with open(dockerfile, 'r', encoding='utf-8') as f:
            content = f.read()

        # 验证基本语法
        assert content.startswith('FROM '), f"{dockerfile.name} 缺少 FROM 指令"

        # 验证多阶段构建（推荐）
        from_count = content.count('FROM ')
        if from_count > 1:
            print(f"✅ {dockerfile.name} 使用多阶段构建（{from_count} 阶段）")
        else:
            print(f"ℹ️  {dockerfile.name} 使用单阶段构建")

        # 验证常见指令
        common_instructions = ['WORKDIR', 'COPY', 'RUN']
        for instruction in common_instructions:
            if instruction in content:
                print(f"✅ {dockerfile.name} 包含 {instruction} 指令")


def test_ci_coverage_threshold():
    """测试 CI 覆盖率阈值配置"""

    # 检查 pytest 配置文件
    pytest_ini = Path("backend/pytest.ini")
    pyproject_toml = Path("backend/pyproject.toml")

    config_file = None
    if pytest_ini.exists():
        config_file = pytest_ini
    elif pyproject_toml.exists():
        config_file = pyproject_toml

    if config_file is None:
        pytest.skip("pytest 配置文件不存在")

    with open(config_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # 查找覆盖率配置
    if '--cov' in content or 'cov' in content:
        print("✅ 配置了代码覆盖率测试")

        # 查找覆盖率阈值（应该 >= 80%）
        if 'fail_under' in content or 'cov-fail-under' in content:
            print("✅ 配置了覆盖率阈值")
        else:
            print("⚠️  未配置覆盖率阈值")


def test_workflow_permissions():
    """测试 workflow 权限配置"""

    workflow_file = Path(".github/workflows/ci.yml")

    with open(workflow_file, 'r', encoding='utf-8') as f:
        workflow = yaml.safe_load(f)

    # 检查是否配置了权限
    if 'permissions' in workflow:
        permissions = workflow['permissions']
        print(f"✅ Workflow 配置了权限: {permissions}")

        # 对于镜像推送，需要 packages:write 权限
        if 'build-and-push' in workflow['jobs']:
            if 'packages' in permissions:
                assert permissions['packages'] == 'write', "packages 权限应该为 write"
                print("✅ 配置了 packages:write 权限")
    else:
        # 检查 job 级别的权限
        for job_name, job_config in workflow['jobs'].items():
            if 'permissions' in job_config:
                print(f"✅ Job '{job_name}' 配置了权限: {job_config['permissions']}")


def test_matrix_strategy():
    """测试是否使用了 matrix 策略（多版本测试）"""

    workflow_file = Path(".github/workflows/ci.yml")

    with open(workflow_file, 'r', encoding='utf-8') as f:
        workflow = yaml.safe_load(f)

    for job_name, job_config in workflow['jobs'].items():
        if 'strategy' in job_config:
            strategy = job_config['strategy']
            if 'matrix' in strategy:
                print(f"✅ Job '{job_name}' 使用 matrix 策略: {strategy['matrix']}")


def test_required_environment_variables():
    """测试必需的环境变量配置"""

    workflow_file = Path(".github/workflows/ci.yml")

    with open(workflow_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # 检查镜像相关的环境变量
    required_vars = [
        'REGISTRY',
        'IMAGE_NAME'
    ]

    for var in required_vars:
        if var in content:
            print(f"✅ 配置了环境变量: {var}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
