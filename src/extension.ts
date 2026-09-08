import * as vscode from 'vscode';
import fetch from 'node-fetch';
import { setTimeout as scheduleTimeout } from 'node:timers';

let activeDecorations: vscode.TextEditorDecorationType[] = [];

const outputChannel = vscode.window.createOutputChannel('English to Chinese Translator');
const translationCache = new Map<string, string>();

const REQUEST_HEADERS = {
    Accept: 'application/json, text/plain, */*',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
};
const REQUEST_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string): Promise<Awaited<ReturnType<typeof fetch>>> {
    const request = fetch(url, { headers: REQUEST_HEADERS });
    const timeout = new Promise<never>((_, reject) => {
        scheduleTimeout(() => reject(new Error('翻译请求超时')), REQUEST_TIMEOUT_MS);
    });
    return Promise.race([request, timeout]);
}

function joinGoogleSegments(data: unknown): string | null {
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
        return null;
    }

    const translated = data[0]
        .map((segment: unknown) => (Array.isArray(segment) && typeof segment[0] === 'string' ? segment[0] : ''))
        .join('')
        .trim();

    return translated || null;
}

async function translateWithGoogle(text: string): Promise<string | null> {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
        throw new Error(`Google translate HTTP ${response.status}`);
    }

    const data = await response.json();
    outputChannel.appendLine(`Google response: ${JSON.stringify(data)}`);
    return joinGoogleSegments(data);
}

async function translateWithChromeDict(text: string): Promise<string | null> {
    const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=en&tl=zh-CN&q=${encodeURIComponent(text)}`;
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
        throw new Error(`Chrome dict translate HTTP ${response.status}`);
    }

    const data = await response.json();
    outputChannel.appendLine(`Chrome dict response: ${JSON.stringify(data)}`);
    if (Array.isArray(data) && typeof data[0] === 'string' && data[0].trim()) {
        return data[0].trim();
    }
    return joinGoogleSegments(data);
}

async function translateText(text: string): Promise<string | null> {
    const cacheKey = text.trim();
    const cached = translationCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    const errors: string[] = [];
    for (const translator of [translateWithGoogle, translateWithChromeDict]) {
        try {
            const translation = await translator(text);
            if (translation) {
                translationCache.set(cacheKey, translation);
                return translation;
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            errors.push(errorMessage);
            outputChannel.appendLine(`Translation error: ${errorMessage}`);
        }
    }

    if (errors.length > 0) {
        throw new Error('翻译服务暂时不可用，请检查网络连接或代理设置');
    }
    return null;
}

function sanitizeDecorationText(text: string): string {
    return text.replace(/[\r\n]+/g, ' ').slice(0, 200);
}

export function activate(context: vscode.ExtensionContext) {
    outputChannel.appendLine('=== English to Chinese Translator is now active! ===');

    const hoverProvider = vscode.languages.registerHoverProvider('*', {
        async provideHover(document: vscode.TextDocument, position: vscode.Position) {
            const wordRange = document.getWordRangeAtPosition(position, /[A-Za-z]+(?:'[A-Za-z]+)?/) ||
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
                    const content = new vscode.MarkdownString();
                    content.appendText(translation);
                    return new vscode.Hover(content, wordRange);
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                outputChannel.appendLine(`Translation error: ${errorMessage}`);
                const errorContent = new vscode.MarkdownString();
                errorContent.appendText(errorMessage);
                return new vscode.Hover(errorContent, wordRange);
            }
            return null;
        }
    });

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
                if (!translation) {
                    vscode.window.showErrorMessage('无法翻译所选文本');
                    return;
                }

                activeDecorations.forEach(d => d.dispose());
                activeDecorations = [];

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
                        margin: '0 0.2em 0 0'
                    },
                    after: {
                        contentText: `  ${sanitizeDecorationText(translation)}`,
                        color: new vscode.ThemeColor('editorCodeLens.foreground'),
                        margin: '0 0 0 0.6em',
                        backgroundColor: new vscode.ThemeColor('editor.background')
                    }
                });

                activeDecorations.push(decorationType);
                textEditor.setDecorations(decorationType, [{ range: selection }]);
                vscode.window.setStatusBarMessage(`翻译: ${translation}`, 8000);

                setTimeout(() => {
                    decorationType.dispose();
                    const index = activeDecorations.indexOf(decorationType);
                    if (index > -1) {
                        activeDecorations.splice(index, 1);
                    }
                }, 8000);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`翻译错误: ${errorMessage}`);
            }
        }
    );

    context.subscriptions.push(hoverProvider, translateCommand, outputChannel);
}

export function deactivate() {
    activeDecorations.forEach(d => d.dispose());
    activeDecorations = [];
}
