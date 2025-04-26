/**
 * prompt服务
 * 负责prompt的读取、写入和管理
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { IPrompt, createPrompt } from '../models/promptModel';

/**
 * prompt服务类
 * 管理基于文件系统的提示词
 */
export class PromptFileService {
    private readonly promptsDir: string;
    private defaultPromptsCreated: boolean = false;

    /**
     * 构造函数
     * @param context 扩展上下文
     */
    constructor(context: vscode.ExtensionContext) {
        // 使用全局存储路径而不是工作区
        this.promptsDir = path.join(context.globalStoragePath, 'prompts');
        this.ensurePromptsDirectory();
        this.ensureDefaultPrompts();
    }

    /**
     * 确保提示词目录存在
     */
    private ensurePromptsDirectory(): void {
        if (!fs.existsSync(this.promptsDir)) {
            fs.mkdirSync(this.promptsDir, { recursive: true });
        }
    }

    /**
     * 确保默认提示词存在
     */
    private ensureDefaultPrompts(): void {
        if (this.defaultPromptsCreated) {
            return;
        }

        try {
            // 检查是否已经存在提示词文件
            const existingFiles = fs.readdirSync(this.promptsDir);
            if (existingFiles.length > 0) {
                // 已经有文件存在，不再创建默认提示词
                this.defaultPromptsCreated = true;
                return;
            }
            
            // 创建默认提示词文件
            // 代码解释提示词
            this.savePromptToFile(
                createPrompt(
                    "Code Explanation",
                    "请解释以下代码的功能和工作原理，并指出任何潜在的问题或优化空间：\n\n```\n[粘贴代码在这里]\n```",
                    { 
                        filePath: this.generateFilePathFromTitle("Code Explanation"),
                        updatedAt: Date.now()
                    }
                )
            );
            
            // 代码重构提示词
            this.savePromptToFile(
                createPrompt(
                    "Code Refactoring",
                    "请帮我重构以下代码，使其更加简洁、高效和易于维护：\n\n```\n[粘贴代码在这里]\n```",
                    { 
                        filePath: this.generateFilePathFromTitle("Code Refactoring"),
                        updatedAt: Date.now()
                    }
                )
            );
            
            // 调试帮助提示词
            this.savePromptToFile(
                createPrompt(
                    "Debug Help",
                    "我的代码出现了以下错误，请帮我分析可能的原因和解决方案：\n\n错误信息：\n[粘贴错误信息]\n\n问题代码：\n```\n[粘贴代码在这里]\n```",
                    { 
                        filePath: this.generateFilePathFromTitle("Debug Help"),
                        updatedAt: Date.now()
                    }
                )
            );
            
            console.log('Default prompts created successfully');
            this.defaultPromptsCreated = true;
        } catch (error) {
            console.error('Failed to create default prompts:', error);
        }
    }

    /**
     * 获取所有prompt
     * @returns prompt数组
     */
    public getPromptFiles(): string[] {
        try {
            // 确保目录存在
            this.ensurePromptsDirectory();

            // 读取目录下所有 .md 文件
            return fs.readdirSync(this.promptsDir)
                .filter(file => file.endsWith('.md'))
                .map(file => path.join(this.promptsDir, file));
        } catch (error) {
            console.error('Failed to read prompt files:', error);
            return [];
        }
    }

    /**
     * 从文件读取提示词
     * @param filePath 文件路径
     * @returns 提示词对象
     */
    public readPromptFromFile(filePath: string): IPrompt | undefined {
        try {
            if (!fs.existsSync(filePath)) {
                return undefined;
            }

            // 读取文件内容
            const content = fs.readFileSync(filePath, 'utf8');
            
            // 使用文件名作为标题（去除扩展名）
            const title = path.basename(filePath, '.md');
            
            // 创建提示词对象
            return createPrompt(
                title,
                content,
                { 
                    filePath: filePath,
                    // 使用文件修改时间作为更新时间
                    updatedAt: fs.statSync(filePath).mtimeMs
                }
            );
        } catch (error) {
            console.error('Failed to read prompt file:', error);
            return undefined;
        }
    }

    /**
     * 获取所有提示词
     * @returns 提示词数组
     */
    public getAllPrompts(): IPrompt[] {
        const files = this.getPromptFiles();
        return files
            .map(file => this.readPromptFromFile(file))
            .filter((prompt): prompt is IPrompt => prompt !== undefined);
    }

    /**
     * 获取所有prompt夹
     * @returns 文件夹数组
     */
    public getAllPromptFolders(): { name: string, path: string }[] {
        try {
            // 确保目录存在
            this.ensurePromptsDirectory();
            
            // 读取提示词目录下的所有文件和文件夹
            const items = fs.readdirSync(this.promptsDir);
            const folders: { name: string, path: string }[] = [];
            
            // 过滤出文件夹
            for (const item of items) {
                const itemPath = path.join(this.promptsDir, item);
                try {
                    const stats = fs.statSync(itemPath);
                    if (stats.isDirectory()) {
                        folders.push({
                            name: item,
                            path: itemPath
                        });
                    }
                } catch (error) {
                    console.error(`读取文件夹信息失败: ${itemPath}`, error);
                }
            }
            
            return folders;
        } catch (error) {
            console.error('获取prompt夹失败:', error);
            return [];
        }
    }

    /**
     * 保存提示词到文件
     * @param prompt 提示词对象
     * @returns 保存后的文件路径
     */
    public savePromptToFile(prompt: IPrompt): string {
        // 确保目录存在
        this.ensurePromptsDirectory();
        
        // 如果已经有文件路径，使用原路径；否则根据标题生成新路径
        const filePath = prompt.filePath || this.generateFilePathFromTitle(prompt.title);
        
        // 只保存提示词内容，不添加标题
        fs.writeFileSync(filePath, prompt.content, 'utf8');
        
        return filePath;
    }

    /**
     * 从标题生成文件路径
     * @param title 提示词标题
     * @returns 文件路径
     */
    private generateFilePathFromTitle(title: string): string {
        // 清理标题，替换非法字符
        const cleanTitle = title
            .replace(/[\\/:*?"<>|]/g, '_')  // 替换非法字符
            .replace(/\s+/g, '_');  // 空格替换为下划线
        
        // 生成文件名
        const fileName = `${cleanTitle}.md`;
        
        return path.join(this.promptsDir, fileName);
    }

    /**
     * 删除prompt
     * @param filePath 文件路径
     * @returns 是否成功删除
     */
    public deletePromptFile(filePath: string): boolean {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to delete prompt file:', error);
            return false;
        }
    }

    /**
     * 获取工作区路径
     * @returns 工作区路径
     */
    public getWorkspacePath(): string {
        return this.promptsDir;
    }

    /**
     * 创建prompt夹
     * @param folderName 文件夹名称
     * @returns 是否成功创建
     */
    public createPromptFolder(folderName: string): boolean {
        try {
            // 确保根目录存在
            this.ensurePromptsDirectory();
            
            // 创建文件夹路径
            const folderPath = path.join(this.promptsDir, folderName);
            
            // 检查文件夹是否已存在
            if (fs.existsSync(folderPath)) {
                return false;
            }
            
            // 创建文件夹
            fs.mkdirSync(folderPath, { recursive: true });
            return true;
        } catch (error) {
            console.error('Failed to create prompt folder:', error);
            return false;
        }
    }
}
