import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { storageService } from '../services/storageService';
import { Framework, Attempt, Language, Question } from '../types';

export type ViewSource = 'draft' | 'solution' | 'history';

export const useEditor = (
  question: Question,
  framework: Framework,
  lang: Language,
  onSave: (code: string, versionName?: string) => void
) => {
  const [activeSource, setActiveSource] = useState<ViewSource>('draft');
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [showSaveNaming, setShowSaveNaming] = useState(false);
  const [versionName, setVersionName] = useState('');
  const [history, setHistory] = useState<Attempt[]>([]);
  const [isDrafting, setIsDrafting] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'both' | 'editor' | 'preview'>('both');
  
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const refreshHistory = useCallback(() => {
    const list = storageService.getHistoryByQuestion(question.id, framework);
    if (isMounted.current) setHistory(list);
    return list;
  }, [question.id, framework]);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const activeCode = useMemo(() => {
    if (activeSource === 'draft') {
      return storageService.getDraft(question.id, framework) || question[framework].initial;
    } else if (activeSource === 'solution') {
      return question[framework].solution;
    } else {
      const item = history.find(h => h.id === selectedHistoryId);
      if (item) return item.code;
      if (history.length > 0) return history[0].code;
      return "// " + (lang === 'zh' ? '暂无历史版本' : 'No history yet');
    }
  }, [activeSource, selectedHistoryId, question, framework, history, lang]);

  const handleSaveAttempt = (code: string) => {
    onSave(code, versionName);
    setVersionName('');
    setShowSaveNaming(false);
    refreshHistory();
  };

  const applyToDraft = (code: string) => {
    if (confirm(lang === 'zh' ? '确定覆盖当前草稿？' : 'Overwrite your current draft?')) {
      storageService.saveDraft(question.id, framework, code);
      setActiveSource('draft');
      return true;
    }
    return false;
  };

  return {
    activeSource,
    setActiveSource,
    selectedHistoryId,
    setSelectedHistoryId,
    showSaveNaming,
    setShowSaveNaming,
    versionName,
    setVersionName,
    history,
    isDrafting,
    setIsDrafting,
    layoutMode,
    setLayoutMode,
    activeCode,
    refreshHistory,
    handleSaveAttempt,
    applyToDraft,
    isMounted,
  };
};
