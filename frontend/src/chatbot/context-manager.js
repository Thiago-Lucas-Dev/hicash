export function recentContext(messages) {
  const recent = messages
    .slice(-12)
    .reverse()
    .find((m) => m.role === "assistant" && m.payload);
  try {
    return recent ? JSON.parse(recent.payload) : null;
  } catch {
    return null;
  }
}
