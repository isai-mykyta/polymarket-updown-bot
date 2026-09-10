import { logger } from "../services";

export const executeInChunks = async (
  amount: number,
  chunkSize: number,
  executor: (size: number) => Promise<any>,
  retryUntilSuccess: boolean = false
): Promise<void> => {
  const chunks: number[] = [];
  let remaining = amount;

  while (remaining > 0) {
    chunks.push(Math.min(remaining, chunkSize));
    remaining -= chunkSize;
  }

  let failedChunks = [...chunks];

  while (failedChunks.length > 0) {
    const results = await Promise.allSettled(failedChunks.map(size => executor(size)));
    failedChunks = failedChunks.filter((_, i) => results[i].status === "rejected");

    if (!retryUntilSuccess) break;

    if (failedChunks.length > 0) {
      logger.warn(`⚠️ ${failedChunks.length} chunks failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
};
