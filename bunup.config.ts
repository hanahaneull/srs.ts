import { defineConfig } from "bunup";

export default defineConfig([
    {
        entry: "src/index.ts",
        name: "package",
        format: ["esm", "cjs"],
        minify: true,
        outDir: "dist",
        dts: true,
    },
    {
        entry: "src/cli.ts",
        name: "cli",
        format: "esm",
        minify: true,
        outDir: "dist/cli",
        dts: false,
    }
]);