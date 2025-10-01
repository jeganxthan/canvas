import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3001"); // backend server

type Stroke = {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  color: string;
  size: number;
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("black");
  const [size, setSize] = useState(2);
  const prevPosRef = useRef<{ x: number; y: number } | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStrokes, setRedoStrokes] = useState<Stroke[]>([]);
  const isEraser = color === "white";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = size;
    ctx.lineCap = "round";

    const drawHandler = (data: Stroke) => {
      ctx.strokeStyle = data.color;
      ctx.lineWidth = data.size;
      ctx.beginPath();
      ctx.moveTo(data.prevX, data.prevY);
      ctx.lineTo(data.x, data.y);
      ctx.stroke();
    };

    const clearHandler = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    socket.on("draw", drawHandler);
    socket.on("clear", clearHandler);

    return () => {
      socket.off("draw", drawHandler);
      socket.off("clear", clearHandler);
    };
  }, [size, color]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    prevPosRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseUp = () => {
    setDrawing(false);
    prevPosRef.current = null;
    setRedoStrokes([]); // clear redo stack
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !prevPosRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const stroke: Stroke = { x, y, prevX: prevPosRef.current.x, prevY: prevPosRef.current.y, color, size };
    socket.emit("draw", stroke);

    setStrokes((prev) => [...prev, stroke]); // store locally
    prevPosRef.current = { x, y };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setStrokes([]);
    socket.emit("clear");
  };

  const undo = () => {
    if (strokes.length === 0) return;
    const newStrokes = strokes.slice(0, -1);
    const lastStroke = strokes[strokes.length - 1];
    setRedoStrokes((prev) => [...prev, lastStroke]);
    setStrokes(newStrokes);
    redraw(newStrokes);
  };

  const redo = () => {
    if (redoStrokes.length === 0) return;
    const lastRedo = redoStrokes[redoStrokes.length - 1];
    setRedoStrokes(redoStrokes.slice(0, -1));
    setStrokes((prev) => [...prev, lastRedo]);
    socket.emit("draw", lastRedo);
  };

  const redraw = (strokeList: Stroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokeList.forEach((stroke) => {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.beginPath();
      ctx.moveTo(stroke.prevX, stroke.prevY);
      ctx.lineTo(stroke.x, stroke.y);
      ctx.stroke();
    });
  };

  return (
    <div className="flex flex-col items-center p-4 space-y-4">
      <div className="flex space-x-4">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-10 border rounded" />
        <button onClick={() => setColor("white")} className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400">Eraser</button>
        <button onClick={undo} className="px-3 py-1 bg-yellow-400 rounded hover:bg-yellow-500">Undo</button>
        <button onClick={redo} className="px-3 py-1 bg-green-400 rounded hover:bg-green-500">Redo</button>
        <button onClick={clearCanvas} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">Clear</button>
        <select value={size} onChange={(e) => setSize(parseInt(e.target.value))} className="border rounded px-2">
          <option value={1}>1 px</option>
          <option value={2}>2 px</option>
          <option value={4}>4 px</option>
          <option value={6}>6 px</option>
          <option value={8}>8 px</option>
          <option value={10}>10 px</option>
        </select>
      </div>

      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="border border-gray-400"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
      />
    </div>
  );
}
