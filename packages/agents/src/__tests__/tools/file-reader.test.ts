import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { fileReaderTool, listFilesTool } from "../../tools/file-reader";

describe("fileReaderTool", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "axiom-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should have correct metadata", () => {
    expect(fileReaderTool.name).toBe("read_file");
    expect(fileReaderTool.input_schema.required).toContain("path");
  });

  it("should read a text file", async () => {
    const filePath = path.join(tmpDir, "test.txt");
    fs.writeFileSync(filePath, "Hello, World!");

    const result = await fileReaderTool.execute({ path: filePath });

    expect(result).toContain("Hello, World!");
    expect(result).toContain("test.txt");
  });

  it("should read a TypeScript file and identify language", async () => {
    const filePath = path.join(tmpDir, "test.ts");
    fs.writeFileSync(filePath, 'const x: string = "hello";');

    const result = await fileReaderTool.execute({ path: filePath });

    expect(result).toContain("TypeScript");
    expect(result).toContain('const x: string = "hello"');
  });

  it("should list directory contents when given a directory", async () => {
    fs.writeFileSync(path.join(tmpDir, "file1.ts"), "");
    fs.writeFileSync(path.join(tmpDir, "file2.js"), "");
    fs.mkdirSync(path.join(tmpDir, "subdir"));

    const result = await fileReaderTool.execute({ path: tmpDir });

    expect(result).toContain("Directory listing");
    expect(result).toContain("file1.ts");
    expect(result).toContain("file2.js");
    expect(result).toContain("[dir]");
  });

  it("should reject files over 100KB", async () => {
    const filePath = path.join(tmpDir, "large.txt");
    fs.writeFileSync(filePath, "x".repeat(200_000));

    const result = await fileReaderTool.execute({ path: filePath });

    expect(result).toContain("too large");
  });

  it("should handle non-existent files", async () => {
    const result = await fileReaderTool.execute({
      path: path.join(tmpDir, "nonexistent.txt"),
    });

    expect(result).toContain("Error reading file");
  });
});

describe("listFilesTool", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "axiom-list-test-"));
    fs.writeFileSync(path.join(tmpDir, "app.ts"), "");
    fs.writeFileSync(path.join(tmpDir, "config.json"), "{}");
    fs.mkdirSync(path.join(tmpDir, "src"));
    fs.writeFileSync(path.join(tmpDir, "src", "index.ts"), "");
    fs.writeFileSync(path.join(tmpDir, "src", "utils.ts"), "");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should have correct metadata", () => {
    expect(listFilesTool.name).toBe("list_files");
    expect(listFilesTool.input_schema.required).toContain("path");
  });

  it("should list top-level files", async () => {
    const result = await listFilesTool.execute({ path: tmpDir });

    expect(result).toContain("app.ts");
    expect(result).toContain("config.json");
    expect(result).toContain("[dir] src");
  });

  it("should list files recursively", async () => {
    const result = await listFilesTool.execute({
      path: tmpDir,
      recursive: true,
    });

    expect(result).toContain("app.ts");
    expect(result).toContain("index.ts");
    expect(result).toContain("utils.ts");
  });

  it("should filter by extension", async () => {
    const result = await listFilesTool.execute({
      path: tmpDir,
      recursive: true,
      pattern: ".json",
    });

    expect(result).toContain("config.json");
    expect(result).not.toContain("app.ts");
  });

  it("should handle non-existent directory", async () => {
    const result = await listFilesTool.execute({
      path: path.join(tmpDir, "nonexistent"),
    });

    expect(result).toContain("Error");
  });
});
