
import { Framework } from '../types';

export const playgroundService = {
  generateHtml: (code: string, framework: Framework): string => {
    if (framework === 'react') {
      // 移除 import 语句，UMD 版本的 React 已在全局
      const cleanCode = code.replace(/import\s+[\s\S]*?from\s+['"].*?['"];?/g, '');

      return `
        <!DOCTYPE html>
        <html>
          <head>
            <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
            <script src="https://cdn.tailwindcss.com"></script>
            <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
            <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
            <style>
              body { margin: 0; padding: 2rem; display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; background: white; font-family: sans-serif; }
              #root { width: 100%; }
            </style>
          </head>
          <body>
            <div id="root"></div>
            <script type="text/javascript">
              // 关键修复：在执行代码前模拟 CommonJS 环境
              // 这样 Babel 的 transform-modules-commonjs 插件就能正常工作
              window.exports = {};
              window.module = { exports: window.exports };
              
              // 暴露常用的 Hooks 到全局，减少用户心智负担
              const { useState, useEffect, useCallback, useMemo, useRef, useReducer, useContext, useLayoutEffect } = React;

              try {
                // 使用 Babel 转换代码
                // 启用 env 预设并包含 modules 转换，配合上面的 window.exports 注入
                const transformed = Babel.transform(\`${cleanCode.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`, {
                  presets: ['react', ['env', { modules: 'commonjs' }]],
                }).code;

                // 执行转换后的代码
                eval(transformed);

                // 优先从导出中寻找组件
                const Target = window.exports.default || window.module.exports || window.exports.App;

                if (Target) {
                  const root = ReactDOM.createRoot(document.getElementById('root'));
                  root.render(React.createElement(Target));
                } else {
                  // 如果没有导出，尝试匹配第一个大写字母开头的全局函数（Babel 转换后可能会挂载在全局）
                  // 或者提示用户
                  throw new Error("找不到可渲染的组件。请确保使用了 'export default' 导出你的组件。");
                }
              } catch (e) {
                document.getElementById('root').innerHTML = \`
                  <div style="color: #ff6b81; font-family: monospace; font-size: 13px; padding: 1.5rem; border: 2px solid #ffeef0; background: #fffafb; border-radius: 1.5rem; width: 100%;">
                    <b style="font-size: 15px; display: block; margin-bottom: 0.5rem;">⚠️ 预览渲染错误</b>
                    <pre style="white-space: pre-wrap; margin: 0;">\${e.message}</pre>
                  </div>
                \`;
              }
            </script>
          </body>
        </html>
      `;
    } else {
      // Vue SFC 预览逻辑
      const script = code.match(/<script setup>([\s\S]*?)<\/script>/)?.[1] || '';
      const template = code.match(/<template>([\s\S]*?)<\/template>/)?.[1] || '';
      const style = code.match(/<style>([\s\S]*?)<\/style>/)?.[1] || '';

      return `
        <!DOCTYPE html>
        <html>
          <head>
            <script src="https://cdn.tailwindcss.com"></script>
            <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
            <style>
              body { margin: 0; padding: 2rem; display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; background: white; font-family: sans-serif; }
              #app { width: 100%; }
              ${style}
            </style>
          </head>
          <body>
            <div id="app"></div>
            <script>
              const { createApp, ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } = Vue;
              try {
                const App = {
                  template: \`${template.replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`,
                  setup() {
                    ${script.replace(/import .* from .*/g, '')}
                    // 自动将 script setup 中的变量暴露给模板
                    const context = {};
                    const scriptStr = \`${script.replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`;
                    const varMatches = scriptStr.matchAll(/(?:const|let|var|function)\s+([a-zA-Z0-9_$]+)/g);
                    for (const m of varMatches) {
                       try { context[m[1]] = eval(m[1]); } catch(e) {}
                    }
                    return context;
                  }
                };
                createApp(App).mount('#app');
              } catch (e) {
                document.getElementById('app').innerHTML = \`
                  <div style="color: #ff6b81; font-family: monospace; font-size: 13px; padding: 1.5rem; border: 2px solid #ffeef0; background: #fffafb; border-radius: 1.5rem; width: 100%;">
                    <b style="font-size: 15px; display: block; margin-bottom: 0.5rem;">⚠️ Vue 预览错误</b>
                    <pre style="white-space: pre-wrap; margin: 0;">\${e.message}</pre>
                  </div>
                \`;
              }
            </script>
          </body>
        </html>
      `;
    }
  }
};
