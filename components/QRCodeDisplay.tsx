"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface QRCodeDisplayProps {
  joinUrl: string;
  size?: number;
}

export default function QRCodeDisplay({ joinUrl, size = 200 }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !joinUrl) return;

    QRCode.toCanvas(canvasRef.current, joinUrl, {
      width: size,
      margin: 2,
      color: {
        dark: "#00D4FF",
        light: "#07071A",
      },
      errorCorrectionLevel: "M",
    }).catch(console.error);
  }, [joinUrl, size]);

  return (
    <div className="inline-block p-2 rounded-lg bg-[#07071A]" style={{
      boxShadow: "0 0 20px rgba(0, 212, 255, 0.3), 0 0 40px rgba(0, 212, 255, 0.1)",
      border: "1px solid rgba(0, 212, 255, 0.4)",
    }}>
      <canvas ref={canvasRef} className="rounded" />
    </div>
  );
}