import { router, publicProcedure } from "./trpc";
import { getDb } from "../db";
import { liveStreams } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const stopAllStreamsRouter = router({
  /**
   * ADMIN ONLY: Force stop all active live streams
   * This endpoint will mark all active streams as ended
   */
  stopAllActive: publicProcedure.mutation(async () => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      
      // Update all active streams to ended status
      const result = await db
        .update(liveStreams)
        .set({
          status: "ended",
          endedAt: new Date(),
        })
        .where(eq(liveStreams.status, "active"))
        .returning();

      return {
        success: true,
        stoppedCount: result.length,
        message: `Successfully stopped ${result.length} active streams`,
      };
    } catch (error) {
      console.error("Error stopping streams:", error);
      return {
        success: false,
        stoppedCount: 0,
        message: "Failed to stop streams",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }),

  /**
   * Get all active streams
   */
  getActive: publicProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      
      const activeStreams = await db
        .select()
        .from(liveStreams)
        .where(eq(liveStreams.status, "active"));

      return {
        success: true,
        count: activeStreams.length,
        streams: activeStreams,
      };
    } catch (error) {
      console.error("Error fetching active streams:", error);
      return {
        success: false,
        count: 0,
        streams: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }),
});
