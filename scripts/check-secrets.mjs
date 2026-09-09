import { isAbsolute, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const MAX_OUTPUT_BYTES = 10 * 1024 * 1024;

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: MAX_OUTPUT_BYTES,
    ...options,
  });
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

function repositoryRoot() {
  const result = run("git", ["rev-parse", "--show-toplevel"]);
  if (result.status !== 0) {
    fail("비밀 검사 실패: Git 저장소 루트를 확인할 수 없습니다.");
    return null;
  }
  return result.stdout.trim();
}

function stagedPaths(root) {
  const result = run(
    "git",
    ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"],
    { cwd: root },
  );
  if (result.status !== 0) {
    fail("비밀 검사 실패: 스테이징된 파일 목록을 확인할 수 없습니다.");
    return null;
  }
  return result.stdout.split("\0").filter(Boolean);
}

function envFileKind(path) {
  const basename = path.replaceAll("\\", "/").split("/").at(-1);
  if (basename === ".env.example") return "example";
  if (basename === ".env" || basename?.startsWith(".env.")) return "private";
  return null;
}

function exampleHasPopulatedSensitiveValue(root, path) {
  const result = run("git", ["show", `:${path}`], { cwd: root });
  if (result.status !== 0) return true;

  const sensitiveName =
    /(?:KEY|SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE|CREDENTIAL|AUTH|DATABASE_URL)/i;
  const blankValue = /^(?:""|'')?(?:\s+#.*)?$/;

  for (const line of result.stdout.split(/\r?\n/)) {
    const assignment = line.match(
      /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/,
    );
    if (!assignment || !sensitiveName.test(assignment[1])) continue;
    if (!blankValue.test(assignment[2])) return true;
  }
  return false;
}

function configuredGitleaks(root) {
  const fromEnvironment = process.env.GITLEAKS_BIN?.trim();
  if (fromEnvironment) return fromEnvironment;

  const result = run(
    "git",
    ["config", "--local", "--get", "hanbeonman.gitleaksPath"],
    { cwd: root },
  );
  const fromRepository = result.status === 0 ? result.stdout.trim() : "";
  if (!fromRepository) return "gitleaks";
  return isAbsolute(fromRepository) ? fromRepository : resolve(root, fromRepository);
}

function main() {
  const root = repositoryRoot();
  if (!root) return;

  const paths = stagedPaths(root);
  if (!paths) return;

  const privateEnvFiles = paths.filter((path) => envFileKind(path) === "private");
  if (privateEnvFiles.length > 0) {
    fail(
      `커밋 중단: 환경 변수 파일은 스테이징할 수 없습니다 (${privateEnvFiles.join(", ")}).`,
    );
    return;
  }

  for (const path of paths.filter((item) => envFileKind(item) === "example")) {
    if (exampleHasPopulatedSensitiveValue(root, path)) {
      fail(
        `커밋 중단: ${path}의 민감한 환경 변수 값은 비워 두어야 합니다. 변수 이름과 빈 값만 커밋하세요.`,
      );
      return;
    }
  }

  const gitleaks = configuredGitleaks(root);
  const scan = run(
    gitleaks,
    [
      "git",
      "--pre-commit",
      "--staged",
      "--redact=100",
      "--no-banner",
      "--no-color",
      ".",
    ],
    { cwd: root, stdio: "ignore" },
  );

  if (scan.error?.code === "ENOENT") {
    fail(
      [
        "커밋 중단: Gitleaks 실행 파일을 찾을 수 없습니다.",
        "설정 방법:",
        "  1) GITLEAKS_BIN 환경 변수에 실행 파일 경로 지정",
        "  2) git config --local hanbeonman.gitleaksPath <실행-파일-경로>",
        "  3) Gitleaks를 설치하고 PATH에 추가",
      ].join("\n"),
    );
    return;
  }

  if (scan.status !== 0) {
    fail(
      scan.status === 1
        ? "커밋 중단: 스테이징된 변경에서 비밀 정보 후보를 발견했습니다. 값을 제거한 뒤 다시 시도하세요."
        : "커밋 중단: Gitleaks 검사를 완료하지 못했습니다. 설치와 설정을 확인하세요.",
    );
  }
}

main();
