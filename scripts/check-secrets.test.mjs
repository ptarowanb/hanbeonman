import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(new URL("./check-secrets.mjs", import.meta.url));
const knownWindowsBinary =
  "C:\\Users\\ptaro\\.codex\\tools\\gitleaks\\8.30.1\\gitleaks.exe";

function findGitleaks() {
  if (process.env.GITLEAKS_TEST_BIN) return process.env.GITLEAKS_TEST_BIN;
  if (process.env.GITLEAKS_BIN) return process.env.GITLEAKS_BIN;
  if (existsSync(knownWindowsBinary)) return knownWindowsBinary;

  const probe = spawnSync("gitleaks", ["version"], { stdio: "ignore" });
  if (probe.status === 0) return "gitleaks";

  throw new Error(
    "테스트에 Gitleaks가 필요합니다. GITLEAKS_TEST_BIN에 실행 파일 경로를 지정하세요.",
  );
}

const gitleaksBinary = findGitleaks();

function git(cwd, ...args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(
    result.status,
    0,
    `git ${args[0]} failed: ${result.stderr || result.stdout}`,
  );
}

function createRepository() {
  const cwd = mkdtempSync(join(tmpdir(), "hanbeonman-secrets-"));
  git(cwd, "init", "--quiet");
  git(cwd, "config", "user.name", "Secret Scanner Test");
  git(cwd, "config", "user.email", "scanner-test@example.invalid");
  writeFileSync(cwd + "/.gitignore", ".env\n.env.*\n!.env.example\n");
  writeFileSync(cwd + "/README.md", "temporary fixture\n");
  git(cwd, "add", ".gitignore", "README.md");
  git(cwd, "commit", "--quiet", "-m", "fixture baseline");
  return cwd;
}

function writeFixture(cwd, relativePath, contents) {
  const fullPath = join(cwd, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, contents);
}

function runScanner(cwd, environment = {}) {
  return spawnSync(process.execPath, [scriptPath], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GITLEAKS_BIN: gitleaksBinary,
      ...environment,
    },
  });
}

function withRepository(run) {
  const cwd = createRepository();
  try {
    return run(cwd);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

test("강제 추가한 ignored .env.local 파일을 차단한다", () =>
  withRepository((cwd) => {
    writeFixture(cwd, "apps/web/.env.local", "LOCAL_SETTING=value\n");
    git(cwd, "add", "--force", "apps/web/.env.local");

    const result = runScanner(cwd);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /환경 변수 파일/);
  }));

test("민감한 값이 채워진 .env.example을 차단한다", () =>
  withRepository((cwd) => {
    writeFixture(cwd, ".env.example", "OPENAI_API_KEY=placeholder-only\n");
    git(cwd, "add", ".env.example");

    const result = runScanner(cwd);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /비워 두어야/);
    assert.doesNotMatch(result.stderr, /placeholder-only/);
  }));

test("추적 소스에 들어간 명백한 가짜 공급자 키를 차단하고 값을 출력하지 않는다", () =>
  withRepository((cwd) => {
    const fabricatedKey = [
      "g",
      "h",
      "p",
      "_",
      "K7mQ2vN9xR4p",
      "L8sT1wY6zA3b",
      "C5dE0fG2hJ9k",
    ].join("");
    writeFixture(cwd, "src/provider.js", `export const token = "${fabricatedKey}";\n`);
    git(cwd, "add", "src/provider.js");

    const result = runScanner(cwd);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /비밀 정보 후보/);
    assert.doesNotMatch(result.stdout + result.stderr, new RegExp(fabricatedKey));
  }));

test("일반 텍스트와 민감한 값이 빈 .env.example은 허용한다", () =>
  withRepository((cwd) => {
    writeFixture(
      cwd,
      ".env.example",
      'OPENAI_API_KEY=\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=""\nAPP_NAME=fixture\n',
    );
    writeFixture(cwd, "src/clean.js", 'export const greeting = "hello";\n');
    git(cwd, "add", ".env.example", "src/clean.js");

    const result = runScanner(cwd);

    assert.equal(result.status, 0, result.stderr);
  }));

test("Gitleaks를 찾을 수 없으면 설정 방법을 안내하며 실패한다", () =>
  withRepository((cwd) => {
    writeFixture(cwd, "src/clean.js", 'export const greeting = "hello";\n');
    git(cwd, "add", "src/clean.js");

    const result = runScanner(cwd, {
      GITLEAKS_BIN: join(cwd, "missing-gitleaks"),
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /GITLEAKS_BIN/);
    assert.match(result.stderr, /hanbeonman\.gitleaksPath/);
    assert.match(result.stderr, /PATH/);
    assert.doesNotMatch(result.stderr, /--no-verify/);
  }));
