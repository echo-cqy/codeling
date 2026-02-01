
import { Framework } from '../types';

export const playgroundService = {
  generateHtml: (code: string, framework: Framework): string => {
    if (framework === 'react') {
      // 移除 import 语句，UMD 版 React 已在全局
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
              body { margin: 0; padding: 1.5rem; background: white; font-family: sans-serif; overflow-x: hidden; }
              #root { width: 100%; height: 100%; }
              ::-webkit-scrollbar { width: 4px; }
              ::-webkit-scrollbar-thumb { background: #ffcfd2; border-radius: 10px; }
            </style>
          </head>
          <body>
            <div id="root"></div>
            <script>
              // 关键修复：模拟 CommonJS 模块环境
              window.exports = {};
              window.module = { exports: window.exports };
              
              const { useState, useEffect, useCallback, useMemo, useRef, useReducer, useContext, useLayoutEffect } = React;
              
              try {
                // 使用 Babel 转换，默认会将 export 转换为 exports 对象的操作
                const transformed = Babel.transform(\`${cleanCode.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`, {
                  presets: ['react', ['env', { modules: 'commonjs' }]],
                }).code;
                
                eval(transformed);
                
                // 从 exports 中寻找组件
                const Target = window.exports.default || window.module.exports || window.exports.App;
                
                if (Target) {
                  const root = ReactDOM.createRoot(document.getElementById('root'));
                  root.render(React.createElement(Target));
                } else {
                  throw new Error("找不到导出的 React 组件。请确保使用了 'export default'。");
                }
              } catch (e) {
                document.getElementById('root').innerHTML = \`
                  <div style="color: #ff6b81; font-family: monospace; font-size: 13px; padding: 1rem; border: 2px solid #ffeef0; background: #fffafb; border-radius: 1rem;">
                    <b>⚠️ 渲染错误:</b> <br/> \${e.message}
                  </div>
                \`;
              }
            </script>
          </body>
        </html>
      `;
    } else {
      // Vue SFC 预览
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
              body { margin: 0; padding: 1.5rem; background: white; font-family: sans-serif; }
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
                document.getElementById('app').innerHTML = \`预览错误: \${e.message}\`;
              }
            </script>
          </body>
        </html>
      `;
    }
  }
};
