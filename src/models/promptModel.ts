/**
 * 提示词数据模型
 * 定义了提示词的数据结构和相关接口
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * 提示词接口定义
 */
export interface IPrompt {
    id: string;          // 唯一标识符
    title: string;       // 标题
    content: string;     // 提示词内容
    createdAt: number;   // 创建时间戳
    updatedAt: number;   // 更新时间戳
    usageCount: number;  // 使用次数
    folderId?: string;   // 所属文件夹ID（可选）
    filePath?: string;   // 文件路径（用于基于文件的提示词）
}

/**
 * prompt夹接口定义
 */
export interface IPromptFolder {
    id: string;          // 文件夹ID
    name: string;        // 文件夹名称
    createdAt: number;   // 创建时间
}

/**
 * 创建一个新的提示词
 * @param title 提示词标题
 * @param content 提示词内容
 * @param options 可选参数，可以包含folderId或文件相关信息
 * @returns 新创建的提示词对象
 */
export function createPrompt(
    title: string, 
    content: string, 
    options?: string | { filePath?: string; updatedAt?: number; folderId?: string }
): IPrompt {
    const now = Date.now();
    
    // 处理不同类型的options参数
    let folderId: string | undefined;
    let filePath: string | undefined;
    let updatedTime: number = now;
    
    if (typeof options === 'string') {
        // 如果options是字符串，当作folderId处理
        folderId = options;
    } else if (options && typeof options === 'object') {
        // 如果options是对象，提取其中的属性
        folderId = options.folderId;
        filePath = options.filePath;
        updatedTime = options.updatedAt || now;
    }
    
    return {
        id: uuidv4(),
        title,
        content,
        createdAt: now,
        updatedAt: updatedTime,
        usageCount: 0,
        folderId,
        filePath
    };
}

/**
 * 创建一个新的prompt夹
 * @param name 文件夹名称
 * @returns 新创建的文件夹对象
 */
export function createFolder(name: string): IPromptFolder {
    const now = Date.now();
    return {
        id: uuidv4(),
        name,
        createdAt: now
    };
}
