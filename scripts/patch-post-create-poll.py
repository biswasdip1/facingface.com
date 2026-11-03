with open('server/routers.ts', 'r') as f:
    content = f.read()

# Add poll field to posts.create input schema
old_input = """        text: z.string().max(2000).optional(),
        mediaUrl: z.string().optional(),
        mediaType: z.enum(["image", "video"]).optional(),
      })"""

new_input = """        text: z.string().max(2000).optional(),
        mediaUrl: z.string().optional(),
        mediaType: z.enum(["image", "video"]).optional(),
        poll: z.object({
          question: z.string().min(1).max(300),
          options: z.array(z.string().min(1).max(200)).min(2).max(6),
          expiresInHours: z.number().min(1).max(168).optional(),
        }).optional(),
      })"""

content = content.replace(old_input, new_input, 1)

# Add poll creation after postId is returned
old_return = "      return { postId };"
new_return = """      // Create poll if provided
      if (input.poll) {
        const expiresAt = input.poll.expiresInHours
          ? new Date(Date.now() + input.poll.expiresInHours * 3600 * 1000)
          : undefined;
        const pollId = await createPoll({
          postId,
          question: input.poll.question,
          expiresAt: expiresAt ?? null,
        });
        await createPollOptions(
          input.poll.options.map((text, i) => ({ pollId, text, displayOrder: i }))
        );
      }

      return { postId };"""

content = content.replace(old_return, new_return, 1)

with open('server/routers.ts', 'w') as f:
    f.write(content)

print("Done" if "createPoll(" in content else "FAILED")
