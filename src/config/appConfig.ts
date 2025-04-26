/**
 * 应用配置文件
 * 集中管理所有配置项
 */

/**
 * 提示词类别枚举
 */
export enum PromptCategory {
    General = "通用"
}

/**
 * MCP配置
 */
export const mcpConfig = {
    // 模板类型列表
    templateTypes: [
        { value: "requirement document", label: "Requirement Document" },
        { value: "function list", label: "Function List" },
        { value: "development architecture", label: "Development Architecture" },
        { value: "frontend features", label: "Frontend Features" },
        { value: "backend features", label: "Backend Features" },
        { value: "database", label: "Database" },
        { value: "server api", label: "Server API" },
        { value: "api dependencies", label: "API Dependencies" },
        { value: "plugin dependencies", label: "Plugin Dependencies" },
        { value: "development plan", label: "Development Plan" },
        { value: "feature document", label: "Feature Document" }
    ],
    
    // AI模型配置
    defaultModel: "gpt-4",
    defaultApiBaseUrl: "https://api.example.com",
    
    // 提示词生成配置
    promptGen: {
        // 提示词生成模板
        promptTemplate: `
You are a professional AI prompt engineer tasked with creating an effective prompt.

Prompt Purpose:
{purpose}

Global Rules:
{rules}

Prompt Language:
{language}

Please create a well-structured, effective prompt based on the purpose and rules provided. Only return the prompt text itself, without any explanations, introductions, or additional formatting.
`
    },
    
    // 功能描述和帮助文本
    functionDescriptions: {
        generateDocument: "Generate product documentation based on user requirements, support multiple document templates",
        useDescription: "List all available tools and their parameters"
    },
    
    // 界面文本
    uiText: {
        title: "AI Document Generator",
        generateButton: "Generate Document",
        templateSelectLabel: "Select Template Type",
        titleInputLabel: "Document Title",
        descriptionInputLabel: "User Requirements",
        additionalInfoLabel: "Additional Information (Optional)",
        loadingText: "Generating document, please wait...",
        errorMessage: "Failed to generate document, please try again",
        successMessage: "Document generated successfully!"
    },
    
    // 各类模板的说明
    templateDescriptions: {
        "requirement document": "Describe the source, purpose, core requirements, and peripheral features",
        "function list": "Manage the functions to be developed, list all features",
        "development architecture": "Describe the technical architecture implementation plan, including frontend, backend, API, environment dependencies, and database design",
        "frontend features": "Describe the frontend features, including fonts, colors, styles, and UI components",
        "backend features": "Describe the backend features, including tools, functions, and methods",
        "database": "Describe the database design, including fields, class diagrams, and table relationships",
        "server api": "Describe the server-side interface design and implementation method",
        "API dependency": "List the API interfaces and usage methods of the project dependencies",
        "plugin dependency": "Describe the project dependencies of plugins and components",
        "development plan": "Outline development plan, explaining development order and priority",
        "feature document": "Separate feature documents according to development plan, ensuring good separation between features"
    }
};
