/**
 * 项目文件树视图提供器
 * 负责在VS Code侧边栏展示当前项目文件结构
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 项目文件树节点类
 * 表示项目树视图中的一个节点（文件或文件夹）
 */
export class ProjectTreeItem extends vscode.TreeItem {
    /**
     * 文件/文件夹的绝对路径
     */
    public readonly filePath: string;
    
    /**
     * 构造函数
     * @param label 显示的标签
     * @param collapsibleState 可折叠状态
     * @param contextValue 上下文值（用于菜单显示控制）
     * @param resourceUri 资源URI
     * @param stats 文件信息(如文件大小、修改时间等)
     */
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly resourceUri: vscode.Uri,
        public readonly stats?: fs.Stats
    ) {
        super(label, collapsibleState);
        
        // 设置文件路径
        this.filePath = resourceUri.fsPath;
        
        // 设置资源URI，用于支持拖放
        this.resourceUri = resourceUri;
        
        // 从文件后缀自动设置图标（VS Code会根据资源URI提供正确的图标）
        if (contextValue === 'workspaceFolder') {
            this.iconPath = new vscode.ThemeIcon('root-folder');
        }
        
        // 设置工具提示
        if (stats) {
            // 包含文件大小和修改时间的详细提示
            const size = this.formatFileSize(stats.size);
            const modified = new Date(stats.mtime).toLocaleString();
            this.tooltip = `${this.label}\n\n路径: ${this.filePath}\n大小: ${size}\n修改时间: ${modified}`;
            
            // 为文件节点显示文件大小作为描述
            if (contextValue === 'file') {
                this.description = size;
            }
        } else {
            this.tooltip = this.filePath;
        }
        
        // 设置上下文值，用于控制右键菜单，借鉴VS Code原生资源管理器行为
        this.contextValue = contextValue;
        
        // Set file click command
        if (contextValue === 'file') {
            this.command = {
                command: 'vscode.open',
                title: 'Open file',
                arguments: [resourceUri]
            };
        }
    }
    
    /**
     * 格式化文件大小显示
     */
    private formatFileSize(bytes: number): string {
        if (bytes === 0) {
            return '0 B';
        }
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
    }
}

/**
 * 项目文件树数据提供器
 * 负责为VS Code的项目树视图提供数据
 */
export class ProjectTreeDataProvider implements vscode.TreeDataProvider<ProjectTreeItem>, vscode.TreeDragAndDropController<ProjectTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ProjectTreeItem | undefined | null | void> = new vscode.EventEmitter<ProjectTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ProjectTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    // 拖放相关配置
    public readonly dragMimeTypes = ['application/vnd.code.tree.projectexplorer', 'text/uri-list'];
    public readonly dropMimeTypes = ['application/vnd.code.tree.projectexplorer', 'text/uri-list'];
    
    // 排序状态
    private sortByName: boolean = true;
    
    // 过滤配置
    private showHiddenFiles: boolean = false;
    private excludePatterns: string[] = ['.git', 'node_modules', '.DS_Store'];
    
    constructor() {
        // 创建更精确的文件监听器
        const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*');
        
        // 监听文件创建
        fileWatcher.onDidCreate(uri => {
            this.refresh();
        });
        
        // 监听文件删除
        fileWatcher.onDidDelete(uri => {
            this.refresh();
        });
        
        // 监听文件更改
        fileWatcher.onDidChange(uri => {
            // 只在特定情况下刷新（例如文件名或状态变化）
            this.refresh();
        });
        
        // 监听工作区变化
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            this.refresh();
        });
    }
    
    /**
     * 刷新树视图
     */
    public refresh(): void {
        this._onDidChangeTreeData.fire();
    }
    
    /**
     * 切换排序方式
     */
    public toggleSortOrder(): void {
        this.sortByName = !this.sortByName;
        this.refresh();
    }
    
    /**
     * 切换隐藏文件显示
     */
    public toggleHiddenFiles(): void {
        this.showHiddenFiles = !this.showHiddenFiles;
        this.refresh();
    }
    
    /**
     * 获取树项的子节点
     * @param element 当前树项
     * @returns 子树项数组的Promise
     */
    getChildren(element?: ProjectTreeItem): Thenable<ProjectTreeItem[]> {
        // If no workspace is open, show a message
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            return Promise.resolve([
                new ProjectTreeItem(
                    'No open workspace folders',
                    vscode.TreeItemCollapsibleState.None,
                    'message',
                    vscode.Uri.file(''),
                    undefined
                )
            ]);
        }
        
        // 如果是根节点，返回所有工作区文件夹
        if (!element) {
            return Promise.resolve(this.getWorkspaceFolders());
        }
        
        // 返回文件夹的子项
        const filePath = element.resourceUri.fsPath;
        return Promise.resolve(this.getFilesInDirectory(filePath));
    }
    
    /**
     * 获取指定元素
     * @param element 当前树项
     * @returns 返回同一个树项，满足TreeDataProvider接口要求
     */
    getTreeItem(element: ProjectTreeItem): vscode.TreeItem {
        return element;
    }
    
    /**
     * 获取所有工作区文件夹
     * @returns 工作区文件夹树节点数组
     */
    private getWorkspaceFolders(): ProjectTreeItem[] {
        if (!vscode.workspace.workspaceFolders) {
            return [];
        }
        
        return vscode.workspace.workspaceFolders.map(folder => {
            // 获取文件夹的统计信息
            try {
                const stats = fs.statSync(folder.uri.fsPath);
                return new ProjectTreeItem(
                    folder.name,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'workspaceFolder',
                    folder.uri,
                    stats
                );
            } catch (error) {
                return new ProjectTreeItem(
                    folder.name,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'workspaceFolder',
                    folder.uri
                );
            }
        });
    }
    
    /**
     * 获取指定目录中的文件和文件夹
     * @param folderPath 目录路径
     * @returns 文件和文件夹树节点数组
     */
    private getFilesInDirectory(folderPath: string): ProjectTreeItem[] {
        if (!fs.existsSync(folderPath)) {
            return [];
        }
        
        try {
            // 读取目录内容
            const files = fs.readdirSync(folderPath);
            
            // 根据设置过滤文件
            const filteredFiles = files.filter(file => {
                // 过滤隐藏文件
                if (!this.showHiddenFiles && file.startsWith('.')) {
                    return false;
                }
                
                // 过滤排除名单中的文件/目录
                return !this.excludePatterns.includes(file);
            });
            
            // 转换为树节点
            const treeItems = filteredFiles.map(file => {
                const filePath = path.join(folderPath, file);
                let stats: fs.Stats | undefined;
                
                try {
                    stats = fs.statSync(filePath);
                } catch (error) {
                    console.log(`Unable to access file: ${filePath}`, error);
                    return null; // Ignore files that cannot be accessed
                }
                
                if (stats.isDirectory()) {
                    // Directory node
                    return new ProjectTreeItem(
                        file,
                        vscode.TreeItemCollapsibleState.Collapsed,
                        'folder',
                        vscode.Uri.file(filePath),
                        stats
                    );
                } else {
                    // 文件节点
                    return new ProjectTreeItem(
                        file,
                        vscode.TreeItemCollapsibleState.None,
                        'file',
                        vscode.Uri.file(filePath),
                        stats
                    );
                }
            }).filter((item): item is ProjectTreeItem => item !== null);
            
            // Sort
            return this.sortItems(treeItems);
            
        } catch (error) {
            console.error(`Failed to read directory: ${folderPath}`, error);
            return [];
        }
    }
    
    /**
     * 排序文件和文件夹
     */
    private sortItems(items: ProjectTreeItem[]): ProjectTreeItem[] {
        return items.sort((a, b) => {
            // 首先按类型排序（文件夹在前）
            const aIsFolder = a.contextValue === 'folder' || a.contextValue === 'workspaceFolder';
            const bIsFolder = b.contextValue === 'folder' || b.contextValue === 'workspaceFolder';
            
            if (aIsFolder && !bIsFolder) {
                return -1;
            }
            if (!aIsFolder && bIsFolder) {
                return 1;
            }
            
            // 如果两者类型相同，按名称排序
            if (this.sortByName) {
                return a.label.localeCompare(b.label);
            } else {
                // 这里可以添加其他排序方式，如修改时间排序
                if (a.stats && b.stats) {
                    return b.stats.mtime.getTime() - a.stats.mtime.getTime();
                }
                return a.label.localeCompare(b.label);
            }
        });
    }
    
    /**
     * 处理拖放操作开始
     */
    handleDrag(source: readonly ProjectTreeItem[], dataTransfer: vscode.DataTransfer): void {
        // 只处理有效的文件或文件夹
        const validItems = source.filter(item => 
            item.contextValue === 'file' || 
            item.contextValue === 'folder' || 
            item.contextValue === 'workspaceFolder'
        );
        
        if (validItems.length > 0) {
            // 添加内部拖放数据
            dataTransfer.set(
                'application/vnd.code.tree.projectexplorer', 
                new vscode.DataTransferItem(validItems)
            );
            
            // 添加标准URI列表（用于与外部拖放交互和拖放到收藏区）
            const uriList = validItems
                .map(item => item.resourceUri.toString())
                .join('\n');
            
            dataTransfer.set('text/uri-list', new vscode.DataTransferItem(uriList));
        }
    }
    
    /**
     * 处理拖放操作结束
     */
    handleDrop(target: ProjectTreeItem | undefined, sources: vscode.DataTransfer, token: vscode.CancellationToken): Thenable<void> {
        // 这里可以实现文件移动拖放功能，但需要更复杂的逻辑
        // 由于实现复杂且并非核心功能，我们可以选择不实现这部分
        // 我们主要关注的是从文件树到收藏区的拖放，这部分在favoritesTreeProvider中实现
        
        return Promise.resolve();
    }
}
