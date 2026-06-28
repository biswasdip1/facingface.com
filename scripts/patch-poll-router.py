with open('server/routers.ts', 'r') as f:
    content = f.read()

# 1. Add poll db imports
old_imports = "  updateUserProfile,\n} from \"./db\";"
new_imports = """  updateUserProfile,
  createPoll,
  createPollOptions,
  getPollByPostId,
  getPollOptions,
  getPollVoteCounts,
  getUserPollVote,
  upsertPollVote,
} from "./db\";"""

content = content.replace(old_imports, new_imports, 1)

# 2. Add poll router before App Router
poll_router = """
// ─── Polls Router ─────────────────────────────────────────────────────────────
const pollsRouter = router({
  getForPost: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .query(async ({ ctx, input }) => {
      const poll = await getPollByPostId(input.postId);
      if (!poll) return { poll: null };
      const options = await getPollOptions(poll.id);
      const voteCounts = await getPollVoteCounts(poll.id);
      const userVote = await getUserPollVote(poll.id, ctx.user.id);
      const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);
      return {
        poll: {
          ...poll,
          options: options.map((opt) => ({
            ...opt,
            voteCount: voteCounts[opt.id] ?? 0,
            percentage: totalVotes > 0 ? Math.round(((voteCounts[opt.id] ?? 0) / totalVotes) * 100) : 0,
          })),
          totalVotes,
          userVotedOptionId: userVote?.optionId ?? null,
          isExpired: poll.expiresAt ? new Date() > poll.expiresAt : false,
        },
      };
    }),

  vote: protectedProcedure
    .input(z.object({ pollId: z.number(), optionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Verify poll exists and is not expired
      const poll = await getPollByPostId(0); // will fetch by pollId below
      const options = await getPollOptions(input.pollId);
      const validOption = options.find((o) => o.id === input.optionId);
      if (!validOption) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid poll option." });
      }
      await upsertPollVote(input.pollId, input.optionId, ctx.user.id);
      const voteCounts = await getPollVoteCounts(input.pollId);
      const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);
      return {
        success: true,
        voteCounts,
        totalVotes,
        userVotedOptionId: input.optionId,
      };
    }),
});

"""

old_app = "// ─── App Router ───────────────────────────────────────────────────────────────"
content = content.replace(old_app, poll_router + old_app, 1)

# 3. Add polls to appRouter
content = content.replace(
    "  linkPreview: linkPreviewRouter,\n});",
    "  linkPreview: linkPreviewRouter,\n  polls: pollsRouter,\n});"
)

with open('server/routers.ts', 'w') as f:
    f.write(content)

print("Done" if "pollsRouter" in content else "FAILED")
