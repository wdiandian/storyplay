import Link from "next/link";
import { listStoredStoryProjects } from "@/lib/storyProject/store";
import { filterStoryProjectsForUser, getStudioUserOrNull } from "@/lib/storyProject/auth";
import type { StoryProject, StoryProjectAudience } from "@/lib/storyProject/types";
import { StudioAuthGate } from "../StudioAuthGate";

type StudioProjectsPageProps = {
  params: Promise<{ locale: string }>;
};

const audienceLabels: Record<StoryProjectAudience, string> = {
  male: "男性向",
  female: "女性向",
  universal: "通用",
};

const publishLabels: Record<StoryProject["publish"]["status"], string> = {
  draft: "草稿",
  playtest: "试玩",
  published: "已发布",
};

function localePath(path: string, locale: string) {
  if (locale === "zh-CN") return path;
  return `/${locale}${path}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function StudioSidebar({ locale, active }: { locale: string; active: "projects" | "skus" }) {
  const linkClass =
    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors";
  const inactiveClass = "text-sp-subdued hover:bg-sp-muted hover:text-sp-text";

  return (
    <aside className="sticky top-8 hidden h-[calc(100vh-4rem)] w-64 shrink-0 flex-col rounded-2xl border border-sp-border bg-sp-surface/82 p-4 shadow-sm shadow-black/[0.04] backdrop-blur lg:flex">
      <Link
        href={localePath("/", locale)}
        className="inline-flex items-center gap-2 px-2 py-2 text-sm font-semibold text-sp-text transition-colors hover:text-sp-accent"
      >
        <span className="font-serif text-lg">
          <span>Story</span>
          <span className="text-sp-play">Play</span>
        </span>
      </Link>

      <nav className="mt-8 space-y-1">
        <Link
          href={localePath("/studio/projects", locale)}
          className={`${linkClass} ${active === "projects" ? "bg-sp-accent text-white" : inactiveClass}`}
        >
          <i className="fa-solid fa-pen-nib w-4 text-center text-[13px]" />
          故事工程
        </Link>
        <Link
          href={localePath("/studio/skus", locale)}
          className={`${linkClass} ${active === "skus" ? "bg-sp-accent text-white" : inactiveClass}`}
        >
          <i className="fa-solid fa-layer-group w-4 text-center text-[13px]" />
          发布管理
        </Link>
        <span className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sp-subdued">
          <i className="fa-solid fa-flask w-4 text-center text-[13px]" />
          试玩调试
        </span>
        <span className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sp-subdued">
          <i className="fa-solid fa-arrow-up-from-bracket w-4 text-center text-[13px]" />
          发布
        </span>
      </nav>

      <div className="mt-auto rounded-xl border border-sp-border bg-sp-muted p-3 text-xs leading-relaxed text-sp-subdued">
        故事工程是创作源文件；发布管理只处理发布后的 Story SKU 包装、展示和资源状态。
      </div>
    </aside>
  );
}

function ProjectCard({ project, locale }: { project: StoryProject; locale: string }) {
  return (
    <Link
      href={localePath(`/studio/projects/${project.id}`, locale)}
      className="group block rounded-2xl border border-sp-border bg-sp-surface p-5 shadow-sm shadow-black/[0.04] transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-sp-accent/70 hover:shadow-lg hover:shadow-black/10"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="font-mono text-xs text-sp-subdued">{project.id}</div>
          <h2 className="mt-2 line-clamp-2 font-serif text-2xl font-semibold leading-tight text-sp-text">
            {project.title}
          </h2>
        </div>
        <span className="shrink-0 rounded-full bg-sp-accentSoft px-2.5 py-1 text-xs font-medium text-sp-accent">
          {publishLabels[project.publish.status]}
        </span>
      </div>

      <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-sp-subdued">
        {project.logline || project.synopsis || "还没有补充故事概念。"}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <span className="rounded-full border border-sp-border bg-sp-muted px-2 py-0.5 text-[11px] text-sp-subdued">
          {audienceLabels[project.audience]}
        </span>
        {project.genres.slice(0, 3).map((genre) => (
          <span
            key={genre}
            className="rounded-full bg-sp-accentSoft px-2 py-0.5 text-[11px] text-sp-accent"
          >
            {genre}
          </span>
        ))}
        {project.moods.slice(0, 2).map((mood) => (
          <span
            key={mood}
            className="rounded-full border border-sp-border px-2 py-0.5 text-[11px] text-sp-subdued"
          >
            {mood}
          </span>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-sp-border pt-4 text-xs text-sp-subdued">
        <div>
          <div className="text-[10px] smallcaps">角色</div>
          <strong className="mt-1 block font-semibold text-sp-text">{project.characters.length}</strong>
        </div>
        <div>
          <div className="text-[10px] smallcaps">生成</div>
          <strong className="mt-1 block font-semibold text-sp-text">{project.generation.status}</strong>
        </div>
        <div>
          <div className="text-[10px] smallcaps">更新</div>
          <strong className="mt-1 block font-semibold text-sp-text">{formatDate(project.updatedAt)}</strong>
        </div>
      </div>
    </Link>
  );
}

export default async function StudioProjectsPage({ params }: StudioProjectsPageProps) {
  const { locale } = await params;
  const auth = await getStudioUserOrNull();
  if (!auth) return <StudioAuthGate locale={locale} />;

  const projects = auth
    ? filterStoryProjectsForUser(await listStoredStoryProjects(), auth.userId)
    : [];
  const draftCount = projects.filter((project) => project.publish.status === "draft").length;
  const playtestCount = projects.filter((project) => project.publish.status === "playtest").length;

  return (
    <main className="min-h-screen bg-sp-bg text-sp-text">
      <div className="mx-auto flex w-full max-w-[1440px] gap-6 px-5 py-5 md:px-8 md:py-8">
        <StudioSidebar locale={locale} active="projects" />

        <section className="min-w-0 flex-1">
          <header className="rounded-2xl border border-sp-border bg-sp-surface/82 p-5 shadow-sm shadow-black/[0.04] backdrop-blur md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-[10px] smallcaps text-sp-subdued">Creator Workspace</div>
                <h1 className="mt-3 font-serif text-3xl font-black leading-tight text-sp-text md:text-5xl">
                  故事工程
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-sp-subdued md:text-[15px]">
                  这里是创作者长期维护的故事工程。它负责故事概念、世界观、角色、互动策略和后续试玩生成，不再把首页 SKU 当成创作源数据。
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link
                  href={localePath("/", locale)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-sp-border bg-sp-surface px-4 text-sm font-semibold text-sp-text transition-colors hover:border-sp-accent hover:text-sp-accent"
                >
                  <i className="fa-solid fa-house text-[12px]" />
                  首页
                </Link>
                <Link
                  href={localePath("/studio/projects/new", locale)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-sp-accent px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <i className="fa-solid fa-plus text-[12px]" />
                  新建工程
                </Link>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-sp-border bg-sp-muted px-4 py-3">
                <div className="text-[10px] smallcaps text-sp-subdued">全部工程</div>
                <div className="mt-2 font-serif text-2xl font-semibold text-sp-text">{projects.length}</div>
              </div>
              <div className="rounded-xl border border-sp-border bg-sp-muted px-4 py-3">
                <div className="text-[10px] smallcaps text-sp-subdued">草稿</div>
                <div className="mt-2 font-serif text-2xl font-semibold text-sp-text">{draftCount}</div>
              </div>
              <div className="rounded-xl border border-sp-border bg-sp-muted px-4 py-3">
                <div className="text-[10px] smallcaps text-sp-subdued">试玩中</div>
                <div className="mt-2 font-serif text-2xl font-semibold text-sp-text">{playtestCount}</div>
              </div>
              <div className="rounded-xl border border-sp-border bg-sp-muted px-4 py-3">
                <div className="text-[10px] smallcaps text-sp-subdued">本地存储</div>
                <div className="mt-2 font-serif text-2xl font-semibold text-sp-text">JSON</div>
              </div>
            </div>
          </header>

          {projects.length > 0 ? (
            <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} locale={locale} />
              ))}
            </section>
          ) : (
            <section className="mt-6 rounded-2xl border border-dashed border-sp-border bg-sp-surface p-8 text-center shadow-sm shadow-black/[0.03]">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sp-accentSoft text-sp-accent">
                <i className="fa-solid fa-pen-nib text-sm" />
              </div>
              <h2 className="mt-4 font-serif text-2xl font-semibold text-sp-text">
                还没有故事工程
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-sp-subdued">
                先创建一个工程，把故事想法沉淀成可编辑的创作源数据。后续试玩、章节编辑和发布都会围绕这个工程推进。
              </p>
              <Link
                href={localePath("/studio/projects/new", locale)}
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-sp-accent px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <i className="fa-solid fa-plus text-[12px]" />
                创建第一个工程
              </Link>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
