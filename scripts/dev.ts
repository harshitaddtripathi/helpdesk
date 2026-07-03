type DevProcess = {
  name: string;
  command: string[];
};

const processes: DevProcess[] = [
  { name: "api", command: [process.execPath, "--watch", "server/src/index.ts"] },
  { name: "web", command: [process.execPath, "vite", "--host", "0.0.0.0"] }
];

const children = processes.map(({ name, command }) => {
  const child = Bun.spawn(command, {
    stdout: "pipe",
    stderr: "pipe",
    env: Bun.env
  });

  pipeOutput(name, child.stdout);
  pipeOutput(name, child.stderr);

  return child;
});

process.on("SIGINT", () => {
  for (const child of children) {
    child.kill();
  }
  process.exit(0);
});

await Promise.race(children.map((child) => child.exited));

for (const child of children) {
  child.kill();
}

function pipeOutput(name: string, stream: ReadableStream<Uint8Array> | null) {
  if (!stream) return;

  const reader = stream.getReader();
  const decoder = new TextDecoder();

  void (async () => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      for (const line of text.split(/\r?\n/)) {
        if (line.trim().length > 0) {
          console.log(`[${name}] ${line}`);
        }
      }
    }
  })();
}

export {};
