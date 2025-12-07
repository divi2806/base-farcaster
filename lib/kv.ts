// Stub implementation for KV store
// This is a minimal implementation to fix build errors

import { notificationDetailsSchema } from "@farcaster/miniapp-core";
import { z } from "zod";

type NotificationDetails = z.infer<typeof notificationDetailsSchema>;

export async function setUserNotificationDetails(
  fid: number,
  notificationDetails: NotificationDetails
): Promise<void> {
  // Stub implementation - in a real app, you would store this in a database
  console.log(`Setting notification details for FID ${fid}:`, notificationDetails);
}

export async function getUserNotificationDetails(
  fid: number
): Promise<NotificationDetails | null> {
  // Stub implementation - in a real app, you would retrieve from a database
  console.log(`Getting notification details for FID ${fid}`);
  return null;
}

export async function deleteUserNotificationDetails(fid: number): Promise<void> {
  // Stub implementation - in a real app, you would delete from a database
  console.log(`Deleting notification details for FID ${fid}`);
}
