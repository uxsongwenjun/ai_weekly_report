module.exports = {
  apps: [
    {
      name: "ai-weekly-report",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      cwd: "/path/to/ai-weekly-report",  // ← 修改为实际路径
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
