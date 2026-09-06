import { prisma } from './db';

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
}

export async function dispatchWebhookEvent(event: string, data: any): Promise<void> {
  try {
    const webhooks = await prisma.webhookConfig.findMany({
      where: { isActive: true },
    });

    for (const hook of webhooks) {
      const eventsList = Array.isArray(hook.events) ? (hook.events as string[]) : [];
      if (eventsList.length > 0 && !eventsList.includes(event) && !eventsList.includes('*')) {
        continue;
      }

      // Non-blocking dispatch
      (async () => {
        try {
          let bodyPayload: any;

          if (hook.provider === 'teams') {
            bodyPayload = {
              '@type': 'MessageCard',
              '@context': 'http://schema.org/extensions',
              themeColor: event.includes('urgent') ? 'DC2626' : '2563EB',
              summary: `[SIMPLY IT] ${event}`,
              sections: [
                {
                  activityTitle: `🔔 [SIMPLY IT] Sự kiện: ${event}`,
                  activitySubtitle: new Date().toLocaleString('vi-VN'),
                  facts: Object.entries(data || {})
                    .filter(([_, v]) => typeof v === 'string' || typeof v === 'number')
                    .slice(0, 6)
                    .map(([k, v]) => ({ name: k, value: String(v) })),
                  markdown: true,
                },
              ],
            };
          } else if (hook.provider === 'slack') {
            bodyPayload = {
              text: `🔔 *[SIMPLY IT]* Sự kiện: \`${event}\`\n${JSON.stringify(data, null, 2)}`,
            };
          } else {
            // Default & Zalo / Custom Webhook JSON format
            bodyPayload = {
              event,
              timestamp: new Date().toISOString(),
              data,
            };
          }

          await fetch(hook.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyPayload),
          });
        } catch (dispatchErr) {
          console.error(`[Webhook ${hook.name} Dispatch Error]:`, dispatchErr);
        }
      })();
    }
  } catch (err) {
    console.error('[Webhook System Error]:', err);
  }
}
