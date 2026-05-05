import type { ToolInput, ToolResult } from "./types.js";
import { parseProxyString } from "../utils/proxy";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const axios = require("axios");

export async function runProxyChecker(input: ToolInput): Promise<ToolResult> {
  const proxyStr = input.proxy || "";
  
  if (!proxyStr) {
    return {
      success: false,
      note: "Tài khoản không có Proxy để kiểm tra.",
      fetchedCount: 0
    };
  }

  const proxyConfig = parseProxyString(proxyStr);
  if (!proxyConfig) {
    return {
      success: false,
      note: "Định dạng Proxy không hợp lệ (Yêu cầu host:port:user:pass).",
      fetchedCount: 0
    };
  }

  input.log("INFO", `Đang kiểm tra kết nối qua Proxy: ${proxyConfig.host}:${proxyConfig.port}`);
  
  const startTime = Date.now();
  try {
    const { HttpsProxyAgent } = await import("https-proxy-agent");
    const proxyUrl = proxyConfig.username 
      ? `http://${proxyConfig.username}:${proxyConfig.password}@${proxyConfig.host}:${proxyConfig.port}`
      : `http://${proxyConfig.host}:${proxyConfig.port}`;

    const agent = new HttpsProxyAgent(proxyUrl);
    
    input.log("INFO", "Đang thử kết nối đến Google via Proxy...");
    
    // Thuc hien request thuc te voi timeout 10 giay
    await axios.get("https://www.google.com", {
      httpsAgent: agent,
      httpAgent: agent,
      timeout: 10000,
      validateStatus: () => true // Chap nhan moi status code
    });

    const latency = Date.now() - startTime;
    input.log("SUCCESS", `Proxy hoạt động tốt. Độ trễ: ${latency}ms`);

    return {
      success: true,
      note: `Proxy LIVE (${latency}ms)`,
      data: {
        latency,
        status: "LIVE",
        ip: proxyConfig.host,
        checkedAt: new Date().toISOString()
      },
      metrics: {
        latencyMs: latency
      }
    };
  } catch (err: unknown) {
    const error = err as any;
    const errorMsg = axios.isAxiosError(error) 
      ? (error.code === "ECONNABORTED" ? "Timeout (10s)" : error.message)
      : (error instanceof Error ? error.message : "Không thể kết nối");

    input.log("ERROR", `Proxy DEAD: ${errorMsg}`);
    return {
      success: false,
      note: `Proxy DEAD (${errorMsg})`,
      data: {
        status: "DEAD",
        error: errorMsg
      }
    };
  }
}
