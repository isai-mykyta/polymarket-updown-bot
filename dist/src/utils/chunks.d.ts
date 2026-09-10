export declare const executeInChunks: (amount: number, chunkSize: number, executor: (size: number) => Promise<any>, retryUntilSuccess?: boolean) => Promise<void>;
