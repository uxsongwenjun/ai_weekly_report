import type { Metadata } from "next";
import Link from "next/link";
import { getWeekList, getLatestWeekId, getWeekData } from "@/lib/db/queries";
import Header from "@/components/Header";
import WeeklyOverviewNew from "@/components/WeeklyOverviewNew";
import Top3Section from "@/components/Top3Section";
import IndustryNewsSection from "@/components/IndustryNewsSection";
import OpenSourceSection from "@/components/OpenSourceSection";
import HotTopicsSection from "@/components/HotTopicsSection";
import FooterSection from "@/components/FooterSection";
import AnchorNav from "@/components/AnchorNav";
import { Toaster } from "sonner";

// Cache the page for 1 hour
export const revalidate = 3600;

interface PageProps {
  searchParams: Promise<{ week?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { week: weekParam } = await searchParams;
  const weekId = weekParam ?? await getLatestWeekId();
  if (!weekId) return { title: "AI设计探针 · 周报" };

  const data = await getWeekData(weekId);
  if (!data) return { title: "AI设计探针 · 周报" };

  return {
    title: `AI设计探针 · ${data.week.period} | ${data.week.date_range}`,
    description: data.week.intro ?? "每周精选 AI 设计领域最值得关注的动态",
  };
}

function EmptyState() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center"
      style={{ background: "var(--color-bg)", color: "var(--color-text)" }}
    >
      <span style={{ fontSize: 40 }}>📡</span>
      <h2 className="text-section-title">尚无发布内容</h2>
      <p className="text-body max-w-sm" style={{ color: "var(--color-text-secondary)" }}>
        运行以下命令初始化数据库并写入示例数据，或完整跑一次采集流程：
      </p>
      <div
        className="rounded-xl px-5 py-4 text-left text-note font-mono space-y-1 w-full max-w-sm"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <p style={{ color: "var(--color-text-tertiary)" }}># 写入示例数据（快速预览）</p>
        <p style={{ color: "var(--color-text)" }}>node tools/seed.js</p>
        <br />
        <p style={{ color: "var(--color-text-tertiary)" }}># 完整采集 + 发布流程</p>
        <p style={{ color: "var(--color-text)" }}>node tools/generate-week.js</p>
      </div>
    </div>
  );
}

function NotFoundState({ weekId }: { weekId: string }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center"
      style={{ background: "var(--color-bg)", color: "var(--color-text)" }}
    >
      <span style={{ fontSize: 40 }}>🔍</span>
      <h2 className="text-section-title">找不到「{weekId}」的数据</h2>
      <Link
        href="/"
        className="text-note rounded-lg px-4 py-2 transition-colors"
        style={{ background: "var(--color-accent-light)", color: "var(--color-accent)" }}
      >
        ← 返回最新一期
      </Link>
    </div>
  );
}

export default async function Home({ searchParams }: PageProps) {
  const { week: weekParam } = await searchParams;

  const weekList = await getWeekList();
  const latestId = await getLatestWeekId();
  const weekId = weekParam ?? latestId;

  if (!weekId || weekList.length === 0) {
    return <EmptyState />;
  }

  const data = await getWeekData(weekId);

  if (!data) {
    return <NotFoundState weekId={weekId} />;
  }

  const totalSelected =
    data.topThree.length +
    data.industry.length +
    data.designTools.length +
    data.opensource.length +
    data.hotTopics.length;

  return (
    <div className="page-canvas" style={{ background: "var(--color-bg)", minHeight: "100vh" }}>
      <Toaster position="top-center" />
      <div className="page-shell">
        <div className="page-content relative">
          <AnchorNav />
          <Header week={data.week} selectedCount={totalSelected} weeks={weekList} currentWeekId={weekId} />

          <main>
            <WeeklyOverviewNew week={data.week} />
            <Top3Section items={data.topThree} />
            <IndustryNewsSection items={[...data.industry, ...data.designTools]} />
            <OpenSourceSection items={data.opensource} />
            <HotTopicsSection items={data.hotTopics} />
            <FooterSection week={data.week} />
          </main>
        </div>
      </div>
    </div>
  );
}
