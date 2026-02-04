import { useState, useEffect, useCallback } from "react";
import { storageService } from "../services/storageService";
import { AuthUser } from "../services/authService";

export const useSync = (
  user: AuthUser | null,
  authLoading: boolean,
  handleRefreshStats: () => void,
  onFeedback: (msg: string, type: "success" | "error") => void
) => {
  const [showMigration, setShowMigration] = useState(false);
  const [migrationData, setMigrationData] = useState<ReturnType<
    typeof storageService.exportLocalData
  > | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);

  const handleSkipMigration = useCallback(() => {
    setShowMigration(false);
    setMigrationData(null);
  }, []);

  const handleImportMigration = useCallback(async () => {
    if (!migrationData) return;
    setIsMigrating(true);
    try {
      await storageService.pushLocalDataToRemote(migrationData);
      await storageService.pullRemote();
      handleRefreshStats();
      onFeedback("SYNCED ✨", "success");
      setShowMigration(false);
      setMigrationData(null);
    } catch (e) {
      onFeedback(
        e instanceof Error ? e.message : "Import failed",
        "error"
      );
    } finally {
      setIsMigrating(false);
    }
  }, [migrationData, handleRefreshStats, onFeedback]);

  useEffect(() => {
    if (authLoading) return;

    const localSnapshot = storageService.exportLocalData();
    storageService.setRemoteUserId(user?.id ?? null);

    if (!user) return;

    (async () => {
      try {
        const meta = await storageService.pullRemote();
        handleRefreshStats();

        const hasLocalProgress =
          localSnapshot.stats.history.length > 0 ||
          localSnapshot.drafts.length > 0;

        if (!meta.hasAnyRemoteData && hasLocalProgress) {
          setMigrationData(localSnapshot);
          setShowMigration(true);
        }
      } catch (e) {
        onFeedback(
          e instanceof Error ? e.message : "Sync failed",
          "error"
        );
      }
    })();
  }, [user?.id, authLoading, handleRefreshStats, onFeedback]);

  return {
    showMigration,
    setShowMigration,
    migrationData,
    isMigrating,
    handleSkipMigration,
    handleImportMigration,
  };
};
