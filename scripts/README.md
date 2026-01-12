# Scripts 工具脚本

本目录包含项目的各类自动化脚本，按功能分为以下两类：

## 📋 目录

- [i18n 国际化工具](#i18n-国际化工具)
- [系统工具](#系统工具)
- [使用方法](#使用方法)

---

## i18n 国际化工具

完整的国际化工作流工具集，用于管理项目的多语言翻译。所有脚本使用 TypeScript 编写，位于 `scripts/i18n/` 目录。

### 脚本列表

| 脚本 | pnpm 命令 | 描述 |
|------|-----------|------|
| `i18n/index.ts` | `pnpm i18n` | 主入口CLI，统一调用所有i18n脚本 |
| `i18n/extract.ts` | `pnpm i18n:extract` | 从组件中提取硬编码字符串 |
| `i18n/generate.ts` | `pnpm i18n:generate` | 根据提取的字符串生成翻译键 |
| `i18n/update.ts` | `pnpm i18n:update` | 自动更新组件使用翻译调用 |
| `i18n/validate.ts` | `pnpm i18n:validate` | 验证i18n实现的完整性 |
| `i18n/merge.ts` | `pnpm i18n:merge` | 合并新翻译到JSON文件 |
| `i18n/cleanup.ts` | `pnpm i18n:cleanup` | 清理未使用的孤立翻译键 |
| `i18n/stats.ts` | `pnpm i18n:stats` | 显示详细的i18n统计信息 |
| `i18n/backup.ts` | `pnpm i18n:backup` | 备份或恢复翻译文件 |
| `i18n/watch.ts` | `pnpm i18n:watch` | 监听文件变化并自动验证 |
| `i18n-config.json` | - | i18n工具配置文件 |

### 推荐工作流程

```bash
# 1. 提取硬编码字符串
pnpm i18n:extract

# 2. 生成翻译键
pnpm i18n:generate

# 3. 合并到翻译文件
pnpm i18n:merge

# 4. 更新组件使用翻译
pnpm i18n:update

# 5. 验证翻译完整性
pnpm i18n:validate

# 6. 清理未使用的键
pnpm i18n:cleanup
```

或者使用一键执行完整流程：

```bash
pnpm i18n:all
```

### CLI 快捷命令

```bash
# 查看帮助
pnpm i18n help

# 使用别名快速执行
pnpm i18n e      # extract
pnpm i18n g      # generate
pnpm i18n v      # validate
pnpm i18n m      # merge
pnpm i18n c      # cleanup
pnpm i18n s      # stats
pnpm i18n b      # backup
pnpm i18n w      # watch
pnpm i18n a      # all (完整流程)
```

### 常用选项

| 选项 | 描述 |
|------|------|
| `--dry-run` | 预览变更，不实际修改文件 |
| `--verbose` | 显示详细输出 |
| `--force` | 跳过确认提示 |
| `--namespace <ns>` | 仅处理指定的命名空间 |

### 备份管理

```bash
# 创建备份
pnpm i18n:backup create

# 列出所有备份
pnpm i18n:backup list

# 恢复到最近备份
pnpm i18n:backup restore

# 恢复指定备份
pnpm i18n:backup restore --id backup_2024-01-15_10-30-00

# 比较备份与当前文件
pnpm i18n:backup compare --verbose
```

---

## 系统工具

### kill-port - 端口进程管理

用于查找并终止占用指定端口的进程。

| 脚本 | pnpm 命令 | 适用系统 |
|------|-----------|----------|
| `kill-port.ps1` | `pnpm kill-port` | Windows (PowerShell) |
| `kill-port.sh` | `pnpm kill-port:unix` | Linux / macOS |

#### Windows 使用

```powershell
# 基本用法 (需要端口号作为参数)
pnpm kill-port -- -Port 8080

# 强制终止，跳过确认
pnpm kill-port -- -Port 8080 -Force

# 检查 UDP 端口
pnpm kill-port -- -Port 53 -Protocol UDP
```

#### Linux / macOS 使用

```bash
# 基本用法
pnpm kill-port:unix 8080

# 强制终止
pnpm kill-port:unix 8080 -f

# 指定协议
pnpm kill-port:unix 8080 --protocol udp

# 指定信号
pnpm kill-port:unix 8080 --signal KILL
```

#### 功能特性

- 显示进程详细信息（PID、名称、路径、CPU、内存等）
- 支持 TCP 和 UDP 协议
- 确认提示防止误操作
- 支持强制模式跳过确认
- 自动检测系统环境

---

## 使用方法

### 前置要求

确保已安装 Node.js 和 pnpm：

```bash
node -v    # 需要 Node.js 18+
pnpm -v    # 需要 pnpm 8+
```

### 直接执行脚本

```bash
# 使用 node 直接执行
node scripts/i18n-cli.js help
node scripts/i18n-extract.js --verbose

# Windows PowerShell
.\scripts\kill-port.ps1 -Port 8080

# Linux/macOS
./scripts/kill-port.sh 8080
```

### 通过 pnpm 执行

```bash
# 查看所有可用脚本
pnpm run

# 执行 i18n 相关脚本
pnpm i18n help
pnpm i18n:stats

# 执行端口管理脚本
pnpm kill-port -- -Port 3000
```

---

## 配置文件

### i18n-config.json

核心配置文件，定义：

- `targetDirectories`: 扫描的目标目录
- `excludePatterns`: 排除的文件/目录模式
- `extractionRules`: 字符串提取规则
- `namespaceMapping`: 目录到命名空间的映射
- `keyGenerationRules`: 翻译键生成规则
- `existingTranslations`: 现有翻译文件路径
- `backupSettings`: 备份配置
- `validation`: 验证规则

---

## 输出目录

脚本执行后会在项目根目录生成以下目录：

| 目录 | 描述 |
|------|------|
| `i18n-reports/` | 提取、验证、统计等报告文件 |
| `i18n-updates/` | 组件更新的差异和预览文件 |
| `i18n-backups/` | 翻译文件备份 |

---

## 常见问题

### Q: 脚本报错找不到配置文件？

确保从项目根目录执行脚本，或使用 pnpm 命令。

### Q: Windows 上 PowerShell 脚本无法执行？

需要允许执行脚本策略：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

或使用 pnpm 命令（已配置 Bypass 策略）。

### Q: 端口终止失败？

某些进程需要管理员/root权限。Windows 使用管理员 PowerShell，Linux/macOS 使用 `sudo`。
