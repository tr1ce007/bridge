import Link from "next/link";
import { Fragment, useMemo } from "react";
import { parseChatText, type Inline } from "@/lib/chat/markdown";

function Spans({ parts }: { parts: Inline[] }) {
  return (
    <>
      {parts.map((p, i) => {
        if (p.href) {
          return (
            <Link key={i} href={p.href} className="font-medium text-primary underline underline-offset-2 hover:no-underline">
              {p.text}
            </Link>
          );
        }
        return p.bold ? <strong key={i}>{p.text}</strong> : <Fragment key={i}>{p.text}</Fragment>;
      })}
    </>
  );
}

/** Assistant text as React elements (paragraphs, lists, bold, a few internal links). Never raw HTML. */
export function AssistantText({ text }: { text: string }) {
  const blocks = useMemo(() => parseChatText(text), [text]);
  return (
    <div className="space-y-3 break-words text-base leading-relaxed">
      {blocks.map((b, i) => {
        if (b.type === "p") {
          return (
            <p key={i}>
              {b.lines.map((line, j) => (
                <Fragment key={j}>
                  {j > 0 && <br />}
                  <Spans parts={line} />
                </Fragment>
              ))}
            </p>
          );
        }
        const Tag = b.type;
        return (
          <Tag key={i} className={b.type === "ul" ? "list-disc space-y-1.5 pl-5 marker:text-accent" : "list-decimal space-y-1.5 pl-5 marker:text-accent-text"}>
            {b.items.map((item, j) => (
              <li key={j} className="pl-1">
                <Spans parts={item} />
              </li>
            ))}
          </Tag>
        );
      })}
    </div>
  );
}
