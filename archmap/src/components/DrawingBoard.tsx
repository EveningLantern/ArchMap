"use client";

import { useRef, useEffect, useState } from "react";

// Define shape properties for modification
interface Shape {
  type: string;
  x1: number;
  y1: number;
  x2?: number;
  y2?: number;
  radius?: number;
  sides?: number;
  color: string;
  lineWidth: number;
}

export default function DrawingBoard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#ffffff"); // Default white for visibility on black
  const [tool, setTool] = useState<"pencil" | "eraser" | "line" | "rectangle" | "circle" | "square" | "triangle" | "polygon" | "arc">("pencil");
  const [lineWidth, setLineWidth] = useState(5);
  const [drawHistory, setDrawHistory] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);
  const [shapes, setShapes] = useState<Shape[]>([]); // Store drawn shapes for modification
  const [selectedShapeIndex, setSelectedShapeIndex] = useState<number | null>(null); // Track selected shape for modification
  const [isModifying, setIsModifying] = useState(false); // Track if modifying a shape
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null); // Track starting point for drawing

  // Set up canvas on mount and handle initial state
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    // Set canvas size to fill the entire right side (70% of viewport width, 80% of viewport height)
    canvas.width = window.innerWidth * 0.7;
    canvas.height = window.innerHeight * 0.8;

    // Set canvas background to #333333
    context.fillStyle = "#333333";
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Default settings
    context.lineWidth = lineWidth;
    context.lineCap = "round";
    context.strokeStyle = color;

    // Save initial state for undo
    const initialImage = context.getImageData(0, 0, canvas.width, canvas.height);
    setDrawHistory([initialImage]);

    // Redraw all shapes on canvas
    redrawShapes(context);
  }, []); // Run only on mount

  // Update stroke style and line width without redrawing the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context) return;

    context.strokeStyle = tool === "eraser" ? "#333333" : color;
    context.lineWidth = lineWidth;
    redrawShapes(context); // Redraw shapes with updated settings
  }, [color, lineWidth, tool]);

  // Redraw all shapes on the canvas
  const redrawShapes = (context: CanvasRenderingContext2D) => {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    context.fillStyle = "#333333";
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);

    shapes.forEach((shape) => {
      context.strokeStyle = shape.color;
      context.lineWidth = shape.lineWidth;

      switch (shape.type) {
        case "line":
          context.beginPath();
          context.moveTo(shape.x1, shape.y1);
          context.lineTo(shape.x2!, shape.y2!);
          context.stroke();
          break;
        case "rectangle":
        case "square":
          context.strokeRect(shape.x1, shape.y1, (shape.x2 || shape.x1) - shape.x1, (shape.y2 || shape.y1) - shape.y1);
          break;
        case "circle":
          context.beginPath();
          context.arc(shape.x1, shape.y1, shape.radius!, 0, Math.PI * 2);
          context.stroke();
          break;
        case "triangle":
          context.beginPath();
          context.moveTo(shape.x1, shape.y1);
          context.lineTo(shape.x2!, shape.y2!);
          context.lineTo(shape.x1 + ((shape.x2 || shape.x1) - shape.x1) / 2, shape.y1 - Math.abs((shape.y2 || shape.y1) - shape.y1));
          context.closePath();
          context.stroke();
          break;
        case "polygon":
          context.beginPath();
          const sides = shape.sides || 5;
          const angle = (2 * Math.PI) / sides;
          for (let i = 0; i < sides; i++) {
            const x = shape.x1 + (shape.radius || 50) * Math.cos(angle * i);
            const y = shape.y1 + (shape.radius || 50) * Math.sin(angle * i);
            if (i === 0) context.moveTo(x, y);
            else context.lineTo(x, y);
          }
          context.closePath();
          context.stroke();
          break;
        case "arc":
          context.beginPath();
          context.arc(shape.x1, shape.y1, shape.radius!, 0, Math.PI, false); // Half-circle arc for simplicity
          context.stroke();
          break;
        case "pencil":
        case "eraser":
          // Pencil/eraser drawings are handled via drawHistory, not shapes
          break;
      }
    });

    // Restore any pencil/eraser drawings from drawHistory
    if (drawHistory.length > 0) {
      context.putImageData(drawHistory[drawHistory.length - 1], 0, 0);
    }
  };

  // Start drawing or selecting shape
  const startDrawingOrModify = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on a shape for modification
    let hitShapeIndex = null;
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      if (isPointInShape(x, y, shape)) {
        hitShapeIndex = i;
        break;
      }
    }

    if (hitShapeIndex !== null && e.altKey) { // Use Alt key to modify (e.g., delete or move)
      setSelectedShapeIndex(hitShapeIndex);
      setIsModifying(true);
      setStartPoint({ x, y });
      return;
    } else if (hitShapeIndex !== null) { // Select shape for modification (e.g., resize)
      setSelectedShapeIndex(hitShapeIndex);
      setIsModifying(true);
      setStartPoint({ x, y });
      return;
    }

    // Start new drawing
    context.beginPath();
    context.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    setIsDrawing(true);
    setStartPoint({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });

    // Save current state before drawing
    saveCanvasState(context);
  };

  // Check if a point is in a shape (simplified for this example)
  const isPointInShape = (x: number, y: number, shape: Shape): boolean => {
    switch (shape.type) {
      case "line":
        const dist = distanceToLine({ x, y }, { x: shape.x1, y: shape.y1 }, { x: shape.x2!, y: shape.y2! });
        return dist < shape.lineWidth + 5;
      case "rectangle":
      case "square":
        return x >= shape.x1 && x <= (shape.x2 || shape.x1) && y >= shape.y1 && y <= (shape.y2 || shape.y1);
      case "circle":
        return Math.hypot(x - shape.x1, y - shape.y1) <= (shape.radius || 50) + 5;
      case "triangle":
        return isPointInTriangle(x, y, { x: shape.x1, y: shape.y1 }, { x: shape.x2!, y: shape.y2! }, { x: shape.x1 + (((shape.x2 || shape.x1) - shape.x1) / 2), y: shape.y1 - Math.abs((shape.y2 || shape.y1) - shape.y1) });
      case "polygon":
        return isPointInPolygon(x, y, shape.x1, shape.y1, shape.radius || 50, shape.sides || 5);
      case "arc":
        return Math.hypot(x - shape.x1, y - shape.y1) <= (shape.radius || 50) + 5 && y >= shape.y1 - (shape.radius || 50) && y <= shape.y1;
      case "pencil":
      case "eraser":
        return false; // Pencil/eraser drawings handled via drawHistory, not shapes
      default:
        return false;
    }
  };

  // Helper functions for shape detection (unchanged from previous)
  const distanceToLine = (point: { x: number; y: number }, start: { x: number; y: number }, end: { x: number; y: number }) => {
    const A = point.x - start.x;
    const B = point.y - start.y;
    const C = end.x - start.x;
    const D = end.y - start.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = start.x;
      yy = start.y;
    } else if (param > 1) {
      xx = end.x;
      yy = end.y;
    } else {
      xx = start.x + param * C;
      yy = start.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const isPointInTriangle = (x: number, y: number, p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }) => {
    const areaOrig = Math.abs((p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y)) / 2);
    const area1 = Math.abs((p1.x * (p2.y - y) + p2.x * (y - p1.y) + x * (p1.y - p2.y)) / 2);
    const area2 = Math.abs((p2.x * (p3.y - y) + p3.x * (y - p2.y) + x * (p2.y - p3.y)) / 2);
    const area3 = Math.abs((p3.x * (p1.y - y) + p1.x * (y - p3.y) + x * (p3.y - p1.y)) / 2);

    return Math.abs(areaOrig - (area1 + area2 + area3)) < 0.01;
  };

  const isPointInPolygon = (x: number, y: number, centerX: number, centerY: number, radius: number, sides: number) => {
    const angle = (2 * Math.PI) / sides;
    let inside = false;
    for (let i = 0, j = sides - 1; i < sides; j = i++) {
      const xi = centerX + radius * Math.cos(angle * i);
      const yi = centerY + radius * Math.sin(angle * i);
      const xj = centerX + radius * Math.cos(angle * j);
      const yj = centerY + radius * Math.sin(angle * j);
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  // Draw or modify
  const drawOrModify = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isModifying && selectedShapeIndex !== null && startPoint) {
      const updatedShapes = [...shapes];
      const shape = updatedShapes[selectedShapeIndex];

      if (e.shiftKey) { // Resize (scale)
        const dx = x - startPoint.x;
        const dy = y - startPoint.y;
        shape.x2 = shape.x1 + dx;
        shape.y2 = shape.y1 + dy;
        if (shape.type === "circle" || shape.type === "arc" || shape.type === "polygon") {
          shape.radius = Math.hypot(dx, dy) / 2 || 50; // Default radius if zero
        }
        if (shape.type === "square") {
          const size = Math.max(Math.abs(dx), Math.abs(dy));
          shape.x2 = shape.x1 + (dx > 0 ? size : -size);
          shape.y2 = shape.y1 + (dy > 0 ? size : -size);
        }
      } else { // Move
        const dx = x - startPoint.x;
        const dy = y - startPoint.y;
        shape.x1 += dx;
        shape.y1 += dy;
        if (shape.x2) shape.x2 += dx;
        if (shape.y2) shape.y2 += dy;
      }

      setShapes(updatedShapes);
      setStartPoint({ x, y }); // Update start point for continuous modification
      redrawShapes(context);
    } else if (isDrawing && startPoint) {
      if (tool === "pencil" || tool === "eraser") {
        draw(e);
      } else {
        drawShape(e);
      }
    }
  };

  // Draw functions (now properly defined)
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context || !canvas) return;

    context.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    context.stroke();
  };

  const drawShape = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context || !canvas) return;

    const currentX = e.nativeEvent.offsetX;
    const currentY = e.nativeEvent.offsetY;

    context.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
    if (drawHistory.length > 0) {
      context.putImageData(drawHistory[drawHistory.length - 1], 0, 0); // Restore previous state
    }

    switch (tool) {
      case "line":
        context.beginPath();
        context.moveTo(startPoint.x, startPoint.y);
        context.lineTo(currentX, currentY);
        context.stroke();
        break;
      case "rectangle":
        context.strokeRect(startPoint.x, startPoint.y, currentX - startPoint.x, currentY - startPoint.y);
        break;
      case "square":
        const size = Math.max(Math.abs(currentX - startPoint.x), Math.abs(currentY - startPoint.y));
        const dx = currentX > startPoint.x ? size : -size;
        const dy = currentY > startPoint.y ? size : -size;
        context.strokeRect(startPoint.x, startPoint.y, dx, dy);
        break;
      case "circle":
        const radius = Math.hypot(currentX - startPoint.x, currentY - startPoint.y) / 2;
        context.beginPath();
        context.arc(startPoint.x + (currentX - startPoint.x) / 2, startPoint.y + (currentY - startPoint.y) / 2, radius, 0, Math.PI * 2);
        context.stroke();
        break;
      case "triangle":
        context.beginPath();
        context.moveTo(startPoint.x, startPoint.y);
        context.lineTo(currentX, currentY);
        context.lineTo(startPoint.x + (currentX - startPoint.x) / 2, startPoint.y - Math.abs(currentY - startPoint.y));
        context.closePath();
        context.stroke();
        break;
      case "polygon":
        const polyRadius = Math.hypot(currentX - startPoint.x, currentY - startPoint.y) / 2 || 50;
        const sides = 5; // Default pentagon
        const polyAngle = (2 * Math.PI) / sides;
        context.beginPath();
        for (let i = 0; i < sides; i++) {
          const x = startPoint.x + polyRadius * Math.cos(polyAngle * i);
          const y = startPoint.y + polyRadius * Math.sin(polyAngle * i);
          if (i === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.closePath();
        context.stroke();
        break;
      case "arc":
        const arcRadius = Math.hypot(currentX - startPoint.x, currentY - startPoint.y) / 2 || 50;
        context.beginPath();
        context.arc(startPoint.x + (currentX - startPoint.x) / 2, startPoint.y, arcRadius, 0, Math.PI, false); // Half-circle arc
        context.stroke();
        break;
    }
  };

  // Stop drawing or modifying
  const stopDrawingOrModify = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (context) context.closePath();
    setIsDrawing(false);
    setIsModifying(false);
    setRedoStack([]); // Clear redo stack on new drawing or modification
    setSelectedShapeIndex(null);
    setStartPoint(null);

    if (isDrawing && startPoint) {
      const shape: Shape = {
        type: tool,
        x1: startPoint.x,
        y1: startPoint.y,
        color,
        lineWidth,
      };

      if (tool === "pencil" || tool === "eraser") {
        // Pencil/eraser drawings are stored in drawHistory, not shapes
      } else {
        const rect = canvas!.getBoundingClientRect();
        const currentX = context!.getImageData(canvas!.width - 1, 0, 1, 1).data[0] === 51 ? canvas!.width : context!.getImageData(canvas!.width - 1, 0, 1, 1).data[0];
        const currentY = context!.getImageData(0, canvas!.height - 1, 1, 1).data[1];
        shape.x2 = currentX;
        shape.y2 = currentY;
        if (tool === "circle" || tool === "arc" || tool === "polygon") {
          shape.radius = Math.hypot(currentX - startPoint.x, currentY - startPoint.y) / 2 || 50;
        }
        if (tool === "polygon") shape.sides = 5; // Default pentagon
        if (tool === "square") {
          const size = Math.max(Math.abs(currentX - startPoint.x), Math.abs(currentY - startPoint.y));
          shape.x2 = startPoint.x + (currentX > startPoint.x ? size : -size);
          shape.y2 = startPoint.y + (currentY > startPoint.y ? size : -size);
        }

        setShapes([...shapes, shape]);
      }
    }
  };

  // Delete selected shape (on right-click or specific key)
  const deleteShape = () => {
    if (selectedShapeIndex !== null) {
      const updatedShapes = shapes.filter((_, index) => index !== selectedShapeIndex);
      setShapes(updatedShapes);
      setSelectedShapeIndex(null);
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (context) redrawShapes(context);
    }
  };

  // Save current canvas state for undo
  const saveCanvasState = (context: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    setDrawHistory((prev) => [...prev, imageData]);
  };

  // Undo drawing
  const undo = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context || drawHistory.length <= 1) return;

    const lastState = drawHistory[drawHistory.length - 2];
    setRedoStack([drawHistory[drawHistory.length - 1], ...redoStack]);
    setDrawHistory(drawHistory.slice(0, -1));
    context.putImageData(lastState, 0, 0);
  };

  // Redo drawing
  const redo = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context || redoStack.length === 0) return;

    const nextState = redoStack[0];
    setDrawHistory([...drawHistory, nextState]);
    setRedoStack(redoStack.slice(1));
    context.putImageData(nextState, 0, 0);
  };

  // Export canvas as PNG without background
  const exportDrawing = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    // Save the current canvas state
    const currentImageData = context.getImageData(0, 0, canvas.width, canvas.height);

    // Create a temporary canvas to isolate the drawing (remove background)
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempContext = tempCanvas.getContext("2d");
    if (!tempContext) return;

    // Draw only the non-background pixels (assuming #333333 is the background)
    tempContext.putImageData(currentImageData, 0, 0);

    // Create a data URL for the drawing without background
    const link = document.createElement("a");
    link.download = "archmap_drawing.png";
    link.href = tempCanvas.toDataURL("image/png");
    link.click();

    // Clean up (optional, but good practice)
    tempCanvas.remove();
  };

  return (
    <div className="w-7/10 p-4 bg-[#333333] rounded-lg border border-white shadow-md flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-white">ARCHMAP</h1>
        <button
          onClick={exportDrawing}
          className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500 text-white font-medium transition-colors duration-200"
        >
          Export PNG
        </button>
      </div>
      <div className="relative flex-1 h-full">
        {/* Toolbar overlay within the drawing board */}
        <div className="absolute top-4 left-4 flex gap-2 flex-wrap z-10">
          <button
            onClick={() => setTool("pencil")}
            className={`px-3 py-1 rounded ${tool === "pencil" ? "bg-gray-700" : "bg-gray-600"} text-white transition-colors duration-200 relative`}
            title="Pencil"
          >
            ✏️
          </button>
          <button
            onClick={() => setTool("eraser")}
            className={`px-3 py-1 rounded ${tool === "eraser" ? "bg-gray-700" : "bg-gray-600"} text-white transition-colors duration-200 relative`}
            title="Eraser"
          >
            🧹
          </button>
          <button
            onClick={() => setTool("line")}
            className={`px-3 py-1 rounded ${tool === "line" ? "bg-gray-700" : "bg-gray-600"} text-white transition-colors duration-200 relative`}
            title="Line"
          >
            ─
          </button>
          <button
            onClick={() => setTool("rectangle")}
            className={`px-3 py-1 rounded ${tool === "rectangle" ? "bg-gray-700" : "bg-gray-600"} text-white transition-colors duration-200 relative`}
            title="Rectangle"
          >
            ▯
          </button>
          <button
            onClick={() => setTool("circle")}
            className={`px-3 py-1 rounded ${tool === "circle" ? "bg-gray-700" : "bg-gray-600"} text-white transition-colors duration-200 relative`}
            title="Circle"
          >
            ○
          </button>
          <button
            onClick={() => setTool("square")}
            className={`px-3 py-1 rounded ${tool === "square" ? "bg-gray-700" : "bg-gray-600"} text-white transition-colors duration-200 relative`}
            title="Square"
          >
            ▢
          </button>
          <button
            onClick={() => setTool("triangle")}
            className={`px-3 py-1 rounded ${tool === "triangle" ? "bg-gray-700" : "bg-gray-600"} text-white transition-colors duration-200 relative`}
            title="Triangle"
          >
            △
          </button>
          <button
            onClick={() => setTool("polygon")}
            className={`px-3 py-1 rounded ${tool === "polygon" ? "bg-gray-700" : "bg-gray-600"} text-white transition-colors duration-200 relative`}
            title="Polygon"
          >
            ⬟
          </button>
          <button
            onClick={() => setTool("arc")}
            className={`px-3 py-1 rounded ${tool === "arc" ? "bg-gray-700" : "bg-gray-600"} text-white transition-colors duration-200 relative`}
            title="Arc"
          >
            ⌓
          </button>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 border-none rounded-full"
          />
          <input
            type="range"
            min="1"
            max="20"
            value={lineWidth}
            onChange={(e) => setLineWidth(parseInt(e.target.value))}
            className="w-24 accent-white bg-gray-600 rounded-full"
          />
          <button
            onClick={undo}
            className="px-3 py-1 bg-gray-600 rounded hover:bg-gray-500 text-white text-sm font-medium transition-colors duration-200"
            disabled={drawHistory.length <= 1}
          >
            Undo
          </button>
          <button
            onClick={redo}
            className="px-3 py-1 bg-gray-600 rounded hover:bg-gray-500 text-white text-sm font-medium transition-colors duration-200"
            disabled={redoStack.length === 0}
          >
            Redo
          </button>
          <button
            onClick={deleteShape}
            className="px-3 py-1 bg-red-600 rounded hover:bg-red-500 text-white text-sm font-medium transition-colors duration-200"
            disabled={selectedShapeIndex === null}
          >
            Delete
          </button>
        </div>
        {/* Canvas filling the entire right side */}
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawingOrModify}
          onMouseMove={drawOrModify}
          onMouseUp={stopDrawingOrModify}
          onMouseOut={stopDrawingOrModify}
          onContextMenu={(e) => { e.preventDefault(); deleteShape(); }} // Right-click to delete
          className="border border-gray-700 bg-[#333333] w-full h-full absolute top-0 left-0"
        />
      </div>
    </div>
  );
}