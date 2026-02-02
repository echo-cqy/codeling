
import { Framework } from '../types';

export const playgroundService = {
  generateHtml: (code: string, framework: Framework): string => {
    // Helper to escape strings for template literals in generated JS
    const escapeJS = (str: string) => {
      return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${');
    };

    if (framework === 'react') {
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
              body { margin: 0; padding: 0; background: white; font-family: sans-serif; overflow-x: hidden; }
              #root { width: 100%; height: 100vh; display: flex; flex-direction: column; }
              #root > * { flex: 1; }
              ::-webkit-scrollbar { width: 4px; }
              ::-webkit-scrollbar-thumb { background: #ffcfd2; border-radius: 10px; }
            </style>
          </head>
          <body>
            <div id="root"></div>
            <script>
              window.exports = {};
              window.module = { exports: window.exports };
              
              const { useState, useEffect, useCallback, useMemo, useRef, useReducer, useContext, useLayoutEffect } = React;
              
              try {
                const transformed = Babel.transform(\`${escapeJS(cleanCode)}\`, {
                  presets: [
                    ['react', { runtime: 'classic' }],
                    ['env', { modules: 'commonjs' }]
                  ],
                }).code;
                
                eval(transformed);
                
                const Target = window.exports.default || window.module.exports || window.exports.App || window.App;
                
                if (Target) {
                  const root = ReactDOM.createRoot(document.getElementById('root'));
                  root.render(React.createElement(Target));
                } else {
                  throw new Error("未能找到导出的组件。请确保代码包含 'export default function App() { ... }'");
                }
              } catch (e) {
                document.getElementById('root').innerHTML = \`
                  <div style="color: #ff6b81; font-family: monospace; font-size: 13px; padding: 1.5rem; border: 2px solid #ffeef0; background: #fffafb; border-radius: 1rem; margin: 1rem;">
                    <b>⚠️ 渲染错误:</b> <br/> \${e.message}
                  </div>
                \`;
              }
            </script>
          </body>
        </html>
      `;
    } else {
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
              body { margin: 0; padding: 0; background: white; font-family: sans-serif; }
              #app { min-height: 100vh; }
              ${style}
            </style>
          </head>
          <body>
            <div id="app"></div>
            <script>
              const { createApp, ref, reactive, computed, watch, onMounted, onUnmounted, nextTick, provide, inject } = Vue;
              
              // Enhanced Vue SFC Macros Mock
              window.defineProps = (config) => {
                const p = {};
                if (Array.isArray(config)) {
                  config.forEach(key => p[key] = undefined);
                } else if (typeof config === 'object') {
                  Object.keys(config).forEach(key => {
                    const val = config[key];
                    // Handle default values if provided: defineProps({ data: { default: () => [] } })
                    if (val && typeof val === 'object' && 'default' in val) {
                      p[key] = typeof val.default === 'function' ? val.default() : val.default;
                    } else {
                      p[key] = undefined;
                    }
                  });
                }
                return reactive(p);
              };
              
              window.defineEmits = () => (event, ...args) => console.log('Emitted:', event, args);
              window.defineExpose = () => {};
              window.defineOptions = () => {};
              window.defineSlots = () => ({});
              window.defineModel = () => ref();

              try {
                const App = {
                  template: \`${escapeJS(template)}\`,
                  setup() {
                    const __script = \`${escapeJS(script.replace(/import .* from .*/g, ''))}\`;
                    
                    // Re-run the script in the setup context and try to capture variables
                    eval(__script);

                    const __context = {};
                    // Match top-level variable and function declarations
                    const __declarations = __script.matchAll(/(?:const|let|var|function)\\s+([a-zA-Z0-9_$]+)/g);
                    for (const m of __declarations) {
                      const name = m[1];
                      try {
                        if (eval('typeof ' + name) !== 'undefined') {
                          __context[name] = eval(name);
                        }
                      } catch(e) {}
                    }
                    
                    return __context;
                  }
                };
                createApp(App).mount('#app');
              } catch (e) {
                document.getElementById('app').innerHTML = \`
                  <div style="color: #ff6b81; font-family: monospace; font-size: 13px; padding: 1.5rem; border: 2px solid #ffeef0; background: #fffafb; border-radius: 1rem; margin: 1rem;">
                    <b>预览错误:</b> \${e.message}
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
