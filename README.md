# AI设计探针 · 周报系统

> 每周精选 AI 设计领域最值得关注的动态，由 OpenClaw 驱动自动更新。

## 快速开始

```bash
# 安装依赖
pnpm install

# 初始化数据库（含 Mock 数据，可直接预览）
node tools/seed.js

# 开发模式
pnpm dev        # 访问 http://localhost:3000

# 生产构建
pnpm build
pnpm start
```

## 项目结构

```
app/           Next.js App Router（页面 + API Routes）
components/    React 组件（Notion 风格）
lib/db/        数据库层（better-sqlite3 + Drizzle ORM）
tools/         OpenClaw CLI 工具集
skills/        OpenClaw Skill 配置
data/          SQLite 数据库文件
```

## CLI 工具

```bash
node tools/generate-week.js              # 一键全流程（采集→处理→发布）
node tools/collect-rss.js               # 仅采集 RSS
node tools/collect-github.js            # 仅采集 GitHub
node tools/process-data.js --week 2026-W10  # AI 处理并生成周报
node tools/publish-week.js --week 2026-W10  # 发布指定期
node tools/check-status.js              # 查看状态
node tools/update-item.js --id 1 --field ai_detail --value "..."
```

## 环境变量

复制 `.env.example` 为 `.env.local` 并填写：

```
DATABASE_PATH=./data/weekly.db
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...
API_KEY=your-api-key
```

## 部署

```bash
pnpm build
pm2 start ecosystem.config.js
```

定时任务（crontab）：
```
0 9 * * 5  cd /path/to/ai-weekly-report && node tools/generate-week.js >> /var/log/weekly-report.log 2>&1
```
