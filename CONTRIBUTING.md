# 贡献指南

感谢您对Cursor Copilot扩展的关注！我们欢迎各种形式的贡献，包括功能请求、bug报告、文档改进或代码贡献。

## 如何贡献

### 报告问题

如果您发现了bug或有功能建议，请通过以下步骤提交issue：

1. 检查是否已经存在相同的issue
2. 使用清晰的标题描述问题
3. 提供详细的问题描述，包括：
   - 问题的复现步骤
   - 期望的行为
   - 实际的行为
   - 截图（如果有）
   - 环境信息（操作系统、VS Code版本等）

### 提交代码

1. Fork此仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个Pull Request

### 开发指南

#### 环境设置

```bash
# 克隆仓库
git clone https://github.com/yourusername/cursor-copilot.git
cd cursor-copilot

# 安装依赖
npm install

# 设置MCP服务
cd doc-gen-server
python -m venv doc_env
source doc_env/bin/activate  # 在Windows上使用: doc_env\Scripts\activate
pip install -r requirements.txt
cd ..

cd prompt_gen_server
python -m venv prompt_env
source prompt_env/bin/activate  # 在Windows上使用: prompt_env\Scripts\activate
pip install -r requirements.txt
cd ..
```

#### 开发流程

1. 在本地运行和调试扩展：
   - 按F5键在新的VS Code窗口中启动扩展
   - 更改代码后，重新加载窗口（Ctrl+R或Cmd+R）以应用更改

2. 测试您的更改：
   - 确保您的更改不会破坏现有功能
   - 添加适当的测试（如果可能）

3. 代码风格：
   - 遵循现有的代码风格
   - 使用有意义的变量名和函数名
   - 添加适当的注释

## 代码审查流程

所有提交将由维护者进行审查。我们可能会要求进行更改或提供额外的信息。

感谢您的贡献！
