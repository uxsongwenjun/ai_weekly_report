import { z } from "zod";

export const ItemSchema = z.object({
  section: z.enum(["top_three", "industry", "design_tools", "opensource", "hot_topics"]),
  title: z.string().min(1).max(200),
  summary: z.string().optional(),
  highlight: z.string().optional(),
  category: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  image_url: z.string().url().nullable().optional(),
  logo_url: z.string().url().nullable().optional(),
  source_url: z.string().url().nullable().optional(),
  author: z.string().nullable().optional(),
  author_label: z.string().nullable().optional(),
  author_avatar: z.string().nullable().optional(),
  heat_data: z.string().nullable().optional(),
  ai_summary: z.string().optional(),
  ai_detail: z.string().optional(),
  sort_order: z.number().int().min(0).max(10).optional(),
  source_platform: z.string().nullable().optional(),
  source_date: z.string().nullable().optional(),
  source_type: z.string().nullable().optional(),
});

export const WeekSchema = z
  .object({
    period: z.string().optional(),
    date_range: z.string().optional(),
    intro: z.string().optional(),
    keywords: z.union([z.string(), z.array(z.string())]).optional(),
    data_source_line: z.string().optional(),
    status: z.enum(["draft", "published"]).optional(),
  })
  .passthrough();

export const RawItemSchema = z.object({
  source_type: z.string().min(1),
  source_name: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  raw_data: z.union([z.string(), z.record(z.unknown())]).nullable().optional(),
});
