with open('server/routers.ts', 'r') as f:
    content = f.read()

old = "      const postId = await createPost({\n        authorId: ctx.user.id,\n        text: input.text ?? null,\n        mediaUrl: input.mediaUrl ?? null,\n        mediaType: input.mediaType ?? null,\n        isFlagged: false,\n      });\n\n      return { postId };"

new = """      // Auto-detect URL in text and fetch link preview
      let linkPreview = null;
      if (input.text) {
        const foundUrl = extractFirstUrl(input.text);
        if (foundUrl) {
          linkPreview = await fetchLinkPreview(foundUrl);
        }
      }

      const postId = await createPost({
        authorId: ctx.user.id,
        text: input.text ?? null,
        mediaUrl: input.mediaUrl ?? null,
        mediaType: input.mediaType ?? null,
        isFlagged: false,
        linkUrl: linkPreview?.url ?? null,
        linkTitle: linkPreview?.title ?? null,
        linkDescription: linkPreview?.description ?? null,
        linkImage: linkPreview?.image ?? null,
        linkSiteName: linkPreview?.siteName ?? null,
      });

      return { postId };"""

if old in content:
    content = content.replace(old, new, 1)
    with open('server/routers.ts', 'w') as f:
        f.write(content)
    print("Replaced successfully")
else:
    # Try to find the block
    idx = content.find("const postId = await createPost({")
    print(f"Block not found as expected. Found at index: {idx}")
    print(repr(content[idx:idx+200]))
