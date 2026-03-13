# 周报应用部署问题记录

## 概述
- **部署时间**: 2026-03-13
- **服务器**: 121.41.97.123:3000
- **容器名称**: weekly-report
- **镜像**: ai-weekly-report:latest

---

## 一、部署问题

### 1.1 端口3000无响应

**现象**:
```
Docker Compose 启动后，端口3000显示监听但 curl 超时无响应
```

**原因**:
- Docker Compose 配置的容器启动后，Next.js standalone 模式与 docker compose 网络存在兼容性问题
- 容器日志显示 "Ready"，但实际 HTTP 服务无响应

**解决方案**:
```bash
# 改用 docker run 直接启动
docker run -d --name weekly-report -p 3000:3000 \
  -v /home/lewis/ai-weekly-report/data:/app/data \
  --env-file /home/lewis/ai-weekly-report/.env \
  ai-weekly-report:latest
```

---

### 1.2 端口被占用

**现象**:
```
failed to bind host port 0.0.0.0:3000/tcp: address already in use
```

**原因**:
- 残留进程占用端口 3000
- 进程 PID: 113595

**解决方案**:
```bash
# 查找并终止占用进程
sudo fuser -k 3000/tcp

# 或
sudo lsof -ti:3000 | xargs sudo kill -9
```

---

### 1.3 容器间网络隔离

**现象**:
- OpenClaw 容器无法访问 weekly-report 容器
- 两者在不同 Docker 网络中

**网络状态**:
```
OpenClaw:     172.18.0.2 (openclaw_default 网络)
Weekly-report: 172.17.0.2 (默认 bridge 网络)
```

**解决方案**:
```bash
# 将 weekly-report 加入 openclaw 网络
docker network connect openclaw_default weekly-report

# 验证连接
docker exec openclaw curl http://weekly-report:3000
```

---

## 二、数据问题

### 2.1 数据库为空

**现象**:
- 部署后页面显示"尚无发布内容"
- 数据库只有表结构，没有数据

**原因**:
- 部署脚本只运行了 `init-db.js`（仅初始化表结构）
- 未运行 `seed.js` 生成示例数据

**解决方案**:
```bash
# 生成示例数据
docker exec weekly-report node tools/seed.js
```

**数据生成结果**:
- 周报期数: 2026-W10
- 文章数量: 18 条
- 数据源: 15 个 RSS 订阅源

---

### 2.2 外键约束错误

**现象**:
```
[API Error] SQLITE_CONSTRAINT: FOREIGN KEY constraint failed
```

**错误次数**: 16 次

**原因**:
- 外部客户端（OpenClaw）尝试插入 items 数据
- 但引用的 `week_id` 不存在于 weeks 表中

**影响**:
- 数据库写入失败
- API 返回 500 错误

**解决方案**:
1. 调用方应确保先创建 week 记录，再插入 items
2. 或检查请求的 `week_id` 是否有效

---

### 2.3 JSON 解析错误

**现象**:
```
SyntaxError: Expected ':' after property name in JSON at position 2540
```

**位置**: `/api/data/weeks/[weekId]/route.js`

**原因**:
- 客户端发送了格式不正确的 JSON 数据
- 可能缺少引号、逗号或括号不匹配

**解决方案**:
- 调用方需检查请求体的 JSON 格式
- 使用 JSON 校验工具验证数据

---

## 三、API 路由问题

### 3.1 可用端点

| 端点 | 状态 | 说明 |
|------|------|------|
| `GET /api/week/list` | ✅ 正常 | 获取周列表 |
| `GET /api/data/status` | ✅ 正常 | 获取数据状态 |
| `GET /api/data/weeks/:id` | ✅ 正常 | 获取指定周详情 |

### 3.2 缺失端点

| 端点 | 状态 | 说明 |
|------|------|------|
| `GET /api/data/weeks` | ❌ 404 | 缺少周列表路由 |
| `GET /api/week` | ❌ 404 | 缺少周列表路由 |

### 3.3 异常端点

| 端点 | 状态 | 说明 |
|------|------|------|
| `POST/PUT /api/data/weeks/:id` | ⚠️ 异常 | JSON 解析错误 |
| `POST /api/data/raw` | ⚠️ 异常 | 外键约束失败 |

---

## 四、运行状态

### ✅ 正常运行

- **容器状态**: 健康（运行 37 分钟）
- **前端页面**: http://121.41.97.123:3000 正常访问
- **数据展示**: 143 处内容匹配，18 条文章正常显示
- **网络访问**: OpenClaw 可正常访问 weekly-report

### ⚠️ 注意事项

1. **数据库操作顺序**: 插入 items 前必须先创建对应的 week 记录
2. **JSON 格式**: 确保 POST/PUT 请求的请求体格式正确
3. **网络配置**: 如需容器间通信，需加入同一网络

---

## 五、建议修复

### 5.1 调用方（OpenClaw）修复

```javascript
// 正确的 API 调用顺序

// 1. 先创建 week 记录
POST /api/data/weeks
{
  "id": "2026-W11",
  "period": "第 2 期",
  "date_range": "2026.03.11 - 03.17",
  "status": "draft"
}

// 2. 再插入 items
POST /api/data/weeks/2026-W11/items
{
  "title": "文章标题",
  "summary": "文章摘要",
  "section": "industry_news"
}
```

### 5.2 可选优化

- 添加缺失的 API 端点（/api/data/weeks 列表接口）
- 添加请求参数校验中间件
- 完善错误日志，记录请求来源 IP

---

## 六、快速检查命令

```bash
# 检查容器状态
docker ps | grep weekly

# 查看日志
docker logs weekly-report --tail 50

# 检查数据库
docker exec weekly-report node -e "
const { createClient } = require('@libsql/client');
const client = createClient({ url: 'file:/app/data/weekly.db' });
client.execute('SELECT COUNT(*) as count FROM weeks').then(r => console.log('Weeks:', r.rows[0].count));
client.execute('SELECT COUNT(*) as count FROM items').then(r => console.log('Items:', r.rows[0].count));
"

# 测试 API
curl http://localhost:3000/api/data/status
curl http://localhost:3000/api/week/list

# 检查网络连接
docker network inspect openclaw_default
```

---

*文档生成时间: 2026-03-13*
