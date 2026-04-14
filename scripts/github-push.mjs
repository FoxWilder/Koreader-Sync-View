import { execSync } from "child_process";

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error("GITHUB_TOKEN not found in environment");
  process.exit(1);
}

const repo = "FoxWilder/Koreader-Sync-View";
const remote = `https://${token}@github.com/${repo}.git`;

function run(cmd, opts = {}) {
  console.log(`> ${cmd.replace(token, "***")}`);
  return execSync(cmd, { encoding: "utf8", stdio: "pipe", ...opts });
}

try {
  // Fetch remote state (may fail if repo is empty — that's fine)
  try {
    run(`git fetch "${remote}" main:refs/remotes/origin/main`);
    // Check if remote has commits we don't have (non-fast-forward)
    const aheadBehind = run(
      `git rev-list --left-right --count main...refs/remotes/origin/main`
    ).trim();
    const [ahead, behind] = aheadBehind.split("\t").map(Number);
    console.log(`Local is ${ahead} ahead, ${behind} behind remote main`);

    if (behind > 0) {
      // Remote has commits we don't. Merge them in (unrelated histories = initial GitHub commit)
      console.log("Remote has commits not in local — merging...");
      run(`git merge refs/remotes/origin/main --allow-unrelated-histories -m "Merge remote initial commit"`);
    }
  } catch (fetchErr) {
    // Remote is likely empty — no problem, just push
    console.log("Remote appears empty or has no main branch — doing initial push.");
  }

  // Push
  const result = run(`git push "${remote}" main`);
  console.log(result || "Push successful.");
  console.log("\nDone! Code is now on GitHub.");
} catch (err) {
  console.error("Push failed:", err.message);
  process.exit(1);
}
