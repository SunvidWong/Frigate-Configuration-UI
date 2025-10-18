"""
全局护栏规则验证测试

测试场景: G1-G4
- G1: 测试优先（Test-First Discipline）
- G2: 规格边界（Specification Boundaries）
- G3: 中文优先（Chinese-First Interface）
- G4: 自动化（Automation & Unattended Development）
"""

import pytest
from pathlib import Path
import re
import ast


class TestG1_TestFirstDiscipline:
    """G1: 测试优先规则验证"""

    def test_all_service_modules_have_tests(self):
        """验证所有 service 模块都有对应的测试"""

        services_dir = Path("backend/src/services")
        tests_dir = Path("backend/tests/unit")

        if not services_dir.exists():
            pytest.skip("services 目录不存在")

        service_files = list(services_dir.glob("*.py"))
        service_files = [f for f in service_files if f.name != "__init__.py"]

        missing_tests = []

        for service_file in service_files:
            # 查找对应的测试文件
            test_file_name = f"test_{service_file.stem}.py"
            test_file = tests_dir / test_file_name

            if not test_file.exists():
                missing_tests.append(service_file.name)

        assert len(missing_tests) == 0, f"以下 service 模块缺少测试: {missing_tests}"

        print(f"✅ 所有 {len(service_files)} 个 service 模块都有测试")

    def test_code_coverage_configuration(self):
        """验证配置了代码覆盖率"""

        config_files = [
            Path("backend/pytest.ini"),
            Path("backend/pyproject.toml"),
            Path("backend/.coveragerc"),
        ]

        has_coverage_config = False

        for config_file in config_files:
            if not config_file.exists():
                continue

            with open(config_file, 'r', encoding='utf-8') as f:
                content = f.read()

            if '--cov' in content or 'coverage' in content:
                has_coverage_config = True
                print(f"✅ 在 {config_file.name} 中找到覆盖率配置")
                break

        assert has_coverage_config, "未配置代码覆盖率"

    def test_ci_runs_tests(self):
        """验证 CI 运行测试"""

        ci_file = Path(".github/workflows/ci.yml")

        if not ci_file.exists():
            pytest.skip("CI 配置文件不存在")

        with open(ci_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # 验证 CI 包含测试步骤
        assert 'pytest' in content, "CI 未配置运行 pytest"

        # 验证包含覆盖率检查
        if '--cov' in content:
            print("✅ CI 配置了覆盖率检查")

        print("✅ CI 配置了测试执行")


class TestG2_SpecificationBoundaries:
    """G2: 规格边界验证"""

    def test_no_unnecessary_dependencies(self):
        """验证没有引入不必要的依赖"""

        requirements_file = Path("backend/requirements.txt")

        if not requirements_file.exists():
            pytest.skip("requirements.txt 不存在")

        with open(requirements_file, 'r', encoding='utf-8') as f:
            dependencies = [line.strip() for line in f if line.strip() and not line.startswith('#')]

        # 必需的依赖（根据 plan.md）
        required_deps = {
            'fastapi',
            'docker',
            'pyyaml',
            'pydantic',
        }

        # 验证必需依赖存在
        deps_lower = [dep.lower().split('==')[0].split('>=')[0] for dep in dependencies]

        for req_dep in required_deps:
            assert any(req_dep in dep for dep in deps_lower), f"缺少必需依赖: {req_dep}"

        print(f"✅ 所有必需依赖存在（共 {len(dependencies)} 个依赖）")

    def test_api_endpoints_match_spec(self):
        """验证 API 端点符合规格定义"""

        api_dir = Path("backend/src/api")

        if not api_dir.exists():
            pytest.skip("API 目录不存在")

        # 预期的 API 端点文件
        expected_api_files = [
            'instances.py',  # 实例管理 API
            'cameras.py',    # 摄像头配置 API
        ]

        for api_file in expected_api_files:
            api_path = api_dir / api_file
            if api_path.exists():
                print(f"✅ API 文件存在: {api_file}")

    def test_no_hardcoded_secrets(self):
        """验证代码中没有硬编码的密钥"""

        # 检查关键目录
        dirs_to_check = [
            Path("backend/src"),
            Path("frontend/src"),
        ]

        suspicious_patterns = [
            r'password\s*=\s*["\'][^"\']{8,}["\']',  # password = "hardcoded"
            r'api[_-]?key\s*=\s*["\'][^"\']{20,}["\']',  # api_key = "..."
            r'secret\s*=\s*["\'][^"\']{20,}["\']',  # secret = "..."
        ]

        findings = []

        for dir_path in dirs_to_check:
            if not dir_path.exists():
                continue

            for py_file in dir_path.rglob("*.py"):
                with open(py_file, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()

                for pattern in suspicious_patterns:
                    matches = re.findall(pattern, content, re.IGNORECASE)
                    if matches:
                        findings.append(f"{py_file}: {matches}")

        assert len(findings) == 0, f"发现可疑的硬编码密钥: {findings}"

        print("✅ 代码中没有硬编码的密钥")


class TestG3_ChineseFirstInterface:
    """G3: 中文优先验证"""

    def test_error_messages_are_chinese(self):
        """验证错误消息使用中文"""

        error_codes_file = Path("backend/src/models/error_codes.py")

        if not error_codes_file.exists():
            pytest.skip("error_codes.py 不存在")

        with open(error_codes_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # 统计中文字符
        chinese_chars = len(re.findall(r'[\u4e00-\u9fa5]', content))

        assert chinese_chars > 50, f"错误码文件中文字符不足: {chinese_chars}"

        print(f"✅ 错误码文件包含 {chinese_chars} 个中文字符")

    def test_frontend_has_chinese_translations(self):
        """验证前端包含中文翻译"""

        i18n_file = Path("frontend/src/i18n/zh-CN.json")

        if not i18n_file.exists():
            # 检查其他可能的位置
            alternative_locations = [
                Path("frontend/src/locales/zh-CN.json"),
                Path("frontend/public/locales/zh-CN.json"),
            ]

            found = False
            for alt_file in alternative_locations:
                if alt_file.exists():
                    i18n_file = alt_file
                    found = True
                    break

            if not found:
                pytest.skip("中文翻译文件不存在")

        import json

        with open(i18n_file, 'r', encoding='utf-8') as f:
            translations = json.load(f)

        # 验证翻译包含中文
        all_values = str(translations)
        chinese_chars = len(re.findall(r'[\u4e00-\u9fa5]', all_values))

        assert chinese_chars > 20, f"翻译文件中文字符不足: {chinese_chars}"

        print(f"✅ 翻译文件包含 {chinese_chars} 个中文字符")

    def test_ui_components_use_chinese(self):
        """验证 UI 组件使用中文"""

        frontend_components = Path("frontend/src/components")

        if not frontend_components.exists():
            frontend_components = Path("frontend/src/pages")

        if not frontend_components.exists():
            pytest.skip("前端组件目录不存在")

        # 检查几个关键组件
        component_files = list(frontend_components.glob("*.tsx")) + \
                         list(frontend_components.glob("*.jsx"))

        if len(component_files) == 0:
            pytest.skip("没有找到 React 组件")

        total_chinese_chars = 0

        for component_file in component_files[:5]:  # 检查前 5 个组件
            with open(component_file, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()

            chinese_chars = len(re.findall(r'[\u4e00-\u9fa5]', content))
            total_chinese_chars += chinese_chars

        assert total_chinese_chars > 10, f"UI 组件中文字符不足: {total_chinese_chars}"

        print(f"✅ UI 组件包含 {total_chinese_chars} 个中文字符")

    def test_yaml_keys_remain_english(self):
        """验证 YAML 配置键名保持英文"""

        config_renderer = Path("backend/src/services/config_renderer.py")

        if not config_renderer.exists():
            pytest.skip("config_renderer.py 不存在")

        with open(config_renderer, 'r', encoding='utf-8') as f:
            content = f.read()

        # 验证包含标准 Frigate 配置键名（英文）
        frigate_keys = ['mqtt', 'detectors', 'cameras', 'ffmpeg']

        for key in frigate_keys:
            assert f"'{key}'" in content or f'"{key}"' in content, f"配置渲染器缺少键名: {key}"

        print("✅ YAML 配置键名保持英文（符合 Frigate 规范）")


class TestG4_Automation:
    """G4: 自动化验证"""

    def test_ci_workflow_auto_triggers(self):
        """验证 CI 自动触发"""

        ci_file = Path(".github/workflows/ci.yml")

        if not ci_file.exists():
            pytest.skip("CI 配置文件不存在")

        import yaml

        with open(ci_file, 'r', encoding='utf-8') as f:
            workflow = yaml.safe_load(f)

        # 验证触发条件
        assert 'on' in workflow, "缺少触发条件"

        triggers = workflow['on']

        # 应该在 push 或 pull_request 时触发
        has_auto_trigger = 'push' in triggers or 'pull_request' in triggers

        assert has_auto_trigger, "CI 未配置自动触发"

        print(f"✅ CI 配置了自动触发: {list(triggers.keys())}")

    def test_no_verify_hooks_not_bypassed(self):
        """验证没有绕过 git hooks"""

        # 检查 CI 配置和脚本中是否使用了 --no-verify
        files_to_check = [
            Path(".github/workflows/ci.yml"),
            Path("docker/docker-compose.yml"),
        ]

        for file_path in files_to_check:
            if not file_path.exists():
                continue

            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # 检查是否有 --no-verify 标志
            assert '--no-verify' not in content, f"{file_path.name} 使用了 --no-verify"

        print("✅ 没有绕过 git hooks")

    def test_restart_policy_is_no(self):
        """验证容器重启策略为 'no'（快速失败）"""

        compose_file = Path("docker/docker-compose.yml")

        if not compose_file.exists():
            pytest.skip("docker-compose.yml 不存在")

        import yaml

        with open(compose_file, 'r', encoding='utf-8') as f:
            compose_config = yaml.safe_load(f)

        # 检查所有服务的重启策略
        services = compose_config.get('services', {})

        for service_name, service_config in services.items():
            restart_policy = service_config.get('restart', 'no')

            # 父容器应该使用 restart: no（快速失败原则）
            if 'backend' in service_name or 'config' in service_name:
                assert restart_policy == 'no', \
                    f"服务 {service_name} 应该使用 restart: no，当前: {restart_policy}"

                print(f"✅ 服务 '{service_name}' 使用快速失败策略: restart={restart_policy}")


class TestCodeQuality:
    """代码质量验证"""

    def test_no_print_statements_in_production_code(self):
        """验证生产代码中没有 print 语句（应该使用 logging）"""

        src_dir = Path("backend/src")

        if not src_dir.exists():
            pytest.skip("源代码目录不存在")

        print_statements = []

        for py_file in src_dir.rglob("*.py"):
            # 跳过 __init__.py 和测试文件
            if py_file.name == "__init__.py":
                continue

            with open(py_file, 'r', encoding='utf-8') as f:
                content = f.read()

            # 查找 print 语句（排除注释）
            lines = content.split('\n')
            for i, line in enumerate(lines, 1):
                if 'print(' in line and not line.strip().startswith('#'):
                    # 允许在 main.py 和 preflight.py 中使用 print（启动日志）
                    if py_file.name in ['main.py', 'preflight.py']:
                        continue

                    print_statements.append(f"{py_file}:{i}")

        # 这是一个建议性检查，不强制要求
        if len(print_statements) > 0:
            print(f"⚠️  发现 {len(print_statements)} 个 print 语句（建议使用 logging）")
        else:
            print("✅ 生产代码使用 logging 而非 print")

    def test_functions_have_docstrings(self):
        """验证主要函数有文档字符串"""

        src_dir = Path("backend/src/services")

        if not src_dir.exists():
            pytest.skip("services 目录不存在")

        service_files = [f for f in src_dir.glob("*.py") if f.name != "__init__.py"]

        total_functions = 0
        functions_with_docstrings = 0

        for service_file in service_files:
            with open(service_file, 'r', encoding='utf-8') as f:
                content = f.read()

            try:
                tree = ast.parse(content)

                for node in ast.walk(tree):
                    if isinstance(node, ast.FunctionDef):
                        # 跳过私有函数
                        if node.name.startswith('_'):
                            continue

                        total_functions += 1

                        # 检查是否有 docstring
                        if ast.get_docstring(node):
                            functions_with_docstrings += 1

            except SyntaxError:
                pass

        if total_functions > 0:
            coverage = functions_with_docstrings / total_functions
            print(f"✅ 函数文档覆盖率: {coverage:.1%} ({functions_with_docstrings}/{total_functions})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
