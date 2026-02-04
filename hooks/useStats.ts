import { useState, useCallback } from "react";
import { storageService } from "../services/storageService";
import { UserStats } from "../types";

export const useStats = (onFeedback: (msg: string, type: "success" | "error") => void) => {
  const [stats, setStats] = useState<UserStats>(storageService.getStats());

  const refreshStats = useCallback(() => {
    const s = storageService.getStats();
    setStats(s);
    return s;
  }, []);

  const handleDeleteAttempt = useCallback(
    (id: string) => {
      storageService.deleteAttempt(id);
      refreshStats();
      onFeedback("DELETED ✨", "success");
    },
    [refreshStats, onFeedback]
  );

  const handleClearListStats = useCallback((questionIds: string[]) => {
    storageService.clearQuestionListStats(questionIds);
    refreshStats();
    onFeedback("LIST STATS CLEARED ✨", "success");
  }, [refreshStats, onFeedback]);

  const handleResetListStats = useCallback((questionIds: string[]) => {
    storageService.resetQuestionListStats(questionIds);
    refreshStats();
    onFeedback("LIST STATS RESET ✨", "success");
  }, [refreshStats, onFeedback]);

  const handleSaveAttempt = useCallback((
    questionId: string,
    framework: any,
    code: string,
    versionName?: string
  ) => {
    storageService.saveAttempt({
      id: Math.random().toString(36).substr(2, 9),
      questionId,
      framework,
      code,
      timestamp: Date.now(),
      status: "passed",
      name: versionName,
    });
    refreshStats();
    onFeedback("SAVED ✨", "success");
  }, [refreshStats, onFeedback]);

  return {
    stats,
    setStats,
    refreshStats,
    handleDeleteAttempt,
    handleClearListStats,
    handleResetListStats,
    handleSaveAttempt,
  };
};
