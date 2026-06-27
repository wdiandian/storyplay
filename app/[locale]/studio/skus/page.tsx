import Link from "next/link";
import { listManageableStorySkus } from "@/lib/storySku/serverCatalog";
import { SkuManagerClient } from "./SkuManagerClient";

type StudioSkuPageProps = {
  params: Promise<{ locale: string }>;
};

function localePath(path: string, locale: string) {
  if (locale === "zh-CN") return path;
  return `/${locale}${path}`;
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-sp-border bg-sp-surface px-4 py-3 shadow-sm shadow-black/[0.03]">
      <div className="text-[10px] smallcaps text-sp-subdued">{label}</div>
      <div className="mt-2 font-serif text-2xl font-semibold text-sp-text">{value}</div>
    </div>
  );
}

export default async function StudioSkusPage({ params }: StudioSkuPageProps) {
  const { locale } = await params;
  const skus = await listManageableStorySkus();
  const creatorCount = skus.filter((sku) => sku.publish.source === "creator").length;
  const maleCount = skus.filter((sku) => sku.gender === "male").length;
  const femaleCount = skus.filter((sku) => sku.gender === "female").length;
  const missingCover = skus.filter((sku) => !sku.assets.cover).length;
  const missingFirstAct = skus.filter((sku) => !sku.firstAct.zh).length;
  const firstSceneCount = skus.filter((sku) => sku.assets.firstScene).length;
  const editableFields = ["标题", "一句话卖点", "简介", "标签", "封面", "首图", "推荐", "排序", "上下架"];

  return (
    <main className="min-h-screen bg-sp-bg text-sp-text">
      <div className="mx-auto flex w-full max-w-[1440px] gap-6 px-5 py-5 md:px-8 md:py-8">
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
              href={localePath("/studio/skus", locale)}
              className="flex items-center gap-3 rounded-xl bg-sp-accent px-3 py-2.5 text-sm font-semibold text-white"
            >
              <i className="fa-solid fa-layer-group w-4 text-center text-[13px]" />
              发布管理
            </Link>
            <Link
              href={localePath("/studio/projects", locale)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sp-subdued transition-colors hover:bg-sp-muted hover:text-sp-text"
            >
              <i className="fa-solid fa-pen-nib w-4 text-center text-[13px]" />
              故事工程
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
            StoryProject 是创作源文件；Story SKU 是首页、列表和试玩入口消费的发布产物。
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex flex-col gap-5 rounded-2xl border border-sp-border bg-sp-surface/82 p-5 shadow-sm shadow-black/[0.04] backdrop-blur md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-[10px] smallcaps text-sp-subdued">Creator Workspace</div>
                <h1 className="mt-3 font-serif text-3xl font-black leading-tight text-sp-text md:text-5xl">
                  发布管理
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-sp-subdued md:text-[15px]">
                  管理已发布到首页和故事列表的 Story SKU。这里处理作品包装、分类、资源和上下架；故事正文、固定首场和剧情大纲仍回到 StoryProject 编辑。
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
                  href={localePath("/studio/projects", locale)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-sp-accent px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <i className="fa-solid fa-pen-nib text-[12px]" />
                  回到创作
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="已发布作品" value={skus.length} />
              <Stat label="创作者发布" value={creatorCount} />
              <Stat label="男性向" value={maleCount} />
              <Stat label="女性向" value={femaleCount} />
            </div>
          </header>

          <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-2xl border border-sp-border bg-sp-surface p-5 shadow-sm shadow-black/[0.04]">
              <h2 className="font-serif text-xl font-semibold text-sp-text">发布包装字段</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {editableFields.map((field) => (
                  <span
                    key={field}
                    className="rounded-full border border-sp-border bg-sp-muted px-3 py-1 text-xs text-sp-subdued"
                  >
                    {field}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-sp-border bg-sp-surface p-5 shadow-sm shadow-black/[0.04]">
              <h2 className="font-serif text-xl font-semibold text-sp-text">发布资源审计</h2>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm text-sp-subdued">
                <div>
                  <div className="text-[10px] smallcaps">缺封面</div>
                  <strong className="mt-1 block font-semibold text-sp-text">{missingCover}</strong>
                </div>
                <div>
                  <div className="text-[10px] smallcaps">缺首幕</div>
                  <strong className="mt-1 block font-semibold text-sp-text">{missingFirstAct}</strong>
                </div>
                <div>
                  <div className="text-[10px] smallcaps">首图覆盖</div>
                  <strong className="mt-1 block font-semibold text-sp-text">
                    {firstSceneCount}/{skus.length}
                  </strong>
                </div>
              </div>
            </div>
          </section>

          <SkuManagerClient skus={skus} locale={locale} />
        </section>
      </div>
    </main>
  );
}
