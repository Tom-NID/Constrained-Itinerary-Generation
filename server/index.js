"use strict";

// Loading modules
import express from "express";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { Worker } from "worker_threads";

// Get the current directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = app.listen(8080, function () {
  console.log("Server listening on port http://localhost:8080/");
});

// Listen on the websocket
const io = new Server(server);
const workers = {}; // Store workers for each client

app.use(express.static("public"));

// Set up to serve default file
app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "public", "../../public/app.html"));
});

io.on("connection", function (socket) {
  // parameters
  let maxSearchRadius = -1;
  let originLat = 0;
  let originLng = 0;

  let isWorkerBusy = false;
  let clear = true;

  // Stop the task if it takes too long
  socket.on("stopGeneration", () => {
    if (workers[socket.id]) {
      workers[socket.id].terminate();
      delete workers[socket.id];
      socket.emit("message", "Generation stopped succesfully.");
    } else {
      socket.emit("error", "Currently no generation in progress.");
    }
    isWorkerBusy = false;
  });

  socket.on("request", async (data) => {
    if (data.radius < 5000 || data.radius > 50000) {
      socket.emit("error", "Bad radius value");
      return;
    }
    if (data.elevation.up > 1000 || data.elevation.down > 1000) {
      socket.emit("error", "Elevation too high");
      return;
    }
    if (data.maxPaths < 1 || data.maxPaths > 10) {
      socket.emit("error", "Bad number of paths");
      return;
    }
    // TODO: vérifier les autres valeurs si nécessaire

    if (isWorkerBusy) {
      console.log("BUSY !!!!");
      socket.emit("message", "A task is already running");
      return;
    }

    maxSearchRadius = Math.max(data.radius, maxSearchRadius);

    if (
        data.radius > maxSearchRadius ||
        data.startingPoint.lat != originLat ||
        data.startingPoint.lng != originLng
    ) {
      clear = true;
    }

    // Délégation vers un worker thread pour gérer le traitement lourd.
    // Le worker devra prendre en compte :
    // - la sélection d'algorithme :
    //    * Si les deux contraintes (distance et dénivelé) sont actives → BFS complet,
    //    * Si seule l'élévation est activée → BFS adapté (ignorant la distance),
    //    * Si seule la distance est activée → A* (logique actuelle).
    // - Le traitement préférentiel du type de terrain (pénalités appliquées aux segments non préférés)
    const worker = new Worker("./server/worker.js", {
      workerData: { request: data, clear: clear },
    });

    clear = false;
    isWorkerBusy = true;

    workers[socket.id] = worker;

    worker.on("error", (msg) => {
      socket.emit("error", msg);
      return;
    });

    worker.on("message", (res) => {
      if (res.type === "result") {
        socket.emit("result", {
          request: data,
          response: { startingNode: res.startingNode, paths: res.paths },
        });
        isWorkerBusy = false;
      } else if (res.type === "generationInfo") {
        socket.emit("generationInfo", res.message);
      }
    });

    worker.on("error", (error) => {
      console.error("Worker error:", error);
    });
  });
});
