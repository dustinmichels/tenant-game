import { storeToRefs } from "pinia";
import { getGameStore, formatSpendEventText, formatEarnEventText } from "../stores/game";

export { formatSpendEventText, formatEarnEventText };

/**
 * Backward compatibility wrapper around the Pinia game store.
 * Allows existing tests and components to consume reactive state and actions
 * with the exact same API contract.
 */
export function useGameStorage() {
  const store = getGameStore();
  store.reloadFromStorage();
  const refs = storeToRefs(store);

  return {
    // Reactive State & Computed Refs
    state: refs.state,
    personWidth: refs.personWidth,
    personHeight: refs.personHeight,
    personScale: refs.personScale,
    isConfigured: refs.isConfigured,
    buildings: refs.buildings,
    totalBuildings: refs.totalBuildings,
    totalTenants: refs.totalTenants,
    round: refs.round,
    phase: refs.phase,
    currentPhaseInfo: refs.currentPhaseInfo,
    unionTenantsCount: refs.unionTenantsCount,
    coalitionTenantsCount: refs.coalitionTenantsCount,
    totalEvictionsCount: refs.totalEvictionsCount,
    organizedBuildingsCount: refs.organizedBuildingsCount,
    tallies: refs.tallies,
    landlordStartingMoney: refs.landlordStartingMoney,
    landlordMoney: refs.landlordMoney,
    canUndoLandlordSpend: refs.canUndoLandlordSpend,
    events: refs.events,
    coalitionConnections: refs.coalitionConnections,
    coalitions: refs.coalitions,
    buildingColorMap: refs.buildingColorMap,
    canUndoCoalition: refs.canUndoCoalition,
    isEditPosition: refs.isEditPosition,

    // Actions
    setupGame: store.setupGame,
    resetGame: store.resetGame,
    nextPhase: store.nextPhase,
    prevPhase: store.prevPhase,
    spendLandlordMoney: store.spendLandlordMoney,
    undoLandlordSpend: store.undoLandlordSpend,
    earnLandlordMoney: store.earnLandlordMoney,
    addEvent: store.addEvent,
    removeEvent: store.removeEvent,
    clearEvents: store.clearEvents,
    toggleUnion: store.toggleUnion,
    toggleEditPosition: store.toggleEditPosition,
    toggleEviction: store.toggleEviction,
    adjustBuildingTenants: store.adjustBuildingTenants,
    reorderBuildings: store.reorderBuildings,
    updateBuildingPosition: store.updateBuildingPosition,
    updateBuildingPositions: store.updateBuildingPositions,
    updateTally: store.updateTally,
    addRoundRow: store.addRoundRow,
    shufflePositions: store.shufflePositions,
    connectCoalition: store.connectCoalition,
    disconnectCoalition: store.disconnectCoalition,
    disconnectPair: store.disconnectPair,
    disconnectBuilding: store.disconnectBuilding,
    undoLastCoalition: store.undoLastCoalition,
    syncCurrentRoundTally: store.syncCurrentRoundTally,
    persist: store.persist,
  };
}
