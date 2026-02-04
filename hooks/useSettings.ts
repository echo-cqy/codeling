import { useState } from "react";
import { aiService } from "../services/aiService";
import { AIModelConfig, Language } from "../types";

export const useSettings = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showQuestionEdit, setShowQuestionEdit] = useState(false);
  const [testStatus, setTestStatus] = useState<
    "idle" | "testing" | "success" | "failed"
  >("idle");

  const handleTestConnection = async (
    config: AIModelConfig | undefined,
    lang: Language,
    testFailedMsg: string,
    onFeedback: (msg: string, type: "success" | "error") => void
  ) => {
    if (config?.provider !== "gemini" && !config?.apiKey) {
      onFeedback(lang === "zh" ? "请填写 API Key" : "Fill API Key", "error");
      return;
    }
    setTestStatus("testing");
    const result = await aiService.testConnection(config!);
    if (result) {
      setTestStatus("success");
      onFeedback("CONNECTED ✨", "success");
    } else {
      setTestStatus("failed");
      onFeedback(testFailedMsg, "error");
    }
    setTimeout(() => setTestStatus("idle"), 3000);
  };

  return {
    showSettings,
    setShowSettings,
    showAuth,
    setShowAuth,
    showManualAdd,
    setShowManualAdd,
    showImport,
    setShowImport,
    showQuestionEdit,
    setShowQuestionEdit,
    testStatus,
    setTestStatus,
    handleTestConnection,
  };
};
