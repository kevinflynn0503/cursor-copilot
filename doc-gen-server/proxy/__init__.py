"""
产品文档生成AI代理模块

提供与AI服务交互和文档生成的功能
"""

from .gpt_service import generate_document

__version__ = "0.1.0"

__all__ = [
    "generate_document"
]
