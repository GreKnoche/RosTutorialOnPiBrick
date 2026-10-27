## intro

Das ist der Nav2-Baum NavToPoseWithConsistentReplanningAndIfPathBecomesInvalid. ComputePathToPose scheitert, bis ClearGlobalCostmap-Context die Karte geräumt hat. Der erste Pfad läuft durch den Block, ValidatePath bleibt failure, der nächste Pfad führt darum herum. FollowPath scheitert einmal, ClearLocalCostmap-Context räumt, danach fährt das Auto zum Parkplatz. SpinRecovery, WaitRecovery und BackUpRecovery bleiben idle, solange diese Fahrt klappt.
