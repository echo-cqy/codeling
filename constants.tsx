
import { Question, Difficulty } from './types';

export const MOCK_QUESTIONS: Question[] = [
  {
    id: '1',
    title: 'Counter Component',
    difficulty: Difficulty.EASY,
    description: 'Create a simple counter component with "Increment" and "Decrement" buttons. Ensure the count cannot go below zero.',
    category: 'Basic Hooks',
    tags: ['useState', 'Basics', 'Reactivity'],
    // Added missing createdAt property to satisfy the Question interface
    createdAt: 1715000000000,
    react: {
      initial: `import React, { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm text-center border border-pink-100">
      <h2 className="text-2xl font-bold mb-4 text-pink-500">Count: {count}</h2>
      <div className="flex gap-3 justify-center">
        <button 
          onClick={() => setCount(count + 1)}
          className="px-4 py-2 bg-pink-400 text-white rounded-lg font-bold hover:bg-pink-500 transition"
        >
          + Increment
        </button>
        <button 
          onClick={() => setCount(Math.max(0, count - 1))}
          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-gray-200 transition"
        >
          - Decrement
        </button>
      </div>
    </div>
  );
}`,
      solution: `import React, { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm text-center border border-pink-100">
      <h2 className="text-2xl font-bold mb-4 text-pink-500">Count: {count}</h2>
      <div className="flex gap-3 justify-center">
        <button 
          onClick={() => setCount(prev => prev + 1)}
          className="px-4 py-2 bg-pink-400 text-white rounded-lg font-bold hover:bg-pink-500 transition"
        >
          + Increment
        </button>
        <button 
          onClick={() => setCount(prev => Math.max(0, prev - 1))}
          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-gray-200 transition"
        >
          - Decrement
        </button>
      </div>
    </div>
  );
}`
    },
    vue: {
      initial: `<script setup>
import { ref } from 'vue';

const count = ref(0);
</script>

<template>
  <div class="p-6 bg-white rounded-xl shadow-sm text-center border border-pink-100">
    <h2 class="text-2xl font-bold mb-4 text-pink-500">Count: {{ count }}</h2>
    <div class="flex gap-3 justify-center">
      <!-- Add buttons here -->
    </div>
  </div>
</template>`,
      solution: `<script setup>
import { ref } from 'vue';

const count = ref(0);

const increment = () => count.value++;
const decrement = () => {
  if (count.value > 0) count.value--;
};
</script>

<template>
  <div class="p-6 bg-white rounded-xl shadow-sm text-center border border-pink-100">
    <h2 class="text-2xl font-bold mb-4 text-pink-500">Count: {{ count }}</h2>
    <div class="flex gap-3 justify-center">
      <button 
        @click="increment"
        class="px-4 py-2 bg-pink-400 text-white rounded-lg font-bold hover:bg-pink-500 transition"
      >
        + Increment
      </button>
      <button 
        @click="decrement"
        class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-gray-200 transition"
      >
        - Decrement
      </button>
    </div>
  </div>
</template>`
    }
  },
  {
    id: '2',
    title: 'Progress Bar',
    difficulty: Difficulty.EASY,
    description: 'Implement a progress bar that animates from its current width to a new width whenever the value prop changes.',
    category: 'Styling',
    tags: ['Transition', 'CSS'],
    // Added missing createdAt property to satisfy the Question interface
    createdAt: 1715000000000,
    react: {
      initial: `import React, { useState } from 'react';

export default function ProgressBar() {
  const [val, setVal] = useState(45);

  return (
    <div className="w-full max-w-sm p-4">
      <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden mb-4">
         {/* Implement bar here */}
      </div>
      <input 
        type="range" value={val} onChange={e => setVal(e.target.value)} 
        className="w-full accent-pink-400"
      />
    </div>
  );
}`,
      solution: `import React, { useState } from 'react';

export default function ProgressBar() {
  const [val, setVal] = useState(45);

  return (
    <div className="w-full max-w-sm p-4">
      <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden mb-4 border border-pink-50">
         <div 
           className="h-full bg-gradient-to-r from-pink-300 to-pink-500 transition-all duration-500 ease-out"
           style={{ width: \`\${val}%\` }}
         />
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-pink-400">{val}%</span>
        <input 
          type="range" value={val} onChange={e => setVal(e.target.value)} 
          className="accent-pink-400"
        />
      </div>
    </div>
  );
}`
    },
    vue: {
      initial: `<script setup>
import { ref } from 'vue';
const val = ref(45);
</script>

<template>
  <div class="w-full max-w-sm p-4">
    <div class="w-full bg-gray-100 rounded-full h-4 overflow-hidden mb-4">
       <!-- Progress bar -->
    </div>
    <input type="range" v-model="val" class="w-full accent-pink-400" />
  </div>
</template>`,
      solution: `<script setup>
import { ref } from 'vue';
const val = ref(60);
</script>

<template>
  <div class="w-full max-w-sm p-4">
    <div class="w-full bg-gray-100 rounded-full h-4 overflow-hidden mb-4 border border-pink-50">
       <div 
         class="h-full bg-gradient-to-r from-pink-300 to-pink-500 transition-all duration-500 ease-out"
         :style="{ width: val + '%' }"
       ></div>
    </div>
    <div class="flex justify-between items-center">
      <span class="text-xs font-bold text-pink-400">{{ val }}%</span>
      <input type="range" v-model="val" min="0" max="100" class="accent-pink-400" />
    </div>
  </div>
</template>`
    }
  }
];
