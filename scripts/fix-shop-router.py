#!/usr/bin/env python3
"""Move shopRouter definition before appRouter in routers.ts and register it."""
import re

with open('/home/ubuntu/facingface/server/routers.ts', 'r') as f:
    content = f.read()

# Find the shop router block (from the comment to the last });)
# The block starts at "// ─── Shop (Sale & Buy) Router"
# and ends at the last `});` before `export type AppRouter`
shop_start_marker = '// ─── Shop (Sale & Buy) Router'
export_type_marker = '\nexport type AppRouter = typeof appRouter;'

shop_start_idx = content.find(shop_start_marker)
export_type_idx = content.find(export_type_marker)

if shop_start_idx == -1 or export_type_idx == -1:
    print("ERROR: Could not find markers")
    exit(1)

# Extract the shop router block (from shop_start to export_type_marker)
shop_block = content[shop_start_idx:export_type_idx]
print(f"Shop block length: {len(shop_block)} chars")
print(f"Shop block starts with: {shop_block[:80]}")
print(f"Shop block ends with: {shop_block[-80:]}")

# Remove the shop block from its current position
content_without_shop = content[:shop_start_idx] + content[export_type_idx:]

# Find appRouter definition position in the cleaned content
app_router_marker = '\nexport const appRouter = router({'
app_router_idx = content_without_shop.find(app_router_marker)
if app_router_idx == -1:
    print("ERROR: Could not find appRouter")
    exit(1)

print(f"appRouter found at index: {app_router_idx}")

# Insert shop block before appRouter
new_content = (
    content_without_shop[:app_router_idx] +
    '\n' + shop_block.rstrip() + '\n' +
    content_without_shop[app_router_idx:]
)

# Now add shop: shopRouter to appRouter
# Find the videoViews: videoViewsRouter line and add shop after it
new_content = new_content.replace(
    '  videoViews: videoViewsRouter,\n});',
    '  videoViews: videoViewsRouter,\n  shop: shopRouter,\n});'
)

# Verify no duplicate
shop_count = new_content.count('shop: shopRouter')
print(f"shop: shopRouter count: {shop_count}")

with open('/home/ubuntu/facingface/server/routers.ts', 'w') as f:
    f.write(new_content)

print("Done!")
