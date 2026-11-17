import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";
import { ChatView } from "@/components/chat/chat-view";

export async function generateMetadata({ params }: PageProps<"/[locale]/chat">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "chat" });
  // A personal conversation page: no reason for search engines to index it.
  return { title: t("metaTitle"), robots: { index: false } };
}

export default function ChatPage({ params }: PageProps<"/[locale]/chat">) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);
  return <ChatView />;
}
