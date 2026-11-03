with open('server/routers.ts', 'r') as f:
    content = f.read()

# Add getPollById to imports
old_imports = "  upsertPollVote,\n} from \"./db\";"
new_imports = "  upsertPollVote,\n  getPollById,\n} from \"./db\";"
content = content.replace(old_imports, new_imports, 1)

# Fix the vote procedure
old_vote = """  vote: protectedProcedure
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
    }),"""

new_vote = """  vote: protectedProcedure
    .input(z.object({ pollId: z.number(), optionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Verify poll exists
      const poll = await getPollById(input.pollId);
      if (!poll) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Poll not found." });
      }
      // Reject votes on expired polls
      if (poll.expiresAt && new Date() > poll.expiresAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This poll has expired and is no longer accepting votes." });
      }
      // Verify option belongs to this poll
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
    }),"""

content = content.replace(old_vote, new_vote, 1)

with open('server/routers.ts', 'w') as f:
    f.write(content)

print("Done" if "Poll not found" in content else "FAILED")
