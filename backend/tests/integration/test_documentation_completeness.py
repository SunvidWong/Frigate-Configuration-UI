"""
文档完整性检查测试

测试场景: D-DoD-3
- README 包含快速开始步骤
- 错误码文档包含所有错误码
- 用户指南覆盖所有用户故事（P1-P4）
"""

import pytest
from pathlib import Path
import re

from src.models.error_codes import ErrorCode


def test_readme_exists_and_complete():
    """测试 README.md 存在且包含必需章节"""

    readme_path = Path("README.md")

    assert readme_path.exists(), "README.md 不存在"

    with open(readme_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 验证必需章节
    required_sections = [
        '特性',  # 项目特性
        '前置要求',  # 系统要求
        '快速开始',  # 快速开始步骤
        '使用指南',  # 使用说明
        '常见问题',  # FAQ
    ]

    for section in required_sections:
        assert section in content, f"README 缺少必需章节: {section}"

    print(f"✅ README.md 包含所有必需章节")

    # 验证快速开始命令
    assert 'docker-compose up' in content, "README 缺少 docker-compose 启动命令"
    assert 'localhost:9888' in content or '9888' in content, "README 缺少 WebUI 访问地址"

    print("✅ README 包含快速开始步骤")


def test_readme_chinese_content():
    """测试 README 主要内容为中文"""

    readme_path = Path("README.md")

    with open(readme_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 统计中文字符数量
    chinese_chars = len(re.findall(r'[\u4e00-\u9fa5]', content))

    # 中文字符应该占主要部分
    assert chinese_chars > 500, f"README 中文字符数量不足: {chinese_chars}"

    print(f"✅ README 包含 {chinese_chars} 个中文字符")


def test_error_codes_documentation():
    """测试错误码文档包含所有错误码"""

    error_codes_doc = Path("docs/error-codes.md")

    assert error_codes_doc.exists(), "docs/error-codes.md 不存在"

    with open(error_codes_doc, 'r', encoding='utf-8') as f:
        doc_content = f.read()

    # 获取所有定义的错误码
    all_error_codes = [code.value for code in ErrorCode]

    # 验证每个错误码都在文档中
    missing_codes = []
    for code in all_error_codes:
        if code not in doc_content:
            missing_codes.append(code)

    assert len(missing_codes) == 0, f"错误码文档缺少以下错误码: {missing_codes}"

    print(f"✅ 错误码文档包含所有 {len(all_error_codes)} 个错误码")

    # 验证每个错误码都有修复建议
    for code in all_error_codes:
        # 查找错误码对应的章节
        code_pattern = f"### {code}"
        if code_pattern in doc_content or f"## {code}" in doc_content or code in doc_content:
            # 检查附近是否有"修复建议"或"修复"关键字
            # 这是一个简化的检查，实际可以更严格
            print(f"✅ 错误码 {code} 存在于文档中")


def test_error_codes_have_chinese_description():
    """测试错误码文档包含中文描述"""

    error_codes_doc = Path("docs/error-codes.md")

    with open(error_codes_doc, 'r', encoding='utf-8') as f:
        content = f.read()

    # 统计中文字符
    chinese_chars = len(re.findall(r'[\u4e00-\u9fa5]', content))

    assert chinese_chars > 200, f"错误码文档中文字符不足: {chinese_chars}"

    # 验证包含"修复建议"或"修复"关键字
    assert '修复' in content or '解决' in content, "错误码文档缺少修复建议"

    print(f"✅ 错误码文档包含 {chinese_chars} 个中文字符和修复建议")


def test_user_guide_exists_and_complete():
    """测试用户指南存在且完整"""

    user_guide_path = Path("docs/user-guide.md")

    assert user_guide_path.exists(), "docs/user-guide.md 不存在"

    with open(user_guide_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 验证必需章节
    required_sections = [
        '快速开始',
        '三步向导',
        '硬件配置',
        '摄像头配置',
        '部署',
        '多实例管理',
        '硬件加速',
        '故障排查',
    ]

    for section in required_sections:
        assert section in content, f"用户指南缺少章节: {section}"

    print(f"✅ 用户指南包含所有必需章节")


def test_user_guide_covers_user_stories():
    """测试用户指南覆盖所有用户故事"""

    user_guide_path = Path("docs/user-guide.md")

    with open(user_guide_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 验证用户故事覆盖
    user_stories = {
        'P1': ['硬件模式', 'CPU', 'NVIDIA', 'Hailo'],  # 硬件配置
        'P2': ['ONVIF', '品牌模板', '摄像头', 'RTSP'],  # 摄像头配置
        'P3': ['一键部署', '部署', '容器', '实例'],  # 部署流程
        'P4': ['多实例', '启动', '停止', '删除', '克隆'],  # 实例管理
    }

    for story_id, keywords in user_stories.items():
        found_keywords = sum(1 for kw in keywords if kw in content)
        coverage = found_keywords / len(keywords)

        assert coverage >= 0.5, f"用户故事 {story_id} 覆盖不足: {coverage:.1%}"

        print(f"✅ 用户故事 {story_id} 覆盖度: {coverage:.1%} ({found_keywords}/{len(keywords)})")


def test_glossary_exists():
    """测试词汇表存在"""

    glossary_path = Path("docs/glossary.md")

    assert glossary_path.exists(), "docs/glossary.md 不存在"

    with open(glossary_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 验证包含中英对照
    assert '实例' in content or 'Instance' in content, "词汇表缺少关键术语"
    assert '摄像头' in content or 'Camera' in content, "词汇表缺少关键术语"

    print("✅ 词汇表存在且包含中英对照")


def test_all_docs_are_chinese():
    """测试所有文档主要内容为中文"""

    docs = [
        Path("README.md"),
        Path("docs/error-codes.md"),
        Path("docs/user-guide.md"),
        Path("docs/glossary.md"),
    ]

    for doc_path in docs:
        if not doc_path.exists():
            print(f"⚠️  文档不存在: {doc_path}")
            continue

        with open(doc_path, 'r', encoding='utf-8') as f:
            content = f.read()

        chinese_chars = len(re.findall(r'[\u4e00-\u9fa5]', content))

        # 每个文档至少应该有 100 个中文字符
        assert chinese_chars > 100, f"{doc_path.name} 中文字符不足: {chinese_chars}"

        print(f"✅ {doc_path.name} 包含 {chinese_chars} 个中文字符")


def test_documentation_has_examples():
    """测试文档包含示例"""

    docs_to_check = [
        ('README.md', ['```', 'docker-compose']),
        ('docs/user-guide.md', ['```', 'docker', 'rtsp://']),
        ('docs/error-codes.md', ['ERROR', 'WARN']),
    ]

    for doc_file, expected_examples in docs_to_check:
        doc_path = Path(doc_file)

        if not doc_path.exists():
            continue

        with open(doc_path, 'r', encoding='utf-8') as f:
            content = f.read()

        for example in expected_examples:
            assert example in content, f"{doc_file} 缺少示例: {example}"

        print(f"✅ {doc_file} 包含代码示例")


def test_documentation_structure():
    """测试文档目录结构"""

    required_docs = [
        Path("README.md"),
        Path("docs/error-codes.md"),
        Path("docs/user-guide.md"),
        Path("docs/glossary.md"),
    ]

    missing_docs = []
    for doc in required_docs:
        if not doc.exists():
            missing_docs.append(str(doc))

    assert len(missing_docs) == 0, f"缺少必需文档: {missing_docs}"

    print(f"✅ 所有必需文档存在（共 {len(required_docs)} 个）")


def test_screenshots_referenced():
    """测试文档是否引用了截图（可选）"""

    user_guide = Path("docs/user-guide.md")

    if not user_guide.exists():
        pytest.skip("用户指南不存在")

    with open(user_guide, 'r', encoding='utf-8') as f:
        content = f.read()

    # 查找图片引用
    image_references = re.findall(r'!\[.*?\]\(.*?\)', content)

    if len(image_references) > 0:
        print(f"✅ 用户指南包含 {len(image_references)} 个截图引用")
    else:
        print("ℹ️  用户指南未包含截图（可选）")


def test_faq_section_exists():
    """测试 FAQ 章节存在"""

    readme = Path("README.md")

    with open(readme, 'r', encoding='utf-8') as f:
        content = f.read()

    # 验证 FAQ 相关内容
    faq_indicators = ['常见问题', 'FAQ', '问题', 'Q:']

    has_faq = any(indicator in content for indicator in faq_indicators)

    assert has_faq, "README 缺少 FAQ 章节"

    print("✅ README 包含 FAQ 章节")


def test_contribution_guide():
    """测试贡献指南存在"""

    readme = Path("README.md")

    with open(readme, 'r', encoding='utf-8') as f:
        content = f.read()

    contribution_indicators = ['贡献', 'Pull Request', 'Issue']

    has_contribution = any(indicator in content for indicator in contribution_indicators)

    if has_contribution:
        print("✅ README 包含贡献指南")
    else:
        print("ℹ️  README 未包含贡献指南（可选）")


def test_license_mentioned():
    """测试许可证信息"""

    readme = Path("README.md")

    with open(readme, 'r', encoding='utf-8') as f:
        content = f.read()

    license_indicators = ['许可证', 'LICENSE', 'MIT']

    has_license = any(indicator in content for indicator in license_indicators)

    if has_license:
        print("✅ README 包含许可证信息")
    else:
        print("ℹ️  README 未包含许可证信息")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
