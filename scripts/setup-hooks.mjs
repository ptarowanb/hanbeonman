import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

function git(args, cwd) {
  return spawnSync("git", args, { cwd, encoding: "utf8" });
}

const rootResult = git(["rev-parse", "--show-toplevel"], process.cwd());
if (rootResult.status !== 0) {
  process.stderr.write("훅 설치 실패: Git 저장소 루트를 확인할 수 없습니다.\n");
  process.exit(1);
}

const root = rootResult.stdout.trim();
const desiredPath = ".githooks";
const currentResult = git(
  ["config", "--local", "--get", "core.hooksPath"],
  root,
);
const currentPath = currentResult.status === 0 ? currentResult.stdout.trim() : "";

const normalizePath = (path) =>
  resolve(root, path).replaceAll("\\", "/").replace(/\/$/, "").toLowerCase();

if (currentPath && normalizePath(currentPath) !== normalizePath(desiredPath)) {
  const quotedCurrentPath = JSON.stringify(currentPath);
  process.stderr.write(
    [
      `기존 core.hooksPath(${quotedCurrentPath})가 있어 자동으로 변경하지 않았습니다.`,
      "기존 훅을 유지하려면 해당 pre-commit 훅에서 다음 명령을 실행하도록 통합하세요:",
      "  node scripts/check-secrets.mjs",
      "이 저장소의 훅으로 전환하려면:",
      "  git config --local core.hooksPath .githooks",
      "기존 설정으로 복구하려면:",
      `  git config --local core.hooksPath ${quotedCurrentPath}`,
    ].join("\n") + "\n",
  );
  process.exit(1);
}

if (!currentPath) {
  const setResult = git(
    ["config", "--local", "core.hooksPath", desiredPath],
    root,
  );
  if (setResult.status !== 0) {
    process.stderr.write("훅 설치 실패: 저장소 로컬 Git 설정을 변경할 수 없습니다.\n");
    process.exit(1);
  }
}

process.stdout.write(
  [
    "비밀 검사 pre-commit 훅을 사용하도록 설정했습니다.",
    "설정을 되돌리려면 다음 명령을 실행하세요:",
    "  git config --local --unset core.hooksPath",
  ].join("\n") + "\n",
);
