import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

function getSocketBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  try {
    const parsed = new URL(raw, "http://localhost:4000");
    if (parsed.pathname === "/api" || parsed.pathname === "/api/") {
      parsed.pathname = "/";
    }
    return parsed.origin;
  } catch {
    return "http://localhost:4000";
  }
}

export const getSocket = () => {
  if (!socket) {
    socket = io(getSocketBaseUrl(), {
      autoConnect: true,
      reconnection: true,
    });
  }
  return socket;
};

export const joinWorkspace = (workspaceId: string) => {
  const s = getSocket();
  s.emit('joinWorkspace', workspaceId);
};

export const leaveWorkspace = (workspaceId: string) => {
  const s = getSocket();
  s.emit('leaveWorkspace', workspaceId);
};
