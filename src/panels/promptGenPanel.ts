import * as vscode from 'vscode';
import { getNonce } from '../utils';
import { mcpConfig } from '../config/appConfig';
import { createPrompt } from '../models/promptModel';

/**
 * 提示词生成面板
 * 提供用户界面交互，允许用户填写信息生成提示词
 */
export class PromptGenPanel {
    /**
     * 跟踪当前面板
     */
    public static currentPanel: PromptGenPanel | undefined;

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    /**
     * PromptGenPanel 私有构造函数
     */
    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // 设置HTML内容
        this._update();

        // 监听Panel关闭事件
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // 处理Webview中的消息
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'generatePrompt':
                        this._generatePrompt(message.data);
                        return;
                    case 'cancel':
                        this._panel.dispose();
                        return;
                    case 'saveAsPrompt':
                        this._saveAsPrompt(message.data);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    /**
     * 创建或显示面板
     */
    public static show(extensionUri: vscode.Uri, column?: vscode.ViewColumn) {
        const column_ = column || vscode.ViewColumn.One;

        // 如果已有面板，直接显示
        if (PromptGenPanel.currentPanel) {
            PromptGenPanel.currentPanel._panel.reveal(column_);
            return;
        }

        // 创建WebView面板
        const panel = vscode.window.createWebviewPanel(
            'promptGenerator',
            '生成提示词',
            column_,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media')
                ]
            }
        );

        PromptGenPanel.currentPanel = new PromptGenPanel(panel, extensionUri);
    }

    /**
     * 更新WebView内容
     */
    private _update() {
        const webview = this._panel.webview;
        this._panel.title = "生成提示词";
        webview.html = this._getHtmlForWebview(webview);
    }

    /**
     * 生成提示词
     */
    private async _generatePrompt(data: any) {
        try {
            // 显示生成中消息
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Generating prompt...",
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0 });

                try {
                    // 获取当前工作区路径
                    let workspacePath = '';
                    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                        workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
                    } else {
                        throw new Error("No workspace opened, cannot save prompt file");
                    }

                    // 调用MCP服务生成提示词
                    // 注意：必须使用'mcp0.generate_prompt'，这是在extension.ts中注册的命令
                    console.log('Preparing to call MCP service to generate prompt...');
                    const response = await vscode.commands.executeCommand('mcp0.generate_prompt', {
                        purpose: data.purpose,
                        rules: data.rules,
                        language: data.language,
                        project_path: workspacePath // 传递项目路径参数
                    });
                    console.log('Received MCP service response:', response ? 'success' : 'failure');

                    progress.report({ increment: 100 });

                    // 解析响应
                    // response是一个数组，其中包含TextContent对象
                    const responseArray = response as Array<any>;
                    if (!responseArray || !responseArray.length) {
                        throw new Error("Server did not return a valid response");
                    }
                    
                    // 获取文本内容
                    const textContent = responseArray[0];
                    const responseData = JSON.parse(textContent.text);
                    
                    if (!responseData.success) {
                        throw new Error(responseData.error || "Failed to generate prompt");
                    }
                    
                    // 获取生成的提示词信息
                    const promptData = responseData.prompt;
                    
                    if (!promptData || !promptData.content) {
                        throw new Error("Failed to generate prompt");
                    }
                    
                    // 从响应中获取提示词内容和标题
                    const promptContent = promptData.content;
                    const promptTitle = promptData.title;
                    const promptPath = promptData.path;
                    
                    console.log('Successfully generated prompt: ' + promptTitle);
                    console.log('Prompt saved to: ' + promptPath);
                    
                    // 发送消息到面板
                    this._panel.webview.postMessage({
                        command: 'promptGenerated',
                        prompt: promptContent,
                        title: promptTitle,
                        path: promptPath
                    });
                    
                    // 提示已自动保存
                    vscode.window.showInformationMessage(`Prompt「${promptTitle}」generated and saved`);                    
                    
                    return {
                        content: promptContent,
                        title: promptTitle,
                        path: promptPath
                    };
                } catch (error) {
                    console.error('Error generating prompt:', error);
                    vscode.window.showErrorMessage(`Error generating prompt: ${error}`);
                    
                    // 通知WebView生成失败
                    this._panel.webview.postMessage({ 
                        command: 'promptGenerationFailed', 
                        error: `${error}`
                    });
                }

                return null;
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error processing prompt generation: ${error}`);
        }
    }
    
    /**
     * 自动保存生成的提示词 - 不再需要，由MCP服务自动保存
     */
    private async _autoSavePrompt(formData: any, promptContent: string) {
        // 此方法保留但不再使用，由MCP服务负责保存prompt
        // 提示词已经由MCP服务保存为文件
        console.log('Prompt already saved by MCP service');
    }

    /**
     * 保存提示词
     */
    private async _saveAsPrompt(data: any) {
        try {
            // 获取存储服务实例
            const storageService = vscode.extensions.getExtension('cursor-copilot')?.exports.getStorageService();
            if (!storageService) {
                throw new Error('Failed to get storage service');
            }
            
            // 创建新提示词
            const prompt = createPrompt(data.title, data.content);
            
            // 保存提示词
            await storageService.addPrompt(prompt);
            
            // 刷新提示词列表
            vscode.commands.executeCommand('cursor-copilot.refreshPrompts');
            
            vscode.window.showInformationMessage(`Prompt "${data.title}" saved successfully!`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save prompt: ${error}`);
        }
    }

    /**
     * 获取WebView的HTML内容
     */
    private _getHtmlForWebview(webview: vscode.Webview): string {
        // 创建nonce以防止脚本注入
        const nonce = getNonce();

        // 简化语言选择，只提供中英文选项
        const languageOptions = `
            <option value="en">English</option>
            <option value="zh">中文</option>
        `;

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
            <title>Generate Prompt</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    padding: 20px;
                    color: var(--vscode-foreground);
                    font-size: var(--vscode-font-size);
                    background-color: var(--vscode-editor-background);
                }
                h1 {
                    font-size: 1.5em;
                    margin-bottom: 20px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding-bottom: 10px;
                }
                .form-group {
                    margin-bottom: 15px;
                }
                label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: bold;
                }
                input, textarea, select {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid var(--vscode-input-border);
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border-radius: 3px;
                    font-size: var(--vscode-font-size);
                }
                textarea {
                    min-height: 100px;
                    resize: vertical;
                }
                .info-text {
                    font-size: 0.85em;
                    color: var(--vscode-descriptionForeground);
                    margin-top: 4px;
                }
                .button-container {
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 20px;
                    gap: 10px;
                }
                button {
                    padding: 8px 12px;
                    border: none;
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    font-size: var(--vscode-font-size);
                    cursor: pointer;
                    border-radius: 3px;
                }
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                button.secondary {
                    background-color: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                }
                button.secondary:hover {
                    background-color: var(--vscode-button-secondaryHoverBackground);
                }
                #result-container {
                    margin-top: 20px;
                    border-top: 1px solid var(--vscode-panel-border);
                    padding-top: 20px;
                    display: none;
                }
                #result-prompt {
                    background-color: var(--vscode-textBlockQuote-background);
                    border-left: 4px solid var(--vscode-textBlockQuote-border);
                    padding: 10px;
                    margin-top: 10px;
                    white-space: pre-wrap;
                    max-height: 300px;
                    overflow-y: auto;
                }
                .copy-btn {
                    margin-top: 10px;
                }
                .two-columns {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                }
            </style>
        </head>
        <body>
            <h1>Generate AI Prompt</h1>
            
            <div id="form-container">
                <div class="form-group">
                    <label for="purpose">Purpose <span class="required">*</span></label>
                    <textarea id="purpose" placeholder="Detailed description of the main purpose and usage of this prompt, e.g., create a prompt that generates high-quality website business strategies..." rows="5" required></textarea>
                </div>
                
                <div class="form-group">
                    <label for="rules">Global Rules <span class="required">*</span></label>
                    <textarea id="rules" placeholder="Detailed description of the rules and constraints that the AI should follow..." rows="5" required></textarea>
                </div>
                
                <div class="form-group">
                    <label for="language">Prompt Language <span class="required">*</span></label>
                    <select id="language" required>
                        ${languageOptions}
                    </select>
                </div>
                
                <div class="button-container">
                    <button class="secondary" id="cancel-btn">Cancel</button>
                    <button id="generate-btn">Generate Prompt</button>
                </div>
            </div>
            
            <div id="result-container">
                <h2>Generated Prompt</h2>
                <div id="result-prompt"></div>
                <div class="button-container">
                    <button id="copy-btn" class="copy-btn">Copy to Clipboard</button>
                    <button id="save-btn" class="copy-btn">Save as Prompt</button>
                </div>
            </div>
            
            <script nonce="${nonce}">
                (function() {
                    // Get VS Code API
                    const vscode = acquireVsCodeApi();
                    
                    // 初始化变量
                    const purposeTextarea = document.getElementById('purpose');
                    const rulesTextarea = document.getElementById('rules');
                    const languageSelect = document.getElementById('language');
                    const generateBtn = document.getElementById('generate-btn');
                    const cancelBtn = document.getElementById('cancel-btn');
                    
                    // 获取表单数据
                    const submitForm = document.getElementById('form-container');
                    submitForm.addEventListener('submit', function(e) {
                        e.preventDefault();
                        
                        // 获取表单值
                        const purposeValue = purposeTextarea.value.trim();
                        const rulesValue = rulesTextarea.value.trim();
                        const languageValue = languageSelect.value; // 'en' 或 'zh'
                        
                        // 验证必填字段
                        if (!purposeValue || !rulesValue || !languageValue) {
                            alert('Please fill in all required fields');
                            return;
                        }
                        
                        // 禁用生成按钮，显示加载状态
                        generateBtn.disabled = true;
                        generateBtn.textContent = 'Generating...';
                        
                        // 发送消息到扩展
                        vscode.postMessage({
                            command: 'generatePrompt',
                            data: {
                                purpose: purposeValue,
                                rules: rulesValue,
                                language: languageValue
                            }
                        });
                    });
                    
                    // Cancel button click event
                    cancelBtn.addEventListener('click', function() {
                        vscode.postMessage({ command: 'cancel' });
                    });
                    
                    // 复制按钮点击事件
                    copyBtn.addEventListener('click', function() {
                        navigator.clipboard.writeText(resultPrompt.textContent || "").then(() => {
                            copyBtn.textContent = 'Copied!';
                            setTimeout(() => {
                                copyBtn.textContent = 'Copy to Clipboard';
                            }, 2000);
                        });
                    });
                    
                    // 保存按钮点击事件 - 将保存为新的提示词
                    saveBtn.addEventListener('click', function() {
                        const promptTitle = prompt('Enter prompt title:', 'Generated Prompt');
                        if (promptTitle) {
                            vscode.postMessage({
                                command: 'saveAsPrompt',
                                data: {
                                    title: promptTitle,
                                    content: resultPrompt.textContent || ""
                                }
                            });
                        }
                    });
                    
                    // Listen for messages from the extension
                    window.addEventListener('message', event => {
                        const message = event.data;
                        
                        switch (message.command) {
                            case 'promptGeneratedAndSaved':
                                // 显示成功提示
                                resultPrompt.textContent = 'Prompt generated and saved successfully!';
                                resultPrompt.style.color = '#27ae60';
                                resultContainer.style.display = 'block';
                                
                                // 隐藏保存按钮，因为已自动保存
                                saveBtn.style.display = 'none';
                                
                                // 滚动到结果区域
                                resultContainer.scrollIntoView({ behavior: 'smooth' });
                                
                                // 重置按钮
                                generateBtn.disabled = false;
                                generateBtn.textContent = 'Generate New Prompt';
                                
                                // 5秒后提示可继续生成
                                setTimeout(function() {
                                    resultPrompt.textContent = 'Prompt saved. You can continue to generate new prompts or view the prompt manager.';
                                    resultPrompt.style.color = '';
                                }, 5000);
                                break;
                                
                            case 'promptGenerationFailed':
                                // 处理错误情况
                                generateBtn.disabled = false;
                                generateBtn.textContent = 'Re-generate';
                                
                                // 显示错误信息
                                resultPrompt.textContent = 'Generation failed: ' + message.error;
                                resultPrompt.style.color = '#e74c3c';
                                resultContainer.style.display = 'block';
                                
                                // 3秒后恢复样式
                                setTimeout(function() {
                                    resultPrompt.style.color = '';
                                }, 3000);
                                break;
                        }
                    });
                    
                    // Initial focus
                    purposeTextarea.focus();
                }());
            </script>
        </body>
        </html>`;
    }

    /**
     * 销毁面板
     */
    public dispose() {
        PromptGenPanel.currentPanel = undefined;

        // 清理资源
        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
