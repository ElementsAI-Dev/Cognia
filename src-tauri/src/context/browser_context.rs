//! Browser context detection
//!
//! Extracts browser-related context from window information.

use super::WindowInfo;
use log::{debug, trace};
use serde::{Deserialize, Serialize};

/// Browser context information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserContext {
    /// Browser name
    pub browser: String,
    /// Current URL (if detectable from title)
    pub url: Option<String>,
    /// Page title
    pub page_title: Option<String>,
    /// Domain
    pub domain: Option<String>,
    /// Whether it's a secure connection (HTTPS)
    pub is_secure: Option<bool>,
    /// Tab information
    pub tab_info: Option<TabInfo>,
    /// Detected page type
    pub page_type: PageType,
}

/// Tab information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TabInfo {
    /// Whether this is a new tab page
    pub is_new_tab: bool,
    /// Whether this is a settings/config page
    pub is_settings: bool,
    /// Whether this is a dev tools window
    pub is_dev_tools: bool,
    /// Whether this is an extension page
    pub is_extension: bool,
}

/// Page type classification
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PageType {
    /// Search engine results
    SearchResults,
    /// Documentation page
    Documentation,
    /// Code repository (GitHub, GitLab, etc.)
    CodeRepository,
    /// Social media
    SocialMedia,
    /// Video streaming
    VideoStreaming,
    /// News/Article
    NewsArticle,
    /// Email web client
    WebEmail,
    /// E-commerce
    Ecommerce,
    /// Chat/Messaging
    Chat,
    /// Cloud storage
    CloudStorage,
    /// AI/LLM interface
    AiInterface,
    /// Developer tools (online IDE, etc.)
    DevTools,
    /// General web page
    General,
    /// Browser internal page
    BrowserInternal,
}

impl BrowserContext {
    /// Create browser context from window information
    pub fn from_window_info(window: &WindowInfo) -> Result<Self, String> {
        trace!(
            "Creating BrowserContext from window: process='{}', title='{}'",
            window.process_name,
            window.title
        );

        let process_name = window.process_name.to_lowercase();

        // Check if this is a browser
        let browser = Self::detect_browser(&process_name)?;
        debug!("Detected browser: {}", browser);

        let title = &window.title;

        // Parse title to extract page info
        // Common format: "Page Title - Browser Name" or "Page Title — Browser Name"
        let (page_title, url, domain) = Self::parse_browser_title(title, &browser);
        trace!(
            "Parsed title: page_title={:?}, domain={:?}",
            page_title,
            domain
        );

        // Detect tab info
        let tab_info = Self::detect_tab_info(title, &page_title);
        trace!(
            "Tab info: new_tab={}, settings={}, dev_tools={}, extension={}",
            tab_info.is_new_tab,
            tab_info.is_settings,
            tab_info.is_dev_tools,
            tab_info.is_extension
        );

        // Detect page type
        let page_type = Self::detect_page_type(&page_title, &domain);
        debug!("Page type: {:?} for domain: {:?}", page_type, domain);

        // Detect if secure (limited without actual URL)
        let is_secure = domain.as_ref().map(|_| true); // Assume HTTPS for known domains

        debug!(
            "Browser context created: {} - {:?} (type: {:?})",
            browser, page_title, page_type
        );

        Ok(Self {
            browser,
            url,
            page_title,
            domain,
            is_secure,
            tab_info: Some(tab_info),
            page_type,
        })
    }

    /// Detect browser from process name
    fn detect_browser(process_name: &str) -> Result<String, String> {
        trace!("Detecting browser from process: {}", process_name);
        if process_name.contains("chrome") || process_name.contains("chromium") {
            Ok("Google Chrome".to_string())
        } else if process_name.contains("firefox") || process_name.contains("mozilla") {
            Ok("Mozilla Firefox".to_string())
        } else if process_name.contains("msedge") || process_name.contains("edge") {
            Ok("Microsoft Edge".to_string())
        } else if process_name.contains("safari") {
            Ok("Safari".to_string())
        } else if process_name.contains("opera") {
            Ok("Opera".to_string())
        } else if process_name.contains("brave") {
            Ok("Brave".to_string())
        } else if process_name.contains("vivaldi") {
            Ok("Vivaldi".to_string())
        } else if process_name.contains("arc") {
            Ok("Arc".to_string())
        } else {
            trace!("Process '{}' is not a recognized browser", process_name);
            Err("Not a recognized browser".to_string())
        }
    }

    /// Parse browser window title to extract page info
    fn parse_browser_title(
        title: &str,
        _browser: &str,
    ) -> (Option<String>, Option<String>, Option<String>) {
        // Remove browser name from title
        let browser_suffixes = [
            " - Google Chrome",
            " - Mozilla Firefox",
            " - Microsoft Edge",
            " - Safari",
            " - Opera",
            " - Brave",
            " - Vivaldi",
            " - Arc",
            " — Google Chrome",
            " — Mozilla Firefox",
            " — Microsoft Edge",
        ];

        let mut page_title = title.to_string();
        for suffix in &browser_suffixes {
            if let Some(pos) = page_title.rfind(suffix) {
                page_title = page_title[..pos].to_string();
                break;
            }
        }

        let page_title = page_title.trim().to_string();

        // Try to extract domain from title patterns
        // Some sites include domain: "Page Title | example.com"
        let domain = Self::extract_domain_from_title(&page_title);

        // URL is typically not available from title alone
        let url = None;

        if page_title.is_empty() {
            (None, url, domain)
        } else {
            (Some(page_title), url, domain)
        }
    }

    /// Try to extract domain from page title
    fn extract_domain_from_title(title: &str) -> Option<String> {
        trace!("Extracting domain from title: '{}'", title);
        // Common patterns where domain appears in title
        // NOTE: More specific matches MUST come before more general ones
        // e.g., "Google Drive" before "Google", "Yahoo Mail" before "Yahoo"
        let known_domains = [
            ("GitHub", "github.com"),
            ("GitLab", "gitlab.com"),
            ("Stack Overflow", "stackoverflow.com"),
            ("Reddit", "reddit.com"),
            ("Twitter", "twitter.com"),
            ("YouTube", "youtube.com"),
            ("Bing", "bing.com"),
            ("DuckDuckGo", "duckduckgo.com"),
            ("Wikipedia", "wikipedia.org"),
            ("Amazon", "amazon.com"),
            ("eBay", "ebay.com"),
            ("LinkedIn", "linkedin.com"),
            ("Facebook", "facebook.com"),
            ("Instagram", "instagram.com"),
            ("Netflix", "netflix.com"),
            ("Twitch", "twitch.tv"),
            ("Discord", "discord.com"),
            ("Slack", "slack.com"),
            ("Notion", "notion.so"),
            ("Figma", "figma.com"),
            ("Vercel", "vercel.com"),
            ("Netlify", "netlify.com"),
            ("AWS", "aws.amazon.com"),
            ("Azure", "azure.microsoft.com"),
            // Google services - more specific first
            ("Google Drive", "drive.google.com"),
            ("Google Cloud", "cloud.google.com"),
            ("Google Meet", "meet.google.com"),
            ("Gmail", "mail.google.com"),
            ("Google", "google.com"), // General Google last
            ("ChatGPT", "chat.openai.com"),
            ("Claude", "claude.ai"),
            ("Anthropic", "anthropic.com"),
            ("OpenAI", "openai.com"),
            ("Hugging Face", "huggingface.co"),
            ("npm", "npmjs.com"),
            ("PyPI", "pypi.org"),
            ("crates.io", "crates.io"),
            ("MDN", "developer.mozilla.org"),
            ("W3Schools", "w3schools.com"),
            ("Medium", "medium.com"),
            ("Dev.to", "dev.to"),
            ("Hacker News", "news.ycombinator.com"),
            ("Product Hunt", "producthunt.com"),
            ("Dribbble", "dribbble.com"),
            ("Behance", "behance.net"),
            ("CodePen", "codepen.io"),
            ("JSFiddle", "jsfiddle.net"),
            ("Replit", "replit.com"),
            ("CodeSandbox", "codesandbox.io"),
            ("StackBlitz", "stackblitz.com"),
            ("Jira", "atlassian.net"),
            ("Confluence", "atlassian.net"),
            ("Trello", "trello.com"),
            ("Asana", "asana.com"),
            ("Monday", "monday.com"),
            ("Linear", "linear.app"),
            ("Dropbox", "dropbox.com"),
            ("OneDrive", "onedrive.live.com"),
            ("iCloud", "icloud.com"),
            ("Outlook", "outlook.live.com"),
            // Yahoo services - more specific first
            ("Yahoo Mail", "mail.yahoo.com"),
            ("Zoom", "zoom.us"),
            ("Microsoft Teams", "teams.microsoft.com"),
            ("X", "x.com"), // Put X last as it's very short and might match unintentionally
        ];

        let title_lower = title.to_lowercase();

        for (name, domain) in &known_domains {
            if title_lower.contains(&name.to_lowercase()) {
                return Some(domain.to_string());
            }
        }

        // Try to find domain pattern in title (e.g., "example.com")
        let domain_regex = regex::Regex::new(r"([a-zA-Z0-9][-a-zA-Z0-9]*\.)+[a-zA-Z]{2,}").ok()?;
        let result = domain_regex.find(title).map(|m| m.as_str().to_lowercase());
        if let Some(ref domain) = result {
            trace!("Extracted domain from regex: {}", domain);
        }
        result
    }

    /// Detect tab information
    fn detect_tab_info(title: &str, page_title: &Option<String>) -> TabInfo {
        let title_lower = title.to_lowercase();
        let page_lower = page_title
            .as_ref()
            .map(|t| t.to_lowercase())
            .unwrap_or_default();

        TabInfo {
            is_new_tab: title_lower.contains("new tab")
                || title_lower.contains("start page")
                || title_lower.contains("speed dial")
                || page_lower.is_empty(),
            is_settings: title_lower.contains("settings")
                || title_lower.contains("preferences")
                || title_lower.contains("chrome://")
                || title_lower.contains("about:"),
            is_dev_tools: title_lower.contains("devtools")
                || title_lower.contains("developer tools")
                || title_lower.contains("inspector"),
            is_extension: title_lower.contains("extension")
                || title_lower.contains("chrome-extension://")
                || title_lower.contains("moz-extension://"),
        }
    }

    /// Detect page type from title and domain
    fn detect_page_type(page_title: &Option<String>, domain: &Option<String>) -> PageType {
        let title = page_title
            .as_ref()
            .map(|t| t.to_lowercase())
            .unwrap_or_default();
        let dom = domain
            .as_ref()
            .map(|d| d.to_lowercase())
            .unwrap_or_default();

        // Check for browser internal pages
        if title.contains("new tab") || title.contains("settings") || dom.is_empty() {
            return PageType::BrowserInternal;
        }

        // Cloud storage (check before search engines to avoid false positives)
        if dom.contains("drive.google.com")
            || dom.contains("dropbox.com")
            || dom.contains("onedrive.")
            || dom.contains("box.com")
            || dom.contains("icloud.com")
        {
            return PageType::CloudStorage;
        }

        // Web email (check before search engines to avoid false positives)
        if dom.contains("mail.google.com")
            || dom.contains("outlook.live.com")
            || dom.contains("mail.yahoo.com")
            || dom.contains("protonmail.com")
            || title.contains("inbox")
        {
            return PageType::WebEmail;
        }

        // Search engines (more specific check to avoid matching Gmail/Drive)
        if dom == "google.com" && (title.contains("search") || title.contains(" - google search")) {
            return PageType::SearchResults;
        }
        if (dom.contains("bing.com") || dom.contains("duckduckgo.com")) && title.contains("search")
        {
            return PageType::SearchResults;
        }

        // Code repositories
        if dom.contains("github.com") || dom.contains("gitlab.com") || dom.contains("bitbucket.org")
        {
            return PageType::CodeRepository;
        }

        // Documentation
        if dom.contains("docs.")
            || dom.contains("developer.")
            || dom.contains("documentation")
            || title.contains("documentation")
            || title.contains(" docs")
            || title.contains("api reference")
            || dom.contains("mdn")
            || dom.contains("w3schools")
            || dom.contains("devdocs")
        {
            return PageType::Documentation;
        }

        // AI interfaces
        if dom.contains("chat.openai.com")
            || dom.contains("claude.ai")
            || dom.contains("bard.google.com")
            || dom.contains("poe.com")
            || dom.contains("perplexity.ai")
            || dom.contains("huggingface.co")
        {
            return PageType::AiInterface;
        }

        // Video streaming
        if dom.contains("youtube.com")
            || dom.contains("netflix.com")
            || dom.contains("twitch.tv")
            || dom.contains("vimeo.com")
            || dom.contains("dailymotion.com")
            || dom.contains("bilibili.com")
        {
            return PageType::VideoStreaming;
        }

        // Social media
        if dom.contains("twitter.com")
            || dom.contains("x.com")
            || dom.contains("facebook.com")
            || dom.contains("instagram.com")
            || dom.contains("linkedin.com")
            || dom.contains("reddit.com")
            || dom.contains("tiktok.com")
            || dom.contains("weibo.com")
        {
            return PageType::SocialMedia;
        }

        // Chat/Messaging
        if dom.contains("discord.com")
            || dom.contains("slack.com")
            || dom.contains("teams.microsoft.com")
            || dom.contains("telegram.org")
            || dom.contains("whatsapp.com")
        {
            return PageType::Chat;
        }

        // E-commerce
        if dom.contains("amazon.")
            || dom.contains("ebay.")
            || dom.contains("aliexpress.")
            || dom.contains("shopify.")
            || dom.contains("etsy.com")
            || title.contains("shopping")
            || title.contains("cart")
            || title.contains("checkout")
        {
            return PageType::Ecommerce;
        }

        // Dev tools (online IDEs, etc.)
        if dom.contains("codepen.io")
            || dom.contains("jsfiddle.net")
            || dom.contains("replit.com")
            || dom.contains("codesandbox.io")
            || dom.contains("stackblitz.com")
            || dom.contains("gitpod.io")
        {
            return PageType::DevTools;
        }

        // News/Articles
        if title.contains("news")
            || title.contains("article")
            || dom.contains("medium.com")
            || dom.contains("dev.to")
            || dom.contains("news.ycombinator.com")
        {
            return PageType::NewsArticle;
        }

        PageType::General
    }

}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::context::WindowInfo;

    fn create_test_window_info(process_name: &str, title: &str) -> WindowInfo {
        WindowInfo {
            handle: 12345,
            title: title.to_string(),
            class_name: "TestClass".to_string(),
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

    // Browser detection tests
    #[test]
    fn test_detect_browser_chrome() {
        let window = create_test_window_info("chrome.exe", "Google - Google Chrome");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert_eq!(context.browser, "Google Chrome");
    }

    #[test]
    fn test_detect_browser_firefox() {
        let window = create_test_window_info("firefox.exe", "Mozilla Firefox");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert_eq!(context.browser, "Mozilla Firefox");
    }

    #[test]
    fn test_detect_browser_edge() {
        let window = create_test_window_info("msedge.exe", "Microsoft Edge");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert_eq!(context.browser, "Microsoft Edge");
    }

    #[test]
    fn test_detect_browser_safari() {
        let window = create_test_window_info("safari.exe", "Safari");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert_eq!(context.browser, "Safari");
    }

    #[test]
    fn test_detect_browser_opera() {
        let window = create_test_window_info("opera.exe", "Opera");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert_eq!(context.browser, "Opera");
    }

    #[test]
    fn test_detect_browser_brave() {
        let window = create_test_window_info("brave.exe", "Brave");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert_eq!(context.browser, "Brave");
    }

    #[test]
    fn test_detect_browser_vivaldi() {
        let window = create_test_window_info("vivaldi.exe", "Vivaldi");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert_eq!(context.browser, "Vivaldi");
    }

    #[test]
    fn test_detect_browser_arc() {
        let window = create_test_window_info("arc.exe", "Arc");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert_eq!(context.browser, "Arc");
    }

    #[test]
    fn test_not_a_browser() {
        let window = create_test_window_info("notepad.exe", "Notepad");
        let result = BrowserContext::from_window_info(&window);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Not a recognized browser");
    }

    // Page title parsing tests
    #[test]
    fn test_parse_page_title_chrome_format() {
        let window = create_test_window_info("chrome.exe", "GitHub - Google Chrome");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert_eq!(context.page_title, Some("GitHub".to_string()));
    }

    #[test]
    fn test_parse_page_title_firefox_format() {
        let window = create_test_window_info("firefox.exe", "GitHub - Mozilla Firefox");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert_eq!(context.page_title, Some("GitHub".to_string()));
    }

    #[test]
    fn test_parse_page_title_with_em_dash() {
        let window = create_test_window_info("chrome.exe", "Stack Overflow — Google Chrome");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert_eq!(context.page_title, Some("Stack Overflow".to_string()));
    }

    // Domain detection tests
    #[test]
    fn test_detect_domain_github() {
        let window = create_test_window_info(
            "chrome.exe",
            "GitHub - google/material-design - Google Chrome",
        );
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert_eq!(context.domain, Some("github.com".to_string()));
    }

    #[test]
    fn test_detect_domain_stackoverflow() {
        let window = create_test_window_info(
            "chrome.exe",
            "Stack Overflow - How to do something - Google Chrome",
        );
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert_eq!(context.domain, Some("stackoverflow.com".to_string()));
    }

    #[test]
    fn test_detect_domain_youtube() {
        let window = create_test_window_info("chrome.exe", "YouTube - Google Chrome");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert_eq!(context.domain, Some("youtube.com".to_string()));
    }

    #[test]
    fn test_detect_domain_chatgpt() {
        let window = create_test_window_info("chrome.exe", "ChatGPT - Google Chrome");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert_eq!(context.domain, Some("chat.openai.com".to_string()));
    }

    #[test]
    fn test_detect_domain_claude() {
        let window = create_test_window_info("chrome.exe", "Claude - Google Chrome");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert_eq!(context.domain, Some("claude.ai".to_string()));
    }

    // Tab info tests
    #[test]
    fn test_detect_new_tab() {
        let window = create_test_window_info("chrome.exe", "New Tab - Google Chrome");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert!(context.tab_info.as_ref().unwrap().is_new_tab);
    }

    #[test]
    fn test_detect_settings_page() {
        let window = create_test_window_info("chrome.exe", "Settings - Google Chrome");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert!(context.tab_info.as_ref().unwrap().is_settings);
    }

    #[test]
    fn test_detect_dev_tools() {
        let window = create_test_window_info("chrome.exe", "DevTools - Google Chrome");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert!(context.tab_info.as_ref().unwrap().is_dev_tools);
    }

    #[test]
    fn test_detect_extension_page() {
        let window = create_test_window_info("chrome.exe", "Extension Manager - Google Chrome");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert!(context.tab_info.as_ref().unwrap().is_extension);
    }

    // Page type detection tests
    #[test]
    fn test_page_type_code_repository() {
        let window = create_test_window_info("chrome.exe", "GitHub - myrepo - Google Chrome");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert_eq!(context.page_type, PageType::CodeRepository);
    }

    #[test]
    fn test_page_type_video_streaming() {
        let window = create_test_window_info("chrome.exe", "YouTube - Funny Video - Google Chrome");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert_eq!(context.page_type, PageType::VideoStreaming);
    }

    #[test]
    fn test_page_type_social_media() {
        let window = create_test_window_info("chrome.exe", "Twitter - Home - Google Chrome");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert_eq!(context.page_type, PageType::SocialMedia);
    }

    #[test]
    fn test_page_type_ai_interface() {
        let window =
            create_test_window_info("chrome.exe", "ChatGPT - New conversation - Google Chrome");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert_eq!(context.page_type, PageType::AiInterface);
    }

    #[test]
    fn test_page_type_documentation() {
        let window = create_test_window_info("chrome.exe", "MDN Web Docs - Google Chrome");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert_eq!(context.page_type, PageType::Documentation);
    }

    #[test]
    fn test_page_type_chat() {
        let window = create_test_window_info("chrome.exe", "Discord - Server Chat - Google Chrome");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert_eq!(context.page_type, PageType::Chat);
    }

    #[test]
    fn test_page_type_web_email() {
        let window = create_test_window_info("chrome.exe", "Gmail - Inbox - Google Chrome");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert_eq!(context.page_type, PageType::WebEmail);
    }

    #[test]
    fn test_page_type_cloud_storage() {
        let window =
            create_test_window_info("chrome.exe", "Google Drive - My Files - Google Chrome");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert_eq!(context.page_type, PageType::CloudStorage);
    }

    #[test]
    fn test_page_type_dev_tools() {
        let window = create_test_window_info("chrome.exe", "CodePen - Test Pen - Google Chrome");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert_eq!(context.page_type, PageType::DevTools);
    }

    #[test]
    fn test_page_type_browser_internal() {
        let window = create_test_window_info("chrome.exe", "New Tab - Google Chrome");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert_eq!(context.page_type, PageType::BrowserInternal);
    }

    // Suggested actions tests
    #[test]
    fn test_suggested_actions_search_results() {
        let window = create_test_window_info(
            "chrome.exe",
            "search results - Google Search - Google Chrome",
        );
        let context = BrowserContext::from_window_info(&window).unwrap();
        let actions = context.get_suggested_actions();
        assert!(actions.contains(&"Summarize results".to_string()));
    }

    #[test]
    fn test_suggested_actions_documentation() {
        let window = create_test_window_info("chrome.exe", "MDN Web Docs - Array - Google Chrome");
        let context = BrowserContext::from_window_info(&window).unwrap();
        let actions = context.get_suggested_actions();
        assert!(actions.contains(&"Explain concept".to_string()));
    }

    #[test]
    fn test_suggested_actions_code_repository() {
        let window = create_test_window_info("chrome.exe", "GitHub - myrepo - Google Chrome");
        let context = BrowserContext::from_window_info(&window).unwrap();
        let actions = context.get_suggested_actions();
        assert!(actions.contains(&"Explain code".to_string()));
    }

    #[test]
    fn test_suggested_actions_video_streaming() {
        let window = create_test_window_info("chrome.exe", "YouTube - Video - Google Chrome");
        let context = BrowserContext::from_window_info(&window).unwrap();
        let actions = context.get_suggested_actions();
        assert!(actions.contains(&"Summarize video".to_string()));
    }

    #[test]
    fn test_suggested_actions_news_article() {
        let window =
            create_test_window_info("chrome.exe", "Medium - Article Title - Google Chrome");
        let context = BrowserContext::from_window_info(&window).unwrap();
        let actions = context.get_suggested_actions();
        assert!(actions.contains(&"Summarize article".to_string()));
    }

    // Serialization tests
    #[test]
    fn test_browser_context_serialization() {
        let window = create_test_window_info("chrome.exe", "GitHub - Google Chrome");
        let context = BrowserContext::from_window_info(&window).unwrap();

        let json = serde_json::to_string(&context);
        assert!(json.is_ok());

        let parsed: Result<BrowserContext, _> = serde_json::from_str(&json.unwrap());
        assert!(parsed.is_ok());
        assert_eq!(parsed.unwrap().browser, "Google Chrome");
    }

    #[test]
    fn test_tab_info_serialization() {
        let tab_info = TabInfo {
            is_new_tab: true,
            is_settings: false,
            is_dev_tools: false,
            is_extension: false,
        };

        let json = serde_json::to_string(&tab_info);
        assert!(json.is_ok());

        let parsed: Result<TabInfo, _> = serde_json::from_str(&json.unwrap());
        assert!(parsed.is_ok());
        assert!(parsed.unwrap().is_new_tab);
    }

    #[test]
    fn test_page_type_serialization() {
        let page_types = vec![
            PageType::SearchResults,
            PageType::Documentation,
            PageType::CodeRepository,
            PageType::SocialMedia,
            PageType::VideoStreaming,
            PageType::NewsArticle,
            PageType::WebEmail,
            PageType::Ecommerce,
            PageType::Chat,
            PageType::CloudStorage,
            PageType::AiInterface,
            PageType::DevTools,
            PageType::General,
            PageType::BrowserInternal,
        ];

        for page_type in page_types {
            let json = serde_json::to_string(&page_type);
            assert!(json.is_ok());
        }
    }

    // Edge case tests
    #[test]
    fn test_empty_title() {
        let window = create_test_window_info("chrome.exe", " - Google Chrome");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert!(context.page_title.is_none() || context.page_title.as_ref().unwrap().is_empty());
    }

    #[test]
    fn test_complex_title_with_multiple_separators() {
        let window = create_test_window_info("chrome.exe", "Page - Section | Site - Google Chrome");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert!(context.page_title.is_some());
    }

    #[test]
    fn test_case_insensitive_browser_detection() {
        let window = create_test_window_info("CHROME.EXE", "Test - Google Chrome");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert_eq!(context.browser, "Google Chrome");
    }

    #[test]
    fn test_chromium_detection() {
        let window = create_test_window_info("chromium.exe", "Test - Chromium");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert_eq!(context.browser, "Google Chrome");
    }

    #[test]
    fn test_mozilla_detection() {
        let window = create_test_window_info("mozilla.exe", "Test - Mozilla");
        let context = BrowserContext::from_window_info(&window).unwrap();
        assert_eq!(context.browser, "Mozilla Firefox");
    }
}
