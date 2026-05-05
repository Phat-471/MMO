import type { ToolInput, ToolResult } from "./types";

export async function runAIContentWriter(input: ToolInput): Promise<ToolResult> {
  const options = input.options || {};
  const topic = options.topic || "MMO Tips 2026";
  const tone = options.tone || "Professional";
  const keywords = options.keywords || [];

  input.log("INFO", `Dang khoi tao AI de viet noi dung ve chu de: ${topic}`);
  input.log("INFO", `Phong cach: ${tone}, Tu khoa: ${keywords.join(", ")}`);

  // Gia lap goi API AI
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const variations = [
    `Kham pha bi quyet ${topic} hieu qua nhat nam 2026. #mmo #tips`,
    `Ban da biet cach ${topic} chua? Hay xem huong dan chi tiet tai day.`,
    `Chia se kinh nghiem thuc chien ve ${topic} cho nguoi moi bat dau.`
  ];

  const content = variations[Math.floor(Math.random() * variations.length)];

  input.log("SUCCESS", "AI da tao noi dung thanh cong.");

  return {
    success: true,
    data: {
      content,
      topic,
      tone,
      generatedAt: new Date().toISOString()
    },
    metrics: {
      tokensUsed: 150,
      variationsGenerated: 3
    }
  };
}
