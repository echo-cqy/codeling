import React, { useState, useCallback } from "react";
import { Question, Difficulty, Framework, QuestionStats } from "../types";
import { storageService } from "../services/storageService";
import { translations } from "../i18n";

interface QuestionListProps {
  questions: Question[];
  selectedQuestion: Question | null;
  onSelectQuestion: (question: Question) => void;
  onEditQuestion: (question: Question) => void;
  onRefresh: () => void;
  lang: "en" | "zh";
  framework: Framework;
}

const DifficultyBadge: React.FC<{
  difficulty: Difficulty;
  lang: "en" | "zh";
}> = ({ difficulty, lang }) => {
  const t = translations[lang] || translations["en"];
  if (!t.difficulty) {
    console.error("Translation for difficulty missing for lang:", lang, t);
    return null;
  }
  const colors = {
    [Difficulty.EASY]: "bg-green-100 text-green-800",
    [Difficulty.MEDIUM]: "bg-yellow-100 text-yellow-800",
    [Difficulty.HARD]: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${colors[difficulty]}`}
    >
      {t.difficulty[difficulty]}
    </span>
  );
};

const QuestionStatsDisplay: React.FC<{
  stats: QuestionStats;
  lang: "en" | "zh";
}> = ({ stats, lang }) => {
  const t = translations[lang] || translations["en"];

  if (!stats.hasCompleted) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      {stats.isStarred && <span className="text-amber-500 font-bold">✳️</span>}
      <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded-full">
        {stats.completedCount} {t.attempts}
      </span>
    </div>
  );
};

const QuestionList: React.FC<QuestionListProps> = ({
  questions,
  selectedQuestion,
  onSelectQuestion,
  onEditQuestion,
  onRefresh,
  lang,
  framework,
}) => {
  const t = translations[lang] || translations["en"];
  const [statsMap, setStatsMap] = useState<Map<string, QuestionStats>>(
    new Map(),
  );
  const [displayPreferences, setDisplayPreferences] = useState(() =>
    storageService.getDisplayPreferences(),
  );

  // 获取所有问题的统计数据
  const loadStats = useCallback(() => {
    const allStats = storageService.getQuestionStatsAll();
    const statsMap = new Map<string, QuestionStats>();
    allStats.forEach((stat) => {
      statsMap.set(stat.questionId, stat);
    });
    setStatsMap(statsMap);
  }, []);

  React.useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleStarToggle = useCallback(
    (questionId: string) => {
      const stats = storageService.getStats();
      const attempts = stats.history.filter((a) => a.questionId === questionId);

      if (attempts.length > 0) {
        // 找到最新的尝试记录
        const latestAttempt = attempts.reduce((latest, current) =>
          current.timestamp > latest.timestamp ? current : latest,
        );

        // 切换星标状态
        storageService.updateAttempt(latestAttempt.id, {
          isStarred: !latestAttempt.isStarred,
        });

        onRefresh();
        loadStats();
      }
    },
    [onRefresh, loadStats],
  );

  const handleClearListStats = useCallback(() => {
    const questionIds = questions.map((q) => q.id);
    storageService.clearQuestionListStats(questionIds);
    setDisplayPreferences(storageService.getDisplayPreferences());
    onRefresh();
  }, [questions, onRefresh]);

  const handleResetListStats = useCallback(() => {
    const questionIds = questions.map((q) => q.id);
    storageService.resetQuestionListStats(questionIds);
    setDisplayPreferences(storageService.getDisplayPreferences());
    onRefresh();
  }, [questions, onRefresh]);

  const visibleQuestions = questions;

  return (
    <div className="space-y-3">
      {/* 问题列表 */}
      {visibleQuestions.map((question) => {
        const stats = statsMap.get(question.id);
        const isSelected = selectedQuestion?.id === question.id;

        return (
          <div
            key={question.id}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer group ${
              isSelected
                ? "border-pink-300 bg-pink-50"
                : "border-gray-100 hover:border-pink-200 hover:bg-pink-25"
            }`}
            onClick={() => onSelectQuestion(question)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-gray-900 group-hover:text-pink-600 transition">
                    {question.title}
                  </h3>
                  <DifficultyBadge
                    difficulty={question.difficulty}
                    lang={lang}
                  />
                  {question.isStarred && (
                    <span className="text-amber-500 font-bold text-lg">★</span>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {question.description}
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {question.category}
                  </span>
                  {question.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs text-pink-600 bg-pink-100 px-2 py-1 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <QuestionStatsDisplay
                  stats={
                    stats || {
                      questionId: question.id,
                      completedCount: 0,
                      hasCompleted: false,
                      isStarred: false,
                    }
                  }
                  lang={lang}
                />

                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditQuestion(question);
                    }}
                    className="p-2 text-gray-400 hover:text-pink-500 transition"
                    title={t.editQuestion}
                  >
                    ✏️
                  </button>
                  {stats?.hasCompleted && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStarToggle(question.id);
                      }}
                      className={`p-2 transition ${
                        stats.isStarred
                          ? "text-amber-500"
                          : "text-gray-400 hover:text-amber-500"
                      }`}
                      title={stats.isStarred ? t.unstar : t.star}
                    >
                      ✳️
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {visibleQuestions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {t.noQuestionsFound}
        </div>
      )}
    </div>
  );
};

export default QuestionList;
