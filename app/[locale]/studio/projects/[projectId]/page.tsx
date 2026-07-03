import { notFound } from "next/navigation";
import { getStoredStoryProject } from "@/lib/storyProject/store";
import { canAccessStoryProject, getStudioUserOrNull } from "@/lib/storyProject/auth";
import { ProjectEditorClient } from "./ProjectEditorClient";
import { StudioAuthGate } from "../../StudioAuthGate";

type ProjectDetailPageProps = {
  params: Promise<{ locale: string; projectId: string }>;
};

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { locale, projectId } = await params;
  const auth = await getStudioUserOrNull();
  if (!auth) return <StudioAuthGate locale={locale} title="登录后打开故事工程" />;

  const project = await getStoredStoryProject(projectId);
  if (!project) notFound();
  if (!canAccessStoryProject(project, auth.userId)) notFound();

  return <ProjectEditorClient initialProject={project} locale={locale} />;
}
