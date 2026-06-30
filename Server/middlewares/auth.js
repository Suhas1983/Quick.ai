import { clerkClient } from "@clerk/express";

export const auth = async (req, res, next) => {
  try {
    // Get authenticated user
    const { userId, has } = await req.auth();

    // Check if user has premium plan
    const hasPremiumPlan = await has({ plan: "premium" });

    // Get full user details
    const user = await clerkClient.users.getUser(userId);

    if (!hasPremiumPlan) {
      // Get current free usage from Clerk metadata
      const freeUsage = user.privateMetadata?.free_usage || 0;

      req.free_usage = freeUsage;

      // Initialize metadata if it doesn't exist
      if (user.privateMetadata?.free_usage === undefined) {
        await clerkClient.users.updateUserMetadata(userId, {
          privateMetadata: {
            ...user.privateMetadata,
            free_usage: 0,
          },
        });

        req.free_usage = 0;
      }
    } else {
      // Premium users have unlimited usage
      req.free_usage = null;
    }

    // Store plan and userId in request
    req.userId = userId;
    req.plan = hasPremiumPlan ? "premium" : "free";

    next();
  } catch (error) {
    console.error(error);

    return res.status(401).json({
      success: false,
      message: error.message || "Authentication failed",
    });
  }
};