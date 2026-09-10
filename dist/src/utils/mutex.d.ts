export declare class Mutex {
    private locked;
    private queue;
    acquire(): Promise<void>;
    release(): void;
    runExclusive<T>(fn: () => Promise<T>): Promise<T>;
    isLocked(): boolean;
}
