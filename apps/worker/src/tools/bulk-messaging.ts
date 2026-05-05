import type { ToolInput, ToolResult } from "./types";

export async function runBulkMessaging(input: ToolInput): Promise<ToolResult> {
  const options = input.options || {};
  const message = options.message || "Xin chao!";
  const targets = options.targetUids || [];
  const delay = options.delay || 10; // giay

  input.log("INFO", `Bat dau gui tin nhan hang loat cho ${targets.length} doi tuong.`);
  
  let successCount = 0;
  let failCount = 0;

  for (const uid of targets) {
    input.log("INFO", `Dang gui cho: ${uid}...`);
    
    // Gia lap gui tin nhan
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    if (Math.random() > 0.1) {
      successCount++;
      input.log("SUCCESS", `Da gui thanh cong cho ${uid}`);
    } else {
      failCount++;
      input.log("ERROR", `Gui that bai cho ${uid} (Co the do bi chan hoac UID sai)`);
    }

    // Nghi giua cac lan gui
    if (targets.indexOf(uid) < targets.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * 100)); // Demo nhanh nen de delay thap
    }
  }

  return {
    success: true,
    data: {
      summary: `Da gui xong ${targets.length} tin nhan.`,
      successCount,
      failCount
    },
    metrics: {
      messagesSent: successCount,
      errors: failCount,
      durationSeconds: targets.length * delay
    }
  };
}
