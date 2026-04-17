import { NextResponse } from "next/server";
import os from "os";

function getLocalIPv4(): string | null {
  const interfaces = os.networkInterfaces();

  for (const entries of Object.values(interfaces)) {
    if (!entries) continue;

    for (const net of entries) {
      const isIPv4 = net.family === "IPv4";
      const isPrivateRange =
        net.address.startsWith("10.") ||
        net.address.startsWith("192.168.") ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(net.address);

      if (isIPv4 && !net.internal && isPrivateRange) {
        return net.address;
      }
    }
  }

  return null;
}

export async function GET() {
  const ip = getLocalIPv4();

  if (!ip) {
    return NextResponse.json({ ip: null }, { status: 404 });
  }

  return NextResponse.json({ ip });
}
