import { configure, getConfig, resolveAuth, resolveApiKey } from "../config";

describe("config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset module state
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.AGENTOS_API_KEY;
    // Reset global config by re-configuring with empty
    configure({});
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("configure()", () => {
    it("should merge config values", () => {
      configure({ defaultModel: "claude-haiku-4-5-20251001", verbose: true });
      const cfg = getConfig();
      expect(cfg.defaultModel).toBe("claude-haiku-4-5-20251001");
      expect(cfg.verbose).toBe(true);
    });

    it("should allow setting OAuth token", () => {
      configure({ oauthToken: "sk-ant-oat01-test" });
      const auth = resolveAuth();
      expect(auth.oauthToken).toBe("sk-ant-oat01-test");
    });

    it("should allow setting API key", () => {
      configure({ apiKey: "sk-ant-test" });
      const auth = resolveAuth();
      expect(auth.apiKey).toBe("sk-ant-test");
    });

    it("should set spend limit", () => {
      configure({ maxSpendPerRun: 5.0 });
      const cfg = getConfig();
      expect(cfg.maxSpendPerRun).toBe(5.0);
    });
  });

  describe("getConfig()", () => {
    it("should return defaults when nothing is configured", () => {
      configure({});
      const cfg = getConfig();
      expect(cfg.defaultModel).toBe("claude-sonnet-4-6");
      expect(cfg.maxLoops).toBe(10);
      expect(cfg.verbose).toBe(false);
      expect(cfg.maxSpendPerRun).toBe(1.0);
      expect(cfg.persistRuns).toBe(true);
      expect(cfg.storageDir).toContain(".agentos");
    });

    it("should override defaults with configured values", () => {
      configure({ maxLoops: 25 });
      const cfg = getConfig();
      expect(cfg.maxLoops).toBe(25);
    });
  });

  describe("resolveAuth()", () => {
    it("should prioritize CLAUDE_CODE_OAUTH_TOKEN env var", () => {
      process.env.CLAUDE_CODE_OAUTH_TOKEN = "sk-ant-oat01-env";
      process.env.ANTHROPIC_API_KEY = "sk-ant-api";
      const auth = resolveAuth();
      expect(auth.oauthToken).toBe("sk-ant-oat01-env");
      expect(auth.apiKey).toBeUndefined();
      expect(auth.authMode).toBe("oauth_token");
    });

    it("should use config oauthToken over env API key", () => {
      configure({ oauthToken: "sk-ant-oat01-config" });
      process.env.ANTHROPIC_API_KEY = "sk-ant-api";
      const auth = resolveAuth();
      expect(auth.oauthToken).toBe("sk-ant-oat01-config");
    });

    it("should fall back to AGENTOS_API_KEY", () => {
      process.env.AGENTOS_API_KEY = "aos-key";
      const auth = resolveAuth();
      expect(auth.apiKey).toBe("aos-key");
      expect(auth.authMode).toBe("api_key");
    });

    it("should fall back to ANTHROPIC_API_KEY", () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-key";
      const auth = resolveAuth();
      expect(auth.apiKey).toBe("sk-ant-key");
      expect(auth.authMode).toBe("api_key");
    });

    it("should fall back to config apiKey", () => {
      configure({ apiKey: "sk-ant-config" });
      const auth = resolveAuth();
      expect(auth.apiKey).toBe("sk-ant-config");
    });

    it("should throw when no auth is available", () => {
      configure({});
      expect(() => resolveAuth()).toThrow("No authentication found");
    });

    it("should include baseUrl from config", () => {
      configure({ oauthToken: "tok", baseUrl: "https://proxy.example.com" });
      const auth = resolveAuth();
      expect(auth.baseUrl).toBe("https://proxy.example.com");
    });
  });

  describe("resolveApiKey()", () => {
    it("should return API key when set", () => {
      configure({ apiKey: "sk-ant-test" });
      expect(resolveApiKey()).toBe("sk-ant-test");
    });

    it("should return OAuth token when only OAuth is set", () => {
      configure({ oauthToken: "sk-ant-oat01-test" });
      expect(resolveApiKey()).toBe("sk-ant-oat01-test");
    });

    it("should throw when nothing is set", () => {
      configure({});
      expect(() => resolveApiKey()).toThrow();
    });
  });
});
