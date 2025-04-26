// 导入VS Code API
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectTreeDataProvider, ProjectTreeItem } from './providers/projectTreeProvider';
import { DocTreeDataProvider, DocTreeItem } from './providers/docTreeProvider';
import { FavoritesTreeDataProvider, FavoriteTreeItem, IFavoriteItem } from './providers/favoritesTreeProvider';
import { OutlineProvider } from './providers/outlineProvider';
import { PromptFileService } from './services/promptFileService';
import { PromptFileTreeDataProvider, PromptFileTreeItem } from './providers/promptFileTreeProvider';
import { PromptGenPanel } from './panels/promptGenPanel';
import { StorageService } from './services/storageService'; // 导入StorageService
import { PromptCreatePanel } from './panels/promptCreatePanel'; // 导入提示词创建面板

/**
 * 当插件被激活时调用此函数
 * 插件激活时机：当用户执行命令、满足激活事件时
 * @param context 插件上下文，用于注册命令、事件等
 */
export function activate(context: vscode.ExtensionContext) {
    // 输出日志，方便调试
    console.log('Cursor Copilot plugin activated!');

    // 初始化工作区路径
    let workspacePath = '';
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    }
    
    // 初始化存储服务
    const storageService = new StorageService(context); // 初始化StorageService
    
    // 初始化prompt服务
    const promptFileService = new PromptFileService(context);

    // 创建基于文件的提示词树视图数据提供器
    const promptFileTreeProvider = new PromptFileTreeDataProvider(promptFileService);

    // 注册刷新基于文件的提示词列表命令
    context.subscriptions.push(
        vscode.commands.registerCommand('cursor-copilot.refreshPromptTree', () => {
            promptFileTreeProvider.refresh();
        })
    );
    
    // 注册创建prompt命令
    context.subscriptions.push(
        vscode.commands.registerCommand('cursor-copilot.createPromptFile', async () => {
            await promptFileTreeProvider.createPromptFile();
        })
    );
    
    // 注册创建prompt夹命令
    context.subscriptions.push(
        vscode.commands.registerCommand('cursor-copilot.createPromptFolder', async () => {
            await promptFileTreeProvider.createPromptFolder();
        })
    );
    
    // 注册复制提示词内容命令
    context.subscriptions.push(
        vscode.commands.registerCommand('cursor-copilot.copyPromptContent', async (item: PromptFileTreeItem) => {
            await promptFileTreeProvider.copyPromptContent(item);
        })
    );
    
    // 注册打开prompt所在位置命令
    context.subscriptions.push(
        vscode.commands.registerCommand('cursor-copilot.openPromptFileLocation', async (item: PromptFileTreeItem) => {
            await promptFileTreeProvider.openPromptFileLocation(item);
        })
    );
    
    // 注册打开prompt夹所在位置命令
    context.subscriptions.push(
        vscode.commands.registerCommand('cursor-copilot.openPromptFolderLocation', async (item: PromptFileTreeItem) => {
            await promptFileTreeProvider.openPromptFolderLocation(item);
        })
    );
    
    // 注册显示提示词创建面板命令
    context.subscriptions.push(
        vscode.commands.registerCommand('cursor-copilot.showPromptCreatePanel', (folderPath?: string) => {
            PromptCreatePanel.show(context.extensionUri, promptFileService, folderPath);
        })
    );
    
    // 注册在文件夹中创建提示词命令
    context.subscriptions.push(
        vscode.commands.registerCommand('cursor-copilot.createPromptInFolder', (item: PromptFileTreeItem) => {
            promptFileTreeProvider.createPromptInFolder(item);
        })
    );
    
    // 注册删除prompt夹命令
    context.subscriptions.push(
        vscode.commands.registerCommand('cursor-copilot.deletePromptFolder', (item: PromptFileTreeItem) => {
            promptFileTreeProvider.deletePromptFolder(item);
        })
    );
    
    // 注册打开prompt命令
    context.subscriptions.push(
        vscode.commands.registerCommand('cursor-copilot.openPromptFile', (item: PromptFileTreeItem) => {
            promptFileTreeProvider.openPromptFile(item);
        })
    );
    
    // 注册删除prompt命令
    context.subscriptions.push(
        vscode.commands.registerCommand('cursor-copilot.deletePromptFile', async (item: PromptFileTreeItem) => {
            await promptFileTreeProvider.deletePromptFile(item);
        })
    );

    // 注册基于文件的提示词树视图
    const promptFileTreeView = vscode.window.createTreeView('promptFileExplorer', {
        treeDataProvider: promptFileTreeProvider,
        showCollapseAll: true
    });

    // 创建项目文件树视图数据提供器
    const projectTreeProvider = new ProjectTreeDataProvider();

    // 注册项目文件树视图
    const projectTreeView = vscode.window.createTreeView('projectExplorer', {
        treeDataProvider: projectTreeProvider,
        showCollapseAll: true,
        canSelectMany: false,
        // 使用在提供器中实现的拖放控制器
        dragAndDropController: projectTreeProvider
    });
    
    // 注册创建文件夹命令
    context.subscriptions.push(
        vscode.commands.registerCommand('cursor-copilot.createFolder', async (folderItem?: ProjectTreeItem) => {
            try {
                // 确定父文件夹路径
                let parentPath: string;
                
                if (folderItem) {
                    // 如果从右键菜单触发，使用选中的文件夹
                    if (folderItem.contextValue === 'folder' || folderItem.contextValue === 'workspaceFolder') {
                        parentPath = folderItem.filePath;
                    } else {
                        // 如果选择的是文件，使用其所在目录
                        parentPath = path.dirname(folderItem.filePath);
                    }
                } else {
                    // 如果没有选择任何项，使用第一个工作区文件夹
                    const workspaceFolders = vscode.workspace.workspaceFolders;
                    if (!workspaceFolders || workspaceFolders.length === 0) {
                        vscode.window.showErrorMessage('No open workspace folder');
                        return;
                    }
                    parentPath = workspaceFolders[0].uri.fsPath;
                }
                
                // Request user input for folder name
                const folderName = await vscode.window.showInputBox({
                    prompt: 'Enter folder name',
                    placeHolder: 'Folder name',
                    validateInput: (value) => {
                        if (!value || value.trim().length === 0) {
                            return 'Folder name cannot be empty';
                        }
                        
                        // 检查名称是否包含非法字符
                        if (/[\\/:\*\?"<>|]/.test(value)) {
                            return 'Folder name cannot contain the following characters: \\ / : * ? " < > |';
                        }
                        
                        const newFolderPath = path.join(parentPath, value);
                        if (fs.existsSync(newFolderPath)) {
                            return `${value} already exists`;
                        }
                        
                        return null;
                    }
                });
                
                if (!folderName) {
                    return; // 用户取消
                }
                
                // 创建文件夹
                const newFolderPath = path.join(parentPath, folderName);
                fs.mkdirSync(newFolderPath);
                
                // 刷新文件树
                projectTreeProvider.refresh();
                
                vscode.window.showInformationMessage(`Created folder: ${folderName}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to create folder: ${error}`);
            }
        })
    );
    
    // 创建产品文档树视图数据提供器
    const docTreeProvider = new DocTreeDataProvider();
    
    // 注册产品文档树视图
    const docTreeView = vscode.window.createTreeView('docExplorer', {
        treeDataProvider: docTreeProvider,
        showCollapseAll: true,
        // 添加拖放支持
        dragAndDropController: {
            // 定义拖动文件类型
            dragMimeTypes: ['text/uri-list', 'application/vnd.code.tree.docexplorer'],
            // 定义接收拖入类型（不需要响应拖入）
            dropMimeTypes: [],
            
            // 处理拖动开始事件
            handleDrag: (source: readonly DocTreeItem[], dataTransfer: vscode.DataTransfer) => {
                // 仅处理文件节点
                const files = source.filter(item => item.isFile);
                if (files.length > 0) {
                    // 添加文件URI到拖放数据中
                    dataTransfer.set('application/vnd.code.tree.docexplorer', new vscode.DataTransferItem(files));
                    
                    // 设置标准文件拖放类型 - 对于外部拖放非常重要
                    files.forEach(file => {
                        dataTransfer.set('text/uri-list', new vscode.DataTransferItem(
                            `${vscode.Uri.file(file.docPath).toString()}`
                        ));
                    });
                }
            },
            // 可选：处理拖放事件
            handleDrop: () => { /* 不需要实现，默认行为即可 */ }
        }
    });
    
    // 注册创建文档命令
    context.subscriptions.push(
        vscode.commands.registerCommand('cursor-copilot.createDoc', async (docItem?: DocTreeItem) => {
            try {
                // 确定父文件夹路径
                let parentPath: string;
                
                if (docItem) {
                    // 如果从右键菜单触发，使用选中的文件夹
                    if (!docItem.isFile) {
                        parentPath = docItem.docPath;
                    } else {
                        // 如果选择的是文件，使用其所在目录
                        parentPath = path.dirname(docItem.docPath);
                    }
                } else {
                    // 如果没有选择任何项，使用文档根目录
                    const workspaceFolders = vscode.workspace.workspaceFolders;
                    if (!workspaceFolders || workspaceFolders.length === 0) {
                        vscode.window.showErrorMessage('没有打开的工作区文件夹');
                        return;
                    }
                    
                    // 检查是否存在doc文件夹，不存在则创建
                    const docPath = path.join(workspaceFolders[0].uri.fsPath, 'doc');
                    if (!fs.existsSync(docPath)) {
                        fs.mkdirSync(docPath, { recursive: true });
                    }
                    parentPath = docPath;
                }
                
                // Request user input for document title
                const docTitle = await vscode.window.showInputBox({
                    prompt: 'Enter document title',
                    placeHolder: 'Document title',
                    validateInput: (value) => {
                        if (!value || value.trim().length === 0) {
                            return 'Document title cannot be empty';
                        }
                        return null;
                    }
                });
                
                if (!docTitle) {
                    return; // 用户取消
                }
                
                // 生成文件名（将标题转换为文件名）
                const fileName = `${docTitle.replace(/[\\/:*?"<>|\s]/g, '_')}.md`;
                const docFilePath = path.join(parentPath, fileName);
                
                if (fs.existsSync(docFilePath)) {
                    const overwrite = await vscode.window.showWarningMessage(
                        `Document ${fileName} already exists, do you want to overwrite?`,
                        { modal: true },
                        'Overwrite',
                        'Cancel'
                    );
                    
                    if (overwrite !== 'Overwrite') {
                        return;
                    }
                }
                
                // Create document file
                const docContent = `# ${docTitle}\n\n<!-- Add document content here -->\n\n## Introduction\n\n## Content\n\n## Summary\n`;
                fs.writeFileSync(docFilePath, docContent, 'utf8');
                
                // 刷新文档树
                docTreeProvider.refresh();
                
                // Open the newly created document
                const document = await vscode.workspace.openTextDocument(docFilePath);
                await vscode.window.showTextDocument(document);
                
                vscode.window.showInformationMessage(`Created document: ${docTitle}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to create document: ${error}`);
            }
        })
    );

    // 注册常用功能视图
    const favoritesTreeProvider = new FavoritesTreeDataProvider(storageService); // 传入storageService
    
    const favoritesTreeView = vscode.window.createTreeView('favoritesExplorer', {
        treeDataProvider: favoritesTreeProvider,
        showCollapseAll: true,
        canSelectMany: false
    });

    // 注册文件大纲视图
    const outlineProvider = new OutlineProvider();
    const outlineTreeView = vscode.window.createTreeView('outlineExplorer', {
        treeDataProvider: outlineProvider,
        showCollapseAll: true,
        canSelectMany: false
    });

    // 将树视图添加到上下文中，以便自动清理
    context.subscriptions.push(promptFileTreeView, projectTreeView, docTreeView, favoritesTreeView, outlineTreeView);

    // 注册刷新项目命令
    context.subscriptions.push(
        vscode.commands.registerCommand('cursor-copilot.refreshProject', () => {
            projectTreeProvider.refresh();
        })
    );
    
    // 注册折叠所有命令
    context.subscriptions.push(
        vscode.commands.registerCommand('cursor-copilot.collapseAll', () => {
            // 通过事件触发TreeView的collapseAll方法
            vscode.commands.executeCommand('workbench.actions.treeView.projectExplorer.collapseAll');
        })
    );
    
    // 注册删除文件/文件夹命令
    context.subscriptions.push(
        vscode.commands.registerCommand('cursor-copilot.deleteFile', async (item: ProjectTreeItem | DocTreeItem) => {
            let resourceUri: vscode.Uri | undefined;
            let itemLabel = '';
            let isDirectory = false;
            let isDocItem = false;
            
            // 处理ProjectTreeItem类型
            if (item instanceof ProjectTreeItem && item.resourceUri) {
                resourceUri = item.resourceUri;
                itemLabel = item.label;
                isDirectory = item.contextValue === 'folder';
            }
            // 处理DocTreeItem类型
            else if (item instanceof DocTreeItem) {
                resourceUri = vscode.Uri.file(item.docPath);
                itemLabel = item.label;
                isDirectory = !item.isFile;
                isDocItem = true;
            }
            
            if (!resourceUri) {
                vscode.window.showErrorMessage('无法识别要删除的项目');
                return;
            }
            
            const fileType = isDirectory ? 'folder' : 'file';
            
            // 确认删除
            const answer = await vscode.window.showWarningMessage(
                `Do you want to delete the ${fileType}「${itemLabel}」?`,
                { modal: true },
                'Delete',
                'Cancel'
            );
            
            if (answer !== 'Delete') {
                return;
            }
            
            try {
                // 使用VS Code的API创建删除操作
                if (isDirectory) {
                    // 递归删除文件夹
                    await vscode.workspace.fs.delete(resourceUri, { recursive: true, useTrash: true });
                } else {
                    // 删除文件
                    await vscode.workspace.fs.delete(resourceUri, { useTrash: true });
                }
                
                // 根据项目类型刷新不同的树视图
                if (isDocItem) {
                    docTreeProvider.refresh();
                } else {
                    projectTreeProvider.refresh();
                }
                
                vscode.window.showInformationMessage(`Deleted ${fileType}「${itemLabel}」`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to delete ${fileType}「${itemLabel}」: ${error}`);
            }
        })
    );
    
    // 注册重命名文件/文件夹命令
    context.subscriptions.push(
        vscode.commands.registerCommand('cursor-copilot.renameFile', async (item: ProjectTreeItem) => {
            if (item && item.resourceUri) {
                const oldPath = item.resourceUri.fsPath;
                const dirName = path.dirname(oldPath);
                const oldName = path.basename(oldPath);
                const isDirectory = item.contextValue === 'folder';
                const fileType = isDirectory ? 'folder' : 'file';
                
                // 输入新名称
                const newName = await vscode.window.showInputBox({
                    prompt: `Enter new ${fileType} name`,
                    value: oldName,
                    validateInput: (value) => {
                        if (!value.trim()) {
                            return 'Name cannot be empty';
                        }
                        if (value === oldName) {
                            return null; // 名称没有变化也是允许的
                        }
                        const newPath = path.join(dirName, value);
                        if (fs.existsSync(newPath)) {
                            return `A ${fileType} with the same name already exists`;
                        }
                        return null;
                    }
                });
                
                if (newName && newName !== oldName) {
                    // 构建新路径
                    const newPath = path.join(dirName, newName);
                    
                    try {
                        // 使用VS Code的API重命名
                        await vscode.workspace.fs.rename(
                            item.resourceUri,
                            vscode.Uri.file(newPath),
                            { overwrite: false }
                        );
                        
                        // 刷新树视图
                        projectTreeProvider.refresh();
                    } catch (error) {
                        vscode.window.showErrorMessage(`Failed to rename ${fileType}: ${error}`);
                    }
                }
            }
        })
    );
    
    // 注册在终端中打开命令
    context.subscriptions.push(
        vscode.commands.registerCommand('cursor-copilot.openInTerminal', (item: ProjectTreeItem) => {
            if (item && item.resourceUri) {
                const terminal = vscode.window.createTerminal({
                    cwd: item.resourceUri.fsPath,
                    name: `Terminal: ${path.basename(item.resourceUri.fsPath)}`
                });
                terminal.show();
            }
        })
    );
    
    // 注册创建文件命令
    context.subscriptions.push(
        vscode.commands.registerCommand('cursor-copilot.createFile', async (item: ProjectTreeItem) => {
            if (!item || !item.resourceUri) {
                return;
            }
            
            let targetDir = item.resourceUri.fsPath;
            
            // 如果选择的是文件，使用其所在目录
            if (item.contextValue === 'file') {
                targetDir = path.dirname(targetDir);
            }
            
            // 请求用户输入文件名
            const fileName = await vscode.window.showInputBox({
                prompt: 'Enter a new file name',
                placeHolder: 'e.g., newfile.js'
            });
            
            if (!fileName) {
                return; // 用户取消
            }
            
            // 创建文件路径
            const filePath = path.join(targetDir, fileName);
            
            // 检查文件是否已存在
            if (fs.existsSync(filePath)) {
                vscode.window.showErrorMessage(`File ${fileName} already exists!`);
                return;
            }
            
            // 创建空文件
            fs.writeFileSync(filePath, '', 'utf8');
            
            // 打开新文件
            const document = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(document);
            
            // 刷新项目树
            projectTreeProvider.refresh();
            
            vscode.window.showInformationMessage(`Created file ${fileName}!`);
        })
    );
    
    // 注册在Finder中显示命令
    context.subscriptions.push(
        vscode.commands.registerCommand('cursor-copilot.showInFinder', (item: ProjectTreeItem | DocTreeItem) => {
            if (item && item.resourceUri) {
                vscode.commands.executeCommand('revealFileInOS', item.resourceUri);
            }
        })
    );
    
    // 注册打开文件命令
    context.subscriptions.push(
        vscode.commands.registerCommand('cursor-copilot.openFile', (item: ProjectTreeItem | DocTreeItem) => {
            if (item && item.resourceUri && (item.contextValue === 'file' || item.contextValue === 'docFile')) {
                vscode.commands.executeCommand('vscode.open', item.resourceUri);
            }
        })
    );
    
    // 注册在侧边打开命令
    context.subscriptions.push(
        vscode.commands.registerCommand('cursor-copilot.openFileToSide', (item: ProjectTreeItem | DocTreeItem) => {
            if (item && item.resourceUri && (item.contextValue === 'file' || item.contextValue === 'docFile')) {
                vscode.commands.executeCommand('vscode.open', item.resourceUri, { viewColumn: vscode.ViewColumn.Beside });
            }
        })
    );
    
    // 注册复制路径相关命令
    context.subscriptions.push(
        vscode.commands.registerCommand('cursor-copilot.copyPath', async (item: ProjectTreeItem | DocTreeItem) => {
            if (item && item.resourceUri) {
                const filePath = item.resourceUri.fsPath;
                await vscode.env.clipboard.writeText(filePath);
                vscode.window.showInformationMessage(`Path copied: ${filePath}`);
            }
        })
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('cursor-copilot.copyRelativePath', async (item: ProjectTreeItem | DocTreeItem) => {
            if (item && item.resourceUri && vscode.workspace.workspaceFolders) {
                const wsFolder = vscode.workspace.getWorkspaceFolder(item.resourceUri);
                if (wsFolder) {
                    const relativePath = path.relative(wsFolder.uri.fsPath, item.resourceUri.fsPath);
                    await vscode.env.clipboard.writeText(relativePath);
                    vscode.window.showInformationMessage(`Relative path copied: ${relativePath}`);
                }
            }
        })
    );
    
    // 注册添加当前文件到常用功能命令
    context.subscriptions.push(
        vscode.commands.registerCommand('cursor-copilot.addFileToFavorites', async (itemOrUri: any) => {
            console.log('Adding file to favorites, parameter type:', typeof itemOrUri, itemOrUri);
            
            let filePath: string | undefined;
            
            // 情况1: 参数是URI对象（从资源管理器菜单或其他来源）
            if (itemOrUri instanceof vscode.Uri) {
                filePath = itemOrUri.fsPath;
                console.log('From URI adding file:', filePath);
            }
            // 情况2: 参数是TreeItem对象（从项目树或文档树右键菜单）
            else if (itemOrUri && itemOrUri.resourceUri) {
                filePath = itemOrUri.resourceUri.fsPath;
                console.log('From TreeItem adding file:', filePath);
            }
            // 情况3: 没有参数，使用当前编辑器文件
            else if (vscode.window.activeTextEditor) {
                filePath = vscode.window.activeTextEditor.document.uri.fsPath;
                console.log('From active editor adding file:', filePath);
            }
            // 情况4: 其他情况，让用户选择文件
            else {
                const fileUris = await vscode.window.showOpenDialog({
                    canSelectFiles: true, 
                    canSelectFolders: false,
                    canSelectMany: false,
                    title: 'Select file to add to favorites'
                });
                
                if (fileUris && fileUris.length > 0) {
                    filePath = fileUris[0].fsPath;
                    console.log('User selected file to add to favorites:', filePath);
                }
            }
            
            if (filePath) {
                try {
                    await favoritesTreeProvider.addFileToFavorites(filePath);
                    vscode.window.showInformationMessage(`File ${path.basename(filePath)} added to favorites!`);
                } catch (error) {
                    console.error('Failed to add file to favorites:', error);
                    vscode.window.showErrorMessage(`Failed to add file to favorites: ${error instanceof Error ? error.message : String(error)}`);
                }
            } else {
                vscode.window.showErrorMessage('Failed to add file to favorites');
            }
        })
    );
    
    // 注册从常用功能移除命令
    context.subscriptions.push(
        vscode.commands.registerCommand('cursor-copilot.removeFromFavorites', async (item: FavoriteTreeItem) => {
            if (item) {
                await favoritesTreeProvider.removeFromFavorites(item);
                vscode.window.showInformationMessage('Removed from favorites!');
            }
        })
    );
    
    // 注册添加选中代码到常用功能命令
    context.subscriptions.push(
        vscode.commands.registerCommand('cursor-copilot.addCodeToFavorites', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor || !editor.selection || editor.selection.isEmpty) {
                vscode.window.showErrorMessage('Please select a code snippet first');
                return;
            }
            
            const document = editor.document;
            const selection = editor.selection;
            const selectedText = document.getText(selection);
            
            await favoritesTreeProvider.addCodeToFavorites(
                document.uri.fsPath,
                selection.start.line,
                selectedText
            );
            
            vscode.window.showInformationMessage('Code snippet added to favorites!');
        })
    );
    
    // 监听工作区变化，自动刷新项目视图和文档视图
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
        projectTreeProvider.refresh();
        docTreeProvider.refresh();
    });

    // 注册提示词生成命令
    context.subscriptions.push(
        vscode.commands.registerCommand('cursor-copilot.generatePrompt', () => {
            PromptGenPanel.show(context.extensionUri);
        })
    );
    
    // 将服务导出，使其他模块可以访问
    return {
        getPromptFileService: () => promptFileService
    };
}

/**
 * 当插件被停用时调用此函数
 * 可以在这里进行一些清理工作
 */
export function deactivate() {
    console.log('Cursor Copilot plugin deactivated!');
}
