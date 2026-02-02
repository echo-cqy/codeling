
import { Framework } from '../types';

export const playgroundService = {
  /**
   * Generates HTML for React.
   * Note: Vue is now handled directly via @vue/repl in EditorPane.
   */
  generateHtml: (code: string, framework: Framework): string => {
    if (framework !== 'react') return '';

    const escapeJS = (str: string) => {
      return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${');
    };

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
            #root { width: 100%; min-height: 100vh; display: flex; flex-direction: column; }
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
                throw new Error("Missing export. Use 'export default function App() { ... }'");
              }
            } catch (e) {
              document.getElementById('root').innerHTML = \`
                <div style="color: #ff6b81; font-family: monospace; font-size: 13px; padding: 1.5rem; border: 2px solid #ffeef0; background: #fffafb; border-radius: 1rem; margin: 1rem;">
                  <b>⚠️ Error:</b> <br/> \${e.message}
                </div>
              \`;
            }
          </script>
        </body>
      </html>
    `;
  }
};
