/**
 * 常用文件树视图提供器
 * 负责在VS Code侧边栏展示常用文件和代码片段
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { StorageService } from '../services/storageService';

/**
 * 常用文件项类型定义
 */
export interface IFavoriteItem {
    id: string;          // 唯一标识
    type: 'file' | 'code'; // 类型：文件或代码片段
    path: string;        // 文件路径
    label: string;       // 显示的标签
    lineNumber?: number; // 代码片段所在行号（可选）
    codeSnippet?: string; // 代码片段内容（可选）
    description?: string; // 描述信息（可选）
}

/**
 * 常用文件树节点类
 */
export class FavoriteTreeItem extends vscode.TreeItem {
    constructor(
        public readonly favoriteItem: IFavoriteItem,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(favoriteItem.label, collapsibleState);
        
        // 设置工具提示
        if (favoriteItem.type === 'file') {
            this.tooltip = favoriteItem.path;
        } else {
            this.tooltip = new vscode.MarkdownString(`**${favoriteItem.label}**\n\n\`\`\`\n${favoriteItem.codeSnippet}\n\`\`\``);
        }
        
        // 设置图标
        if (favoriteItem.type === 'file') {
            this.iconPath = vscode.ThemeIcon.File;
        } else {
            this.iconPath = new vscode.ThemeIcon('symbol-snippet');
        }
        
        // 设置描述
        if (favoriteItem.description) {
            this.description = favoriteItem.description;
        } else if (favoriteItem.type === 'file') {
            this.description = path.basename(favoriteItem.path);
        }
        
        // 设置上下文
        this.contextValue = favoriteItem.type === 'file' ? 'favoriteFile' : 'favoriteCode';
        
        // 设置命令 - 点击时打开文件或代码位置
        if (favoriteItem.type === 'file') {
            this.command = {
                command: 'vscode.open',
                title: '打开文件',
                arguments: [vscode.Uri.file(favoriteItem.path)]
            };
        } else if (favoriteItem.type === 'code' && favoriteItem.lineNumber !== undefined) {
            this.command = {
                command: 'vscode.open',
                title: '打开代码位置',
                arguments: [
                    vscode.Uri.file(favoriteItem.path),
                    { 
                        selection: new vscode.Range(
                            new vscode.Position(favoriteItem.lineNumber, 0),
                            new vscode.Position(favoriteItem.lineNumber, 0)
                        )
                    }
                ]
            };
        }
        
        // 添加资源URI以支持拖放
        this.resourceUri = vscode.Uri.file(favoriteItem.path);
    }
}

/**
 * 常用文件树数据提供器
 */
export class FavoritesTreeDataProvider implements vscode.TreeDataProvider<FavoriteTreeItem>, vscode.TreeDragAndDropController<FavoriteTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FavoriteTreeItem | undefined | null | void> = new vscode.EventEmitter<FavoriteTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FavoriteTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    // 拖放相关配置
    public readonly dragMimeTypes = ['text/uri-list'];
    public readonly dropMimeTypes = ['text/uri-list', 'application/vnd.code.tree.projectexplorer'];
    
    constructor(private storageService: StorageService) {}
    
    /**
     * 刷新树视图
     */
    public refresh(): void {
        this._onDidChangeTreeData.fire();
    }
    
    /**
     * 获取树项的子节点
     */
    getChildren(element?: FavoriteTreeItem): Thenable<FavoriteTreeItem[]> {
        // 根节点下返回所有常用项
        if (!element) {
            return Promise.resolve(this.getFavoriteItems());
        }
        
        // 常用项没有子节点
        return Promise.resolve([]);
    }
    
    /**
     * 获取指定元素
     */
    getTreeItem(element: FavoriteTreeItem): vscode.TreeItem {
        return element;
    }
    
    /**
     * 获取所有常用项
     */
    private getFavoriteItems(): FavoriteTreeItem[] {
        const favorites = this.storageService.getFavorites();
        
        // 检查文件是否存在，过滤掉不存在的文件
        const validFavorites = favorites.filter(item => {
            if (!fs.existsSync(item.path)) {
                return false;
            }
            return true;
        });
        
        // 转换为树节点
        return validFavorites.map(favorite => 
            new FavoriteTreeItem(
                favorite,
                vscode.TreeItemCollapsibleState.None
            )
        );
    }
    
    /**
     * 添加文件到常用项
     */
    async addFileToFavorites(filePath: string): Promise<void> {
        if (!fs.existsSync(filePath)) {
            vscode.window.showErrorMessage('File does not exist, cannot add to favorites');
            return;
        }
        
        const fileName = path.basename(filePath);
        
        // Create label
        const label = await vscode.window.showInputBox({
            placeHolder: fileName,
            prompt: 'Enter the label name for the favorite item',
            value: fileName
        });
        
        if (!label) {
            return; // User canceled
        }
        
        // 创建常用项
        const favoriteItem: IFavoriteItem = {
            id: `file_${Date.now()}`,
            type: 'file',
            path: filePath,
            label: label
        };
        
        // 保存到存储服务
        await this.storageService.addFavorite(favoriteItem);
        
        // 刷新视图
        this.refresh();
    }
    
    /**
     * 添加代码片段到常用项
     * @param filePath 文件路径
     * @param lineNumber 代码片段所在行号
     * @param codeSnippet 代码片段内容
     */
    async addCodeToFavorites(filePath: string, lineNumber: number, codeSnippet: string): Promise<void> {
        try {
            console.log('Adding code snippet to favorites - starting processing', {
                filePath,
                lineNumber,
                codeSnippetLength: codeSnippet.length
            });
            
            // Check if file exists
            if (!fs.existsSync(filePath)) {
                const errorMsg = `File does not exist: ${filePath}`;
                console.error(errorMsg);
                vscode.window.showErrorMessage(`Failed to add code snippet to favorites: ${errorMsg}`);
                return;
            }
            
            // Check if code snippet is valid
            if (!codeSnippet || codeSnippet.trim() === '') {
                const errorMsg = 'Selected code snippet is empty';
                console.error(errorMsg);
                vscode.window.showErrorMessage(`Failed to add code snippet to favorites: ${errorMsg}`);
                return;
            }
            
            const fileName = path.basename(filePath);
            const defaultLabel = `${fileName}:${lineNumber+1}`;
            
            // Create label (user input)
            console.log('Displaying label input box');
            const label = await vscode.window.showInputBox({
                placeHolder: defaultLabel,
                prompt: 'Enter the label name for the code snippet',
                value: defaultLabel,
                ignoreFocusOut: true // Prevent user from accidentally switching windows to close the input box
            });
            
            // User canceled
            if (!label) {
                console.log('User canceled adding code snippet');
                return;
            }
            
            console.log('Creating code snippet favorite item, label:', label);
            
            // Create favorite item
            const favoriteItem: IFavoriteItem = {
                id: `code_${Date.now()}`,
                type: 'code',
                path: filePath,
                label: label,
                lineNumber: lineNumber,
                codeSnippet: codeSnippet,
                description: `Line ${lineNumber+1}` // Add line number information as description
            };
            
            // Save to storage service
            console.log('Saving code snippet to data storage...');
            await this.storageService.addFavorite(favoriteItem);
            
            // Refresh view
            console.log('Code snippet added to favorites, refreshing view');
            this.refresh();
            
            // Show success message
            vscode.window.showInformationMessage(`Successfully added code snippet to favorites: ${label}`);
            
        } catch (error) {
            // Record error details and show to user
            console.error('Adding code snippet failed:', error);
            vscode.window.showErrorMessage(`Adding code snippet failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * 从常用项移除
     */
    async removeFromFavorites(item: FavoriteTreeItem): Promise<void> {
        await this.storageService.removeFavorite(item.favoriteItem.id);
        this.refresh();
    }
    
    /**
     * 处理拖放操作开始
     */
    handleDrag(source: readonly FavoriteTreeItem[], dataTransfer: vscode.DataTransfer): void {
        // 可以将收藏项拖放到编辑器中
        if (source.length > 0) {
            const uriList = source
                .map(item => item.resourceUri?.toString() || '')
                .filter(uri => uri !== '')
                .join('\n');
            
            if (uriList) {
                dataTransfer.set('text/uri-list', new vscode.DataTransferItem(uriList));
            }
        }
    }
    
    /**
     * 处理拖放操作结束
     */
    async handleDrop(target: FavoriteTreeItem | undefined, dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
        // 检查是否有项目树的拖放数据
        const projectExplorerData = dataTransfer.get('application/vnd.code.tree.projectexplorer');
        if (projectExplorerData) {
            try {
                const items = projectExplorerData.value;
                if (Array.isArray(items)) {
                    // 处理来自项目树的拖放
                    // 使用Promise.all同时处理多个文件
                    await Promise.all(
                        items
                            .filter(item => {
                                return item && 
                                       item.resourceUri && 
                                       item.resourceUri.fsPath && 
                                       item.contextValue === 'file';
                            })
                            .map(async (item) => {
                                console.log('Processing file drop:', item.resourceUri.fsPath);
                                return this.addFileToFavorites(item.resourceUri.fsPath);
                            })
                    );
                    
                    // 刷新视图
                    this.refresh();
                    return Promise.resolve();
                }
            } catch (error) {
                console.error('Error processing project tree data:', error);
            }
        }
        
        // 检查是否有URI列表
        const uriListData = dataTransfer.get('text/uri-list');
        if (uriListData) {
            const uriList = uriListData.value;
            if (typeof uriList === 'string') {
                // 处理URI列表
                const uris = uriList.split('\n').filter(uri => uri.trim() !== '');
                uris.forEach(async (uri) => {
                    try {
                        // 转换为本地文件路径
                        const vscodeUri = vscode.Uri.parse(uri);
                        if (vscodeUri.scheme === 'file') {
                            const filePath = vscodeUri.fsPath;
                            // 检查是文件还是目录
                            try {
                                const stat = fs.statSync(filePath);
                                if (stat.isFile()) {
                                    await this.addFileToFavorites(filePath);
                                }
                                // Temporarily skip folders
                            } catch (error) {
                                console.error(`Unable to access file: ${filePath}`, error);
                            }
                        }
                    } catch (error) {
                        console.error(`Processing URI failed: ${uri}`, error);
                    }
                });
                return Promise.resolve();
            }
        }
        
        return Promise.resolve();
    }
}
