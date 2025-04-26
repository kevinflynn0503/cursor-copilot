/**
 * 工具函数集合
 */

/**
 * 生成随机nonce字符串，用于WebView内容安全策略
 * 防止恶意脚本注入
 */
export function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
