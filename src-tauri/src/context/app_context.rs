//! Application context detection
//!
//! Identifies the type of application and provides relevant context.

use super::WindowInfo;
use log::{debug, trace};
use serde::{Deserialize, Serialize};

/// Application type classification
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AppType {
    /// Web browser
    Browser,
    /// Code editor / IDE
    CodeEditor,
    /// Terminal / Command line
    Terminal,
    /// Document editor (Word, Google Docs, etc.)
    DocumentEditor,
    /// Spreadsheet application
    Spreadsheet,
    /// Presentation software
    Presentation,
    /// Email client
    Email,
    /// Chat / Messaging application
    Chat,
    /// File manager / Explorer
    FileManager,
    /// Media player
    MediaPlayer,
    /// Image editor
    ImageEditor,
    /// PDF viewer
    PdfViewer,
    /// Note-taking application
    NoteTaking,
    /// Database tool
    Database,
    /// API client (Postman, Insomnia)
    ApiClient,
    /// Version control GUI
    VersionControl,
    /// System settings
    SystemSettings,
    /// Game
    Game,
    /// Unknown application
    Unknown,
}

/// Application context information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppContext {
    /// Application type
    pub app_type: AppType,
    /// Application name
    pub app_name: String,
    /// Application version (if detectable)
    pub version: Option<String>,
    /// Whether the app supports text input
    pub supports_text_input: bool,
    /// Whether the app supports rich text
    pub supports_rich_text: bool,
    /// Whether the app is a development tool
    pub is_dev_tool: bool,
    /// Suggested actions for this app type
    pub suggested_actions: Vec<String>,
    /// Additional metadata
    pub metadata: std::collections::HashMap<String, String>,
}

impl AppContext {
    /// Create app context from window information
    pub fn from_window_info(window: &WindowInfo) -> Result<Self, String> {
        trace!(
            "Creating AppContext from window: process='{}', title='{}', class='{}'",
            window.process_name,
            window.title,
            window.class_name
        );

        let process_name = window.process_name.to_lowercase();
        let title = window.title.to_lowercase();
        let class_name = window.class_name.to_lowercase();

        let (app_type, app_name) = Self::detect_app_type(&process_name, &title, &class_name);
        debug!("Detected app type: {:?} ({})", app_type, app_name);

        let (supports_text_input, supports_rich_text, is_dev_tool) = match app_type {
            AppType::Browser => (true, true, false),
            AppType::CodeEditor => (true, false, true),
            AppType::Terminal => (true, false, true),
            AppType::DocumentEditor => (true, true, false),
            AppType::Spreadsheet => (true, false, false),
            AppType::Presentation => (true, true, false),
            AppType::Email => (true, true, false),
            AppType::Chat => (true, true, false),
            AppType::FileManager => (false, false, false),
            AppType::MediaPlayer => (false, false, false),
            AppType::ImageEditor => (false, false, false),
            AppType::PdfViewer => (false, false, false),
            AppType::NoteTaking => (true, true, false),
            AppType::Database => (true, false, true),
            AppType::ApiClient => (true, false, true),
            AppType::VersionControl => (true, false, true),
            AppType::SystemSettings => (false, false, false),
            AppType::Game => (false, false, false),
            AppType::Unknown => (true, false, false),
        };

        let suggested_actions = Self::get_suggested_actions(&app_type);
        trace!(
            "App capabilities: text_input={}, rich_text={}, dev_tool={}, actions={}",
            supports_text_input,
            supports_rich_text,
            is_dev_tool,
            suggested_actions.len()
        );

        Ok(Self {
            app_type,
            app_name,
            version: None,
            supports_text_input,
            supports_rich_text,
            is_dev_tool,
            suggested_actions,
            metadata: std::collections::HashMap::new(),
        })
    }

    /// Detect application type from process and window information
    fn detect_app_type(process_name: &str, title: &str, class_name: &str) -> (AppType, String) {
        trace!(
            "Detecting app type from process='{}', title='{}', class='{}'",
            process_name,
            title,
            class_name
        );

        // Browsers
        if process_name.contains("chrome") || process_name.contains("chromium") {
            return (AppType::Browser, "Google Chrome".to_string());
        }
        if process_name.contains("firefox") || process_name.contains("mozilla") {
            return (AppType::Browser, "Mozilla Firefox".to_string());
        }
        if process_name.contains("msedge") || process_name.contains("edge") {
            return (AppType::Browser, "Microsoft Edge".to_string());
        }
        if process_name.contains("safari") {
            return (AppType::Browser, "Safari".to_string());
        }
        if process_name.contains("opera") {
            return (AppType::Browser, "Opera".to_string());
        }
        if process_name.contains("brave") {
            return (AppType::Browser, "Brave".to_string());
        }
        if process_name.contains("vivaldi") {
            return (AppType::Browser, "Vivaldi".to_string());
        }
        if process_name.contains("arc") {
            return (AppType::Browser, "Arc".to_string());
        }

        // Code editors / IDEs
        if process_name.contains("code") || title.contains("visual studio code") {
            return (AppType::CodeEditor, "Visual Studio Code".to_string());
        }
        if process_name.contains("cursor") {
            return (AppType::CodeEditor, "Cursor".to_string());
        }
        if process_name.contains("windsurf") {
            return (AppType::CodeEditor, "Windsurf".to_string());
        }
        if process_name.contains("idea") || process_name.contains("intellij") {
            return (AppType::CodeEditor, "IntelliJ IDEA".to_string());
        }
        if process_name.contains("pycharm") {
            return (AppType::CodeEditor, "PyCharm".to_string());
        }
        if process_name.contains("webstorm") {
            return (AppType::CodeEditor, "WebStorm".to_string());
        }
        if process_name.contains("goland") {
            return (AppType::CodeEditor, "GoLand".to_string());
        }
        if process_name.contains("rider") {
            return (AppType::CodeEditor, "Rider".to_string());
        }
        if process_name.contains("clion") {
            return (AppType::CodeEditor, "CLion".to_string());
        }
        if process_name.contains("sublime") {
            return (AppType::CodeEditor, "Sublime Text".to_string());
        }
        if process_name.contains("atom") {
            return (AppType::CodeEditor, "Atom".to_string());
        }
        if process_name.contains("notepad++") {
            return (AppType::CodeEditor, "Notepad++".to_string());
        }
        if process_name.contains("vim") || process_name.contains("nvim") {
            return (AppType::CodeEditor, "Vim/Neovim".to_string());
        }
        if process_name.contains("emacs") {
            return (AppType::CodeEditor, "Emacs".to_string());
        }
        if process_name.contains("devenv") || title.contains("visual studio") {
            return (AppType::CodeEditor, "Visual Studio".to_string());
        }
        if process_name.contains("android studio") || process_name.contains("studio64") {
            return (AppType::CodeEditor, "Android Studio".to_string());
        }
        if process_name.contains("xcode") {
            return (AppType::CodeEditor, "Xcode".to_string());
        }
        if process_name.contains("zed") {
            return (AppType::CodeEditor, "Zed".to_string());
        }

        // Terminals
        if process_name.contains("cmd") || class_name.contains("consolewindowclass") {
            return (AppType::Terminal, "Command Prompt".to_string());
        }
        if process_name.contains("powershell") {
            return (AppType::Terminal, "PowerShell".to_string());
        }
        if process_name.contains("windowsterminal") || process_name.contains("wt") {
            return (AppType::Terminal, "Windows Terminal".to_string());
        }
        if process_name.contains("terminal") || process_name.contains("iterm") {
            return (AppType::Terminal, "Terminal".to_string());
        }
        if process_name.contains("alacritty") {
            return (AppType::Terminal, "Alacritty".to_string());
        }
        if process_name.contains("warp") {
            return (AppType::Terminal, "Warp".to_string());
        }
        if process_name.contains("hyper") {
            return (AppType::Terminal, "Hyper".to_string());
        }

        // Document editors
        if process_name.contains("winword") || title.contains("word") {
            return (AppType::DocumentEditor, "Microsoft Word".to_string());
        }
        if process_name.contains("libreoffice") && title.contains("writer") {
            return (AppType::DocumentEditor, "LibreOffice Writer".to_string());
        }
        if process_name.contains("pages") {
            return (AppType::DocumentEditor, "Apple Pages".to_string());
        }

        // Spreadsheets
        if process_name.contains("excel") {
            return (AppType::Spreadsheet, "Microsoft Excel".to_string());
        }
        if process_name.contains("libreoffice") && title.contains("calc") {
            return (AppType::Spreadsheet, "LibreOffice Calc".to_string());
        }
        if process_name.contains("numbers") {
            return (AppType::Spreadsheet, "Apple Numbers".to_string());
        }

        // Presentations
        if process_name.contains("powerpnt") || title.contains("powerpoint") {
            return (AppType::Presentation, "Microsoft PowerPoint".to_string());
        }
        if process_name.contains("libreoffice") && title.contains("impress") {
            return (AppType::Presentation, "LibreOffice Impress".to_string());
        }
        if process_name.contains("keynote") {
            return (AppType::Presentation, "Apple Keynote".to_string());
        }

        // Email clients
        if process_name.contains("outlook") {
            return (AppType::Email, "Microsoft Outlook".to_string());
        }
        if process_name.contains("thunderbird") {
            return (AppType::Email, "Thunderbird".to_string());
        }
        if process_name.contains("mail") {
            return (AppType::Email, "Mail".to_string());
        }

        // Chat applications
        if process_name.contains("slack") {
            return (AppType::Chat, "Slack".to_string());
        }
        if process_name.contains("discord") {
            return (AppType::Chat, "Discord".to_string());
        }
        if process_name.contains("teams") {
            return (AppType::Chat, "Microsoft Teams".to_string());
        }
        if process_name.contains("telegram") {
            return (AppType::Chat, "Telegram".to_string());
        }
        if process_name.contains("whatsapp") {
            return (AppType::Chat, "WhatsApp".to_string());
        }
        if process_name.contains("wechat") {
            return (AppType::Chat, "WeChat".to_string());
        }
        if process_name.contains("zoom") {
            return (AppType::Chat, "Zoom".to_string());
        }

        // File managers
        if process_name.contains("explorer") && !title.contains("internet") {
            return (AppType::FileManager, "Windows Explorer".to_string());
        }
        if process_name.contains("finder") {
            return (AppType::FileManager, "Finder".to_string());
        }
        if process_name.contains("nautilus") || process_name.contains("dolphin") {
            return (AppType::FileManager, "File Manager".to_string());
        }

        // Note-taking
        if process_name.contains("notion") {
            return (AppType::NoteTaking, "Notion".to_string());
        }
        if process_name.contains("obsidian") {
            return (AppType::NoteTaking, "Obsidian".to_string());
        }
        if process_name.contains("onenote") {
            return (AppType::NoteTaking, "OneNote".to_string());
        }
        if process_name.contains("evernote") {
            return (AppType::NoteTaking, "Evernote".to_string());
        }
        if process_name.contains("bear") {
            return (AppType::NoteTaking, "Bear".to_string());
        }
        if process_name.contains("logseq") {
            return (AppType::NoteTaking, "Logseq".to_string());
        }

        // Database tools
        if process_name.contains("dbeaver") {
            return (AppType::Database, "DBeaver".to_string());
        }
        if process_name.contains("datagrip") {
            return (AppType::Database, "DataGrip".to_string());
        }
        if process_name.contains("ssms") || title.contains("sql server management") {
            return (
                AppType::Database,
                "SQL Server Management Studio".to_string(),
            );
        }
        if process_name.contains("pgadmin") {
            return (AppType::Database, "pgAdmin".to_string());
        }
        if process_name.contains("tableplus") {
            return (AppType::Database, "TablePlus".to_string());
        }

        // API clients
        if process_name.contains("postman") {
            return (AppType::ApiClient, "Postman".to_string());
        }
        if process_name.contains("insomnia") {
            return (AppType::ApiClient, "Insomnia".to_string());
        }
        if process_name.contains("httpie") {
            return (AppType::ApiClient, "HTTPie".to_string());
        }

        // Version control
        if process_name.contains("gitkraken") {
            return (AppType::VersionControl, "GitKraken".to_string());
        }
        if process_name.contains("sourcetree") {
            return (AppType::VersionControl, "SourceTree".to_string());
        }
        if process_name.contains("github desktop") || process_name.contains("githubdesktop") {
            return (AppType::VersionControl, "GitHub Desktop".to_string());
        }
        if process_name.contains("fork") {
            return (AppType::VersionControl, "Fork".to_string());
        }

        // PDF viewers
        if process_name.contains("acrobat") || process_name.contains("acrord") {
            return (AppType::PdfViewer, "Adobe Acrobat".to_string());
        }
        if process_name.contains("foxit") {
            return (AppType::PdfViewer, "Foxit Reader".to_string());
        }
        if process_name.contains("sumatrapdf") {
            return (AppType::PdfViewer, "SumatraPDF".to_string());
        }

        // Image editors
        if process_name.contains("photoshop") {
            return (AppType::ImageEditor, "Adobe Photoshop".to_string());
        }
        if process_name.contains("gimp") {
            return (AppType::ImageEditor, "GIMP".to_string());
        }
        if process_name.contains("figma") {
            return (AppType::ImageEditor, "Figma".to_string());
        }
        if process_name.contains("sketch") {
            return (AppType::ImageEditor, "Sketch".to_string());
        }

        // Media players
        if process_name.contains("vlc") {
            return (AppType::MediaPlayer, "VLC".to_string());
        }
        if process_name.contains("spotify") {
            return (AppType::MediaPlayer, "Spotify".to_string());
        }
        if process_name.contains("wmplayer") {
            return (AppType::MediaPlayer, "Windows Media Player".to_string());
        }

        // System settings
        if process_name.contains("systemsettings") || process_name.contains("control") {
            return (AppType::SystemSettings, "System Settings".to_string());
        }

        // Default
        trace!(
            "No specific app type matched, returning Unknown for process: {}",
            process_name
        );
        (AppType::Unknown, process_name.to_string())
    }

    /// Get suggested actions for an app type
    fn get_suggested_actions(app_type: &AppType) -> Vec<String> {
        match app_type {
            AppType::Browser => vec![
                "Summarize page".to_string(),
                "Translate page".to_string(),
                "Extract content".to_string(),
                "Find information".to_string(),
            ],
            AppType::CodeEditor => vec![
                "Explain code".to_string(),
                "Fix bug".to_string(),
                "Refactor".to_string(),
                "Generate tests".to_string(),
                "Add comments".to_string(),
            ],
            AppType::Terminal => vec![
                "Explain command".to_string(),
                "Fix error".to_string(),
                "Suggest command".to_string(),
            ],
            AppType::DocumentEditor => vec![
                "Improve writing".to_string(),
                "Summarize".to_string(),
                "Translate".to_string(),
                "Check grammar".to_string(),
            ],
            AppType::Email => vec![
                "Draft reply".to_string(),
                "Summarize thread".to_string(),
                "Improve tone".to_string(),
            ],
            AppType::Chat => vec![
                "Draft message".to_string(),
                "Translate".to_string(),
                "Summarize conversation".to_string(),
            ],
            AppType::NoteTaking => vec![
                "Organize notes".to_string(),
                "Expand idea".to_string(),
                "Summarize".to_string(),
            ],
            AppType::Database => vec![
                "Explain query".to_string(),
                "Optimize query".to_string(),
                "Generate query".to_string(),
            ],
            _ => vec![
                "Explain".to_string(),
                "Translate".to_string(),
                "Summarize".to_string(),
            ],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_window_info(process_name: &str, title: &str, class_name: &str) -> WindowInfo {
        WindowInfo {
            handle: 12345,
            title: title.to_string(),
            class_name: class_name.to_string(),
            process_id: 1234,
            process_name: process_name.to_string(),
            exe_path: Some(format!("C:\\Program Files\\{}", process_name)),
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
            is_minimized: false,
            is_maximized: false,
            is_focused: true,
            is_visible: true,
        }
    }

    #[test]
    fn test_detect_browser_chrome() {
        let window =
            create_test_window_info("chrome.exe", "Google - Google Chrome", "Chrome_WidgetWin_1");
        let context = AppContext::from_window_info(&window).unwrap();

        assert_eq!(context.app_type, AppType::Browser);
        assert_eq!(context.app_name, "Google Chrome");
        assert!(context.supports_text_input);
        assert!(context.supports_rich_text);
    }

    #[test]
    fn test_detect_browser_firefox() {
        let window =
            create_test_window_info("firefox.exe", "Mozilla Firefox", "MozillaWindowClass");
        let context = AppContext::from_window_info(&window).unwrap();

        assert_eq!(context.app_type, AppType::Browser);
        assert_eq!(context.app_name, "Mozilla Firefox");
    }

    #[test]
    fn test_detect_browser_edge() {
        let window = create_test_window_info("msedge.exe", "Microsoft Edge", "Chrome_WidgetWin_1");
        let context = AppContext::from_window_info(&window).unwrap();

        assert_eq!(context.app_type, AppType::Browser);
        assert_eq!(context.app_name, "Microsoft Edge");
    }

    #[test]
    fn test_detect_code_editor_vscode() {
        let window = create_test_window_info(
            "code.exe",
            "main.rs - Visual Studio Code",
            "Chrome_WidgetWin_1",
        );
        let context = AppContext::from_window_info(&window).unwrap();

        assert_eq!(context.app_type, AppType::CodeEditor);
        assert_eq!(context.app_name, "Visual Studio Code");
        assert!(context.is_dev_tool);
    }

    #[test]
    fn test_detect_code_editor_cursor() {
        let window =
            create_test_window_info("cursor.exe", "main.rs - Cursor", "Chrome_WidgetWin_1");
        let context = AppContext::from_window_info(&window).unwrap();

        assert_eq!(context.app_type, AppType::CodeEditor);
        assert_eq!(context.app_name, "Cursor");
    }

    #[test]
    fn test_detect_terminal_powershell() {
        let window =
            create_test_window_info("powershell.exe", "Windows PowerShell", "ConsoleWindowClass");
        let context = AppContext::from_window_info(&window).unwrap();

        assert_eq!(context.app_type, AppType::Terminal);
        assert!(context.is_dev_tool);
    }

    #[test]
    fn test_detect_terminal_windows_terminal() {
        let window = create_test_window_info(
            "WindowsTerminal.exe",
            "Windows Terminal",
            "CASCADIA_HOSTING_WINDOW_CLASS",
        );
        let context = AppContext::from_window_info(&window).unwrap();

        assert_eq!(context.app_type, AppType::Terminal);
    }

    #[test]
    fn test_detect_document_editor_word() {
        let window = create_test_window_info("WINWORD.EXE", "Document1 - Word", "OpusApp");
        let context = AppContext::from_window_info(&window).unwrap();

        assert_eq!(context.app_type, AppType::DocumentEditor);
        assert!(context.supports_rich_text);
    }

    #[test]
    fn test_detect_spreadsheet_excel() {
        let window = create_test_window_info("EXCEL.EXE", "Book1 - Excel", "XLMAIN");
        let context = AppContext::from_window_info(&window).unwrap();

        assert_eq!(context.app_type, AppType::Spreadsheet);
    }

    #[test]
    fn test_detect_chat_slack() {
        let window =
            create_test_window_info("slack.exe", "Slack - Workspace", "Chrome_WidgetWin_1");
        let context = AppContext::from_window_info(&window).unwrap();

        assert_eq!(context.app_type, AppType::Chat);
        assert_eq!(context.app_name, "Slack");
    }

    #[test]
    fn test_detect_chat_discord() {
        let window = create_test_window_info("Discord.exe", "Discord", "Chrome_WidgetWin_1");
        let context = AppContext::from_window_info(&window).unwrap();

        assert_eq!(context.app_type, AppType::Chat);
        assert_eq!(context.app_name, "Discord");
    }

    #[test]
    fn test_detect_note_taking_notion() {
        let window = create_test_window_info("Notion.exe", "Notion", "Chrome_WidgetWin_1");
        let context = AppContext::from_window_info(&window).unwrap();

        assert_eq!(context.app_type, AppType::NoteTaking);
        assert_eq!(context.app_name, "Notion");
    }

    #[test]
    fn test_detect_note_taking_obsidian() {
        let window =
            create_test_window_info("Obsidian.exe", "My Vault - Obsidian", "Chrome_WidgetWin_1");
        let context = AppContext::from_window_info(&window).unwrap();

        assert_eq!(context.app_type, AppType::NoteTaking);
        assert_eq!(context.app_name, "Obsidian");
    }

    #[test]
    fn test_detect_database_dbeaver() {
        let window = create_test_window_info("dbeaver.exe", "DBeaver", "SWT_Window0");
        let context = AppContext::from_window_info(&window).unwrap();

        assert_eq!(context.app_type, AppType::Database);
        assert!(context.is_dev_tool);
    }

    #[test]
    fn test_detect_api_client_postman() {
        let window = create_test_window_info("Postman.exe", "Postman", "Chrome_WidgetWin_1");
        let context = AppContext::from_window_info(&window).unwrap();

        assert_eq!(context.app_type, AppType::ApiClient);
        assert!(context.is_dev_tool);
    }

    #[test]
    fn test_detect_file_manager_explorer() {
        let window = create_test_window_info("explorer.exe", "Documents", "CabinetWClass");
        let context = AppContext::from_window_info(&window).unwrap();

        assert_eq!(context.app_type, AppType::FileManager);
        assert!(!context.supports_text_input);
    }

    #[test]
    fn test_detect_unknown_app() {
        let window =
            create_test_window_info("unknown_app.exe", "Unknown Application", "UnknownClass");
        let context = AppContext::from_window_info(&window).unwrap();

        assert_eq!(context.app_type, AppType::Unknown);
    }

    #[test]
    fn test_suggested_actions_browser() {
        let window = create_test_window_info("chrome.exe", "Google", "Chrome_WidgetWin_1");
        let context = AppContext::from_window_info(&window).unwrap();

        assert!(context
            .suggested_actions
            .contains(&"Summarize page".to_string()));
        assert!(context
            .suggested_actions
            .contains(&"Translate page".to_string()));
    }

    #[test]
    fn test_suggested_actions_code_editor() {
        let window = create_test_window_info("code.exe", "main.rs", "Chrome_WidgetWin_1");
        let context = AppContext::from_window_info(&window).unwrap();

        assert!(context
            .suggested_actions
            .contains(&"Explain code".to_string()));
        assert!(context.suggested_actions.contains(&"Fix bug".to_string()));
        assert!(context
            .suggested_actions
            .contains(&"Generate tests".to_string()));
    }

    #[test]
    fn test_suggested_actions_terminal() {
        let window = create_test_window_info("powershell.exe", "PowerShell", "ConsoleWindowClass");
        let context = AppContext::from_window_info(&window).unwrap();

        assert!(context
            .suggested_actions
            .contains(&"Explain command".to_string()));
        assert!(context.suggested_actions.contains(&"Fix error".to_string()));
    }

    #[test]
    fn test_app_type_serialization() {
        let types = vec![
            AppType::Browser,
            AppType::CodeEditor,
            AppType::Terminal,
            AppType::DocumentEditor,
            AppType::Spreadsheet,
            AppType::Presentation,
            AppType::Email,
            AppType::Chat,
            AppType::FileManager,
            AppType::MediaPlayer,
            AppType::ImageEditor,
            AppType::PdfViewer,
            AppType::NoteTaking,
            AppType::Database,
            AppType::ApiClient,
            AppType::VersionControl,
            AppType::SystemSettings,
            AppType::Game,
            AppType::Unknown,
        ];

        for t in types {
            let json = serde_json::to_string(&t);
            assert!(json.is_ok());
        }
    }

    #[test]
    fn test_app_context_serialization() {
        let window = create_test_window_info("code.exe", "main.rs", "Chrome_WidgetWin_1");
        let context = AppContext::from_window_info(&window).unwrap();

        let json = serde_json::to_string(&context);
        assert!(json.is_ok());

        let parsed: Result<AppContext, _> = serde_json::from_str(&json.unwrap());
        assert!(parsed.is_ok());
    }
}
