/**
 * IFTTT Webhook Bridge for Broadlink RM4 Pro
 * 
 * Sends HTTP requests to IFTTT webhook endpoints to trigger
 * Broadlink IR/RF commands for the AV setup (projector + screen).
 * 
 * This abstraction allows easy swapping to a local bridge server
 * (e.g., Raspberry Pi) in the future without changing API routes.
 */

const IFTTT_KEY = process.env.IFTTT_WEBHOOK_KEY;

interface BridgeResult {
  success: boolean;
  error?: string;
}

/**
 * Trigger an IFTTT webhook event
 */
async function triggerIFTTT(eventName: string): Promise<BridgeResult> {
  if (!IFTTT_KEY) {
    console.error('IFTTT_WEBHOOK_KEY not configured');
    return { success: false, error: 'IFTTT webhook key not configured' };
  }

  const url = `https://maker.ifttt.com/trigger/${eventName}/with/key/${IFTTT_KEY}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`IFTTT trigger failed for ${eventName}: ${res.status} ${text}`);
      return { success: false, error: `IFTTT returned ${res.status}` };
    }

    console.log(`✅ IFTTT trigger successful: ${eventName}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ IFTTT trigger error for ${eventName}: ${message}`);
    return { success: false, error: message };
  }
}

/**
 * Helper to wait between sequential IFTTT commands
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Individual device commands
export const projectorOn = () => triggerIFTTT('projector_on');
export const projectorOff = () => triggerIFTTT('projector_off');
export const screenDown = () => triggerIFTTT('screen_down');
export const screenUp = () => triggerIFTTT('screen_up');

/**
 * Start the full AV setup:
 * 1. Lower the screen
 * 2. Wait for screen to descend (~5 seconds)
 * 3. Turn on the projector
 */
export async function startAV(): Promise<BridgeResult> {
  console.log('🎬 Starting AV setup...');

  const screenResult = await screenDown();
  if (!screenResult.success) {
    console.error('Failed to lower screen, aborting AV start');
    return screenResult;
  }

  // Wait for screen to fully descend before turning on projector
  await delay(5000);

  const projectorResult = await projectorOn();
  if (!projectorResult.success) {
    console.error('Failed to turn on projector (screen is already down)');
    return projectorResult;
  }

  console.log('✅ AV setup started successfully');
  return { success: true };
}

/**
 * Stop the full AV setup:
 * 1. Turn off the projector
 * 2. Wait briefly
 * 3. Raise the screen
 */
export async function stopAV(): Promise<BridgeResult> {
  console.log('🔴 Stopping AV setup...');

  const projectorResult = await projectorOff();
  if (!projectorResult.success) {
    console.error('Failed to turn off projector, attempting screen up anyway');
  }

  // Brief pause between commands
  await delay(2000);

  const screenResult = await screenUp();
  if (!screenResult.success) {
    console.error('Failed to raise screen');
    // Return failure only if both failed
    if (!projectorResult.success) {
      return { success: false, error: 'Failed to stop both projector and screen' };
    }
    return screenResult;
  }

  console.log('✅ AV setup stopped successfully');
  return { success: true };
}
