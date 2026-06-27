import { notFound } from "next/navigation";
import { getStoredStoryProject } from "@/lib/storyProject/store";
import { ProjectEditorClient } from "./ProjectEditorClient";

type ProjectDetailPageProps = {
  params: Promise<{ locale: string; projectId: string }>;
};

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { locale, projectId } = await params;
  const project = await getStoredStoryProject(projectId);
  if (!project) notFound();

  return <ProjectEditorClient initialProject={project} locale={locale} />;
}
