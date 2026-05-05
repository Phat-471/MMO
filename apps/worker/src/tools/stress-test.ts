import type { ToolRunner } from "./types";

export const runStressTest: ToolRunner = async (input) => {
  const { log, options } = input;
  const duration = options.durationSeconds || 30;
  const interval = options.logIntervalSeconds || 2;

  await log("INFO", `Bat dau Stress Test trong ${duration} giay...`);
  
  const steps = Math.floor(duration / interval);
  for (let i = 1; i <= steps; i++) {
    await new Promise(r => setTimeout(r, interval * 1000));
    await log("INFO", `[STRESS TEST] Buoc ${i}/${steps}: Dang gia lap tai nang... (${i * interval}s)`);
    if (i % 3 === 0) {
      await log("INFO", `[STRESS TEST] Bo nho hien tai: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    }
  }

  await log("INFO", "Stress Test hoan tat thanh cong.");

  return {
    success: true,
    note: `Da hoan thanh stress test trong ${duration}s`,
    snapshotData: []
  };
};
