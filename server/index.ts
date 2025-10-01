import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*" },
});

mongoose.connect("mongodb://localhost:27017/drawingApp")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

const strokeSchema = new mongoose.Schema({
  x: Number,
  y: Number,
  prevX: Number,
  prevY: Number,
  color: String,
  timestamp: { type: Date, default: Date.now },
});

const Stroke = mongoose.model("Stroke", strokeSchema);

io.on("connection", async (socket) => {
  console.log("User connected:", socket.id);

  // Send stored strokes to new client
  const strokes = await Stroke.find();
  strokes.forEach((stroke) => socket.emit("draw", stroke));

  socket.on("draw", async (data) => {
    io.emit("draw", data); // broadcast to all
    const stroke = new Stroke(data);
    await stroke.save();
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

httpServer.listen(3001, () => {
  console.log("WebSocket server running on http://localhost:3001");
});
