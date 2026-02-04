# Codeling 代码架构重构规划方案

## 1. 现状问题总结
- **App.tsx (1000+ 行)**: 承担了过多的职责，包括状态管理、数据同步逻辑、多个 Modal 的渲染、侧边栏和主视图布局。
- **EditorPane.tsx (500+ 行)**: 预览逻辑、编辑器初始化、历史记录管理耦合在一起。
- **逻辑耦合**: 业务逻辑（如同步、过滤、统计）直接散落在组件内部，难以测试和复用。
- **目录扁平**: `components` 目录下组件众多，缺乏层次感。

## 2. 目标架构设计

### 2.1 目录结构调整 (建议)
```text
/src (或根目录)
  ├── components/          # UI 组件
  │   ├── layout/          # 布局相关: Sidebar, Header, MainLayout
  │   ├── editor/          # 编辑器相关: EditorPane, MonacoWrapper, Preview, HistorySidebar
  │   ├── modals/          # 弹窗相关: AuthModal, SettingsModal, ImportModal...
  │   ├── question/        # 题目相关: QuestionList, QuestionHeader
  │   ├── stats/           # 统计相关: StatsView, ChartCards
  │   └── shared/          # 通用组件: Button, Input, MarkdownViewer, Feedback
  ├── hooks/               # 业务逻辑封装 (Custom Hooks)
  │   ├── useQuestions.ts  # 题目列表、过滤、CRUD 逻辑
  │   ├── useSync.ts       # 与 Supabase 的同步逻辑
  │   ├── useStats.ts      # 用户统计数据管理
  │   ├── useSettings.ts   # 全局配置与 Modal 状态管理
  │   └── useEditor.ts     # 编辑器状态与自动保存逻辑
  ├── contexts/            # 核心上下文 (Auth 等)
  ├── services/            # 基础服务 (API, Storage)
  ├── types/               # 类型定义
  └── utils/               # 工具函数
```

### 2.2 核心 Custom Hooks 定义

#### `useQuestions` (管理题目核心逻辑)
```typescript
export const useQuestions = () => {
  // 状态: questions, filteredQuestions, activeCategory, magicTopic
  // 方法: addQuestion, deleteQuestion, updateQuestion, generateMagicQuestion
  // 返回: { questions, filteredQuestions, categories, activeCategory, setActiveCategory, ... }
}
```

#### `useSync` (管理远程同步逻辑)
```typescript
export const useSync = (user: User | null) => {
  // 状态: isSyncing, lastSyncedAt, showMigrationModal
  // 方法: triggerPush, triggerPull, handleMigration
  // 封装 App.tsx 中复杂的同步 Effect
}
```

#### `useEditor` (管理编辑器内部状态)
```typescript
export const useEditor = (questionId: string, framework: string) => {
  // 状态: activeSource (draft/solution/history), isDrafting
  // 方法: saveDraft, restoreFromHistory, switchSource
}
```

## 3. 分阶段重构路线图

### 第一阶段：逻辑抽离 (Hooks 化)
1. **useQuestions**: 将 `App.tsx` 中的题目过滤、分类、CRUD 逻辑移入此 Hook。
2. **useSync**: 将 `App.tsx` 中的 Supabase 同步 Effect 和 Migration 逻辑移入此 Hook。
3. **useSettings**: 管理语言切换、AI 配置、以及多个 Modal 的打开状态。

### 第二阶段：组件拆分 (App.tsx 瘦身)
1. **拆分 Sidebar**: 包含分类过滤、搜索、题目列表。
2. **拆分 Header**: 包含视图切换、语言/设置按钮、用户头像。
3. **拆分 Modals**: 将 `App.tsx` 中内联的 Modal 代码（如 ManualAdd, Settings）提取到 `components/modals`。

### 第三阶段：深度重构 (EditorPane 拆解)
1. **MonacoWrapper**: 封装 Monaco Editor 的初始化和配置。
2. **PreviewContainer**: 独立处理 React 和 Vue 的预览逻辑（支持动态加载）。
3. **HistorySidebar**: 独立管理练习历史记录。

### 第四阶段：样式与性能优化
1. **Tailwind 构建集成**: 从 CDN 迁移到标准的 PostCSS 流程。
2. **React.memo**: 对大型列表和静态 UI 进行性能加固。

---
## 4. 后续行动建议
- 优先执行 **第一阶段** 的 `useQuestions` 抽离，这是风险最低且收益最高的改动。
- 在拆分组件时，保持 Props 接口的简洁，优先通过 Context 或 Hooks 获取全局状态。
