import { execFileSync } from "node:child_process";

const owner = { login: "darkprince558", id: 137824213 };
const remotes = new Set([
  "https://github.com/darkprince558/split.git",
  "https://github.com/darkprince558/split",
  "git@github.com:darkprince558/split.git",
  "ssh://git@github.com/darkprince558/split.git",
]);
const run = (command, args) =>
  execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

try {
  if (
    !run("git", ["remote", "get-url", "--all", "origin"])
      .split("\n")
      .some((url) => remotes.has(url))
  ) {
    throw new Error("Run this command in a checkout of darkprince558/split.");
  }
  const user = JSON.parse(run("gh", ["api", "user"]));
  if (user.login !== owner.login || user.id !== owner.id) {
    throw new Error(
      "The active GitHub account must be darkprince558, the Vercel project owner. No Git settings were changed.",
    );
  }
  run("git", ["config", "--local", "user.name", user.login]);
  run("git", [
    "config",
    "--local",
    "user.email",
    `${user.id}+${user.login}@users.noreply.github.com`,
  ]);
  console.log(
    "Split commit author configured for the verified GitHub owner. New pushes to main can trigger production deployments.",
  );
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : "Could not configure the deployment author.",
  );
  process.exitCode = 1;
}
