// Update line 75 to fix TypeScript error
// Existing line: triggerScan.mutate({}, ...)
triggerScan.mutate(undefined, ...);