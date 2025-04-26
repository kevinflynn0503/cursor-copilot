import os
import logging
from sys import stdin, stdout
import json
import requests
from fastmcp import FastMCP
import mcp.types as types
from proxy.gpt_service import generate_document
from pathlib import Path

# 配置
TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "templates")
DOC_SAVE_FOLDER = "doc"  # 相对于项目根目录的路径

# 从环境变量中获取配置
API_KEY = os.environ.get("API_KEY", "")
MODEL = os.environ.get("MODEL", "gpt-4")
API_URL = os.environ.get("API_URL", "https://api.openai.com/v1")

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# stdin和stdout配置
stdin.reconfigure(encoding='utf-8')
stdout.reconfigure(encoding='utf-8')

# 创建FastMCP实例
mcp = FastMCP("doc-gen")

@mcp.tool("use_description")
async def list_tools():
    """列出所有可用的工具及其参数"""
    return {
        "tools": [
            {
                "name": "Generate document",
                "description": "Generate document based on user requirements and select template",
                "parameters": {
                    "title": {
                        "type": "string",
                        "description": "Document title",
                        "required": True
                    },
                    "template_type": {
                        "type": "string",
                        "description": "Document template type (requirement_doc/function_list/development_architecture/frontend_features/backend_features/database_design/server_api/api_dependencies/plugin_dependencies/development_plan/feature_document)",
                        "required": True
                    },
                    "description": {
                        "type": "string",
                        "description": "A simple description of the product or feature, AI will generate the document based on this description",
                        "required": True
                    },
                    "file_name": {
                        "type": "string",
                        "description": "File name for generated document (without path, with extension)",
                        "required": True
                    },
                    "project_path": {
                        "type": "string",
                        "description": "Project root directory path (required)",
                        "required": True
                    },
                    "additional_info": {
                        "type": "string",
                        "description": "Additional information or requirements (optional)",
                        "required": False
                    },
                    "model": {
                        "type": "string",
                        "description": "AI model name (optional, default to configured model)",
                        "required": False
                    },
                    "api_base_url": {
                        "type": "string",
                        "description": "API base URL (optional, default to configured URL)",
                        "required": False
                    },
                    "language": {
                        "type": "string",
                        "description": "Document language (e.g., en, zh, ja, etc.)",
                        "required": False
                    }
                }
            }
        ]
    }

@mcp.tool("generate_document")
async def create_document(title: str, template_type: str, description: str, file_name: str, project_path: str, additional_info: str = "", model: str = None, api_base_url: str = None, language: str = "en") -> list[types.TextContent]:
    """Generate product document
    
    Args:
        title: Document title
        template_type: Document template type (requirement_doc/function_list/development_architecture/frontend_features/backend_features/database_design/server_api/api_dependencies/plugin_dependencies/development_plan/feature_document)
        description: A simple description of the product or feature, AI will generate the document based on this description
        file_name: File name for generated document (without path, with extension)
        project_path: Project root directory path
        additional_info: Additional information or requirements (optional)
        language: Document language (e.g., en, zh, ja, etc.)
        
    Returns:
        List: List of TextContent objects containing the generated document
    """
    logger.info(f"Received document generation request: {title} - {template_type}")
    
    # Validate parameters
    if not title or not template_type or not description:
        error_msg = "Title, template type, and description cannot be empty"
        logger.error(error_msg)
        return [
            types.TextContent(
                type="text",
                text=json.dumps({
                    "success": False,
                    "error": error_msg,
                    "document": None
                }, ensure_ascii=False)
            )
        ]
    
    # 验证project_path
    if not project_path or not os.path.exists(project_path):
        error_msg = f"Project path does not exist: {project_path}"
        logger.error(error_msg)
        return [
            types.TextContent(
                type="text",
                text=json.dumps({
                    "success": False,
                    "error": error_msg,
                    "document": None
                }, ensure_ascii=False)
            )
        ]
    
    # Create save directory
    doc_dir = os.path.join(project_path, DOC_SAVE_FOLDER)
    if not os.path.exists(doc_dir):
        os.makedirs(doc_dir)
        logger.info(f"Created document save directory: {doc_dir}")
    
    # Check file name
    if not os.path.splitext(file_name)[1]:
        file_name = f"{file_name}.md"
        logger.info(f"File name does not have an extension, using default extension: {file_name}")
    
    # 获取模板类型对应的模板文件
    template_map = {
        # 新文档架构模板
        "requirement_doc": "requirement_doc.md",
        "function_list": "function_list.md",
        "development_architecture": "development_architecture.md",
        "frontend_features": "frontend_features.md",
        "backend_features": "backend_features.md",
        "database_design": "database_design.md",
        "server_api": "server_api.md",
        "api_dependencies": "api_dependencies.md",
        "plugin_dependencies": "plugin_dependencies.md",
        "development_plan": "development_plan.md",
        "feature_document": "feature_document.md"
    }
    
    template_file = template_map.get(template_type)
    if not template_file:
        error_msg = f"Unsupported template type: {template_type}"
        logger.error(error_msg)
        return [
            types.TextContent(
                type="text",
                text=json.dumps({
                    "success": False,
                    "error": error_msg,
                    "document": None
                }, ensure_ascii=False)
            )
        ]
    
    template_path = os.path.join(TEMPLATES_DIR, template_file)
    
    try:
        # Check if template file exists, create default template if not
        if not os.path.exists(template_path):
            logger.warning(f"Template file does not exist: {template_path}, using default template")
            # Here you can add logic to create a default template based on template_type
            # For simplicity, skipping this step for now
            error_msg = f"Template file does not exist: {template_file}"
            return [
                types.TextContent(
                    type="text",
                    text=json.dumps({
                        "success": False,
                        "error": error_msg,
                        "document": None
                    }, ensure_ascii=False)
                )
            ]
        
        # 读取模板内容
        with open(template_path, 'r', encoding='utf-8') as f:
            template_content = f.read()
        
        # If provided model or API URL, update environment variables
        if model:
            os.environ["MODEL"] = model
            logger.info(f"Using custom model: {model}")
        
        if api_base_url:
            os.environ["API_URL"] = api_base_url
            logger.info(f"Using custom API base URL: {api_base_url}")
        
        # 调用GPT服务生成文档
        document_content = generate_document(
            title=title,
            template_content=template_content,
            description=description,
            additional_info=additional_info,
            language=language
        )
        
        # 保存文档
        save_path = os.path.join(doc_dir, file_name)
        with open(save_path, 'w', encoding='utf-8') as f:
            f.write(document_content)
        
        logger.info(f"Document saved: {save_path}")
        
        # Return result
        return [
            types.TextContent(
                type="text",
                text=json.dumps({
                    "success": True,
                    "error": None,
                    "message": "I have created the document file. You don't need to create it again, but instead check if other documents need to be created and call the MCP service again.",
                    "document": {
                        "path": save_path,
                        "title": title,
                        "template_type": template_type
                    }
                }, ensure_ascii=False)
            )
        ]
        
    except Exception as e:
        error_msg = f"Failed to generate document: {str(e)}"
        logger.error(error_msg)
        return [
            types.TextContent(
                type="text",
                text=json.dumps({
                    "success": False,
                    "error": error_msg,
                    "document": None
                }, ensure_ascii=False)
            )
        ]

if __name__ == "__main__":
    # Print current configuration
    logger.info(f"Starting product document generation service...")
    logger.info(f"API key status: {'Set' if API_KEY else 'Not set'}")
    logger.info(f"Using model: {MODEL}")
    logger.info(f"API base URL: {API_URL}")
    mcp.run()
