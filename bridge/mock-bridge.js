import { createServer } from "node:http";

const port = Number(process.env.PORT || 3001);
let tick = 0;

function buildReading() {
  tick += 1;
  const pressureRise = Math.min(34, tick * 3);
  const ivDrop = Math.max(28, 120 - tick * 4);

  return {
    connected: true,
    receivedAt: new Date().toISOString(),
    reading: {
      bedId: "Bed 01",
      pressure: {
        zones: [22, 38 + pressureRise, 62 + pressureRise, 44],
        highDurationSec: tick > 4 ? 35 + tick * 5 : 0,
        lastMovementMin: 10 + tick,
      },
      iv: {
        remainingMl: ivDrop,
        flowMlPerMin: tick > 16 ? 0 : 6,
        abnormalFlow: tick > 16,
      },
    },
  };
}

const server = createServer((request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.url === "/latest") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(buildReading()));
    return;
  }

  response.writeHead(404, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ error: "Use /latest" }));
});

server.listen(port, () => {
  console.log(`CareHub mock bridge listening on http://localhost:${port}/latest`);
});
