export class Mutex {
  private locked = false;
  private queue: (() => void)[] = [];

  public async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return;
    }

    return new Promise<void>((resolve) => this.queue.push(resolve));
  }

  public release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next?.();
    } else {
      this.locked = false;
    }
  }

  public async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  public isLocked(): boolean {
    return this.locked;
  }
}
