# Time Tools Plugin

Time and timezone utilities for Cognia AI agents.

## Features

- **time_now**: Get current date/time in any timezone
- **time_convert**: Convert timestamps between timezones
- **time_parse**: Parse date strings into structured format
- **time_diff**: Calculate differences between dates
- **time_format**: Format timestamps with custom patterns

## Installation

The plugin is included with Cognia. Enable it in Settings → Plugins.

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultTimezone` | string | `"UTC"` | Default timezone for operations |
| `defaultFormat` | string | `"ISO"` | Default output format |

## Supported Timezones

Common timezone identifiers:
- `UTC`, `GMT`
- `America/New_York`, `America/Los_Angeles`, `America/Chicago`
- `Europe/London`, `Europe/Paris`, `Europe/Berlin`
- `Asia/Shanghai`, `Asia/Tokyo`, `Asia/Singapore`
- `Australia/Sydney`, `Pacific/Auckland`
- UTC offset format: `UTC+8`, `GMT-5`, etc.

## Format Patterns

| Token | Description | Example |
|-------|-------------|---------|
| `YYYY` | 4-digit year | 2024 |
| `YY` | 2-digit year | 24 |
| `MM` | Month (01-12) | 03 |
| `DD` | Day (01-31) | 15 |
| `HH` | Hour 24h (00-23) | 14 |
| `hh` | Hour 12h (01-12) | 02 |
| `mm` | Minutes (00-59) | 30 |
| `ss` | Seconds (00-59) | 45 |
| `SSS` | Milliseconds | 123 |
| `A` | AM/PM | PM |
| `a` | am/pm | pm |

## Examples

### Get Current Time
```
time_now({ timezone: "Asia/Shanghai" })
→ { formatted: "2024-03-15T22:30:45.123Z", ... }
```

### Convert Timezone
```
time_convert({
  timestamp: "2024-03-15T10:00:00Z",
  fromTimezone: "UTC",
  toTimezone: "Asia/Tokyo"
})
→ { converted: { formatted: "2024-03-15 19:00:00", ... } }
```

### Calculate Difference
```
time_diff({
  startDate: "2024-01-01",
  endDate: "2024-12-31",
  unit: "days"
})
→ { difference: 365, ... }
```

## License

MIT
