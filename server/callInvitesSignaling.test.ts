import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Server as SocketServer } from "socket.io";
import { GROUP_CALL_INVITATION_EVENT, type GroupCallInvitationPayload } from "../shared/callInvites";
const mocks = vi.hoisted(() => ({ authenticateRequest: vi.fn(), sendCallPushNotification: vi.fn() }));
vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));
vi.mock("./webpush", () => ({ sendCallPushNotification: mocks.sendCallPushNotification }));
import { initCallSignaling, emitGroupCallInvitation } from "./callSignaling";
let middleware: (socket: any, next: (error?: Error) => void) => Promise<void>;
let connection: (socket: any) => void;
let io: { use: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn>; to: ReturnType<typeof vi.fn>; emit: ReturnType<typeof vi.fn> };
let deliveries: Array<{ socketId: string; event: string; payload: unknown }>;
let sockets: Array<{ id: string; data: { userId?: number }; request: object; on: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; handlers: Map<string, (...args: any[]) => void> }>;
const payload: GroupCallInvitationPayload = { roomId: 42, groupId: 71, fromId: 1, fromName: "Person 1", type: "video", expiresAt: Date.now() + 300_000 };
beforeEach(() => {
  vi.resetAllMocks(); deliveries = []; sockets = [];
  io = {
    use: vi.fn(fn => { middleware = fn; }),
    on: vi.fn((event, fn) => { if (event === "connection") connection = fn; }),
    to: vi.fn(socketId => ({ emit: vi.fn((event, data) => deliveries.push({ socketId, event, payload: data })) })),
    emit: vi.fn(),
  };
  initCallSignaling(io as unknown as SocketServer);
});
afterEach(() => { for (const socket of sockets) socket.handlers.get("disconnect")?.(); });
async function socket(userId: number, id: string) {
  const handlers = new Map<string, (...args: any[]) => void>();
  const result = { id, data: {} as { userId?: number }, request: { authenticatedUserId: userId }, handlers, on: vi.fn((event, handler) => handlers.set(event, handler)), disconnect: vi.fn() };
  mocks.authenticateRequest.mockResolvedValueOnce({ id: userId });
  const next = vi.fn(); await middleware(result, next);
  expect(next).toHaveBeenCalledWith();
  connection(result); sockets.push(result); return result;
}
describe("targeted group call invitation emitter", () => {
  it("targets every authenticated tab only for selected recipients and projects no secrets", async () => {
    await socket(1, "owner"); await socket(2, "peer-first-tab"); await socket(2, "peer-second-tab");
    await socket(3, "friend"); await socket(8, "outsider");
    io.emit.mockClear();
    emitGroupCallInvitation([2, 3, 2, 0, -1, 1, 1.5, 99], { ...payload, secret: "do-not-send", sdp: "no-sdp" } as GroupCallInvitationPayload);
    expect(deliveries).toEqual([
      { socketId: "peer-first-tab", event: GROUP_CALL_INVITATION_EVENT, payload },
      { socketId: "peer-second-tab", event: GROUP_CALL_INVITATION_EVENT, payload },
      { socketId: "friend", event: GROUP_CALL_INVITATION_EVENT, payload },
    ]);
    expect(GROUP_CALL_INVITATION_EVENT).toBe("call:group-invitation");
    expect(io.emit).not.toHaveBeenCalled();
    expect(JSON.stringify(deliveries)).not.toContain("do-not-send");
  });
  it("never registers unauthenticated connections as invitation recipients", async () => {
    mocks.authenticateRequest.mockRejectedValueOnce(new Error("not authenticated"));
    const untrusted = { id: "untrusted", data: {}, request: {}, on: vi.fn(), disconnect: vi.fn() };
    const next = vi.fn(); await middleware(untrusted, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "Unauthorized socket connection" }));
    emitGroupCallInvitation([2], payload);
    expect(deliveries).toEqual([]);
  });
  it("removes only disconnected tabs and keeps other authenticated connections targeted", async () => {
    const first = await socket(2, "first"); await socket(2, "second");
    first.handlers.get("disconnect")?.();
    emitGroupCallInvitation([2], payload);
    expect(deliveries.map(row => row.socketId)).toEqual(["second"]);
  });
});
