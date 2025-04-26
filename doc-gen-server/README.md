# 产品文档生成服务

一个基于MCP（Message Communication Protocol）的产品文档生成服务，可以通过AI生成各种类型的产品文档，并保存到指定目录。本服务可以与多种AI模型和服务提供商集成，包括OpenAI、DeepSeek等。

## 功能特点

- **多种文档模板**：支持8种专业产品文档模板
- **灵活的AI模型配置**：支持配置不同的AI模型和API端点
- **VSCode扩展集成**：与VSCode扩展无缝集成，提供文档管理界面
- **简单易用**：通过MCP协议轻松调用，快速生成高质量文档
- **可定制化**：支持通过参数自定义文档内容和格式
- **本地存储**：所有生成的文档保存在项目的doc目录，易于管理

## 支持的文档类型

- 需求文档
- 用户旅程
- 页面架构
- 数据字段
- PRD分析
- 流程图
- 时序图
- 类图

## 安装与运行

### 1. 准备工作

```bash
# 克隆仓库
git clone https://github.com/yourusername/doc-gen.git
cd doc-gen

# 创建并激活虚拟环境
python3 -m venv doc_env
source doc_env/bin/activate  # Linux/Mac
# 或 doc_env\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt
```

### 2. 启动服务

```bash
# 设置环境变量后启动服务
export API_KEY="你的API密钥"  # Linux/Mac
# 或 set API_KEY=你的API密钥  # Windows
python server.py
```

### 3. 测试服务

服务启动后，可以使用HTTP请求进行测试：

```bash
curl -X POST http://localhost:3000/mcp -H "Content-Type: application/json" -d '{"method":"generate_document","params":{"title":"测试文档","template_type":"需求文档","description":"这是一个测试文档","file_name":"test_doc.md","project_path":"/项目路径"}}'
```

## 配置说明

### 配置方式

有三种方式可以配置AI模型和API端点：

1. **环境变量配置**：直接在启动服务前设置环境变量
2. **MCP配置文件配置**：在MCP配置文件中设置环境变量
3. **API参数配置**：在调用API时通过参数指定

### 可配置项

| 配置项 | 环境变量 | 说明 | 默认值 |
|---------|------------|------|--------|
| API密钥 | `API_KEY` | 用于调用AI服务的API密钥 | 无 |
| AI模型 | `MODEL` | 要使用的AI模型名称 | `gpt-4` |
| API基础URL | `API_URL` | AI服务的API基础URL | `https://api.openai.com/v1` |
| 模板目录 | `TEMPLATES_DIR` | 文档模板的存放目录 | `./templates` |
| 文档保存目录 | `DOC_SAVE_FOLDER` | 生成文档的保存目录 | `doc` |

## MCP配置说明

### 1. MCP配置文件示例

在VSCode或Cursor等支持MCP协议的IDE中，需要配置mcp_config.json文件，以使用此服务。以下是一个配置示例：

```json
{
  "mcpServers": {
    "doc-gen": {
      "command": "/路径/到/doc_env/bin/python",
      "args": [
        "/路径/到/doc-gen/server.py"
      ],
      "env": {
        "API_KEY": "您的API密钥",
        "MODEL": "gpt-4",
        "API_URL": "https://api.openai.com/v1"
      },
      "cwd": "/路径/到/doc-gen"
    }
  }
}
```

### 2. 非OpenAI服务配置示例

例如，要使用DeepSeek的API，可以这样配置：

```json
{
  "mcpServers": {
    "doc-gen": {
      "command": "/路径/到/doc_env/bin/python",
      "args": [
        "/路径/到/doc-gen/server.py"
      ],
      "env": {
        "API_KEY": "您的DeepSeek API密钥",
        "MODEL": "deepseek-ai/DeepSeek-R1",
        "API_URL": "https://api.deepseek.com/v1"
      },
      "cwd": "/路径/到/doc-gen"
    }
  }
}
```

## 调用参数说明

除了通过环境变量和MCP配置文件进行配置外，还可以在调用API时通过参数指定模型和API基础URL。

### 可用的调用参数

| 参数名 | 是否必填 | 说明 |
|---------|------------|------|
| `title` | 是 | 文档标题 |
| `template_type` | 是 | 文档模板类型，如“需求文档”、“用户旅程”等 |
| `description` | 是 | 对产品或功能的描述，AI将基于此生成文档 |
| `file_name` | 是 | 生成文档的文件名（带后缀） |
| `project_path` | 是 | 项目根目录路径 |
| `additional_info` | 否 | 额外的信息或要求 |
| `model` | 否 | 要使用的AI模型名称，会覆盖环境变量中的设置 |
| `api_base_url` | 否 | 要使用的API基础URL，会覆盖环境变量中的设置 |

### 调用示例

```json
{
  "method": "generate_document",
  "params": {
    "title": "用户登录功能需求文档",
    "template_type": "需求文档",
    "description": "实现用户通过手机号和验证码登录系统",
    "file_name": "user_login_prd.md",
    "project_path": "/项目路径",
    "additional_info": "需要支持多种登录方式，包括手机号、邮箱和第三方登录",
    "model": "gpt-4",
    "api_base_url": "https://api.openai.com/v1"
  }
}
```

## VSCode扩展方式使用

在使用VSCode扩展方式时，可以通过扩展的左侧视图来管理和查看生成的文档。

1. 点击“创建产品文档”按钮可以生成一个空白的文档模板
2. 点击“刷新产品文档”按钮可以刷新文档列表
3. 点击文档名称可以直接打开查看和编辑

## 一键生成示例

以下是一个简单的Shell脚本，用于生成产品需求文档：

```bash
#!/bin/bash

# 配置参数
TITLE="新功能需求文档"
TEMPLATE_TYPE="需求文档"
DESCRIPTION="开发一个新的用户管理功能，包括用户注册、登录、个人资料管理等"
FILE_NAME="user_management_prd.md"
PROJECT_PATH="$(pwd)"

# 发送请求
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d "{
    \"method\": \"generate_document\",
    \"params\": {
      \"title\": \"$TITLE\",
      \"template_type\": \"$TEMPLATE_TYPE\",
      \"description\": \"$DESCRIPTION\",
      \"file_name\": \"$FILE_NAME\",
      \"project_path\": \"$PROJECT_PATH\"
    }
  }"

echo "文档已生成：$PROJECT_PATH/doc/$FILE_NAME"
```

## 贡献指南

欢迎提交Issue和Pull Request来完善此项目。
