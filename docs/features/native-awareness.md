# Native Awareness Guide

Cognia's Native Awareness system provides real-time system monitoring and productivity tracking, available exclusively in the desktop app.

## Overview

The awareness system helps you understand your computer usage patterns and system health:

- **System Monitoring** - Real-time CPU, memory, disk, battery, network status
- **Activity Tracking** - Records 12 types of user activities
- **Smart Suggestions** - Contextual recommendations based on system state
- **Focus Tracking** - Application usage patterns and productivity insights

## Desktop App Required

**Important**: Awareness features require the Cognia desktop app for system-level access.

### Why Desktop Only?

System awareness requires access to:

- System metrics (CPU, memory, battery)
- Application usage tracking
- Window focus detection
- Process information

Web browsers cannot provide this level of system access.

## System Monitoring

### What's Monitored

#### CPU Usage

Real-time CPU monitoring:

- **CPU Usage** - Percentage of CPU being used (0-100%)
- **CPU Cores** - Number of processor cores
- **CPU Frequency** - Current clock speed in MHz

**Understanding CPU Usage**:

- 0-30%: Light usage (system idle, background tasks)
- 30-70%: Normal usage (web browsing, documents)
- 70-100%: Heavy usage (compiling, gaming, video editing)

**When to Worry**:

- Consistently above 80% may indicate:
  - Background process using resources
  - Malware or unwanted software
  - Need to close applications
  - Consider upgrading hardware

#### Memory Usage

Memory (RAM) monitoring:

- **Memory Used** - Amount of RAM in use (GB)
- **Memory Total** - Total RAM available (GB)
- **Memory Percentage** - Percentage of RAM used
- **Available Memory** - Free RAM available (GB)

**Understanding Memory Usage**:

- Less than 70%: Healthy
- 70-85%: Normal for heavy workloads
- Above 85%: Consider closing applications
- Above 95%: Risk of system slowdown

**Smart Suggestions**:
Cognia will suggest closing applications when memory usage exceeds 85%.

#### Disk Usage

Storage monitoring:

- **Disk Used** - Used storage space (GB)
- **Disk Total** - Total storage capacity (GB)
- **Disk Percentage** - Percentage used
- **Available Disk** - Free space remaining (GB)

**When to Clean Up**:

- Above 90% full: Consider cleaning up
- Clear temporary files
- Uninstall unused applications
- Move large files to external storage

#### Battery Status

Battery monitoring (Windows and macOS only):

- **Battery Level** - Current charge (0-100%)
- **Battery State** - Charging, discharging, full, unknown
- **Power Mode** - Current power saving mode
- **Time Remaining** - Estimated minutes until empty/full

**Power Saving Suggestions**:

- Below 20%: Connect to power or save work
- Below 10%: Urgent - save immediately
- Enable power saving mode to extend battery

#### Network Status

Network connectivity:

- **Status** - Online or offline
- **Type** - WiFi, ethernet, or unknown

**Usage**: Network status helps context-aware features work better.

#### System Uptime

- **Uptime** - Time since last restart (seconds, minutes, hours, days)
- **OS Version** - Operating system version
- **Hostname** - Computer name

### Refresh Interval

System metrics update automatically every **10 seconds** by default.

**Change Refresh Rate**:

1. Go to Settings → Native Tools → Awareness
2. Adjust "Refresh Interval"
3. Options: 5s, 10s (default), 30s, 60s

**Recommendations**:

- **5 seconds**: Real-time monitoring (higher CPU usage)
- **10 seconds**: Balanced (recommended)
- **30-60 seconds**: Basic monitoring (lowest CPU usage)

## Activity Tracking

Cognia automatically tracks your activities to provide insights.

### Tracked Activities

#### Text Selection

- When you select text in any application
- Tracked even if not using Cognia's selection features

#### Code Selection

- Specific to code selections in code editors
- Helps track development time

#### Screenshot

- When you capture screenshots (with Cognia or other tools)
- Tracks screenshot-taking habits

#### App Switch

- When you switch between applications
- Measures task switching frequency

#### Tab Switch

- When you switch browser tabs
- Indicates browsing patterns

#### File Open

- When you open files
- Tracks file-based work

#### Web Search

- When you perform web searches
- Captures search queries

#### File Search

- When you search for files locally
- Indicates file management tasks

#### Copy/Cut/Paste

- Clipboard operations
- Measures content manipulation

#### AI Query

- When you ask Cognia questions
- Tracks AI assistant usage

#### Translation

- When you use translation features
- Language preferences

#### Code Generation

- When AI generates code for you
- Development assistance tracking

#### Document Edit

- When you edit documents
- Content creation tracking

### Activity Timeline

View your activity timeline:

1. Open Native Tools → Focus tab
2. Scroll through timeline
3. See activities with timestamps
4. Filter by activity type

### Activity Statistics

View aggregated statistics:

- **Total Activities** - All-time count
- **By Type** - Breakdown by activity type
- **By Application** - Most used applications
- **By Hour** - Activity patterns throughout the day
- **By Day** - Daily activity trends

## Smart Suggestions

Cognia provides intelligent suggestions based on system state and your behavior.

### Suggestion Types

#### System Health Suggestions

**High Memory Usage**

```
"Memory usage is at 85%. Consider closing unused applications
to improve performance."
```

**Trigger**: Memory usage > 85%
**Priority**: High
**Actionable**: Yes - shows task manager

**Low Battery**

```
"Battery level at 15%. Connect to power or save your work.
Estimated time remaining: 25 minutes."
```

**Trigger**: Battery < 20%
**Priority**: Urgent
**Actionable**: Yes - enable power saving

**Low Disk Space**

```
"Disk usage is at 92%. Consider cleaning up temporary files
or moving large files to external storage."
```

**Trigger**: Disk usage > 90%
**Priority**: Medium
**Actionable**: Yes - open disk cleanup

#### Productivity Suggestions

**Take a Break**

```
"You've been working for 2 hours. Consider taking a short
break to maintain productivity and reduce eye strain."
```

**Trigger**: Continuous focus > 2 hours
**Priority**: Medium
**Actionable**: Yes - start break timer

**Context Switching**

```
"You've switched applications 45 times in the last hour.
Consider focusing on one task at a time to improve productivity."
```

**Trigger**: High app switching frequency
**Priority**: Low
**Actionable**: No - informational only

#### Focus Suggestions

**Peak Productivity Time**

```
"Your most productive hours are 9 AM - 12 PM. Consider
scheduling important tasks during this time."
```

**Based on**: Your activity patterns
**Priority**: Low
**Actionable**: No - informational

### Configuring Suggestions

**Enable/Disable Suggestions**:

1. Go to Settings → Native Tools → Awareness
2. Toggle "Enable Suggestions"
3. Choose which suggestion types to receive

**Sensitivity Settings**:

- **Low** - Only urgent suggestions (battery, critical errors)
- **Medium** - Health and productivity suggestions (default)
- **High** - All suggestions including informational

## Focus Tracking

Understand your work patterns and improve productivity.

### What's Tracked

#### Application Usage

Tracks which applications you use:

- Application name
- Window title
- Duration of use
- Time spent in each app

#### Focus Sessions

Records focused work sessions:

- **Start Time** - When session started
- **End Time** - When session ended
- **Duration** - Session length
- **Application** - App being used
- **Category** - Productive, neutral, or distracting

#### Categorization

Applications are automatically categorized:

**Productive**:

- Code editors (VS Code, IntelliJ)
- Design tools (Figma, Blender)
- Office apps (Word, Excel)
- Terminal/Command line

**Neutral**:

- File Explorer
- System Settings
- Utilities

**Distracting**:

- Social media (Twitter, Facebook)
- Entertainment (YouTube, Netflix)
- Games
- Chat apps (Slack, Discord)

**Note**: You can customize categories in settings.

### Focus Statistics

#### Time Distribution

See how your time is distributed:

- **Productive Time** - Focused work
- **Neutral Time** - Necessary tasks
- **Distracting Time** - Non-work activities

Visual breakdown with pie charts.

#### Top Applications

Most used applications:

- Application name
- Time spent
- Percentage of total time
- Ranking

#### Productivity Trends

Daily and weekly trends:

- **Daily Focus Time** - Hours per day
- **Weekly Comparison** - This week vs last week
- **Trend Line** - Improving or declining

#### Peak Hours

Your most productive hours:

- Hour-by-hour breakdown
- Activity intensity
- Best times for focused work

### Productivity Insights

#### Focus Score

Calculated based on:

- Ratio of productive vs distracting time
- Length of focus sessions
- Frequency of context switching
- Consistency throughout the day

**Score Ranges**:

- 80-100: Excellent focus
- 60-79: Good focus
- 40-59: Average focus
- 20-39: Poor focus
- 0-19: Very poor focus

#### Recommendations

Based on your data:

- **Optimal Work Hours** - When you're most focused
- **Distraction Sources** - What breaks your focus
- **Session Length** - Ideal focus session duration
- **Break Frequency** - How often to take breaks

### Managing Focus Tracking

**Enable/Disable**:

1. Go to Settings → Native Tools → Awareness
2. Toggle "Enable Focus Tracking"
3. Tracking stops/respects immediately

**Customize Categories**:

1. Go to Focus tab in Native Tools
2. Click "Edit Categories"
3. Reassign applications to different categories
4. Save changes

**Clear History**:

- Clear all focus history
- Clear by date range
- Clear specific applications

## Configuration

### Access Settings

1. Open Cognia desktop app
2. Go to **Settings**
3. Select **Native Tools** tab
4. Configure **Awareness** options

### Awareness Settings

#### System Monitoring

**Enable System Monitoring** (Default: On)

- Master toggle for monitoring features
- Turn off to disable all monitoring

**Refresh Interval** (Default: 10 seconds)

- How often to update system metrics
- Shorter = more accurate, higher CPU usage
- Longer = less accurate, lower CPU usage

#### Activity Tracking

**Enable Activity Tracking** (Default: On)

- Record user activities
- Required for focus tracking and suggestions

**Max Activities** (Default: 1000)

- Maximum activities to keep
- Older activities removed automatically

#### Focus Tracking

**Enable Focus Tracking** (Default: On)

- Track application usage
- Requires activity tracking

**Focus Session Timeout** (Default: 5 minutes)

- Period of inactivity before session ends
- Shorter = more sessions, Longer = fewer sessions

#### Privacy Controls

**Record Application Names** (Default: On)

- Track which apps you use
- Required for statistics

**Record Window Titles** (Default: Off)

- More detailed tracking
- May contain sensitive information

**Exclude from Tracking**

- Don't track specific applications
- Useful for sensitive apps

## Understanding Your Data

### System Metrics

### Healthy System Indicators

✅ **Good**:

- CPU: 0-50%
- Memory: 0-70%
- Disk: 0-80%
- Battery: Above 30%

⚠️ **Warning**:

- CPU: 50-80%
- Memory: 70-85%
- Disk: 80-90%
- Battery: 10-30%

❌ **Critical**:

- CPU: Above 80%
- Memory: Above 85%
- Disk: Above 90%
- Battery: Below 10%

### Productivity Patterns

#### Productive Day

Characteristics:

- Longer focus sessions (>45 minutes)
- High productive time percentage (>60%)
- Low context switching
- Consistent work periods

#### Unproductive Day

Characteristics:

- Short focus sessions (<15 minutes)
- High distracting time percentage
- Frequent context switching
- Inconsistent work patterns

#### Improvement Strategies

**Increase Focus Time**:

- Close distracting applications
- Use website blockers
- Schedule focus blocks
- Take regular breaks

**Reduce Context Switching**:

- Group similar tasks
- Use virtual desktops
- Minimize notifications
- Single-task instead of multi-task

**Optimize Work Hours**:

- Schedule important tasks during peak hours
- Handle administrative tasks during low-energy times
- Take breaks when productivity drops

## Privacy & Security

### Data Stored Locally

All awareness data is stored on your device:

- ✅ No cloud sync
- ✅ No data transmission
- ✅ No analytics or telemetry
- ✅ You control deletion

### Sensitive Information

**What We Track**:

- Application names (e.g., "code.exe")
- Window titles (if enabled)
- Time spent in apps
- System metrics

**What We Don't Track**:

- File contents
- Screen contents
- Keystrokes
- Mouse movements
- Passwords or sensitive data

### Privacy Controls

**Protect Your Privacy**:

1. Disable window title recording
2. Exclude sensitive applications
3. Clear history regularly
4. Review what's recorded
5. Export data before clearing

## Troubleshooting

### System Metrics Not Updating

**Problem**: System state not refreshing

**Solutions**:

1. Check if monitoring is enabled
2. Verify refresh interval isn't too long
3. Restart desktop app
4. Check system permissions

### Activities Not Recording

**Problem**: Activity tracking not working

**Solutions**:

1. Enable activity tracking in settings
2. Check if app is excluded
3. Verify desktop app is running
4. Check privacy settings

### Focus Tracking Inaccurate

**Problem**: Focus sessions not correct

**Solutions**:

1. Adjust focus session timeout
2. Customize app categories
3. Ensure desktop app is running
4. Check for conflicting apps

### Suggestions Not Appearing

**Problem**: No smart suggestions shown

**Solutions**:

1. Enable suggestions in settings
2. Adjust sensitivity level
3. Ensure system monitoring is on
4. Check if suggestion type is enabled

## Tips & Tricks

### Productivity

1. **Review Daily Stats** - Check your focus score each day
2. **Identify Peak Hours** - Schedule important work then
3. **Take Breaks** - Follow break suggestions
4. **Minimize Distractions** - Block distracting apps during focus time
5. **Set Goals** - Aim for 70%+ productive time

### System Health

1. **Monitor Resources** - Keep an eye on memory and disk
2. **Act on Warnings** - Don't ignore high usage alerts
3. **Regular Cleanup** - Clean up disk when >90% full
4. **Battery Management** - Connect power before 20%
5. **Restart Periodically** - Clear memory leaks

### Privacy

1. **Review Regularly** - Check what's being recorded
2. **Exclude Sensitive Apps** - Don't track password managers
3. **Clear History** - Delete old data periodically
4. **Export First** - Save data before clearing
5. **Customize Categories** - Make tracking meaningful

## FAQ

**Q: Does awareness work when Cognia is minimized?**
A: Yes, awareness continues monitoring in the background.

**Q: How much CPU does awareness use?**
A: Very little (~1% every 10 seconds). Negligible impact.

**Q: Can I exclude specific applications?**
A: Yes, add them to the exclusion list in settings.

**Q: Is my data sent to any servers?**
A: No, all awareness data stays on your device.

**Q: How accurate is the productivity score?**
A: It's based on app categories. Customize categories for accuracy.

**Q: Can I export my awareness data?**
A: Yes, export statistics and history as JSON from the Focus tab.

**Q: What happens to old data?**
A: Automatically removed when limit is reached. Pinned entries kept.

**Q: Can I use awareness for time tracking?**
A: Yes! Focus tracking provides detailed session logs for billing or analysis.

**Q: Does battery monitoring work on Linux?**
A: No, battery monitoring is Windows and macOS only due to platform limitations.

**Q: How do I improve my focus score?**
A: Increase time in productive apps, reduce distractions, lengthen focus sessions.

## See Also

- [Native Tools Overview](native-tools.md) - All native tools
- [Native Selection Guide](native-selection.md) - Smart text selection
- [Native Context & Screenshot Guide](native-context-screenshot.md) - Context and screenshots
- [Configuration Guide](configuration.md) - Settings and customization

---

**Last Updated**: December 26, 2024
