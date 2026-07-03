process.env.NODE_ENV = "production";

const entry = new URL("../dist/server/index.js", import.meta.url).href;
await import(entry);

export {};
