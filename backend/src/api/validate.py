"""验证 API 端点

提供前端使用的各类验证接口
"""
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from src.validators.name_validator import (
    validate_instance_name,
    validate_camera_name,
)

router = APIRouter(prefix="/api/validate", tags=["validation"])


class ValidationResponse(BaseModel):
    """验证响应模型"""
    valid: bool
    error: str | None = None


@router.get("/instance-name", response_model=ValidationResponse)
async def validate_instance_name_endpoint(
    name: str = Query(..., description="实例名称")
):
    """验证实例名称

    根据 FR-009: ^[a-z][a-z0-9-]{2,31}$
    """
    error = validate_instance_name(name)

    return ValidationResponse(
        valid=error is None,
        error=error
    )


@router.get("/camera-name", response_model=ValidationResponse)
async def validate_camera_name_endpoint(
    name: str = Query(..., description="摄像头名称")
):
    """验证摄像头名称

    根据 FR-011: 同实例名称规则
    """
    error = validate_camera_name(name)

    return ValidationResponse(
        valid=error is None,
        error=error
    )
