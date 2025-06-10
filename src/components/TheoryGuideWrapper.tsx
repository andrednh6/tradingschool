import { useSimulationSession } from '../hooks/useSimulationSession'; 
import { TheoryGuide } from './TheoryGuide'; 
import type { ShowToastFunction } from '../types/simulation'; 
import { useToast } from '../hooks/useToast'; 
import { theoryContentByLevel } from '../content/theoryLevels';

export function TheoryGuideWrapper() { 
  const { sessionData, completeTheoryForCurrentLevel, isLoadingSession } = useSimulationSession();
  const { showToast } = useToast();

  if (isLoadingSession || !sessionData || !sessionData.isActive || sessionData.theoryProgressLevelCompleted >= sessionData.currentLevel) {
    return null;
  }

  const currentLevelCards = theoryContentByLevel[sessionData.currentLevel];

  if (!currentLevelCards || currentLevelCards.length === 0) {
    console.warn(`TheoryGuideWrapper: No theory cards found for level ${sessionData.currentLevel}`);
    return null;
  }

  const handleCompleteSeries = async () => {
    await completeTheoryForCurrentLevel({showToastFunc: showToast as ShowToastFunction});
  };

  return (
    <TheoryGuide
      cards={currentLevelCards}
      onCompleteSeries={handleCompleteSeries}
    />
  );
}