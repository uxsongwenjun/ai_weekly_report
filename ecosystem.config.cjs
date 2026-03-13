// ecosystem.config.cjs — PM2 配置（CommonJS 格式，供 pm2 start 使用）
module.exports = {
  apps: [
    {
      name: "ai-weekly-report",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      cwd: "/path/to/ai-weekly-report",  // ← 修改为实际部署路径
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        DATABASE_PATH: "./data/weekly.db",
        // API_KEY: "your-secret-api-key",
        // ANTHROPIC_API_KEY: "sk-ant-...",
        // GITHUB_TOKEN: "ghp_...",
      },
    },
  ],
};
