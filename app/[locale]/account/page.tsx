import Link from "next/link";
import { getBillingSummaryForUser } from "@/lib/billingStore";
import { officialDailyCreditQuotaForUser, startOfUtcDay } from "@/lib/officialQuota";
import { AUTH_ENABLED } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getStudioUserOrNull, filterStoryProjectsForUser } from "@/lib/storyProject/auth";
import { listStoredStoryProjects } from "@/lib/storyProject/store";
import { listStoredStoriesForUser } from "@/lib/storyStore";
import { StudioAuthGate } from "../studio/StudioAuthGate";
import { SignOutButton } from "./SignOutButton";

type AccountPageProps = {
  params: Promise<{ locale: string }>;
};

type AccountProfile = {
  userId: string;
  label: string;
  email: string;
  provider: string;
};

type BillingSnapshot = {
  databaseAvailable: boolean;
  storageProvider: "db" | "file";
  balance: number;
  dailyLimit: number;
  dailySpent: number;
  dailyRemaining: number;
  dailyUnlimited: boolean;
  resetsAt: string;
};

function localePath(path: string, locale: string) {
  if (locale === "zh-CN") return path;
  return `/${locale}${path}`;
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function getAccountProfile(): Promise<AccountProfile> {
  if (!AUTH_ENABLED) {
    return {
      userId: "anonymous",
      label: "本地开发模式",
      email: "Auth disabled",
      provider: "anonymous",
    };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const fullName = typeof user?.user_metadata?.full_name === "string"
    ? user.user_metadata.full_name
    : "";

  return {
    userId: user?.id ?? "unknown",
    label: fullName || user?.email?.split("@")[0] || "StoryPlay 用户",
    email: user?.email ?? "未绑定邮箱",
    provider: String(user?.app_metadata?.provider ?? "email"),
  };
}

async function getBillingSnapshot(userId: string): Promise<BillingSnapshot> {
  const dailyQuota = officialDailyCreditQuotaForUser(userId);
  const since = startOfUtcDay();
  const resetsAt = new Date(since.getTime() + 24 * 60 * 60 * 1000).toISOString();

  try {
    const summary = await getBillingSummaryForUser({
      userId,
      dailyLimit: dailyQuota.limit,
      dailyUnlimited: dailyQuota.unlimited,
      since,
      resetsAt,
      limit: 4,
    });
    return {
      databaseAvailable: summary.databaseAvailable,
      storageProvider: summary.storageProvider,
      balance: summary.balance,
      dailyLimit: summary.dailyQuota.limit,
      dailySpent: summary.dailyQuota.spent,
      dailyRemaining: summary.dailyQuota.remaining,
      dailyUnlimited: summary.dailyQuota.unlimited === true,
      resetsAt,
    };
  } catch {
    return {
      databaseAvailable: false,
      storageProvider: "file",
      balance: 0,
      dailyLimit: dailyQuota.limit,
      dailySpent: 0,
      dailyRemaining: dailyQuota.unlimited ? 0 : dailyQuota.limit,
      dailyUnlimited: dailyQuota.unlimited,
      resetsAt,
    };
  }
}

function formatCreditAmount(value: number, unlimited = false) {
  return unlimited ? "∞" : String(value);
}

export default async function AccountPage({ params }: AccountPageProps) {
  const { locale } = await params;
  const auth = await getStudioUserOrNull();
  if (!auth) {
    return (
      <StudioAuthGate
        locale={locale}
        title="登录后查看账号中心"
        description="账号中心会汇总你的创作项目、故事存档和模型额度。登录后，这些数据会绑定到你的账号。"
      />
    );
  }

  const [profile, projects, stories, billing] = await Promise.all([
    getAccountProfile(),
    listStoredStoryProjects().then((items) => filterStoryProjectsForUser(items, auth.userId)),
    listStoredStoriesForUser(auth.userId, 100),
    getBillingSnapshot(auth.userId),
  ]);

  const publishedProjects = projects.filter((project) => project.publish.status === "published").length;
  const recentProjects = projects.slice(0, 4);
  const recentStories = stories.slice(0, 4);

  return (
    <main className="min-h-screen bg-sp-bg text-sp-text">
      <div className="mx-auto w-full max-w-6xl px-5 py-6 md:px-8 md:py-10">
        <header className="flex flex-col gap-5 rounded-2xl border border-sp-border bg-sp-surface/82 p-5 shadow-sm shadow-black/[0.04] backdrop-blur md:flex-row md:items-start md:justify-between md:p-6">
          <div>
            <Link
              href={localePath("/", locale)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-sp-subdued transition-colors hover:text-sp-accent"
            >
              <i className="fa-solid fa-arrow-left text-[12px]" />
              返回首页
            </Link>
            <div className="mt-8 text-[10px] smallcaps text-sp-subdued">Account Center</div>
            <h1 className="mt-3 font-serif text-4xl font-black leading-tight text-sp-text md:text-6xl">
              账号中心
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-sp-subdued md:text-[15px]">
              这里先做最小可用聚合：确认当前账号、找回创作工程和故事存档，并查看模型额度状态。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={localePath("/studio/projects", locale)}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-sp-accent px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <i className="fa-solid fa-pen-nib text-[12px]" />
              创作后台
            </Link>
            {AUTH_ENABLED ? <SignOutButton locale={locale} /> : null}
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-sp-border bg-sp-surface p-5 shadow-sm shadow-black/[0.04] md:col-span-2">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sp-accentSoft text-lg font-bold text-sp-accent">
                {profile.label.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] smallcaps text-sp-subdued">当前账号</div>
                <h2 className="mt-2 truncate font-serif text-2xl font-semibold text-sp-text">
                  {profile.label}
                </h2>
                <p className="mt-1 truncate text-sm text-sp-subdued">{profile.email}</p>
                <p className="mt-2 text-xs text-sp-subdued">登录方式：{profile.provider}</p>
                <p className="mt-1 break-all font-mono text-[11px] text-sp-subdued/80">
                  User ID: {profile.userId}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-sp-border bg-sp-surface p-5 shadow-sm shadow-black/[0.04]">
            <div className="text-[10px] smallcaps text-sp-subdued">创作项目</div>
            <div className="mt-3 font-serif text-3xl font-semibold text-sp-text">{projects.length}</div>
            <p className="mt-2 text-xs text-sp-subdued">已发布 {publishedProjects} 个</p>
          </div>

          <div className="rounded-2xl border border-sp-border bg-sp-surface p-5 shadow-sm shadow-black/[0.04]">
            <div className="text-[10px] smallcaps text-sp-subdued">故事存档</div>
            <div className="mt-3 font-serif text-3xl font-semibold text-sp-text">{stories.length}</div>
            <p className="mt-2 text-xs text-sp-subdued">账号服务端存档</p>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-sp-border bg-sp-surface p-5 shadow-sm shadow-black/[0.04] md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] smallcaps text-sp-subdued">Projects</div>
                  <h2 className="mt-2 font-serif text-2xl font-semibold text-sp-text">我的创作项目</h2>
                </div>
                <Link
                  href={localePath("/studio/projects", locale)}
                  className="text-sm font-semibold text-sp-accent hover:opacity-80"
                >
                  查看全部
                </Link>
              </div>

              <div className="mt-5 space-y-3">
                {recentProjects.length > 0 ? recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={localePath(`/studio/projects/${project.id}`, locale)}
                    className="flex items-center justify-between gap-4 rounded-xl border border-sp-border bg-sp-muted px-4 py-3 transition-colors hover:border-sp-accent/60"
                  >
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-sp-text">{project.title}</h3>
                      <p className="mt-1 truncate text-xs text-sp-subdued">{project.logline || project.synopsis || project.id}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-sp-accentSoft px-2.5 py-1 text-xs text-sp-accent">
                      {project.publish.status}
                    </span>
                  </Link>
                )) : (
                  <div className="rounded-xl border border-dashed border-sp-border bg-sp-muted px-4 py-6 text-sm text-sp-subdued">
                    还没有创作项目。可以从创作后台新建，或从首页预设故事创建可编辑副本。
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-sp-border bg-sp-surface p-5 shadow-sm shadow-black/[0.04] md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] smallcaps text-sp-subdued">Saved Stories</div>
                  <h2 className="mt-2 font-serif text-2xl font-semibold text-sp-text">我的故事存档</h2>
                </div>
                <Link
                  href={localePath("/stories", locale)}
                  className="text-sm font-semibold text-sp-accent hover:opacity-80"
                >
                  查看全部
                </Link>
              </div>

              <div className="mt-5 space-y-3">
                {recentStories.length > 0 ? recentStories.map((story) => (
                  <Link
                    key={story.id}
                    href={localePath(`/play?storyId=${encodeURIComponent(story.id)}`, locale)}
                    className="flex items-center justify-between gap-4 rounded-xl border border-sp-border bg-sp-muted px-4 py-3 transition-colors hover:border-sp-accent/60"
                  >
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-sp-text">{story.worldSetting}</h3>
                      <p className="mt-1 truncate text-xs text-sp-subdued">{story.styleGuide}</p>
                    </div>
                    <span className="shrink-0 text-xs text-sp-subdued">{formatDate(story.updatedAt)}</span>
                  </Link>
                )) : (
                  <div className="rounded-xl border border-dashed border-sp-border bg-sp-muted px-4 py-6 text-sm text-sp-subdued">
                    还没有账号存档。进入游玩页后点击“保存故事”，即可在这里找回。
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-sp-border bg-sp-surface p-5 shadow-sm shadow-black/[0.04] md:p-6">
              <div className="text-[10px] smallcaps text-sp-subdued">Credits</div>
              <h2 className="mt-2 font-serif text-2xl font-semibold text-sp-text">额度摘要</h2>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-sp-border bg-sp-muted p-3">
                  <div className="text-[10px] smallcaps text-sp-subdued">今日剩余</div>
                  <div className="mt-2 font-serif text-2xl font-semibold text-sp-text">
                    {formatCreditAmount(billing.dailyRemaining, billing.dailyUnlimited)}
                  </div>
                </div>
                <div className="rounded-xl border border-sp-border bg-sp-muted p-3">
                  <div className="text-[10px] smallcaps text-sp-subdued">今日上限</div>
                  <div className="mt-2 font-serif text-2xl font-semibold text-sp-text">
                    {formatCreditAmount(billing.dailyLimit, billing.dailyUnlimited)}
                  </div>
                </div>
                <div className="rounded-xl border border-sp-border bg-sp-muted p-3">
                  <div className="text-[10px] smallcaps text-sp-subdued">今日消耗</div>
                  <div className="mt-2 font-serif text-2xl font-semibold text-sp-text">{billing.dailySpent}</div>
                </div>
                <div className="rounded-xl border border-sp-border bg-sp-muted p-3">
                  <div className="text-[10px] smallcaps text-sp-subdued">余额</div>
                  <div className="mt-2 font-serif text-2xl font-semibold text-sp-text">{billing.balance}</div>
                </div>
              </div>
              <p className="mt-4 text-xs leading-6 text-sp-subdued">
                {billing.databaseAvailable
                  ? `额度将在 ${formatDate(billing.resetsAt)} 重置。`
                  : `当前使用本机文件存储记录额度，数据会写入 Docker volume。额度将在 ${formatDate(billing.resetsAt)} 重置。`}
              </p>
              <p className="mt-2 text-[11px] text-sp-subdued/80">
                当前存储：{billing.storageProvider === "db" ? "数据库" : "本机文件"}
              </p>
            </section>

            <section className="rounded-2xl border border-sp-border bg-sp-surface p-5 shadow-sm shadow-black/[0.04] md:p-6">
              <div className="text-[10px] smallcaps text-sp-subdued">Quick Links</div>
              <div className="mt-4 grid gap-2">
                <Link className="rounded-xl border border-sp-border bg-sp-muted px-4 py-3 text-sm font-semibold text-sp-text transition-colors hover:border-sp-accent/60" href={localePath("/studio/projects/new", locale)}>
                  新建故事工程
                </Link>
                <Link className="rounded-xl border border-sp-border bg-sp-muted px-4 py-3 text-sm font-semibold text-sp-text transition-colors hover:border-sp-accent/60" href={localePath("/studio/skus", locale)}>
                  管理发布包装
                </Link>
                <Link className="rounded-xl border border-sp-border bg-sp-muted px-4 py-3 text-sm font-semibold text-sp-text transition-colors hover:border-sp-accent/60" href={localePath("/stories", locale)}>
                  打开我的故事
                </Link>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
