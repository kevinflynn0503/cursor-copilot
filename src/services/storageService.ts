/**
 * 存储服务
 * 负责提示词数据的持久化存储和读取
 */

import * as vscode from 'vscode';
import { IPrompt, IPromptFolder, createPrompt } from '../models/promptModel';
import { IFavoriteItem } from '../providers/favoritesTreeProvider';

// 存储键名
const PROMPTS_STORAGE_KEY = 'cursor-copilot.prompts';
const FAVORITES_STORAGE_KEY = 'cursor-copilot.favorites';
const FOLDERS_STORAGE_KEY = 'cursor-copilot.folders';

/**
 * 提示词存储服务类
 * 负责将提示词数据保存到VS Code的全局状态存储中
 */
export class StorageService {
    private context: vscode.ExtensionContext;

    /**
     * 构造函数
     * @param context VS Code扩展上下文
     */
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        
        // 检查是否是首次启动，如果是则初始化默认提示词
        this.initializeDefaultPromptsIfNeeded();
    }
    
    /**
     * 如果没有提示词，初始化默认提示词
     */
    private async initializeDefaultPromptsIfNeeded(): Promise<void> {
        const prompts = this.getPrompts();
        
        // 只有在没有任何提示词的情况下才初始化默认提示词
        if (prompts.length === 0) {
            // 不再需要默认提示词，由文件服务负责创建默认文件
            // 此处仅初始化空数组
            const defaultPromptObjects: IPrompt[] = [];
            await this.savePrompts(defaultPromptObjects);
        }
    }

    /**
     * 获取所有提示词
     * @returns 提示词数组
     */
    public getPrompts(): IPrompt[] {
        const prompts = this.context.globalState.get<IPrompt[]>(PROMPTS_STORAGE_KEY);
        return prompts || [];
    }

    /**
     * 保存所有提示词
     * @param prompts 提示词数组
     */
    public async savePrompts(prompts: IPrompt[]): Promise<void> {
        await this.context.globalState.update(PROMPTS_STORAGE_KEY, prompts);
    }

    /**
     * 添加一个新提示词
     * @param prompt 新提示词
     */
    public async addPrompt(prompt: IPrompt): Promise<void> {
        const prompts = this.getPrompts();
        prompts.push(prompt);
        await this.savePrompts(prompts);
    }

    /**
     * 更新一个提示词
     * @param updatedPrompt 更新后的提示词
     */
    public async updatePrompt(updatedPrompt: IPrompt): Promise<void> {
        const prompts = this.getPrompts();
        const index = prompts.findIndex(p => p.id === updatedPrompt.id);
        
        if (index !== -1) {
            // 更新提示词，保留使用次数
            updatedPrompt.usageCount = prompts[index].usageCount;
            updatedPrompt.updatedAt = Date.now();
            prompts[index] = updatedPrompt;
            await this.savePrompts(prompts);
        }
    }

    /**
     * 删除一个提示词
     * @param id 要删除的提示词ID
     */
    public async deletePrompt(id: string): Promise<void> {
        const prompts = this.getPrompts();
        const filteredPrompts = prompts.filter(p => p.id !== id);
        
        if (filteredPrompts.length !== prompts.length) {
            await this.savePrompts(filteredPrompts);
        }
    }

    /**
     * 根据ID查找提示词
     * @param id 提示词ID
     * @returns 找到的提示词，如果未找到则返回undefined
     */
    public getPromptById(id: string): IPrompt | undefined {
        const prompts = this.getPrompts();
        return prompts.find(p => p.id === id);
    }

    /**
     * 增加提示词的使用次数
     * @param id 提示词ID
     */
    public async incrementUsageCount(id: string): Promise<void> {
        const prompts = this.getPrompts();
        const index = prompts.findIndex(p => p.id === id);
        
        if (index !== -1) {
            prompts[index].usageCount += 1;
            await this.savePrompts(prompts);
        }
    }

    /**
     * 获取所有文件夹
     * @returns 文件夹数组
     */
    public getFolders(): IPromptFolder[] {
        const folders = this.context.globalState.get<IPromptFolder[]>(FOLDERS_STORAGE_KEY);
        return folders || [];
    }
    
    /**
     * 保存所有文件夹
     * @param folders 文件夹数组
     */
    public async saveFolders(folders: IPromptFolder[]): Promise<void> {
        await this.context.globalState.update(FOLDERS_STORAGE_KEY, folders);
    }
    
    /**
     * 添加一个新文件夹
     * @param folder 新文件夹
     */
    public async addFolder(folder: IPromptFolder): Promise<void> {
        const folders = this.getFolders();
        folders.push(folder);
        await this.saveFolders(folders);
    }
    
    /**
     * 删除一个文件夹
     * @param id 要删除的文件夹ID
     */
    public async deleteFolder(id: string): Promise<void> {
        const folders = this.getFolders();
        const filteredFolders = folders.filter(f => f.id !== id);
        
        if (filteredFolders.length !== folders.length) {
            await this.saveFolders(filteredFolders);
            
            // 删除文件夹时，更新所有属于该文件夹的提示词
            const prompts = this.getPrompts();
            const updatedPrompts = prompts.map(p => {
                if (p.folderId === id) {
                    return {...p, folderId: undefined};
                }
                return p;
            });
            
            await this.savePrompts(updatedPrompts);
        }
    }
    
    /**
     * 更新文件夹名称
     * @param id 文件夹ID
     * @param newName 新名称
     */
    public async updateFolderName(id: string, newName: string): Promise<void> {
        const folders = this.getFolders();
        const index = folders.findIndex(f => f.id === id);
        
        if (index !== -1) {
            folders[index].name = newName;
            await this.saveFolders(folders);
        }
    }

    /**
     * 获取所有常用项
     * @returns 常用项数组
     */
    public getFavorites(): IFavoriteItem[] {
        const favorites = this.context.globalState.get<IFavoriteItem[]>(FAVORITES_STORAGE_KEY);
        return favorites || [];
    }

    /**
     * 保存所有常用项
     * @param favorites 常用项数组
     */
    public async saveFavorites(favorites: IFavoriteItem[]): Promise<void> {
        await this.context.globalState.update(FAVORITES_STORAGE_KEY, favorites);
    }

    /**
     * 添加一个常用项
     * @param favorite 要添加的常用项
     */
    public async addFavorite(favorite: IFavoriteItem): Promise<void> {
        const favorites = this.getFavorites();
        
        // 检查是否已存在相同路径的文件
        if (favorite.type === 'file') {
            const existingIndex = favorites.findIndex(f => 
                f.type === 'file' && f.path === favorite.path
            );
            
            if (existingIndex !== -1) {
                // 如果已存在，替换原有条目
                favorites[existingIndex] = favorite;
                await this.saveFavorites(favorites);
                return;
            }
        }
        
        // 新增常用项
        favorites.push(favorite);
        await this.saveFavorites(favorites);
    }

    /**
     * 删除一个常用项
     * @param id 要删除的常用项ID
     */
    public async removeFavorite(id: string): Promise<void> {
        const favorites = this.getFavorites();
        const filteredFavorites = favorites.filter(f => f.id !== id);
        
        if (filteredFavorites.length !== favorites.length) {
            await this.saveFavorites(filteredFavorites);
        }
    }
}
