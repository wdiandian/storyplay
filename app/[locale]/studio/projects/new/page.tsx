import { NewProjectClient } from "./NewProjectClient";
import { getStudioUserOrNull } from "@/lib/storyProject/auth";
import { StudioAuthGate } from "../../StudioAuthGate";

type NewProjectPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function NewProjectPage({ params }: NewProjectPageProps) {
  const { locale } = await params;
  const auth = await getStudioUserOrNull();
  if (!auth) return <StudioAuthGate locale={locale} title="登录后创建故事工程" />;

  return <NewProjectClient locale={locale} />;
}
