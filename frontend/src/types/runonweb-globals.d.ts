// Global declarations for runonweb (v0.1.0) browser/worker checks that
// reference Worker types absent from the default DOM lib set we compile with.
declare var WorkerGlobalScope: (new (...args: unknown[]) => unknown) | undefined;
