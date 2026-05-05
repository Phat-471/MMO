export interface AuthContext {
  userId: string;
  workspaceId: string | null;
  sessionId: string | null;
  tokenType: "access";
}

export interface RequestWithAuth {
  headers?: {
    authorization?: string;
  };
  auth?: AuthContext;
}
