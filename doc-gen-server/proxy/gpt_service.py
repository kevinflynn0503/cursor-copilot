"""GPT服务模块"""

import os
import requests
import logging
import json
from openai import OpenAI

# 配置
API_KEY = os.environ.get("API_KEY", "")
MODEL = os.environ.get("MODEL", "gpt-4")
API_URL = os.environ.get("API_URL", "https://api.openai.com/v1")

# 配置日志
logger = logging.getLogger(__name__)

def generate_document(title: str, template_content: str, description: str, additional_info: str = "", language: str = "en") -> str:
    """Generate document content
    
    Args:
        title: Document title
        template_content: Template content
        description: User requirements description
        additional_info: Additional information (optional)
        
    Returns:
        str: Generated document content
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

        # Construct prompt with language instruction
        prompt = f"""
        Based on the user's requirements, please generate a professional product development document in {language} language:
        
        Document Title: {title}
        User Requirements: {description}
        
        Additional Information: {additional_info if additional_info else "None"}
        
        Please generate the document according to the template format below, and ensure the document content follows these principles:
        1. Strictly follow the layered structure of requirement documents, keeping clear separation between functional modules
        2. Ensure front-end and back-end separation, clearly distinguish front-end and back-end functions
        3. Database design should consider field definitions, table relationships, and index design
        4. Server-side interfaces should specify request methods, parameters, and return values
        5. Functionality planning should follow modularity and decoupling principles
        
        {template_content}
        
        Notes:
        1. Maintain the template format, filling in the corresponding content
        2. Generated content should be professional, specific, and implementable
        3. If there are diagrams, please use Markdown or Mermaid format
        4. The document should be complete and conform to software engineering development standards
        5. Separate functions according to user needs, ensuring good separation between functions
        6. When planning development, prioritize core functionality before considering peripheral features
        7. IMPORTANT: The entire document MUST be in {language} language
        """

        # System prompt - same for all languages
        system_prompt = "You are an experienced software architect and technical expert, skilled in system design, requirements analysis, and technical documentation. You emphasize modular design, front-end/back-end separation, and function decoupling, capable of producing professional, specific, and implementable technical solutions and development documents."
        
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=4000
        )
        
        document_content = response.choices[0].message.content
        
        # 添加标题
        document_content = f"# {title}\n\n{document_content}"
        
        return document_content
    
    except Exception as e:
        logger.error(f"Failed to call GPT service: {str(e)}")
        raise Exception(f"Failed to call GPT service: {str(e)}")
