import re

with open("server/routers.ts", "r") as f:
    content = f.read()

# 1. Add live stream db imports
old_imports = "  getPollById,\n} from \"./db\";"
new_imports = """  getPollById,
  createLiveStream,
  endLiveStream,
  getLiveStream,
  getActiveLiveStreams,
} from "./db";"""
content = content.replace(old_imports, new_imports)

# 2. Add liveRouter before appRouter
live_router = """
// ─── Live Router ─────────────────────────────────────────────────────────────
const liveRouter = router({
  create: protectedProcedure
    .input(z.object({ title: z.string().max(200).optional() }))
    .mutation(async ({ ctx, input }) => {
      const streamId = await createLiveStream(ctx.user.id, input.title);
      return { streamId };
    }),

  end: protectedProcedure
    .input(z.object({ streamId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await endLiveStream(input.streamId, ctx.user.id);
      return { success: true };
    }),

  get: publicProcedure
    .input(z.object({ streamId: z.number().int() }))
    .query(async ({ input }) => {
      const stream = await getLiveStream(input.streamId);
      if (!stream) return null;
      const host = await getUserById(stream.hostId);
      return { ...stream, host };
    }),

  listActive: publicProcedure.query(async () => {
    const streams = await getActiveLiveStreams();
    const withHosts = await Promise.all(
      streams.map(async (s) => ({ ...s, host: await getUserById(s.hostId) }))
    );
    return withHosts;
  }),
});

"""
content = content.replace(
    "// ─── App Router ───────────────────────────────────────────────────────────────\nexport const appRouter = router({",
    live_router + "// ─── App Router ───────────────────────────────────────────────────────────────\nexport const appRouter = router({"
)

# 3. Add live to appRouter
content = content.replace(
    "  polls: pollsRouter,\n});\nexport type AppRouter = typeof appRouter;",
    "  polls: pollsRouter,\n  live: liveRouter,\n});\nexport type AppRouter = typeof appRouter;"
)

with open("server/routers.ts", "w") as f:
    f.write(content)

print("Done: live router added to routers.ts")
