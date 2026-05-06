import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { ensureDir, copyDir, copyFile } from "../fs.js";

function makeTmpDir(): string {
  const dir = join(tmpdir(), `omr-test-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("ensureDir", () => {
  let tmp: string;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => { rmSync(tmp, { recursive: true, force: true }); });

  it("creates a new directory", () => {
    const dir = join(tmp, "a", "b", "c");
    assert.ok(!existsSync(dir));
    ensureDir(dir);
    assert.ok(existsSync(dir));
  });

  it("is a no-op if the directory already exists", () => {
    ensureDir(tmp);
    assert.ok(existsSync(tmp));
  });
});

describe("copyDir", () => {
  let src: string;
  let dest: string;
  beforeEach(() => {
    src = makeTmpDir();
    dest = join(tmpdir(), `omr-test-dest-${randomUUID()}`);
  });
  afterEach(() => {
    rmSync(src, { recursive: true, force: true });
    rmSync(dest, { recursive: true, force: true });
  });

  it("copies files recursively and returns count", () => {
    writeFileSync(join(src, "a.txt"), "aaa");
    mkdirSync(join(src, "sub"));
    writeFileSync(join(src, "sub", "b.txt"), "bbb");

    const count = copyDir(src, dest);

    assert.equal(count, 2);
    assert.equal(readFileSync(join(dest, "a.txt"), "utf-8"), "aaa");
    assert.equal(readFileSync(join(dest, "sub", "b.txt"), "utf-8"), "bbb");
  });

  it("returns 0 for an empty directory", () => {
    const count = copyDir(src, dest);
    assert.equal(count, 0);
    assert.ok(existsSync(dest));
  });
});

describe("copyFile", () => {
  let tmp: string;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => { rmSync(tmp, { recursive: true, force: true }); });

  it("copies a file and creates parent directories", () => {
    const srcFile = join(tmp, "src.txt");
    writeFileSync(srcFile, "hello");

    const destFile = join(tmp, "deep", "nested", "dest.txt");
    copyFile(srcFile, destFile);

    assert.equal(readFileSync(destFile, "utf-8"), "hello");
  });
});
