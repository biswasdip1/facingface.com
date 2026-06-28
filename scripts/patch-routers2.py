with open('server/routers.ts', 'r') as f:
    content = f.read()

# Add the linkPreview router before the appRouter export
link_router = """
// ─── Link Preview Router ──────────────────────────────────────────────────────
const linkPreviewRouter = router({
  fetch: protectedProcedure
    .input(z.object({ url: z.string().min(1) }))
    .query(async ({ input }) => {
      const preview = await fetchLinkPreview(input.url);
      return { preview };
    }),
});

"""

old = "// ─── App Router ───────────────────────────────────────────────────────────────"
new = link_router + old

if old in content:
    content = content.replace(old, new, 1)
    # Also add linkPreview to the appRouter
    content = content.replace(
        "  media: mediaRouter,\n});",
        "  media: mediaRouter,\n  linkPreview: linkPreviewRouter,\n});"
    )
    with open('server/routers.ts', 'w') as f:
        f.write(content)
    print("Done")
else:
    print("Pattern not found")
