import { afterEach, describe, expect, it, vi } from "vitest";

// The Gemini SDK is replaced by a fake, so no test calls the real API.
const gemini = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: gemini.generate };
  },
  ThinkingLevel: { MINIMAL: "MINIMAL" },
}));

import { POST } from "@/app/api/ask/route";

const ask = (question: unknown) =>
  POST(new Request("http://localhost/api/ask", { method: "POST", body: JSON.stringify({ question }) }));
const FALLBACK = { ok: false, answer: "Ask is unavailable right now." };

afterEach(() => {
  delete process.env.GEMINI_API_KEY;
  gemini.generate.mockReset();
  vi.restoreAllMocks();
});

describe("POST /api/ask", () => {
  it("returns the fallback message when Gemini fails, the key is missing, or the request is bad", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.GEMINI_API_KEY = "test-key";
    gemini.generate.mockRejectedValueOnce(Object.assign(new Error("quota"), { status: 429 }));
    const failed = await ask("How many stations?");
    expect(failed.status).toBe(200);
    expect(await failed.json()).toEqual(FALLBACK);

    gemini.generate.mockResolvedValueOnce({ text: "" });
    expect(await (await ask("How many stations?")).json()).toEqual(FALLBACK);
    const bad = new Request("http://localhost/api/ask", { method: "POST", body: "not json" });
    expect(await (await POST(bad)).json()).toEqual(FALLBACK);

    delete process.env.GEMINI_API_KEY;
    expect(await (await ask("How many stations?")).json()).toEqual(FALLBACK);
  });

  it("returns the model's answer when it works", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    gemini.generate.mockResolvedValueOnce({ text: "81 stations." });
    expect(await (await ask("How many stations?")).json()).toEqual({ ok: true, answer: "81 stations." });
    expect(gemini.generate.mock.calls[0][0].model).toBe("gemini-3.5-flash");
  });
});
