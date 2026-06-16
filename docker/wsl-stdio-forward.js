const net = require("node:net");
const { spawn } = require("node:child_process");

const forwards = [
  { listenPort: 15433, targetPort: 5433, name: "postgres" },
  { listenPort: 16380, targetPort: 6380, name: "redis" },
  { listenPort: 11884, targetPort: 1884, name: "mqtt" },
];

for (const forward of forwards) {
  const server = net.createServer((socket) => {
    const child = spawn("wsl.exe", ["sh", "-lc", `nc 127.0.0.1 ${forward.targetPort}`], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    socket.pipe(child.stdin);
    child.stdout.pipe(socket);

    const closeAll = () => {
      socket.destroy();
      child.kill();
    };

    socket.on("error", closeAll);
    socket.on("close", closeAll);
    child.on("error", closeAll);
    child.on("close", () => socket.end());
  });

  server.listen(forward.listenPort, "127.0.0.1");
}

setInterval(() => {}, 1 << 30);
