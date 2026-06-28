import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserCheck, UserX, UserPlus, Users, Clock, Search,
  MessageCircle, BadgeCheck, X, UserMinus,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

type UserProfile = {
  id: number;
  name: string | null;
  avatar: string | null;
  bio: string | null;
  isVerified: boolean;
};

export default function Friends() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: pendingEnriched = [] } = trpc.friends.pendingEnriched.useQuery();
  const { data: sentEnriched = [] } = trpc.friends.sentEnriched.useQuery();
  const { data: friendsEnriched = [] } = trpc.friends.listEnriched.useQuery();
  const { data: suggestions = [] } = trpc.friends.suggestions.useQuery();

  const { data: legacyFriends = [] } = trpc.friends.list.useQuery();
  const { data: legacySent = [] } = trpc.friends.sent.useQuery();
  const { data: legacyPending = [] } = trpc.friends.pending.useQuery();

  const { data: searchResults = [], isFetching: isSearching } = trpc.users.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.trim().length >= 2 }
  );

  const sendRequestMutation = trpc.friends.sendRequest.useMutation({
    onSuccess: () => {
      utils.friends.sentEnriched.invalidate();
      utils.friends.sent.invalidate();
      utils.friends.suggestions.invalidate();
      utils.friends.pendingCount.invalidate();
      toast.success("Friend request sent!");
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelRequestMutation = trpc.friends.cancelRequest.useMutation({
    onSuccess: () => {
      utils.friends.sentEnriched.invalidate();
      utils.friends.sent.invalidate();
      utils.friends.suggestions.invalidate();
      utils.friends.pendingCount.invalidate();
      toast.success("Request cancelled.");
    },
    onError: (err) => toast.error(err.message),
  });

  const respondMutation = trpc.friends.respond.useMutation({
    onSuccess: (_data, vars) => {
      utils.friends.pendingEnriched.invalidate();
      utils.friends.pending.invalidate();
      utils.friends.listEnriched.invalidate();
      utils.friends.list.invalidate();
      utils.friends.pendingCount.invalidate();
      toast.success(vars.status === "accepted" ? "Friend request accepted!" : "Request declined.");
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMutation = trpc.friends.remove.useMutation({
    onSuccess: () => {
      utils.friends.listEnriched.invalidate();
      utils.friends.list.invalidate();
      utils.friends.suggestions.invalidate();
      toast.success("Friend removed.");
    },
    onError: (err) => toast.error(err.message),
  });

  const friendIds = new Set(legacyFriends.map((f) => (f.userId1 === user?.id ? f.userId2 : f.userId1)));
  const sentIds = new Set(legacySent.map((r) => r.receiverId));
  const pendingIds = new Set(legacyPending.map((r) => r.senderId));

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <span className="its-accent-lg" />
        <h1 className="text-sm font-black tracking-widest uppercase text-foreground">Friends</h1>
        <div className="flex-1 its-divider" />
        {pendingEnriched.length > 0 && (
          <Badge className="bg-[var(--its-red)] text-white border-0">
            {pendingEnriched.length} pending
          </Badge>
        )}
      </div>

      <Tabs defaultValue={pendingEnriched.length > 0 ? "requests" : "suggestions"}>
        {/* Scrollable tab bar — on narrow screens the list scrolls horizontally */}
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0" style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
          <TabsList className="inline-flex w-max sm:w-full sm:grid sm:grid-cols-4 h-auto gap-0">
            <TabsTrigger value="requests" className="relative py-2.5 px-4 text-xs font-bold tracking-widest uppercase whitespace-nowrap flex-shrink-0">
              <Users className="w-3.5 h-3.5 mr-1.5" />
              Requests
              {pendingEnriched.length > 0 && (
                <span className="ml-1.5 bg-[var(--its-red)] text-white text-[10px] font-bold rounded-full w-4 h-4 inline-flex items-center justify-center">
                  {pendingEnriched.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="py-2.5 px-4 text-xs font-bold tracking-widest uppercase whitespace-nowrap flex-shrink-0">
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              Suggestions
            </TabsTrigger>
            <TabsTrigger value="friends" className="py-2.5 px-4 text-xs font-bold tracking-widest uppercase whitespace-nowrap flex-shrink-0">
              <UserCheck className="w-3.5 h-3.5 mr-1.5" />
              Friends
              {friendsEnriched.length > 0 && (
                <span className="ml-1.5 text-muted-foreground text-[10px]">({friendsEnriched.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="find" className="py-2.5 px-4 text-xs font-bold tracking-widest uppercase whitespace-nowrap flex-shrink-0">
              <Search className="w-3.5 h-3.5 mr-1.5" />
              Find
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Friend Requests Tab */}
        <TabsContent value="requests" className="mt-4 space-y-3">
          {pendingEnriched.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No pending friend requests</p>
                <p className="text-sm mt-1">When someone sends you a request, it will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pendingEnriched.map((req) => (
                <PendingRequestCard
                  key={req.id}
                  req={req as any}
                  onAccept={() => respondMutation.mutate({ requestId: req.id, status: "accepted" })}
                  onDecline={() => respondMutation.mutate({ requestId: req.id, status: "declined" })}
                  isLoading={respondMutation.isPending}
                />
              ))}
            </div>
          )}
          {sentEnriched.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-3 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Sent Requests ({sentEnriched.length})
              </h3>
              <div className="space-y-2">
                {sentEnriched.map((req) => (
                  <SentRequestCard
                    key={req.id}
                    req={req as any}
                    onCancel={() => cancelRequestMutation.mutate({ receiverId: req.receiverId })}
                    isLoading={cancelRequestMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* People You May Know Tab */}
        <TabsContent value="suggestions" className="mt-4">
          {suggestions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No suggestions right now</p>
                <p className="text-sm mt-1">Use the Find tab to search for people you know.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-3 font-medium">People You May Know</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {suggestions.map(({ user: suggestedUser, mutualCount }) => (
                  <SuggestionCard
                    key={suggestedUser.id}
                    suggestedUser={suggestedUser as any}
                    mutualCount={mutualCount}
                    onAdd={() => sendRequestMutation.mutate({ receiverId: suggestedUser.id })}
                    isLoading={sendRequestMutation.isPending}
                  />
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* All Friends Tab */}
        <TabsContent value="friends" className="mt-4 space-y-3">
          {friendsEnriched.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No friends yet</p>
                <p className="text-sm mt-1">Check the Suggestions tab to connect with people.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {friendsEnriched.map((row) => row.friend && (
                <FriendCard
                  key={row.id}
                  friend={row.friend as any}
                  onMessage={() => navigate(`/messages?userId=${row.friend!.id}`)}
                  onRemove={() => removeMutation.mutate({ friendId: row.friend!.id })}
                  isLoading={removeMutation.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Find People Tab */}
        <TabsContent value="find" className="mt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {searchQuery.trim().length < 2 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Type at least 2 characters to search for people.</p>
              </CardContent>
            </Card>
          ) : isSearching ? (
            <p className="text-center text-muted-foreground py-6">Searching...</p>
          ) : searchResults.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No users found for &ldquo;{searchQuery}&rdquo;</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {searchResults
                .filter((u) => u.id !== user?.id)
                .map((u) => {
                  const isFriend = friendIds.has(u.id);
                  const hasSent = sentIds.has(u.id);
                  const hasPending = pendingIds.has(u.id);
                  return (
                    <Card key={u.id}>
                      <CardContent className="flex items-center gap-4 py-3">
                        <button onClick={() => navigate(`/profile/${u.id}`)}>
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={u.avatar ?? undefined} />
                            <AvatarFallback>{getInitials(u.name ?? "?")}</AvatarFallback>
                          </Avatar>
                        </button>
                        <div className="flex-1 min-w-0">
                          <button
                            className="font-semibold text-sm hover:underline text-left flex items-center gap-1"
                            onClick={() => navigate(`/profile/${u.id}`)}
                          >
                            {u.name}
                            {(u as any).isVerified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                          </button>
                          <p className="text-xs text-muted-foreground truncate">{(u as any).bio ?? "FacingFace member"}</p>
                        </div>
                        <div>
                          {isFriend ? (
                            <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5" /> Friends
                            </span>
                          ) : hasSent ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => cancelRequestMutation.mutate({ receiverId: u.id })}
                              disabled={cancelRequestMutation.isPending}
                            >
                              <X className="w-3.5 h-3.5 mr-1" /> Cancel
                            </Button>
                          ) : hasPending ? (
                            <div className="flex gap-1">
                              <Button size="sm" className="text-xs" onClick={() => {
                                const req = legacyPending.find(r => r.senderId === u.id);
                                if (req) respondMutation.mutate({ requestId: req.id, status: "accepted" });
                              }}>Accept</Button>
                              <Button size="sm" variant="outline" className="text-xs" onClick={() => {
                                const req = legacyPending.find(r => r.senderId === u.id);
                                if (req) respondMutation.mutate({ requestId: req.id, status: "declined" });
                              }}>Decline</Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              className="text-xs"
                              onClick={() => sendRequestMutation.mutate({ receiverId: u.id })}
                              disabled={sendRequestMutation.isPending}
                            >
                              <UserPlus className="w-3.5 h-3.5 mr-1" /> Add Friend
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PendingRequestCard({
  req,
  onAccept,
  onDecline,
  isLoading,
}: {
  req: { id: number; senderId: number; sender: UserProfile | null; mutualCount: number };
  onAccept: () => void;
  onDecline: () => void;
  isLoading: boolean;
}) {
  const [, navigate] = useLocation();
  const sender = req.sender;
  if (!sender) return null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="bg-gradient-to-br from-muted to-muted/50 h-16 relative" />
        <div className="px-4 pb-4 -mt-8">
          <button onClick={() => navigate(`/profile/${sender.id}`)}>
            <Avatar className="w-16 h-16 border-4 border-background ring-2 ring-[var(--its-red)]">
              <AvatarImage src={sender.avatar ?? undefined} />
              <AvatarFallback className="text-lg">{getInitials(sender.name ?? "?")}</AvatarFallback>
            </Avatar>
          </button>
          <div className="mt-2">
            <button
              className="font-bold text-sm hover:underline text-left flex items-center gap-1"
              onClick={() => navigate(`/profile/${sender.id}`)}
            >
              {sender.name}
              {sender.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
            </button>
            {req.mutualCount > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Users className="w-3 h-3" /> {req.mutualCount} mutual friend{req.mutualCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" className="flex-1 text-xs" onClick={onAccept} disabled={isLoading}>
              <UserCheck className="w-3.5 h-3.5 mr-1" /> Confirm
            </Button>
            <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={onDecline} disabled={isLoading}>
              <UserX className="w-3.5 h-3.5 mr-1" /> Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SentRequestCard({
  req,
  onCancel,
  isLoading,
}: {
  req: { id: number; receiverId: number; receiver: UserProfile | null };
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [, navigate] = useLocation();
  const receiver = req.receiver;
  if (!receiver) return null;

  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-3 px-4">
        <button onClick={() => navigate(`/profile/${receiver.id}`)}>
          <Avatar className="w-10 h-10">
            <AvatarImage src={receiver.avatar ?? undefined} />
            <AvatarFallback>{getInitials(receiver.name ?? "?")}</AvatarFallback>
          </Avatar>
        </button>
        <div className="flex-1 min-w-0">
          <button
            className="font-semibold text-sm hover:underline text-left flex items-center gap-1"
            onClick={() => navigate(`/profile/${receiver.id}`)}
          >
            {receiver.name}
            {receiver.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
          </button>
          <p className="text-xs text-muted-foreground">Request pending...</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="text-xs shrink-0"
          onClick={onCancel}
          disabled={isLoading}
        >
          <X className="w-3.5 h-3.5 mr-1" /> Cancel
        </Button>
      </CardContent>
    </Card>
  );
}

function SuggestionCard({
  suggestedUser,
  mutualCount,
  onAdd,
  isLoading,
}: {
  suggestedUser: UserProfile;
  mutualCount: number;
  onAdd: () => void;
  isLoading: boolean;
}) {
  const [, navigate] = useLocation();

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="bg-gradient-to-br from-muted to-muted/50 h-14 relative" />
        <div className="px-3 pb-3 -mt-7">
          <button onClick={() => navigate(`/profile/${suggestedUser.id}`)}>
            <Avatar className="w-14 h-14 border-4 border-background">
              <AvatarImage src={suggestedUser.avatar ?? undefined} />
              <AvatarFallback>{getInitials(suggestedUser.name ?? "?")}</AvatarFallback>
            </Avatar>
          </button>
          <div className="mt-1.5">
            <button
              className="font-bold text-xs hover:underline text-left flex items-center gap-1 leading-tight"
              onClick={() => navigate(`/profile/${suggestedUser.id}`)}
            >
              {suggestedUser.name}
              {suggestedUser.isVerified && <BadgeCheck className="w-3 h-3 text-blue-500 flex-shrink-0" />}
            </button>
            {mutualCount > 0 ? (
              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
                <Users className="w-2.5 h-2.5" /> {mutualCount} mutual friend{mutualCount !== 1 ? "s" : ""}
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground mt-0.5">FacingFace member</p>
            )}
          </div>
          <Button
            size="sm"
            className="w-full mt-2 text-xs h-7"
            onClick={onAdd}
            disabled={isLoading}
          >
            <UserPlus className="w-3 h-3 mr-1" /> Add Friend
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FriendCard({
  friend,
  onMessage,
  onRemove,
  isLoading,
}: {
  friend: UserProfile;
  onMessage: () => void;
  onRemove: () => void;
  isLoading: boolean;
}) {
  const [, navigate] = useLocation();

  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-3 px-4">
        <button onClick={() => navigate(`/profile/${friend.id}`)}>
          <Avatar className="w-11 h-11">
            <AvatarImage src={friend.avatar ?? undefined} />
            <AvatarFallback>{getInitials(friend.name ?? "?")}</AvatarFallback>
          </Avatar>
        </button>
        <div className="flex-1 min-w-0">
          <button
            className="font-semibold text-sm hover:underline text-left flex items-center gap-1"
            onClick={() => navigate(`/profile/${friend.id}`)}
          >
            {friend.name}
            {friend.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
          </button>
          <p className="text-xs text-muted-foreground truncate">{friend.bio ?? "FacingFace member"}</p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={onMessage}>
            <MessageCircle className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 px-2 text-destructive hover:text-destructive"
            onClick={onRemove}
            disabled={isLoading}
          >
            <UserMinus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
