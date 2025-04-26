import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 文档树项，表示一个文档节点
 */
export class DocTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly docPath: string,
        public readonly isFile: boolean
    ) {
        super(label, collapsibleState);

        // 设置图标和描述
        if (isFile) {
            this.iconPath = new vscode.ThemeIcon('markdown');
            // 提取创建日期作为描述
            try {
                const stats = fs.statSync(docPath);
                this.description = new Date(stats.birthtime).toLocaleDateString();
            } catch (error) {
                this.description = '';
            }
            
            // 设置文件打开命令
            this.command = {
                command: 'vscode.open',
                arguments: [vscode.Uri.file(docPath)],
                title: 'Open Document'
            };

            // 添加拖放支持
            this.resourceUri = vscode.Uri.file(docPath);
            // 允许拖放操作
            this.contextValue = 'docFile';
        } else {
            this.iconPath = new vscode.ThemeIcon('folder');
            this.contextValue = 'docFolder';
        }
        
        // VSCode通过resourceUri自动支持拖放
        // 无需显式设置draggable属性
    }
}

/**
 * 产品文档树视图数据提供器
 * 用于显示项目中的产品文档
 */
export class DocTreeDataProvider implements vscode.TreeDataProvider<DocTreeItem>, vscode.TreeDragAndDropController<DocTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<DocTreeItem | undefined | null | void> = new vscode.EventEmitter<DocTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<DocTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    // 拖放相关配置
    public readonly dragMimeTypes = ['application/vnd.code.tree.docexplorer', 'text/uri-list'];
    public readonly dropMimeTypes = [];

    constructor() {
        // 监听文件变化，自动刷新文档树
        const fileWatcher = vscode.workspace.createFileSystemWatcher('**/doc/**/*.md');
        fileWatcher.onDidCreate(() => this.refresh());
        fileWatcher.onDidDelete(() => this.refresh());
        fileWatcher.onDidChange(() => this.refresh());
    }

    /**
     * 刷新文档树视图
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * 获取树项
     * @param element 文档树项
     * @returns 树项
     */
    getTreeItem(element: DocTreeItem): vscode.TreeItem {
        return element;
    }

    /**
     * 获取子元素
     * @param element 父元素
     * @returns 子元素数组
     */
    async getChildren(element?: DocTreeItem): Promise<DocTreeItem[]> {
        // 如果没有工作区，则返回空
        if (!vscode.workspace.workspaceFolders) {
            return Promise.resolve([]);
        }

        // 根节点
        if (!element) {
            return this.getDocRootFolders();
        }

        // 非文件才继续获取子元素
        if (!element.isFile) {
            return this.getDocItems(element.docPath);
        }

        return [];
    }

    /**
     * 获取文档根文件夹
     * @returns 根文件夹数组
     */
    private async getDocRootFolders(): Promise<DocTreeItem[]> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return [];
        }

        const docFolders: DocTreeItem[] = [];

        // 遍历工作区文件夹
        for (const folder of workspaceFolders) {
            const docPath = path.join(folder.uri.fsPath, 'doc');
            
            // 检查doc文件夹是否存在
            if (fs.existsSync(docPath) && fs.statSync(docPath).isDirectory()) {
                docFolders.push(new DocTreeItem(
                    `${folder.name}/doc`,
                    vscode.TreeItemCollapsibleState.Expanded,
                    docPath,
                    false
                ));
            }
        }

        return docFolders;
    }

    /**
     * 获取指定路径下的文档项
     * @param folderPath 文件夹路径
     * @returns 文档项数组
     */
    private async getDocItems(folderPath: string): Promise<DocTreeItem[]> {
        // 读取文件夹内容
        const items = fs.readdirSync(folderPath);
        const docItems: DocTreeItem[] = [];

        // 遍历文件夹内容
        for (const item of items) {
            const itemPath = path.join(folderPath, item);
            const stat = fs.statSync(itemPath);

            if (stat.isDirectory()) {
                // 如果是文件夹，添加为可折叠的文件夹节点
                docItems.push(new DocTreeItem(
                    item,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    itemPath,
                    false
                ));
            } else if (stat.isFile() && path.extname(item).toLowerCase() === '.md') {
                // 如果是markdown文件，添加为文件节点
                docItems.push(new DocTreeItem(
                    this.getDocTitle(item, itemPath), // 尝试从文件内容中提取标题
                    vscode.TreeItemCollapsibleState.None,
                    itemPath,
                    true
                ));
            }
        }

        // 先显示文件夹，再显示文件，并按名称排序
        return docItems.sort((a, b) => {
            // 如果类型不同（一个是文件夹，一个是文件）
            if (a.isFile !== b.isFile) {
                return a.isFile ? 1 : -1; // 文件夹优先
            }
            
            // 如果类型相同，按名称排序
            return a.label.localeCompare(b.label);
        });
    }

    /**
     * 从文件中提取文档标题
     * 尝试读取文件第一行的标题信息，如果失败则使用文件名
     * @param fileName 文件名
     * @param filePath 文件路径
     * @returns 文档标题
     */
    private getDocTitle(fileName: string, filePath: string): string {
        try {
            // 读取文件内容
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            
            // 查找以 # 开头的标题行
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('# ')) {
                    // 找到标题，返回去掉 # 的部分
                    return trimmedLine.substring(2).trim();
                }
            }
            
            // 没找到标题，返回文件名（不含扩展名）
            return path.basename(fileName, path.extname(fileName));
        } catch (error) {
            // 读取失败，返回文件名（不含扩展名）
            return path.basename(fileName, path.extname(fileName));
        }
    }
    
    /**
     * 处理拖放开始操作
     */
    handleDrag(source: readonly DocTreeItem[], dataTransfer: vscode.DataTransfer): void {
        // 只处理文件类型项目
        const files = source.filter(item => item.isFile);
        
        if (files.length > 0) {
            // 添加产品文档数据
            dataTransfer.set(
                'application/vnd.code.tree.docexplorer',
                new vscode.DataTransferItem(files)
            );
            
            // 添加标准URI列表
            const uriList = files
                .map(item => vscode.Uri.file(item.docPath).toString())
                .join('\n');
            
            dataTransfer.set('text/uri-list', new vscode.DataTransferItem(uriList));
            
            console.log('Document tree drag and drop data created:', uriList);
        }
    }
    
    /**
     * 处理拖放结束操作
     */
    handleDrop(): Thenable<void> {
        // 产品文档树不接收拖入
        return Promise.resolve();
    }
}
