import * as vscode from 'vscode';
import fetch from 'node-fetch';

// 存储活动的装饰器
let activeDecorations: vscode.TextEditorDecorationType[] = [];

// 创建输出通道
const outputChannel = vscode.window.createOutputChannel('English to Chinese Translator');

// 翻译函数
async function translateText(text: string): Promise<string | null> {
    try {
        const response = await fetch(
            `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`
        );

        if (!response.ok) {
            throw new Error(`Translation request failed: ${response.statusText}`);
        }

        const data = await response.json();
        outputChannel.appendLine(`Translation response: ${JSON.stringify(data)}`);

        if (data && data[0] && data[0][0] && data[0][0][0]) {
            return data[0][0][0];
        }

        return '无法翻译';
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        outputChannel.appendLine(`Translation error: ${errorMessage}`);
        return '翻译服务暂时不可用，请稍后重试';
    }
}

export function activate(context: vscode.ExtensionContext) {
    // 显示激活消息
    outputChannel.appendLine('=== English to Chinese Translator is now active! ===');
    vscode.window.showInformationMessage('英汉翻译扩展已激活！');

    // 注册悬停提供器
    const hoverProvider = vscode.languages.registerHoverProvider('*', {
        async provideHover(document: vscode.TextDocument, position: vscode.Position) {
            // 尝试获取单词或选中的文本范围
            const wordRange = document.getWordRangeAtPosition(position, /[A-Za-z]+/) || 
                            document.getWordRangeAtPosition(position);
            
            if (!wordRange) {
                return null;
            }

            const text = document.getText(wordRange);
            if (!text || text.trim().length === 0) {
                return null;
            }

            outputChannel.appendLine(`Attempting to translate: ${text}`);

            try {
                const translation = await translateText(text);
                if (translation) {
                    // 创建悬停内容，使用简洁的样式
                    const content = new vscode.MarkdownString();
                    content.appendText(translation);  // 直接显示翻译结果
                    content.isTrusted = true;
                    
                    // 返回悬停提示，并将其定位在单词正上方
                    return new vscode.Hover(content, wordRange);
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                outputChannel.appendLine(`Translation error: ${errorMessage}`);
                const errorContent = new vscode.MarkdownString();
                errorContent.appendText('翻译失败');
                return new vscode.Hover(errorContent, wordRange);
            }
            return null;
        }
    });

    // 注册选中文本翻译命令
    const translateCommand = vscode.commands.registerTextEditorCommand(
        'english-to-chinese-translator.translate',
        async (textEditor: vscode.TextEditor) => {
            const selection = textEditor.selection;
            if (selection.isEmpty) {
                vscode.window.showInformationMessage('请先选择要翻译的文本');
                return;
            }

            const text = textEditor.document.getText(selection);
            if (!text || text.trim().length === 0) {
                vscode.window.showInformationMessage('所选文本为空');
                return;
            }

            outputChannel.appendLine(`Attempting to translate selection: ${text}`);

            try {
                const translation = await translateText(text);
                if (translation) {
                    // 清除之前的装饰器
                    activeDecorations.forEach(d => d.dispose());
                    activeDecorations = [];

                    // 创建新的装饰器
                    const decorationType = vscode.window.createTextEditorDecorationType({
                        dark: {
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '3px'
                        },
                        light: {
                            backgroundColor: 'rgba(0, 0, 0, 0.03)',
                            border: '1px solid rgba(0, 0, 0, 0.1)',
                            borderRadius: '3px'
                        },
                        before: {
                            contentText: '📝 ',
                            margin: '0.2em'
                        },
                        after: {
                            contentText: `  ${translation}`,
                            color: new vscode.ThemeColor('editorCodeLens.foreground'),
                            margin: '0.2em 2em',
                            backgroundColor: 'var(--vscode-editor-background)'
                        }
                    });

                    // 保存装饰器引用
                    activeDecorations.push(decorationType);

                    // 应用装饰器
                    textEditor.setDecorations(decorationType, [selection]);

                    // 8秒后移除装饰器
                    setTimeout(() => {
                        decorationType.dispose();
                        const index = activeDecorations.indexOf(decorationType);
                        if (index > -1) {
                            activeDecorations.splice(index, 1);
                        }
                    }, 8000);
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`翻译错误: ${errorMessage}`);
            }
        }
    );

    // 注册扩展项
    context.subscriptions.push(hoverProvider, translateCommand);
}

// 扩展停用时清理资源
export function deactivate() {
    // 清理所有活动的装饰器
    activeDecorations.forEach(d => d.dispose());
    activeDecorations = [];
}
