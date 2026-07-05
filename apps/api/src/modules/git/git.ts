import { withSshConnection, execCommand } from "../ssh/ssh-client.js";
import type { SshConnectionParams } from "../ssh/ssh-client.js";
import { isSafeAbsolutePath } from "@watchtower/shared";
import { ApiError } from "../../utils/errors.js";
import type { Client as SshClient } from "ssh2";

export interface GitRepoInfo {
  directory: string;
  remoteUrl: string | null;
  branch: string | null;
  commitSha: string | null;
  commitMessage: string | null;
  commitAuthor: string | null;
  commitDate: string | null;
  isDirty: boolean;
}

/**
 * Discovers Git repositories directly inside the given project directories
 * (one level of `ls` — not a recursive filesystem walk) and reads their
 * current state. Only directories explicitly configured on the Server are
 * ever touched.
 */
export async function discoverGitRepositories(
  sshParams: SshConnectionParams,
  projectDirectories: string[]
): Promise<GitRepoInfo[]> {
  const safeDirectories = projectDirectories.filter(isSafeAbsolutePath);

  const { result } = await withSshConnection(sshParams, async (conn) => {
    const repos: GitRepoInfo[] = [];

    for (const dir of safeDirectories) {
      const lsResult = await execCommand(conn, "sh", [
        "-c",
        `find '${dir.replace(/'/g, "")}' -maxdepth 2 -type d -name .git 2>/dev/null`,
      ]);
      const gitDirs = lsResult.stdout.trim().split("\n").filter(Boolean);

      for (const gitDir of gitDirs) {
        const repoDir = gitDir.replace(/\/\.git$/, "");
        const info = await readGitRepoInfo(conn, repoDir);
        if (info) repos.push(info);
      }
    }

    return repos;
  });

  return result;
}

/** Reads Git state for a single working directory known to contain a repository. */
export async function getGitInfoForDirectory(
  sshParams: SshConnectionParams,
  workingDirectory: string
): Promise<GitRepoInfo | null> {
  if (!isSafeAbsolutePath(workingDirectory)) {
    throw new ApiError("INVALID_IDENTIFIER", "Invalid working directory", 400);
  }

  const { result } = await withSshConnection(sshParams, async (conn) => {
    return readGitRepoInfo(conn, workingDirectory);
  });

  return result;
}

async function readGitRepoInfo(conn: SshClient, repoDir: string): Promise<GitRepoInfo | null> {
  const isRepo = await execCommand(conn, "git", ["-C", repoDir, "rev-parse", "--is-inside-work-tree"]);
  if (isRepo.code !== 0) return null;

  const [remote, branch, log, statusResult] = await Promise.all([
    execCommand(conn, "git", ["-C", repoDir, "config", "--get", "remote.origin.url"]),
    execCommand(conn, "git", ["-C", repoDir, "rev-parse", "--abbrev-ref", "HEAD"]),
    execCommand(conn, "git", ["-C", repoDir, "log", "-1", "--format=%H%n%an%n%ad%n%s"]),
    execCommand(conn, "git", ["-C", repoDir, "status", "--porcelain"]),
  ]);

  const [commitSha, commitAuthor, commitDate, ...messageParts] = log.stdout.trim().split("\n");

  return {
    directory: repoDir,
    remoteUrl: remote.stdout.trim() || null,
    branch: branch.stdout.trim() || null,
    commitSha: commitSha || null,
    commitMessage: messageParts.join("\n") || null,
    commitAuthor: commitAuthor || null,
    commitDate: commitDate || null,
    isDirty: statusResult.stdout.trim().length > 0,
  };
}
