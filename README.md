# Codeling 🍭

Codeling 是一个智能编程练习平台，旨在通过 AI 驱动的题目生成和多框架实时预览，帮助开发者提升编程技能。

[![Netlify Status](https://api.netlify.com/api/v1/badges/8f7b5e4c-1d2a-4b3c-9d8e-7f6e5d4c3b2a/deploy-status)](https://app.netlify.com/)

## 🚀 核心功能

- **AI 智能出题**：集成 Google Gemini AI，根据不同难度和分类自动生成高质量编程题目。
- **多框架支持**：实时切换 React 和 Vue 环境进行编程练习。
- **云端同步**：基于 Supabase 实现用户进度、代码草稿和个人配置的无缝同步。
- **实时预览**：内置强大的代码沙盒，支持代码实时编译与结果展示。
- **多语言支持**：支持中英文界面切换。

## 🛠️ 技术栈

- **Frontend**: React 18, Vite, TypeScript
- **Backend/BaaS**: [Supabase](https://supabase.com/) (Auth, Database)
- **AI**: [Google Gemini Pro API](https://ai.google.dev/)
- **Editor**: Monaco Editor / Vue REPL
- **Deployment**: Netlify

## 📦 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/echo-cqy/codeling.git
cd codeling
```

### 2. 环境配置

在根目录创建 `.env` 文件，并填写以下配置：

```env
# Supabase 配置
VITE_SUPABASE_URL="你的 Supabase 项目地址"
VITE_SUPABASE_ANON_KEY="你的 Supabase 匿名 Key"

# AI 配置
GEMINI_API_KEY="你的 Google AI API Key"
```

### 3. 安装依赖并启动

```bash
pnpm install
pnpm dev
```

## 🌐 部署说明 (Netlify)

本项目在 Netlify 部署时，建议使用 **Supabase Extension**。

**注意：** 为了使 Vite 能够识别环境变量，请确保在 Netlify 后台设置的变量名以 `VITE_` 开头：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`

## 📄 开源协议

本项目签署了 MIT 授权许可。
