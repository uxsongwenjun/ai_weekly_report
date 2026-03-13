import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
} from "drizzle-orm/sqlite-core";

export const weeks = sqliteTable("weeks", {
  id: text("id").primaryKey(),                          // '2026-W10'
  period: text("period").notNull(),                     // '第 2 期'
  date_range: text("date_range").notNull(),             // '2026.03.04-03.10'
  intro: text("intro"),                                 // 一句话导读
  keywords: text("keywords"),                           // JSON 数组
  data_source_line: text("data_source_line"),           // 头部数据说明
  status: text("status").default("draft"),              // draft / published
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updated_at: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const items = sqliteTable("items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  week_id: text("week_id").notNull().references(() => weeks.id),
  section: text("section").notNull(),                   // top_three / industry / design_tools / opensource / hot_topics
  title: text("title").notNull(),
  summary: text("summary"),
  highlight: text("highlight"),                         // 亮点句
  category: text("category"),                           // 类别标签
  tags: text("tags"),                                   // JSON 数组
  image_url: text("image_url"),
  logo_url: text("logo_url"),
  source_url: text("source_url"),
  author: text("author"),
  author_label: text("author_label"),                   // 身份标签
  author_avatar: text("author_avatar"),
  heat_data: text("heat_data"),                         // JSON
  ai_summary: text("ai_summary"),                       // AI 解读摘要
  ai_detail: text("ai_detail"),                         // AI 解读详情
  sort_order: integer("sort_order").default(0),
  source_platform: text("source_platform"),
  source_date: text("source_date"),
  source_type: text("source_type"),                       // rss / github / skillsmp / social
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const rawItems = sqliteTable("raw_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  source_type: text("source_type").notNull(),           // rss / github / skillsmp / social
  source_name: text("source_name"),
  title: text("title"),
  content: text("content"),
  url: text("url"),
  raw_data: text("raw_data"),                           // JSON
  collected_at: text("collected_at").default(sql`CURRENT_TIMESTAMP`),
  processed: integer("processed").default(0),
});

export const sources = sqliteTable("sources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(),                         // rss / social / keyword / github
  name: text("name").notNull(),
  category: text("category"),
  config: text("config").notNull(),                     // JSON
  active: integer("active").default(1),
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const sourceInfo = sqliteTable("source_info", {
  week_id: text("week_id").notNull().references(() => weeks.id),
  categories: text("categories"),                       // JSON
  statement: text("statement"),
  representative_sources: text("representative_sources"), // JSON
  updated_at: text("updated_at"),
});

export type Week = typeof weeks.$inferSelect;
export type Item = typeof items.$inferSelect;
export type RawItem = typeof rawItems.$inferSelect;
export type Source = typeof sources.$inferSelect;
export type SourceInfo = typeof sourceInfo.$inferSelect;
