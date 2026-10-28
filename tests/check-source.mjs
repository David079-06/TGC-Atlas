import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const file = join(dir, name);
    if (statSync(file).isDirectory()) return name === "vendor" ? [] : walk(file);
    return file.endsWith(".js") ? [file] : [];
  });
}

const files = ["api", "lib", "public"].flatMap((dir) => walk(dir));
let failures = 0;
for (const file of files) {
  const code = readFileSync(file, "utf8");
  const result = spawnSync(process.execPath, ["--input-type=module", "--check"], {
    input: code,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    console.error("Syntax error:", relative(".", file), result.stderr.trim());
    failures++;
  }
}

const html = readFileSync("public/index.html", "utf8");
for (const match of html.matchAll(/(?:href|src)=["'](\/[^"']+\.(?:js|css))["']/g)) {
  const asset = join("public", match[1].slice(1));
  if (!existsSync(asset)) {
    console.error("Missing local UI asset:", match[1]);
    failures++;
  }
}

const privatePatterns = [
  /ghp_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /sk-[A-Za-z0-9_-]{25,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];
for (const file of files) {
  const contents = readFileSync(file, "utf8");
  if (privatePatterns.some((pattern) => pattern.test(contents))) {
    console.error("Possible hard-coded credential:", relative(".", file));
    failures++;
  }
}

console.log(`Checked ${files.length} JavaScript files and local UI references.`);
process.exitCode = failures > 0 ? 1 : 0;
