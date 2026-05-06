import type { OmrStateScope } from "../state/paths.js";
import { sendDesktopNotification } from "./desktop-notify.js";
import {
  appendNotification,
  createNotificationEvent,
  type CreateNotificationInput,
  type NotificationEvent,
} from "./notification-store.js";

export interface EmitNotificationInput extends CreateNotificationInput {
  title?: string;
  scope?: OmrStateScope;
}

export function emitNotification(input: EmitNotificationInput): NotificationEvent {
  const event = createNotificationEvent(input);

  if (event.channels.desktop) {
    const result = sendDesktopNotification(
      input.title ?? defaultNotificationTitle(event.source),
      event.summary,
      { tone: event.status },
    );
    event.delivery = result.ok
      ? { desktopOk: true }
      : { desktopOk: false, ...(result.error ? { desktopError: result.error } : {}) };
  }

  if (event.channels.feed || event.channels.desktop) {
    appendNotification(event, input.scope ?? "project");
  }

  return event;
}

function defaultNotificationTitle(source: string): string {
  if (source === "schedule") return "OMR Schedule";
  return `OMR ${source.charAt(0).toUpperCase()}${source.slice(1)}`;
}
