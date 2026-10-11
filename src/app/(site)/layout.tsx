import { SiteHeader } from "@/components/site-header";
import { BackToTop } from "@/components/back-to-top";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border/70 py-6 text-center text-xs text-muted-foreground">
        百闻牌式神卡组评分系统 · 仅供学习交流，卡牌数据版权归网易所有
      </footer>
      <BackToTop />
    </div>
  );
}
