# VSCode AI助手扩展

[![Version](https://img.shields.io/visual-studio-marketplace/v/cursor-coplit.cursor-copilot)](https://marketplace.visualstudio.com/items?itemName=cursor-coplit.cursor-copilot)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/cursor-coplit.cursor-copilot)](https://marketplace.visualstudio.com/items?itemName=cursor-coplit.cursor-copilot)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/cursor-coplit.cursor-copilot)](https://marketplace.visualstudio.com/items?itemName=cursor-coplit.cursor-copilot&ssr=false#review-details)
[![GitHub](https://img.shields.io/github/license/kevinflynn0503/cursor-copilot)](https://github.com/kevinflynn0503/cursor-copilot/blob/main/LICENSE)

## 介绍

这是一个VSCode扩展，提供了强大的AI辅助功能，可以帮助开发者生成文档、管理提示词，提高开发效率。该扩展集成了多种实用功能，能够满足文档管理和AI提示词管理的需求。

## 安装

您可以通过以下方式安装扩展：

- 在VS Code扩展市场中搜索 "Cursor Copilot"
- [直接访问VS Code市场页面](https://marketplace.visualstudio.com/items?itemName=cursor-coplit.cursor-copilot)
- 或者使用VS Code Quick Open (Ctrl+P)，输入以下命令：
  ```
  ext install cursor-coplit.cursor-copilot
  ```

## 功能

### 文档管理

扩展提供了一个完整的文档树视图，用于管理和查看项目中的文档文件。

- **文档浏览**：在VSCode侧边栏中浏览项目的文档结构
- **文档预览**：直接在编辑器中查看Markdown文档
- **拖放支持**：通过拖放操作轻松移动和组织文档
- **自动刷新**：文档变更时自动刷新文档树

### 提示词管理

扩展提供了一个提示词库，用于管理和使用AI提示词。

- **提示词浏览**：在VSCode侧边栏中浏览提示词库
- **提示词创建**：创建新的提示词并保存到库中
- **提示词编辑**：修改已有提示词内容
- **提示词组织**：支持创建文件夹来组织提示词
- **快速复制**：一键复制提示词内容

### AI文档生成

使用AI能力生成各种类型的项目文档。

- **多种文档模板**：支持需求文档、功能列表、开发架构等多种模板
- **自定义生成**：根据简短描述自动生成完整文档
- **多语言支持**：支持生成不同语言的文档

### AI提示词生成

通过AI帮助创建有效的提示词。

- **智能生成**：根据用户需求自动生成优化的提示词
- **规则支持**：允许设置全局规则约束生成结果
- **多语言支持**：支持生成不同语言的提示词

## MCP服务

扩展集成了两个MCP（Managed Command Prompt）服务，提供文档生成和提示词生成能力。

### 文档生成服务 (doc-gen)

#### 配置信息

```json
"doc-gen": {
  "command": "/path/to/python",
  "args": [
    "/path/to/vscode-extension/doc-gen-server/server.py"
  ],
  "env": {
    "API_KEY": "your-api-key",
    "MODEL": "model-name",
    "API_URL": "https://api.example.com/v1"
  },
  "cwd": "/path/to/vscode-extension/doc-gen-server"
}
```

#### 安装依赖

1. 创建Python虚拟环境：
   ```bash
   cd doc-gen-server
   python -m venv doc_env
   source doc_env/bin/activate  # 在Windows上使用: doc_env\Scripts\activate
   pip install -r requirements.txt
   ```

#### 功能能力

文档生成服务可以生成以下类型的文档：
- 需求文档 (requirement_doc)
- 功能列表 (function_list)
- 开发架构 (development_architecture)
- 前端功能 (frontend_features)
- 后端功能 (backend_features)
- 数据库设计 (database_design)
- 服务器API (server_api)
- API依赖 (api_dependencies)
- 插件依赖 (plugin_dependencies)
- 开发计划 (development_plan)
- 功能文档 (feature_document)

### 提示词生成服务 (prompt-gen)

#### 配置信息

```json
"prompt-gen": {
  "command": "/path/to/python",
  "args": [
    "/path/to/vscode-extension/prompt_gen_server/server.py"
  ],
  "env": {
    "API_KEY": "your-api-key",
    "MODEL": "model-name",
    "API_URL": "https://api.example.com/v1"
  },
  "cwd": "/path/to/vscode-extension/prompt_gen_server"
}
```

#### 安装依赖

1. 创建Python虚拟环境：
   ```bash
   cd prompt_gen_server
   python -m venv prompt_env
   source prompt_env/bin/activate  # 在Windows上使用: prompt_env\Scripts\activate
   pip install -r requirements.txt
   ```

#### 功能能力

提示词生成服务可以基于以下信息生成提示词：
- 目的：提示词的用途
- 规则：全局规则和约束
- 语言：生成的提示词语言

生成的提示词将保存在项目的`prompts`目录中，并在提示词库中显示。

# VSCode AI Assistant Extension

## Introduction

This is a VSCode extension that provides powerful AI assistant features to help developers generate documentation, manage prompts, and improve development efficiency. The extension integrates multiple useful features to meet document management and AI prompt management needs.

## Features

### Document Management

The extension provides a complete document tree view for managing and viewing document files in your project.

- **Document Browsing**: Browse the document structure in the VSCode sidebar
- **Document Preview**: View Markdown documents directly in the editor
- **Drag and Drop Support**: Easily move and organize documents with drag and drop operations
- **Automatic Refresh**: Document tree refreshes automatically when documents change

### Prompt Management

The extension provides a prompt library for managing and using AI prompts.

- **Prompt Browsing**: Browse the prompt library in the VSCode sidebar
- **Prompt Creation**: Create new prompts and save them to the library
- **Prompt Editing**: Modify existing prompt content
- **Prompt Organization**: Support for creating folders to organize prompts
- **Quick Copy**: Copy prompt content with a single click

### AI Document Generation

Use AI capabilities to generate various types of project documents.

- **Multiple Document Templates**: Support for requirement documents, function lists, development architecture, and more
- **Custom Generation**: Automatically generate complete documents based on brief descriptions
- **Multi-language Support**: Support for generating documents in different languages

### AI Prompt Generation

Let AI help create effective prompts.

- **Intelligent Generation**: Automatically generate optimized prompts based on user requirements
- **Rule Support**: Set global rules to constrain generation results
- **Multi-language Support**: Support for generating prompts in different languages

## MCP Services

The extension integrates two MCP (Managed Command Prompt) services that provide document generation and prompt generation capabilities.

### Document Generation Service (doc-gen)

#### Configuration

```json
"doc-gen": {
  "command": "/path/to/python",
  "args": [
    "/path/to/vscode-extension/doc-gen-server/server.py"
  ],
  "env": {
    "API_KEY": "your-api-key",
    "MODEL": "model-name",
    "API_URL": "https://api.example.com/v1"
  },
  "cwd": "/path/to/vscode-extension/doc-gen-server"
}
```

#### Installing Dependencies

1. Create a Python virtual environment:
   ```bash
   cd doc-gen-server
   python -m venv doc_env
   source doc_env/bin/activate  # On Windows use: doc_env\Scripts\activate
   pip install -r requirements.txt
   ```

#### Capabilities

The document generation service can generate the following types of documents:
- Requirement Document (requirement_doc)
- Function List (function_list)
- Development Architecture (development_architecture)
- Frontend Features (frontend_features)
- Backend Features (backend_features)
- Database Design (database_design)
- Server API (server_api)
- API Dependencies (api_dependencies)
- Plugin Dependencies (plugin_dependencies)
- Development Plan (development_plan)
- Feature Document (feature_document)

### Prompt Generation Service (prompt-gen)

#### Configuration

```json
"prompt-gen": {
  "command": "/path/to/python",
  "args": [
    "/path/to/vscode-extension/prompt_gen_server/server.py"
  ],
  "env": {
    "API_KEY": "your-api-key",
    "MODEL": "model-name",
    "API_URL": "https://api.example.com/v1"
  },
  "cwd": "/path/to/vscode-extension/prompt_gen_server"
}
```

#### Installing Dependencies

1. Create a Python virtual environment:
   ```bash
   cd prompt_gen_server
   python -m venv prompt_env
   source prompt_env/bin/activate  # On Windows use: prompt_env\Scripts\activate
   pip install -r requirements.txt
   ```

#### Capabilities

The prompt generation service can generate prompts based on the following information:
- Purpose: The purpose of the prompt
- Rules: Global rules and constraints
- Language: The language of the generated prompt

Generated prompts will be saved in the project's `prompts` directory and displayed in the prompt library.
