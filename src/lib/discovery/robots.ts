/**
 * robots.txt check (RFC 9309), without regular expressions: groups by user agent, the most
 * specific group for our agent (or "*"), the longest matching rule wins, Allow wins a tie.
 * Patterns may use "*" (anything) and a final "$" (end of path).
 */

interface Rule {
  allow: boolean;
  pattern: string;
}

function stripComment(line: string): string {
  const hash = line.indexOf("#");
  return (hash >= 0 ? line.slice(0, hash) : line).trim();
}

/** "the-bridge-story-discovery/0.1 (x)" -> "the-bridge-story-discovery" */
function productToken(userAgent: string): string {
  let token = "";
  for (const ch of userAgent.trim()) {
    if (ch === "/" || ch === " " || ch === "(") break;
    token += ch.toLowerCase();
  }
  return token;
}

/** Does `pattern` (with * and optional trailing $) match the start of `path`? */
function matches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const parts = (anchored ? pattern.slice(0, -1) : pattern).split("*");
  let pos = 0;
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (i === 0) {
      if (!path.startsWith(part)) return false;
      pos = part.length;
    } else if (i === parts.length - 1 && anchored) {
      // last piece must sit at the very end of the path
      return part === "" ? true : path.length - part.length >= pos && path.endsWith(part);
    } else {
      const found = path.indexOf(part, pos);
      if (found < 0) return false;
      pos = found + part.length;
    }
  }
  return anchored ? pos === path.length : true;
}

export function isAllowedByRobots(robotsTxt: string, path: string, userAgent: string): boolean {
  const token = productToken(userAgent);
  const target = path.startsWith("/") ? path : `/${path}`;

  // Collect groups: consecutive user-agent lines share the rules that follow them.
  const groups: { agents: string[]; rules: Rule[] }[] = [];
  let current: { agents: string[]; rules: Rule[] } | null = null;
  let lastWasAgent = false;
  for (const rawLine of robotsTxt.split("\n")) {
    const line = stripComment(rawLine.replace(/\r$/, ""));
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if (key === "allow" || key === "disallow") {
      lastWasAgent = false;
      // rules before any user-agent line belong to nobody
      if (current && value !== "") current.rules.push({ allow: key === "allow", pattern: value });
    } else {
      lastWasAgent = false;
    }
  }

  // The most specific agent name that matches us (longest), else "*".
  let bestAgent = "";
  for (const g of groups) {
    for (const a of g.agents) {
      if (a !== "*" && a.length > 0 && token.startsWith(a) && a.length > bestAgent.length) bestAgent = a;
    }
  }
  const wanted = bestAgent || "*";
  const rules = groups.filter((g) => g.agents.includes(wanted)).flatMap((g) => g.rules);

  let best: Rule | null = null;
  for (const rule of rules) {
    if (!matches(rule.pattern, target)) continue;
    if (!best || rule.pattern.length > best.pattern.length || (rule.pattern.length === best.pattern.length && rule.allow && !best.allow)) best = rule;
  }
  return best ? best.allow : true;
}
