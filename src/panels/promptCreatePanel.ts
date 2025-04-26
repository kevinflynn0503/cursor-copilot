/**
 * 提示词创建面板
 * 提供用于添加提示词的WebView界面
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { IPrompt, createPrompt } from '../models/promptModel';
import { PromptFileService } from '../services/promptFileService';

/**
 * 提示词创建面板类
 * 使用WebView实现添加提示词的界面
 */
export class PromptCreatePanel {
    // 单例模式
    private static currentPanel: PromptCreatePanel | undefined;
    
    // WebView面板对象
    private readonly panel: vscode.WebviewPanel;
    // 存储上下文，用于释放资源
    private readonly disposables: vscode.Disposable[] = [];
    
    /**
     * 私有构造函数，通过静态方法创建实例
     * @param panel WebView面板
     * @param extensionUri 扩展URI
     * @param promptFileService prompt服务
     * @param targetFolderPath 目标文件夹路径（可选）
     */
    private constructor(
        panel: vscode.WebviewPanel,
        private readonly extensionUri: vscode.Uri,
        private readonly promptFileService: PromptFileService,
        private readonly targetFolderPath?: string
    ) {
        this.panel = panel;
        
        // 设置WebView内容
        this.updateContent();
        
        // 处理面板关闭事件
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
        
        // 处理WebView消息
        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'savePrompt':
                        await this.savePrompt(message.data);
                        break;
                    case 'cancel':
                        this.panel.dispose();
                        break;
                }
            },
            null,
            this.disposables
        );
    }
    
    /**
     * 显示提示词创建面板
     * @param extensionUri 扩展URI
     * @param promptFileService prompt服务
     * @param targetFolderPath 目标文件夹路径（可选）
     */
    public static show(
        extensionUri: vscode.Uri,
        promptFileService: PromptFileService,
        targetFolderPath?: string
    ): void {
        // 获取当前活动的编辑器列
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
            
        // 如果面板已经存在，则激活
        if (PromptCreatePanel.currentPanel) {
            PromptCreatePanel.currentPanel.panel.reveal(column);
            return;
        }
        
        // 创建WebView面板
        const panel = vscode.window.createWebviewPanel(
            'createPromptEditor',
            'Create Prompt',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'resources')
                ]
            }
        );
        
        // 创建并保存面板实例
        PromptCreatePanel.currentPanel = new PromptCreatePanel(panel, extensionUri, promptFileService, targetFolderPath);
    }
    
    /**
     * 释放资源
     */
    private dispose(): void {
        PromptCreatePanel.currentPanel = undefined;
        
        // 释放所有资源
        this.panel.dispose();
        
        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
    
    /**
     * 更新WebView内容
     */
    private updateContent(): void {
        this.panel.webview.html = this.getHtmlContent();
    }
    
    /**
     * 保存提示词
     * @param data 从WebView接收的提示词数据
     */
    private async savePrompt(data: any): Promise<void> {
        try {
            // 创建提示词对象
            const prompt = createPrompt(data.title, data.content);
            
            // 如果指定了目标文件夹，则保存到该文件夹中
            let filePath: string;
            if (this.targetFolderPath) {
                // 生成文件名
                const fileName = data.title
                    .replace(/[\\/:*?"<>|]/g, '_')  // 替换非法字符
                    .replace(/\s+/g, '_') + '.md';  // 空格替换为下划线
                
                // 创建文件路径
                filePath = path.join(this.targetFolderPath, fileName);
                
                // 保存文件内容（只保存提示词内容，不带标题）
                fs.writeFileSync(filePath, data.content, 'utf8');
            } else {
                // 使用服务保存到默认位置
                // 注意：我们需要修改PromptFileService.savePromptToFile方法以支持不带标题保存
                filePath = this.promptFileService.savePromptToFile(prompt);
            }
            
            // 关闭面板
            this.panel.dispose();
            
            // 显示成功消息
            vscode.window.showInformationMessage(`Prompt "${data.title}" saved successfully`);
            
            // 通知树视图刷新
            vscode.commands.executeCommand('cursor-copilot.refreshPromptTree');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save prompt: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * 生成HTML内容
     * @returns HTML字符串
     */
    private getHtmlContent(): string {
        return `<!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Create Prompt</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    padding: 20px;
                    background-color: var(--vscode-editor-background);
                }
                .form-group {
                    margin-bottom: 20px;
                }
                label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: bold;
                }
                input, textarea {
                    width: 100%;
                    padding: 8px;
                    box-sizing: border-box;
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 2px;
                }
                textarea {
                    min-height: 200px;
                    resize: vertical;
                }
                .button-container {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    margin-top: 20px;
                }
                button {
                    padding: 8px 12px;
                    cursor: pointer;
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 2px;
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
                h1 {
                    margin-top: 0;
                    font-size: 1.5em;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding-bottom: 10px;
                }
                .info-text {
                    font-size: 0.9em;
                    color: var(--vscode-descriptionForeground);
                    margin-top: 4px;
                }
            </style>
        </head>
        <body>
            <h1>Create Prompt</h1>
            
            <div class="form-group">
                <label for="title">Title</label>
                <input type="text" id="title" placeholder="Enter prompt title" required />
                <div class="info-text">Briefly describe the purpose of the prompt</div>
            </div>
            
            <div class="form-group">
                <label for="content">Content</label>
                <textarea id="content" placeholder="Enter prompt content" required></textarea>
                <div class="info-text">Detailed prompt content, can include multiple lines of text</div>
            </div>
            
            <div class="button-container">
                <button class="secondary" id="cancel-btn">Cancel</button>
                <button id="save-btn">Save</button>
            </div>
            
            <script>
                (function() {
                    // 变量初始化
                    const vscode = acquireVsCodeApi();
                    const titleInput = document.getElementById('title');
                    const contentTextarea = document.getElementById('content');
                    const saveBtn = document.getElementById('save-btn');
                    const cancelBtn = document.getElementById('cancel-btn');
                    
                    // 保存按钮点击事件
                    saveBtn.addEventListener('click', function() {
                        // 表单验证
                        if (!titleInput.value.trim()) {
                            alert('Please enter a title');
                            titleInput.focus();
                            return;
                        }
                        
                        if (!contentTextarea.value.trim()) {
                            alert('Please enter content');
                            contentTextarea.focus();
                            return;
                        }
                        
                        // 发送保存消息到扩展
                        vscode.postMessage({
                            command: 'savePrompt',
                            data: {
                                title: titleInput.value.trim(),
                                content: contentTextarea.value.trim()
                            }
                        });
                    });
                    
                    // 取消按钮点击事件
                    cancelBtn.addEventListener('click', function() {
                        vscode.postMessage({ command: 'cancel' });
                    });
                    
                    // 初始焦点
                    titleInput.focus();
                }());
            </script>
        </body>
        </html>`;
    }
}
