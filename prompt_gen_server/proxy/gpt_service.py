#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
GPT服务模块 - 负责与OpenAI API通信，生成提示词
"""

import os
import logging
from openai import OpenAI

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('prompt-gen.gpt_service')

# 环境变量配置
API_KEY = os.environ.get("API_KEY", "")
MODEL = os.environ.get("MODEL", "gpt-4")
API_URL = os.environ.get("API_URL", "https://api.openai.com/v1")

def generate_prompt(
    purpose: str,
    rules: str,
    language: str
) -> dict:
    """
    调用OpenAI API生成提示词
    
    Args:
        purpose: The purpose of the prompt - what it's intended to do
        rules: Global rules - the overall rules and constraints set by user
        language: The language the prompt should be generated in
        
    Returns:
        dict: Dictionary containing the generated prompt content and title
              {"title": prompt_title, "content": prompt_content}
    """
    if not API_KEY:
        logger.warning("API_KEY environment variable is not set")
    
    try:
        # 创建OpenAI客户端，使用环境变量中的配置
        client = OpenAI(
            api_key=API_KEY,
            base_url=API_URL
        )
        
        logger.info(f"Using model: {MODEL}, API base URL: {API_URL}")

        # 构造提示词模板
        prompt = f"""
        You are a professional AI prompt engineer tasked with creating an effective prompt.
        
        Prompt Purpose:
        {purpose}
        
        Global Rules:
        {rules}
        
        Please provide your response in the following JSON format:
        {{
          "title": "A descriptive title for this prompt (3-5 words)",
          "content": "The complete prompt text here"
        }}
        
        Instructions:
        1. Create a well-structured, effective prompt based on the purpose and rules provided.
        2. The prompt should be in {language} language.
        3. The title should be concise but descriptive.
        4. Make sure both the title and content are in {language} language.
        5. IMPORTANT: Return your response only in valid JSON format as specified above, with no additional text.
        """
        
        logger.info("Sending request to OpenAI API...")
        
        # 系统提示词 - 对所有语言保持一致
        system_prompt = "You are an expert AI prompt engineer who creates effective prompts based on user requirements. You can create prompts in multiple languages as requested."
        
        # 调用OpenAI API
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1000,
        )
        
        # 提取生成的提示词（JSON格式）
        response_content = response.choices[0].message.content.strip()
        
        try:
            # 尝试解析JSON响应
            import json
            result = json.loads(response_content)
            
            # 确保结果包含所需字段
            if 'title' not in result or 'content' not in result:
                logger.warning("Response missing required fields, using fallback")
                # 回退：使用前50字符作为标题
                result = {
                    "title": purpose[:50].strip() if len(purpose) > 0 else "Generated Prompt",
                    "content": response_content
                }
        except json.JSONDecodeError:
            logger.warning("Failed to parse JSON response, using fallback")
            # 使用前50字符作为标题
            result = {
                "title": purpose[:50].strip() if len(purpose) > 0 else "Generated Prompt",
                "content": response_content
            }
        
        logger.info(f"Successfully generated prompt: {result['title']}")
        
        return result
    
    except Exception as e:
        logger.error(f"Failed to call GPT service: {str(e)}")
        raise Exception(f"Failed to call GPT service: {str(e)}")
