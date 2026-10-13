import { danmakuFromActivitySteps } from "@/game/danmaku-messages";
import type { AiActivityStep } from "@/game/ai-activity";

test("play danmaku whitelist drops unknown steps and avoids grid ids in response detail", () => {
  const steps: AiActivityStep[] = [
    { id: "ticket", label: "决策凭证已签发", timestamp: 1, detail: null, state: "done" },
    { id: "response", label: "Worker 已响应", timestamp: 2, detail: "模型 100ms · r1c1 概率 50%", state: "done" },
    { id: "secret", label: "不应出现", timestamp: 3, detail: null, state: "done" },
  ];
  const messages = danmakuFromActivitySteps(steps, true);
  expect(messages).toHaveLength(2);
  expect(messages[1].text).not.toMatch(/r\d+c\d/i);
  expect(messages[1].text).not.toMatch(/概率/);
});
