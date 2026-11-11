const path = require("node:path");
const { spawnSync } = require("node:child_process");
const dotenv = require("dotenv");

const root = path.resolve(__dirname, "..");
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || path.join(root, "backend", ".env") });

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const run = (command, args) => {
	const result = spawnSync(command, args, { cwd: root, env: process.env, stdio: "inherit" });
	if (result.status !== 0) process.exit(result.status ?? 1);
};

run(process.execPath, [path.join(root, "scripts", "validate-environment.js")]);
run(npmCommand, ["--workspace", "backend", "run", "prisma:generate"]);
run(npmCommand, ["--workspace", "backend", "run", "prisma:migrate"]);
run(npmCommand, ["--workspace", "backend", "run", "prisma:seed"]);
run(npmCommand, ["run", "provision:users"]);
console.log("IKODI setup completed. Start the server with: npm run dev");
