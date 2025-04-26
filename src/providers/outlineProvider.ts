/**
 * 文件大纲视图提供器
 * 负责在侧边栏显示当前文件的大纲（函数、类等结构）
 */

import * as vscode from 'vscode';

/**
 * 大纲树节点类
 */
export class OutlineItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly symbol: vscode.DocumentSymbol,
        public readonly document: vscode.TextDocument
    ) {
        super(label, collapsibleState);
        
        // 设置图标
        this.iconPath = this.getIconForSymbolKind(symbol.kind);
        
        // 设置描述 - 显示行号
        this.description = `Line ${symbol.range.start.line + 1}`;
        
        // 设置工具提示 - 显示完整内容
        const symbolText = document.getText(symbol.range);
        this.tooltip = new vscode.MarkdownString(
            `**${label}** (${vscode.SymbolKind[symbol.kind]})\n\n` +
            `\`\`\`\n${symbolText.length > 500 ? symbolText.substring(0, 500) + '...' : symbolText}\n\`\`\``
        );
        
        // Set command - click to jump to symbol location
        this.command = {
            command: 'vscode.open',
            title: '跳转到定义',
            arguments: [
                document.uri,
                { 
                    selection: symbol.selectionRange
                }
            ]
        };
        
        // 支持拖放功能 - 设置上下文值和资源URI
        this.contextValue = 'outline-item';
    }
    
    /**
     * 根据符号类型获取对应图标
     */
    private getIconForSymbolKind(kind: vscode.SymbolKind): vscode.ThemeIcon {
        // 映射各种符号类型到对应的图标
        switch (kind) {
            case vscode.SymbolKind.File: 
                return new vscode.ThemeIcon('symbol-file');
            case vscode.SymbolKind.Module: 
                return new vscode.ThemeIcon('symbol-module');
            case vscode.SymbolKind.Namespace: 
                return new vscode.ThemeIcon('symbol-namespace');
            case vscode.SymbolKind.Package: 
                return new vscode.ThemeIcon('symbol-package');
            case vscode.SymbolKind.Class: 
                return new vscode.ThemeIcon('symbol-class');
            case vscode.SymbolKind.Method: 
                return new vscode.ThemeIcon('symbol-method');
            case vscode.SymbolKind.Property: 
                return new vscode.ThemeIcon('symbol-property');
            case vscode.SymbolKind.Field: 
                return new vscode.ThemeIcon('symbol-field');
            case vscode.SymbolKind.Constructor: 
                return new vscode.ThemeIcon('symbol-constructor');
            case vscode.SymbolKind.Enum: 
                return new vscode.ThemeIcon('symbol-enum');
            case vscode.SymbolKind.Interface: 
                return new vscode.ThemeIcon('symbol-interface');
            case vscode.SymbolKind.Function: 
                return new vscode.ThemeIcon('symbol-function');
            case vscode.SymbolKind.Variable: 
                return new vscode.ThemeIcon('symbol-variable');
            case vscode.SymbolKind.Constant: 
                return new vscode.ThemeIcon('symbol-constant');
            case vscode.SymbolKind.String: 
                return new vscode.ThemeIcon('symbol-string');
            case vscode.SymbolKind.Number: 
                return new vscode.ThemeIcon('symbol-number');
            case vscode.SymbolKind.Boolean: 
                return new vscode.ThemeIcon('symbol-boolean');
            case vscode.SymbolKind.Array: 
                return new vscode.ThemeIcon('symbol-array');
            case vscode.SymbolKind.Object: 
                return new vscode.ThemeIcon('symbol-object');
            case vscode.SymbolKind.Key: 
                return new vscode.ThemeIcon('symbol-key');
            case vscode.SymbolKind.Null: 
                return new vscode.ThemeIcon('symbol-null');
            case vscode.SymbolKind.EnumMember: 
                return new vscode.ThemeIcon('symbol-enum-member');
            case vscode.SymbolKind.Struct: 
                return new vscode.ThemeIcon('symbol-struct');
            case vscode.SymbolKind.Event: 
                return new vscode.ThemeIcon('symbol-event');
            case vscode.SymbolKind.Operator: 
                return new vscode.ThemeIcon('symbol-operator');
            case vscode.SymbolKind.TypeParameter: 
                return new vscode.ThemeIcon('symbol-parameter');
            default: 
                return new vscode.ThemeIcon('symbol-misc');
        }
    }
}

/**
 * 文件大纲视图提供器
 */
export class OutlineProvider implements vscode.TreeDataProvider<OutlineItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<OutlineItem | undefined | null | void> = new vscode.EventEmitter<OutlineItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<OutlineItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    private currentDocument: vscode.TextDocument | undefined;
    private symbols: vscode.DocumentSymbol[] | undefined;
    
    constructor() {
        // 监听编辑器切换事件
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                this.currentDocument = editor.document;
                this.refreshOutline();
            } else {
                this.currentDocument = undefined;
                this.symbols = undefined;
                this.refresh();
            }
        });
        
        // 监听文档内容变化事件
        vscode.workspace.onDidChangeTextDocument(e => {
            if (this.currentDocument && e.document.uri.toString() === this.currentDocument.uri.toString()) {
                this.refreshOutline();
            }
        });
        
        // 初始化当前文档
        if (vscode.window.activeTextEditor) {
            this.currentDocument = vscode.window.activeTextEditor.document;
            this.refreshOutline();
        }
    }
    
    /**
     * 刷新大纲视图
     */
    public refresh(): void {
        this._onDidChangeTreeData.fire();
    }
    
    /**
     * 刷新当前文档的大纲
     */
    private async refreshOutline(): Promise<void> {
        if (!this.currentDocument) {
            this.symbols = undefined;
            this.refresh();
            return;
        }
        
        try {
            // 获取文档符号
            const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
                'vscode.executeDocumentSymbolProvider',
                this.currentDocument.uri
            );
            
            this.symbols = symbols;
            this.refresh();
        } catch (error) {
            console.error('Error getting document symbols:', error);
            this.symbols = undefined;
            this.refresh();
        }
    }
    
    /**
     * 获取树项的子节点
     */
    getChildren(element?: OutlineItem): Thenable<OutlineItem[]> {
        if (!this.currentDocument || !this.symbols) {
            return Promise.resolve([]);
        }
        
        // 根节点返回顶层符号
        if (!element) {
            return Promise.resolve(
                this.symbols.map(symbol => 
                    new OutlineItem(
                        symbol.name,
                        symbol.children.length > 0
                            ? vscode.TreeItemCollapsibleState.Expanded
                            : vscode.TreeItemCollapsibleState.None,
                        symbol,
                        this.currentDocument!
                    )
                )
            );
        }
        
        // 返回子符号
        return Promise.resolve(
            element.symbol.children.map(symbol => 
                new OutlineItem(
                    symbol.name,
                    symbol.children.length > 0
                        ? vscode.TreeItemCollapsibleState.Expanded
                        : vscode.TreeItemCollapsibleState.None,
                    symbol,
                    this.currentDocument!
                )
            )
        );
    }
    
    /**
     * 获取指定元素
     */
    getTreeItem(element: OutlineItem): vscode.TreeItem {
        return element;
    }
}
