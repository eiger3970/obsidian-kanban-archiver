const esbuild = require("esbuild");

const prod = process.argv[2] === "production";

const buildOptions = {
  entryPoints: ["main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/*", "@lezer/*", "@cm6/*"],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
};

if (prod) {
  esbuild.build(buildOptions).catch(() => process.exit(1));
} else {
  esbuild.context(buildOptions).then(ctx => ctx.watch()).catch(() => process.exit(1));
}
