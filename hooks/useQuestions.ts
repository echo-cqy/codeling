import { useState, useMemo, useEffect, useCallback } from "react";
import { storageService } from "../services/storageService";
import { aiService } from "../services/aiService";
import { Question, Difficulty, Language, Framework } from "../types";

export const DEFAULT_REACT_INITIAL = `import React from 'react';\n\nexport default function App() {\n  return (\n    <div className="p-10">\n      <h1 className="text-2xl font-bold text-pink-500">Hello React</h1>\n    </div>\n  );\n}`;
export const DEFAULT_VUE_INITIAL = `<script setup>\nimport { ref } from 'vue';\nconst msg = ref('Hello Vue');\n</script>\n\n<template>\n  <div class="p-10">\n    <h1 class="text-2xl font-bold text-pink-500">{{ msg }}</h1>\n  </div>\n</template>`;

export const useQuestions = (lang: Language, onFeedback: (msg: string, type: "success" | "error") => void) => {
  const [questions, setQuestions] = useState<Question[]>(storageService.getQuestions());
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [magicTopic, setMagicTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [manualTab, setManualTab] = useState<"info" | "react" | "vue">("info");
  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    title: "",
    difficulty: Difficulty.EASY,
    category: "",
    description: "",
    react: { initial: DEFAULT_REACT_INITIAL, solution: "" },
    vue: { initial: DEFAULT_VUE_INITIAL, solution: "" },
    tags: [],
  });

  const categories = useMemo(() => {
    const cats = new Set(questions.map((q) => q.category));
    return ["All", ...Array.from(cats)].filter(Boolean);
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    const term = magicTopic.toLowerCase();
    return questions.filter((q) => {
      const matchesSearch =
        q.title.toLowerCase().includes(term) ||
        q.tags.some((tag) => tag.toLowerCase().includes(term));
      const matchesCategory =
        activeCategory === "All" || q.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [questions, magicTopic, activeCategory]);

  useEffect(() => {
    if (!selectedQuestion && questions.length > 0) {
      setSelectedQuestion(questions[0]);
    }
  }, [questions, selectedQuestion]);

  const refreshQuestions = useCallback(() => {
    const q = storageService.getQuestions();
    setQuestions(q);
    return q;
  }, []);

  const handleDeleteQuestion = useCallback(
    (id: string, deleteConfirmMsg: string) => {
      if (confirm(deleteConfirmMsg)) {
        storageService.deleteQuestion(id);
        const updated = refreshQuestions();
        if (selectedQuestion?.id === id) {
          setSelectedQuestion(updated.length > 0 ? updated[0] : null);
        }
        onFeedback("DELETED 🗑️", "success");
      }
    },
    [selectedQuestion, refreshQuestions, onFeedback]
  );

  const handleUpdateQuestion = (
    questionId: string,
    updates: Partial<Pick<Question, "description" | "react" | "vue">>
  ) => {
    const updatedQuestion = storageService.updateQuestionContent(
      questionId,
      updates
    );
    if (updatedQuestion) {
      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? updatedQuestion : q))
      );
      onFeedback("QUESTION UPDATED ✨", "success");
    } else {
      onFeedback("UPDATE FAILED ❌", "error");
    }
  };

  const handleMagicGenerate = async (magicFailMsg: string) => {
    if (!magicTopic.trim()) return;
    setIsGenerating(true);
    try {
      const q = await aiService.generateQuestion(magicTopic, lang);
      storageService.addQuestion(q);
      refreshQuestions();
      setSelectedQuestion(q);
      setMagicTopic("");
      onFeedback("GENERATED ✨", "success");
    } catch (error) {
      console.error("Magic generation failed:", error);
      onFeedback(error instanceof Error ? error.message : magicFailMsg, "error");
    }
    setIsGenerating(false);
  };

  const handleManualSave = () => {
    if (!newQuestion.title || !newQuestion.description) {
      onFeedback(lang === "zh" ? "标题和描述必填" : "Title & Desc Required", "error");
      return;
    }
    const q: Question = {
      id: Math.random().toString(36).substr(2, 9),
      title: newQuestion.title!,
      difficulty: newQuestion.difficulty!,
      description: newQuestion.description!,
      category: newQuestion.category || "General",
      tags: newQuestion.tags || [],
      react: newQuestion.react as any,
      vue: newQuestion.vue as any,
      createdAt: Date.now(),
    };
    storageService.addQuestion(q);
    refreshQuestions();
    setSelectedQuestion(q);
    onFeedback("CREATED ✨", "success");

    setNewQuestion({
      title: "",
      difficulty: Difficulty.EASY,
      category: "",
      description: "",
      react: { initial: DEFAULT_REACT_INITIAL, solution: "" },
      vue: { initial: DEFAULT_VUE_INITIAL, solution: "" },
      tags: [],
    });
    return true; // Indicate success to close modal
  };

  return {
    questions,
    setQuestions,
    activeCategory,
    setActiveCategory,
    selectedQuestion,
    setSelectedQuestion,
    magicTopic,
    setMagicTopic,
    isGenerating,
    manualTab,
    setManualTab,
    newQuestion,
    setNewQuestion,
    categories,
    filteredQuestions,
    refreshQuestions,
    handleDeleteQuestion,
    handleUpdateQuestion,
    handleMagicGenerate,
    handleManualSave,
  };
};
