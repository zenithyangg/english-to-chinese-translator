# English to Chinese Translator for VS Code

一个简单高效的 VS Code 英文翻译扩展，支持悬停翻译和选中翻译功能。

## ✨ 主要功能

- 🔍 **悬停翻译**：将鼠标悬停在英文单词上即可查看中文翻译
- ✨ **选中翻译**：选中任意英文文本，右键选择“翻译选中的文本”或使用快捷键进行翻译
- ⌨️ **快捷键支持**：快速翻译选中的文本

## 📋 使用方法

### 悬停翻译

1. 将鼠标悬停在英文单词上
2. 片刻后显示对应的中文翻译

### 选中翻译

1. 选择任意英文文本（单词、短语或句子）
2. 使用以下任一方式触发翻译：
   - 右键单击，选择“翻译选中的文本”
   - 使用快捷键（见下方）

## ⌨️ 快捷键

- macOS：`Cmd+Shift+T`
- Windows/Linux：`Ctrl+Shift+T`

## 🔧 支持的文件类型

- 纯文本（.txt）
- Markdown（.md）
- JavaScript（.js）
- TypeScript（.ts）
- Python（.py）
- HTML（.html）
- CSS（.css）

## 📦 安装

- Marketplace：在 VS Code 扩展商店搜索 “English to Chinese Translator”
- 本地开发：`npm install` → `npm run compile`，再按 VS Code 扩展开发流程运行/调试

## 🔐 隐私与网络

- 翻译请求会通过网络发送到 `https://translate.googleapis.com/`。
- 被翻译的文本会离开本地环境；请避免对敏感信息进行翻译。

## 🐛 已知问题

- 翻译速度可能受网络状况影响
- 极少数专业术语可能翻译不准确

## 📝 更新记录

### 1.0.1

- 2026-03-20（第 2 次修改）：移除扩展激活弹窗提示

### 1.0.0

- 初始版本：支持悬停翻译与选中翻译

## 🙏 反馈与贡献

如果您有任何问题、建议或想要贡献代码，请访问我们的 [GitHub 仓库](https://github.com/zenithyangg/english-to-chinese-translator)。
