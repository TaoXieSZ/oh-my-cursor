/**
 * Slack Incoming Webhooks: https://api.slack.com/messaging/webhooks
 */

export interface SlackTextPayload {
  text: string;
}

export async function postSlackIncomingWebhook(
  webhookUrl: string,
  payload: SlackTextPayload
): Promise<Response> {
  return fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
