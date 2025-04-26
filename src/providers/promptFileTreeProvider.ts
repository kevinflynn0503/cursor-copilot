/**
 * 基于文件的提示词树视图提供器
 * 负责从文件系统加载和显示提示词
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { IPrompt, createPrompt } from '../models/promptModel';
import { PromptFileService } from '../services/promptFileService';

/**
 * 提示词树节点类
 * 表示树视图中的一个节点，可以是目录节点或提示词节点
 */
export class PromptFileTreeItem extends vscode.TreeItem {
    // 保存提示词数据引用，用于操作时获取
    public readonly prompt?: IPrompt;
    public readonly isDirectory: boolean;
    public readonly filePath?: string;
    
    /**
     * 构造函数
     * @param label 显示的标签
     * @param collapsibleState 可折叠状态
     * @param prompt 关联的提示词数据
     * @param isDirectory 是否是目录节点
     * @param filePath 文件路径
     */
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        prompt?: IPrompt,
        isDirectory: boolean = false,
        filePath?: string
    ) {
        super(label, collapsibleState);
        this.prompt = prompt;
        this.isDirectory = isDirectory;
        this.filePath = filePath;
        
        // 如果是提示词节点，设置上下文和工具提示
        if (prompt) {
            this.contextValue = 'promptFile';
            this.tooltip = new vscode.MarkdownString(`**${prompt.title}**\n\n${prompt.content}`);
            
            // 添加图标
            this.iconPath = new vscode.ThemeIcon('symbol-variable');
            
            // 设置点击行为 - 直接打开文件
            if (filePath) {
                this.command = {
                    command: 'vscode.open',
                    title: 'Open Prompt',
                    arguments: [vscode.Uri.file(filePath)]
                };
            }
        } else if (isDirectory) {
            // 目录节点
            this.contextValue = 'promptDirectory';
            this.iconPath = new vscode.ThemeIcon('folder');
        }
    }
}

/**
 * 基于文件的提示词树视图数据提供器
 * 负责从文件系统加载prompt并提供树视图数据
 */
export class PromptFileTreeDataProvider implements vscode.TreeDataProvider<PromptFileTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<PromptFileTreeItem | undefined | null | void> = new vscode.EventEmitter<PromptFileTreeItem | undefined | null | void>();
    // TreeDataProvider接口需要实现的事件
    readonly onDidChangeTreeData: vscode.Event<PromptFileTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    /**
     * 构造函数
     * @param promptFileService prompt服务
     */
    constructor(private promptFileService: PromptFileService) {}
    
    /**
     * 刷新树视图
     */
    public refresh(): void {
        this._onDidChangeTreeData.fire();
    }
    
    /**
     * 获取树项的子节点
     * @param element 当前树项
     * @returns 子树项数组的Promise
     */
    getChildren(element?: PromptFileTreeItem): Thenable<PromptFileTreeItem[]> {
        if (!element) {
            // 根节点下显示所有prompt
            return Promise.resolve(this.getRootItems());
        } else if (element.isDirectory) {
            // 目录节点下显示该目录中的所有prompt
            return Promise.resolve(this.getPromptsInDirectory(element.filePath!));
        } else {
            return Promise.resolve([]);
        }
    }
    
    /**
     * 获取指定元素
     * @param element 当前树项
     * @returns 返回同一个树项，满足TreeDataProvider接口要求
     */
    getTreeItem(element: PromptFileTreeItem): vscode.TreeItem {
        return element;
    }
    
    /**
     * 获取根节点下的所有提示词
     * @returns 提示词树节点数组
     */
    private getRootItems(): PromptFileTreeItem[] {
        // 获取所有prompt
        const prompts = this.promptFileService.getAllPrompts();
        
        // 获取所有文件夹
        const folders = this.promptFileService.getAllPromptFolders();
        
        // 创建文件夹节点
        const folderItems = folders.map(folder => 
            new PromptFileTreeItem(
                folder.name,
                vscode.TreeItemCollapsibleState.Collapsed,
                undefined,
                true,
                folder.path
            )
        );
        
        // 创建提示词节点
        const promptItems = prompts.map(prompt => 
            new PromptFileTreeItem(
                prompt.title, 
                vscode.TreeItemCollapsibleState.None,
                prompt,
                false,
                prompt.filePath
            )
        );
        
        // 合并并按类型和名称排序
        return [...folderItems, ...promptItems].sort((a, b) => {
            // 优先显示文件夹
            if (a.isDirectory !== b.isDirectory) {
                return a.isDirectory ? -1 : 1;
            }
            // 同类型按名称排序
            return a.label.localeCompare(b.label, 'zh-CN');
        });
    }
    
    /**
     * 获取指定目录下的所有提示词
     * @param dirPath 目录路径
     * @returns 提示词树节点数组
     */
    private getPromptsInDirectory(dirPath: string): PromptFileTreeItem[] {
        // 将来可以实现子目录支持
        return [];
    }
    
    /**
     * 打开prompt
     * @param item 提示词树节点
     */
    public async openPromptFile(item: PromptFileTreeItem): Promise<void> {
        if (item.filePath && fs.existsSync(item.filePath)) {
            // 打开文件
            const document = await vscode.workspace.openTextDocument(item.filePath);
            await vscode.window.showTextDocument(document);
        }
    }
    
    /**
     * 删除prompt
     * @param item 提示词树节点
     */
    public async deletePromptFile(item: PromptFileTreeItem): Promise<boolean> {
        if (item.filePath) {
            // 确认删除
            const result = await vscode.window.showWarningMessage(
                `Delete prompt "${item.label}"?`,
                { modal: true },
                "Delete"
            );
            
            if (result === "Delete") {
                const success = this.promptFileService.deletePromptFile(item.filePath);
                if (success) {
                    this.refresh();
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * 复制提示词内容
     * @param item 提示词树节点
     * @returns 是否成功复制
     */
    public async copyPromptContent(item: PromptFileTreeItem): Promise<boolean> {
        if (item.prompt) {
            try {
                // 复制提示词内容到剪贴板
                await vscode.env.clipboard.writeText(item.prompt.content);
                vscode.window.showInformationMessage(`Copied prompt "${item.label}" content to clipboard`);
                return true;
            } catch (error) {
                console.error('Copy prompt content failed:', error);
                vscode.window.showErrorMessage('Copy prompt content failed');
            }
        }
        return false;
    }

    /**
     * 打开prompt所在位置
     * @param item 提示词树节点
     * @returns 是否成功打开
     */
    public async openPromptFileLocation(item: PromptFileTreeItem): Promise<boolean> {
        if (item.filePath && fs.existsSync(item.filePath)) {
            try {
                // 使用系统默认文件管理器打开文件所在目录
                const folderPath = path.dirname(item.filePath);
                await vscode.env.openExternal(vscode.Uri.file(folderPath));
                return true;
            } catch (error) {
                console.error('Open file location failed:', error);
                vscode.window.showErrorMessage('Open file location failed');
            }
        }
        return false;
    }

    /**
     * 打开prompt夹所在位置
     * @param folderItem 文件夹树节点
     * @returns 是否成功打开
     */
    public async openPromptFolderLocation(folderItem: PromptFileTreeItem): Promise<boolean> {
        if (!folderItem.isDirectory || !folderItem.filePath) {
            return false;
        }
        
        try {
            // 使用系统默认文件管理器打开文件夹所在目录
            const folderPath = folderItem.filePath;
            await vscode.env.openExternal(vscode.Uri.file(folderPath));
            return true;
        } catch (error) {
            console.error('Open folder location failed:', error);
            vscode.window.showErrorMessage('Open folder location failed');
            return false;
        }
    }

    /**
     * 创建prompt
     */
    public async createPromptFile(): Promise<boolean> {
        // 使用提示词创建面板
        vscode.commands.executeCommand('cursor-copilot.showPromptCreatePanel');
        return true;
    }

    /**
     * 创建prompt夹
     */
    public async createPromptFolder(): Promise<boolean> {
        // 获取文件夹名称
        const folderName = await vscode.window.showInputBox({
            prompt: 'Enter folder name',
            placeHolder: 'Folder name',
            validateInput: (value) => {
                if (!value.trim()) {
                    return 'Folder name cannot be empty';
                }
                
                // 检查名称是否包含非法字符
                if (/[\\/:*?"<>|]/.test(value)) {
                    return 'Folder name cannot contain the following characters: \\ / : * ? " < > |';
                }
                
                return null;
            }
        });

        if (!folderName) {
            return false; // 用户取消
        }

        // 创建文件夹
        const success = this.promptFileService.createPromptFolder(folderName);
        if (success) {
            vscode.window.showInformationMessage(`Created folder "${folderName}"`);
            this.refresh();
            return true;
        } else {
            vscode.window.showErrorMessage(`Failed to create folder "${folderName}", folder may already exist`);
            return false;
        }
    }

    /**
     * 在指定文件夹中创建提示词
     * @param folderItem 文件夹树节点
     */
    public async createPromptInFolder(folderItem: PromptFileTreeItem): Promise<boolean> {
        if (!folderItem.isDirectory || !folderItem.filePath) {
            return false;
        }
        
        // 调用创建提示词面板，但需要传递文件夹路径
        vscode.commands.executeCommand('cursor-copilot.showPromptCreatePanel', folderItem.filePath);
        return true;
    }
    
    /**
     * 删除prompt夹
     * @param folderItem 文件夹树节点
     */
    public async deletePromptFolder(folderItem: PromptFileTreeItem): Promise<boolean> {
        if (!folderItem.isDirectory || !folderItem.filePath) {
            return false;
        }
        
        // 确认删除
        const result = await vscode.window.showWarningMessage(
            `Delete folder "${folderItem.label}" and all its contents?`,
            { modal: true },
            "Delete"
        );
        
        if (result === "Delete") {
            try {
                // 递归删除文件夹
                fs.rmdirSync(folderItem.filePath, { recursive: true });
                
                // 刷新树视图
                this.refresh();
                vscode.window.showInformationMessage(`Deleted folder "${folderItem.label}"`);
                return true;
            } catch (error) {
                console.error('Delete folder failed:', error);
                vscode.window.showErrorMessage(`Failed to delete folder "${folderItem.label}": ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        
        return false;
    }
}
