/**
 * Limits of POST /api/ai/chat. Shared by the route's validation and the chat page
 * (this file has no server-only code), so the client never sends something the route refuses.
 */
export const CHAT_MAX_MESSAGES = 40;
export const CHAT_MAX_MESSAGE_CHARS = 4000;
export const CHAT_MAX_SUMMARY_CHARS = 8000;
