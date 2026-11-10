import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import type { ReactElement } from "react";
import AddCallPeople, {
  type AddCallPeopleProps,
} from "../client/src/components/AddCallPeople";

// Exercise the actual component's event handlers and rendered accessibility
// props without introducing a DOM library or modifying the project test setup.
const harness = vi.hoisted(() => ({
  states: [] as unknown[],
  refs: [] as { current: unknown }[],
  stateIndex: 0,
  refIndex: 0,
  user: { id: 1 } as { id: number } | null,
  authLoading: false,
  authError: null as unknown,
  friends: {} as any,
  profiles: {} as any,
  mutation: {} as any,
  mutationOptions: {} as any,
  friendsUseQuery: vi.fn(),
  profilesUseQuery: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("react", async importOriginal => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: (initial: unknown) => {
      const index = harness.stateIndex++;
      if (!(index in harness.states)) {
        harness.states[index] =
          typeof initial === "function" ? initial() : initial;
      }
      return [
        harness.states[index],
        (next: unknown) => {
          harness.states[index] =
            typeof next === "function" ? next(harness.states[index]) : next;
        },
      ];
    },
    useRef: (initial: unknown) => {
      const index = harness.refIndex++;
      harness.refs[index] ??= { current: initial };
      return harness.refs[index];
    },
    useCallback: (callback: unknown) => callback,
    useEffect: () => {},
    useId: () => "add-call-test",
  };
});
vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: harness.user,
    loading: harness.authLoading,
    error: harness.authError,
  }),
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    friends: {
      list: {
        useQuery: (...args: unknown[]) => {
          harness.friendsUseQuery(...args);
          return harness.friends;
        },
      },
      listEnriched: {
        useQuery: (...args: unknown[]) => {
          harness.profilesUseQuery(...args);
          return harness.profiles;
        },
      },
    },
    callInvites: {
      start: {
        useMutation: (options: unknown) => {
          harness.mutationOptions = options;
          return harness.mutation;
        },
      },
    },
  },
}));
vi.mock("sonner", () => ({ toast: { error: harness.toastError } }));
vi.mock("@/components/ui/avatar", () => ({
  Avatar: "span",
  AvatarImage: "img",
  AvatarFallback: "span",
}));
vi.mock("@/components/ui/button", () => ({ Button: "button" }));
vi.mock("@/components/ui/input", () => ({ Input: "input" }));

let props: AddCallPeopleProps;
function render() {
  harness.stateIndex = 0;
  harness.refIndex = 0;
  return AddCallPeople(props);
}
function elements(node: unknown): ReactElement<any>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const element = node as ReactElement<any>;
  return [element, ...elements(element.props.children)];
}
function testId(tree: unknown, id: string) {
  const element = elements(tree).find(item => item.props["data-testid"] === id);
  if (!element) throw new Error(`Missing test selector: ${id}`);
  return element.props;
}
function select(id: number) {
  testId(render(), `call-invite-person-${id}`).onChange();
}
function text(node: unknown): string {
  if (Array.isArray(node)) return node.map(text).join(" ");
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (node && typeof node === "object" && "props" in node) {
    return text((node as ReactElement<any>).props.children);
  }
  return "";
}

beforeEach(() => {
  vi.clearAllMocks();
  // This repository's node-only Vitest setup uses the classic JSX transform.
  vi.stubGlobal("React", React);
  harness.states = [];
  harness.refs = [];
  harness.user = { id: 1 };
  harness.authLoading = false;
  harness.authError = null;
  harness.friends = {
    data: [1, 2, 3, 4, 5].map(id => ({ userId1: 1, userId2: id })),
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  };
  harness.profiles = {
    data: [1, 2, 3, 4, 5].map(id => ({
      friend: {
        id,
        name: `Person ${id}`,
        avatar: null,
        email: "secret@example.com",
      },
    })),
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  };
  harness.mutation = { isPending: false, mutate: vi.fn() };
  props = {
    peerId: 2,
    peerName: "Current peer",
    isVideo: true,
    onClose: vi.fn(),
    onCreated: vi.fn(),
  };
});

afterEach(() => vi.unstubAllGlobals());

describe("AddCallPeople embedded panel", () => {
  it("excludes self, current peer, non-friends, and duplicate profiles without displaying emails", () => {
    harness.profiles.data.push(harness.profiles.data[2]);
    harness.profiles.data.push({ friend: { id: 99, name: "Not a friend" } });
    const tree = render();
    const ids = elements(tree)
      .map(item => item.props["data-testid"])
      .filter(
        id => typeof id === "string" && id.startsWith("call-invite-person-")
      );
    expect(ids).toEqual([
      "call-invite-person-3",
      "call-invite-person-4",
      "call-invite-person-5",
    ]);
    expect(text(tree)).not.toContain("secret@example.com");
    expect(testId(tree, "call-add-people-invite").disabled).toBe(true);
    expect(testId(tree, "call-invite-person-3")["aria-label"]).toBe(
      "Invite Person 3"
    );
  });

  it("limits invitations to two, preserving selections across case-insensitive searches", () => {
    select(3);
    select(4);
    const tree = render();
    expect(testId(tree, "call-invite-person-5").disabled).toBe(true);
    // Even invoking a disabled checkbox's handler cannot add a third person.
    testId(tree, "call-invite-person-5").onChange();
    testId(tree, "call-add-people-search").onChange({
      target: { value: "PERSON 5" },
    });
    expect(
      elements(render()).filter(item => item.props.type === "checkbox")
    ).toHaveLength(1);
    testId(render(), "call-add-people-invite").onClick();
    expect(harness.mutation.mutate).toHaveBeenCalledWith({
      peerId: 2,
      inviteeIds: [3, 4],
      type: "video",
    });
  });

  it("allows deselection at the limit and sends audio for voice calls", () => {
    props.isVideo = false;
    select(3);
    select(4);
    select(3);
    expect(testId(render(), "call-invite-person-5").disabled).toBe(false);
    testId(render(), "call-add-people-invite").onClick();
    expect(harness.mutation.mutate).toHaveBeenCalledWith({
      peerId: 2,
      inviteeIds: [4],
      type: "audio",
    });
  });

  it("cancel before sending closes only this panel and performs no mutation", () => {
    select(3);
    testId(render(), "call-add-people-cancel").onClick();
    expect(props.onClose).toHaveBeenCalledOnce();
    expect(harness.mutation.mutate).not.toHaveBeenCalled();
    expect(props.onCreated).not.toHaveBeenCalled();
  });

  it("locks duplicate submissions and cancellation synchronously, then disables all controls while pending", () => {
    select(3);
    const staleTree = render();
    testId(staleTree, "call-add-people-invite").onClick();
    testId(staleTree, "call-add-people-invite").onClick();
    testId(staleTree, "call-add-people-cancel").onClick();
    expect(harness.mutation.mutate).toHaveBeenCalledOnce();
    expect(props.onClose).not.toHaveBeenCalled();
    harness.mutation.isPending = true;
    const pendingTree = render();
    for (const id of [
      "call-add-people-invite",
      "call-add-people-cancel",
      "call-add-people-search",
      "call-invite-person-3",
    ]) {
      expect(testId(pendingTree, id).disabled).toBe(true);
    }
    const event = {
      key: "Escape",
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    };
    testId(pendingTree, "call-add-people-panel").onKeyDown(event);
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("forbidden failures show an inline alert and toast, preserving selection and call", () => {
    select(3);
    testId(render(), "call-add-people-invite").onClick();
    harness.mutationOptions.onError({
      message: "Forbidden",
      data: { code: "FORBIDDEN" },
    });
    const tree = render();
    expect(harness.toastError).toHaveBeenCalledWith(
      expect.stringContaining("current call is unchanged")
    );
    expect(
      elements(tree).find(item => item.props.role === "alert")
    ).toBeDefined();
    expect(testId(tree, "call-invite-person-3").checked).toBe(true);
    expect(props.onClose).not.toHaveBeenCalled();
    testId(tree, "call-add-people-invite").onClick();
    expect(harness.mutation.mutate).toHaveBeenCalledTimes(2);
  });

  it("reports generic invitation failure without clearing selection", () => {
    select(4);
    testId(render(), "call-add-people-invite").onClick();
    harness.mutationOptions.onError({ message: "Network unavailable" });
    expect(harness.toastError).toHaveBeenCalledWith("Network unavailable");
    expect(text(render())).toContain("Network unavailable");
    expect(testId(render(), "call-invite-person-4").checked).toBe(true);
  });

  it("success calls only onCreated with the actual result and prevents a second submission", () => {
    select(3);
    testId(render(), "call-add-people-invite").onClick();
    const result = { roomId: 21, groupId: 12, invitedUserIds: [2, 3] };
    harness.mutationOptions.onSuccess(result);
    expect(props.onCreated).toHaveBeenCalledWith(result);
    expect(props.onClose).not.toHaveBeenCalled();
    testId(render(), "call-add-people-invite").onClick();
    expect(harness.mutation.mutate).toHaveBeenCalledOnce();
  });

  it("enables queries only with a user and uses a different cache hash after account changes", () => {
    render();
    const firstOptions = harness.friendsUseQuery.mock.lastCall![1];
    expect(firstOptions.enabled).toBe(true);
    const firstHash = firstOptions.queryKeyHashFn([["friends", "list"]]);
    harness.user = { id: 7 };
    render();
    const nextOptions = harness.friendsUseQuery.mock.lastCall![1];
    expect(nextOptions.queryKeyHashFn([["friends", "list"]])).not.toBe(
      firstHash
    );
    harness.user = null;
    render();
    expect(harness.friendsUseQuery.mock.lastCall![1].enabled).toBe(false);
    expect(harness.profilesUseQuery.mock.lastCall![1].enabled).toBe(false);
  });

  it("does not carry selected friends into a changed account or peer", () => {
    select(3);
    harness.user = { id: 7 };
    expect(testId(render(), "call-add-people-invite").disabled).toBe(true);
    harness.user = { id: 1 };
    props.peerId = 3;
    expect(testId(render(), "call-add-people-invite").disabled).toBe(true);
  });

  it("renders real loading, empty, search-empty, and query-error states", () => {
    harness.friends.isLoading = true;
    expect(text(render())).toContain("Loading friends");
    harness.friends.isLoading = false;
    harness.friends.data = [];
    expect(text(render())).toContain("No other friends are available");
    harness.friends.data = [{ userId1: 1, userId2: 3 }];
    testId(render(), "call-add-people-search").onChange({
      target: { value: "No match" },
    });
    expect(text(render())).toContain("No friends match");
    harness.friends.error = { message: "Database offline" };
    const tree = render();
    expect(text(tree)).toContain("Could not load your friends");
    expect(testId(tree, "call-add-people-invite").disabled).toBe(true);
    const retry = elements(tree).find(
      item => text(item.props.children) === "Try again"
    );
    retry!.props.onClick();
    expect(harness.friends.refetch).toHaveBeenCalledOnce();
    expect(harness.profiles.refetch).toHaveBeenCalledOnce();
  });

  it("refuses stale selected friends that were removed before sending", () => {
    select(3);
    harness.friends.data = [];
    testId(render(), "call-add-people-invite").onClick();
    expect(harness.mutation.mutate).not.toHaveBeenCalled();
    expect(harness.toastError).toHaveBeenCalledWith(
      expect.stringContaining("no longer available")
    );
    expect(props.onClose).not.toHaveBeenCalled();
  });
});
