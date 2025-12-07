// Stub implementation for notifications
// This is a minimal implementation to fix build errors

interface NotificationParams {
  fid: number;
  title: string;
  body: string;
}

interface NotificationResult {
  state: 'success' | 'error' | 'rate_limit';
  error?: string;
}

export async function sendFrameNotification(
  params: NotificationParams
): Promise<NotificationResult> {
  // Stub implementation - in a real app, you would send actual notifications
  console.log(`Sending notification to FID ${params.fid}:`, {
    title: params.title,
    body: params.body,
  });

  // Simulate successful notification sending
  return { state: 'success' };
}
