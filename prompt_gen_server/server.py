#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
提示词生成服务
基于用户输入内容和需求，使用AI生成合适的提示词
"""

import os
import json
import logging
import re
from mcp.server import FastMCP
from mcp import types

from proxy.gpt_service import generate_prompt

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('prompt-gen')

# 环境变量配置
API_KEY = os.environ.get("API_KEY", "")
MODEL = os.environ.get("MODEL", "gpt-4")
API_URL = os.environ.get("API_URL", "https://api.openai.com/v1")

# 提示词保存目录
PROMPT_SAVE_FOLDER = "prompts"

# 创建 FastMCP 实例
mcp_server = FastMCP(name="prompt-gen")

@mcp_server.add_tool
def generate_document(
    purpose: str,
    rules: str,
    language: str,
    project_path: str,
    file_name: str = "",
    model: str = "",
    api_base_url: str = ""
) -> list:
    """
    Generate AI prompt based on user requirements
    
    Args:
        purpose: The purpose of the prompt - what it's intended to do
        rules: Global rules - the overall rules and constraints set by user
        language: The language the prompt should be generated in
        project_path: Project root directory path
        file_name: Optional, file name for generated prompt (without path, with extension), will be generated from title if not provided
        model: Optional, custom OpenAI model to use
        api_base_url: Optional, custom OpenAI API base URL
        
    Returns:
        List: Contains the generated result JSON string
    """
    
    # 验证参数
    if not purpose or not rules or not language or not project_path:
        error_msg = "Purpose, rules, language, and project_path cannot be empty"
        logger.error(error_msg)
        return [
            types.TextContent(
                type="text",
                text=json.dumps({
                    "success": False,
                    "error": error_msg,
                    "prompt": None
                }, ensure_ascii=False)
            )
        ]
    
    # 验证project_path
    if not os.path.exists(project_path):
        error_msg = f"Project path does not exist: {project_path}"
        logger.error(error_msg)
        return [
            types.TextContent(
                type="text",
                text=json.dumps({
                    "success": False,
                    "error": error_msg,
                    "prompt": None
                }, ensure_ascii=False)
            )
        ]
    
    # Create save directory
    prompt_dir = os.path.join(project_path, PROMPT_SAVE_FOLDER)
    if not os.path.exists(prompt_dir):
        os.makedirs(prompt_dir)
        logger.info(f"Created prompt save directory: {prompt_dir}")
        
    try:
        # If a custom model or API URL is provided, update environment variables
        if model:
            os.environ["MODEL"] = model
            logger.info(f"Using custom model: {model}")
        
        if api_base_url:
            os.environ["API_URL"] = api_base_url
            logger.info(f"Using custom API base URL: {api_base_url}")
        
        # 调用GPT服务生成提示词
        prompt_result = generate_prompt(
            purpose=purpose,
            rules=rules,
            language=language
        )
        
        # 提取标题和内容
        prompt_title = prompt_result.get('title', '提示词')
        prompt_content = prompt_result.get('content', '')
        
        # 如果未提供文件名，根据标题生成
        if not file_name:
            # Clean title, replace invalid characters, limit length
            clean_title = re.sub(r'[\\/:*?"<>|]', '_', prompt_title)  # Replace invalid characters
            clean_title = clean_title.replace(' ', '_')  # Replace spaces with underscores
            file_name = f"{clean_title[:50]}.md"  # Limit length and add extension
            logger.info(f"Generated file name from title: {file_name}")
        elif not file_name.endswith('.md'):
            file_name = f"{file_name}.md"
            logger.info(f"File name added extension: {file_name}")
        
        # Save prompt to file
        save_path = os.path.join(prompt_dir, file_name)
        with open(save_path, 'w', encoding='utf-8') as f:
            # Add title and content
            f.write(f"# {prompt_title}\n\n{prompt_content}")
        
        logger.info(f"Prompt saved: {save_path}")
        
        # Return result
        return [
            types.TextContent(
                type="text",
                text=json.dumps({
                    "success": True,
                    "error": None,
                    "message": "I have created the prompt file. You can view and use it in the prompt library.",
                    "prompt": {
                        "path": save_path,
                        "title": prompt_title,
                        "content": prompt_content
                    }
                }, ensure_ascii=False)
            )
        ]
        
    except Exception as e:
        error_msg = f"Failed to generate prompt: {str(e)}"
        logger.error(error_msg)
        return [
            types.TextContent(
                type="text",
                text=json.dumps({
                    "success": False,
                    "error": error_msg,
                    "prompt": None
                }, ensure_ascii=False)
            )
        ]

@mcp_server.add_tool
def use_description() -> list:
    """
    List all available tools and their parameters
    """
    return [
        types.TextContent(
            type="text",
            text=json.dumps({
                "functions": {
                    "generate_document": {
                        "description": "Generate AI prompt based on user requirements",
                        "parameters": {
                            "purpose": "The purpose of the prompt - what it's intended to do",
                            "rules": "Global rules - the overall rules and constraints set by user",
                            "language": "The language the prompt should be generated in",
                            "project_path": "Project root directory path",
                            "file_name": "Optional, file name for generated prompt (without path, with extension)",
                            "model": "Optional, custom OpenAI model to use",
                            "api_base_url": "Optional, custom OpenAI API base URL"
                        }
                    },
                    "use_description": {
                        "description": "List all functions and their parameters",
                        "parameters": {}
                    }
                }
            }, ensure_ascii=False)
        )
    ]

if __name__ == "__main__":
    # Print current configuration
    logger.info(f"Starting prompt generation service...")
    logger.info(f"API key status: {'Set' if API_KEY else 'Not set'}")
    logger.info(f"Using model: {MODEL}")
    logger.info(f"API base URL: {API_URL}")
    mcp_server.run()
