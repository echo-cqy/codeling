# Codeling - Frontend Hand Coding Trainer

## Netlify 部署说明

### 重要：清除构建缓存

在重新部署前，请按照以下步骤清除 Netlify 构建缓存：

1. 登录 Netlify Dashboard
2. 进入你的站点设置
3. 前往 **Site settings** > **Build & deploy** > **Build settings**
4. 点击 **Clear cache and retry deploy**

或者使用命令行：
```bash
netlify deploy --clear-cache
```

### 部署配置

- Node.js 版本: 20.x
- 包管理器: npm (Node.js 20 自带的 npm 10.8.2)
- 构建命令: `npm install && npm run build`
- 发布目录: `dist`

### 环境变量

需要在 Netlify Dashboard 中配置：
- `GEMINI_API_KEY`: 你的 Google Gemini API Key

### 常见问题

#### npm 安装失败 "Exit handler never called"

**原因**: Netlify 缓存导致 npm 版本冲突

**解决方案**:
1. 确保 `package.json` 中只有 `"node": "20.x"`，没有 npm 版本限制
2. 确保 `netlify.toml` 中没有 `NPM_VERSION` 配置
3. 在 Netlify Dashboard 中清除构建缓存
4. 重新部署

#### 构建成功但运行时出错

检查环境变量是否正确配置，特别是 `GEMINI_API_KEY`。
