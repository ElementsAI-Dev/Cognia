# Observability

The Observability module provides system monitoring, performance metrics, and diagnostic tools for tracking application health.

## Overview

| Feature | Description |
|---------|-------------|
| **System Metrics** | CPU, memory, and disk usage monitoring |
| **Performance Traces** | Track operation latency and throughput |
| **Error Tracking** | Aggregate and browse application errors |
| **Usage Analytics** | Token usage, API call statistics |
| **Dashboard** | Visual dashboard with charts and graphs |

## Architecture

```text
app/(main)/observability/page.tsx    → Observability dashboard
components/observability/            → 43 monitoring components
hooks/observability/                 → Monitoring hooks
lib/observability/                   → Metrics collection
```

## Dashboard

The observability dashboard displays:

- Real-time system resource usage
- AI provider API call statistics
- Token consumption trends
- Error rate and types
- Agent execution performance

## Usage

Navigate to **Observability** from the sidebar to view the monitoring dashboard. Metrics are collected automatically and displayed in real-time charts.
