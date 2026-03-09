export function cloneSession(session) {
  return JSON.parse(JSON.stringify(session));
}

export function pushHistory(past, session) {
  const snapshot = cloneSession(session);
  const nextPast = [...past, snapshot];
  return nextPast.slice(-50);
}
