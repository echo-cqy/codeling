
import { Question, Difficulty } from '../types';

export const markdownService = {
  /**
   * Parse a markdown string into a Question object.
   */
  parse: (content: string): Question | null => {
    try {
      // 1. Extract Title (First H1)
      const titleMatch = content.match(/^#\s+(.*)/m);
      if (!titleMatch) return null;
      const title = titleMatch[1].trim();

      // 2. Extract Meta Data
      const difficultyMatch = content.match(/- Difficulty:\s*(.*)/i);
      const categoryMatch = content.match(/- Category:\s*(.*)/i);
      const tagsMatch = content.match(/- Tags:\s*(.*)/i);

      let difficulty = Difficulty.EASY;
      if (difficultyMatch) {
        const d = difficultyMatch[1].trim().toLowerCase();
        if (d === 'medium') difficulty = Difficulty.MEDIUM;
        if (d === 'hard') difficulty = Difficulty.HARD;
      }

      const category = categoryMatch ? categoryMatch[1].trim() : 'General';
      const tags = tagsMatch ? tagsMatch[1].split(',').map(t => t.trim()).filter(Boolean) : [];

      // 3. Extract Code Blocks
      const extractCode = (langSection: string): string => {
        // Look for ## Section followed by a code block
        const regex = new RegExp(`##\\s+${langSection}[\\s\\S]*?\`\`\`(?:tsx|jsx|javascript|js|vue|html|xml)?\\n([\\s\\S]*?)\`\`\``, 'i');
        const match = content.match(regex);
        return match ? match[1].trim() : '';
      };

      const reactCode = extractCode('React');
      const vueCode = extractCode('Vue');

      // 4. Extract Description
      // We take everything between the Title and the first ## section as description
      const descStart = content.indexOf('\n', content.indexOf('#')) + 1;
      const firstSection = content.search(/\n##\s+/);
      let description = "";
      
      if (firstSection !== -1) {
        description = content.substring(descStart, firstSection).trim();
      } else {
        description = content.substring(descStart).trim();
      }

      // Cleanup meta lines from description if they were caught
      description = description
        .replace(/- Difficulty:.*\n?/gi, '')
        .replace(/- Category:.*\n?/gi, '')
        .replace(/- Tags:.*\n?/gi, '')
        .replace(/##\s+Meta\n?/gi, '')
        .trim();

      if (!title || (!reactCode && !vueCode)) return null;

      return {
        id: Math.random().toString(36).substr(2, 9),
        title,
        difficulty,
        category,
        tags,
        description: description || "No description provided.",
        createdAt: Date.now(),
        react: {
          initial: reactCode || "// Write your React code here",
          solution: ""
        },
        vue: {
          initial: vueCode || "<!-- Write your Vue code here -->",
          solution: ""
        }
      };
    } catch (e) {
      console.error("Markdown Parse Error:", e);
      return null;
    }
  },

  /**
   * Generate an example Markdown file content
   */
  generateExample: (): string => {
    return `# 示例题目：九宫格抽奖

这是一个经典的九宫格抽奖组件实现。

## Meta
- Difficulty: Medium
- Category: 游戏开发
- Tags: Animation, Grid, State

## React
\`\`\`jsx
import React, { useState } from 'react';

export default function Lottery() {
  const [active, setActive] = useState(-1);
  return (
    <div className="grid grid-cols-3 gap-2 p-4 bg-pink-50 rounded-xl">
      {[...Array(9)].map((_, i) => (
        <div 
          key={i} 
          className={\`w-16 h-16 rounded-lg flex items-center justify-center font-bold \${active === i ? 'bg-pink-500 text-white' : 'bg-white text-pink-300'}\`}
        >
          {i + 1}
        </div>
      ))}
    </div>
  );
}
\`\`\`

## Vue
\`\`\`vue
<script setup>
import { ref } from 'vue';
const active = ref(-1);
</script>

<template>
  <div class="grid grid-cols-3 gap-2 p-4 bg-pink-50 rounded-xl">
    <div 
      v-for="i in 9" 
      :key="i"
      :class="['w-16 h-16 rounded-lg flex items-center justify-center font-bold', active === i-1 ? 'bg-pink-500 text-white' : 'bg-white text-pink-300']"
    >
      {{ i }}
    </div>
  </div>
</template>
\`\`\`
`;
  }
};
