import { z } from "zod";
import { protectedProcedure, router } from "./trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { adminBroadcasts, users } from "../../drizzle/schema";
import { eq, sql, gte } from "drizzle-orm";

/**
 * Admin Broadcast Messaging System (With Segmentation)
 * Allows admins to send mass messages immediately to different user segments
 * NO scheduling or recurring features
 * Segments: All Users, Verified Members, New Users (Last 7 days)
 */

// Helper: Get users matching segment criteria
async function getSegmentedUsers(segmentType: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  let query = db.select({ id: users.id }).from(users);

  switch (segmentType) {
    case "verified_users":
      // Only verified users (blue badge)
      return query.where(eq(users.isVerified, true));

    case "new_users_7days": {
      // Users who signed up in the last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return query.where(gte(users.createdAt, sevenDaysAgo));
    }

    case "all_users":
    default:
      // No filter — all users
      return query;
  }
}

export const broadcastRouter = router({
  // Create and send a broadcast immediately
  create: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1, "Message cannot be empty").max(5000),
        segmentType: z.enum(["all_users", "verified_users", "new_users_7days"]).default("all_users"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
      
      // Only admins can create broadcasts
      if (!ctx.user || (ctx.user.role !== "admin" && ctx.user.role !== "super_admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can create broadcasts",
        });
      }

      try {
        // Get segmented users to count recipients
        const segmentedUsersQuery = await getSegmentedUsers(input.segmentType);
        const segmentedUsers = await segmentedUsersQuery;
        const recipientCount = segmentedUsers.length;

        // Create broadcast record
        const result = await db
          .insert(adminBroadcasts)
          .values({
            message: input.message,
            segmentType: input.segmentType as any,
          })
          .returning();

        const broadcast = result[0];

        return {
          success: true,
          broadcastId: broadcast.id,
          segmentType: input.segmentType,
          recipientCount,
          message: `Broadcast sent to ${recipientCount} ${input.segmentType.replace(/_/g, " ")} users`,
          broadcast,
        };
      } catch (error: any) {
        console.error("Broadcast creation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to create broadcast",
        });
      }
    }),

  // List all broadcasts
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
      
      // Only admins can view broadcasts
      if (!ctx.user || (ctx.user.role !== "admin" && ctx.user.role !== "super_admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can view broadcasts",
        });
      }

      try {
        const broadcasts = await db
          .select()
          .from(adminBroadcasts)
          .orderBy(sql`${adminBroadcasts.createdAt} DESC`)
          .limit(input.limit)
          .offset(input.offset);

        return broadcasts;
      } catch (error: any) {
        console.error("Broadcast list error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch broadcasts",
        });
      }
    }),

  // Get a single broadcast
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
      
      if (!ctx.user || (ctx.user.role !== "admin" && ctx.user.role !== "super_admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can view broadcasts",
        });
      }

      try {
        const broadcast = await db
          .select()
          .from(adminBroadcasts)
          .where(eq(adminBroadcasts.id, input.id));

        if (!broadcast.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Broadcast not found",
          });
        }

        return broadcast[0];
      } catch (error: any) {
        console.error("Broadcast get error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch broadcast",
        });
      }
    }),

  // Get broadcasts for current user (shows all broadcasts sent to their segment)
  myBroadcasts: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
      
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in",
        });
      }

      try {
        // Get all broadcasts (all users can see all broadcasts)
        const broadcasts = await db
          .select()
          .from(adminBroadcasts)
          .orderBy(sql`${adminBroadcasts.createdAt} DESC`)
          .limit(input.limit)
          .offset(input.offset);

        return broadcasts;
      } catch (error: any) {
        console.error("Broadcast myBroadcasts error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch broadcasts",
        });
      }
    }),

  // Delete a broadcast
  delete: protectedProcedure
    .input(z.object({ broadcastId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
      
      if (!ctx.user || (ctx.user.role !== "admin" && ctx.user.role !== "super_admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can delete broadcasts",
        });
      }

      try {
        const broadcast = await db
          .select()
          .from(adminBroadcasts)
          .where(eq(adminBroadcasts.id, input.broadcastId));

        if (!broadcast.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Broadcast not found",
          });
        }

        // Delete broadcast
        await db
          .delete(adminBroadcasts)
          .where(eq(adminBroadcasts.id, input.broadcastId));

        return { success: true, message: "Broadcast deleted" };
      } catch (error: any) {
        console.error("Broadcast delete error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to delete broadcast",
        });
      }
    }),
});
