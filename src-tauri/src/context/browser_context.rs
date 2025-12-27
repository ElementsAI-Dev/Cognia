//! Browser context detection
//!
//! Extracts browser-related context from window information.

use super::WindowInfo;
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
        let process_name = window.process_name.to_lowercase();
        
        // Check if this is a browser
        let browser = Self::detect_browser(&process_name)?;
        
        let title = &window.title;
        
        // Parse title to extract page info
        // Common format: "Page Title - Browser Name" or "Page Title — Browser Name"
        let (page_title, url, domain) = Self::parse_browser_title(title, &browser);
        
        // Detect tab info
        let tab_info = Self::detect_tab_info(title, &page_title);
        
        // Detect page type
        let page_type = Self::detect_page_type(&page_title, &domain);
        
        // Detect if secure (limited without actual URL)
        let is_secure = domain.as_ref().map(|_| true); // Assume HTTPS for known domains
        
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
            Err("Not a recognized browser".to_string())
        }
    }

    /// Parse browser window title to extract page info
    fn parse_browser_title(title: &str, _browser: &str) -> (Option<String>, Option<String>, Option<String>) {
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
        // Common patterns where domain appears in title
        let known_domains = [
            ("GitHub", "github.com"),
            ("GitLab", "gitlab.com"),
            ("Stack Overflow", "stackoverflow.com"),
            ("Reddit", "reddit.com"),
            ("Twitter", "twitter.com"),
            ("X", "x.com"),
            ("YouTube", "youtube.com"),
            ("Google", "google.com"),
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
            ("Google Cloud", "cloud.google.com"),
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
            ("Google Drive", "drive.google.com"),
            ("OneDrive", "onedrive.live.com"),
            ("iCloud", "icloud.com"),
            ("Gmail", "mail.google.com"),
            ("Outlook", "outlook.live.com"),
            ("Yahoo Mail", "mail.yahoo.com"),
            ("Zoom", "zoom.us"),
            ("Google Meet", "meet.google.com"),
            ("Microsoft Teams", "teams.microsoft.com"),
        ];

        let title_lower = title.to_lowercase();
        
        for (name, domain) in &known_domains {
            if title_lower.contains(&name.to_lowercase()) {
                return Some(domain.to_string());
            }
        }

        // Try to find domain pattern in title (e.g., "example.com")
        let domain_regex = regex::Regex::new(r"([a-zA-Z0-9][-a-zA-Z0-9]*\.)+[a-zA-Z]{2,}").ok()?;
        domain_regex.find(&title).map(|m| m.as_str().to_lowercase())
    }

    /// Detect tab information
    fn detect_tab_info(title: &str, page_title: &Option<String>) -> TabInfo {
        let title_lower = title.to_lowercase();
        let page_lower = page_title.as_ref().map(|t| t.to_lowercase()).unwrap_or_default();

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
        let title = page_title.as_ref().map(|t| t.to_lowercase()).unwrap_or_default();
        let dom = domain.as_ref().map(|d| d.to_lowercase()).unwrap_or_default();

        // Check for browser internal pages
        if title.contains("new tab") || title.contains("settings") || dom.is_empty() {
            return PageType::BrowserInternal;
        }

        // Search engines
        if dom.contains("google.com") && (title.contains("search") || title.contains(" - google")) {
            return PageType::SearchResults;
        }
        if dom.contains("bing.com") || dom.contains("duckduckgo.com") || dom.contains("yahoo.com") {
            if title.contains("search") {
                return PageType::SearchResults;
            }
        }

        // Code repositories
        if dom.contains("github.com") || dom.contains("gitlab.com") || dom.contains("bitbucket.org") {
            return PageType::CodeRepository;
        }

        // Documentation
        if dom.contains("docs.") || dom.contains("developer.") || dom.contains("documentation") 
            || title.contains("documentation") || title.contains(" docs") || title.contains("api reference")
            || dom.contains("mdn") || dom.contains("w3schools") || dom.contains("devdocs") {
            return PageType::Documentation;
        }

        // AI interfaces
        if dom.contains("chat.openai.com") || dom.contains("claude.ai") || dom.contains("bard.google.com")
            || dom.contains("poe.com") || dom.contains("perplexity.ai") || dom.contains("huggingface.co") {
            return PageType::AiInterface;
        }

        // Video streaming
        if dom.contains("youtube.com") || dom.contains("netflix.com") || dom.contains("twitch.tv")
            || dom.contains("vimeo.com") || dom.contains("dailymotion.com") || dom.contains("bilibili.com") {
            return PageType::VideoStreaming;
        }

        // Social media
        if dom.contains("twitter.com") || dom.contains("x.com") || dom.contains("facebook.com")
            || dom.contains("instagram.com") || dom.contains("linkedin.com") || dom.contains("reddit.com")
            || dom.contains("tiktok.com") || dom.contains("weibo.com") {
            return PageType::SocialMedia;
        }

        // Chat/Messaging
        if dom.contains("discord.com") || dom.contains("slack.com") || dom.contains("teams.microsoft.com")
            || dom.contains("telegram.org") || dom.contains("whatsapp.com") {
            return PageType::Chat;
        }

        // Web email
        if dom.contains("mail.google.com") || dom.contains("outlook.live.com") || dom.contains("mail.yahoo.com")
            || dom.contains("protonmail.com") || title.contains("inbox") || title.contains("email") {
            return PageType::WebEmail;
        }

        // E-commerce
        if dom.contains("amazon.") || dom.contains("ebay.") || dom.contains("aliexpress.")
            || dom.contains("shopify.") || dom.contains("etsy.com") || title.contains("shopping")
            || title.contains("cart") || title.contains("checkout") {
            return PageType::Ecommerce;
        }

        // Cloud storage
        if dom.contains("drive.google.com") || dom.contains("dropbox.com") || dom.contains("onedrive.")
            || dom.contains("box.com") || dom.contains("icloud.com") {
            return PageType::CloudStorage;
        }

        // Dev tools (online IDEs, etc.)
        if dom.contains("codepen.io") || dom.contains("jsfiddle.net") || dom.contains("replit.com")
            || dom.contains("codesandbox.io") || dom.contains("stackblitz.com") || dom.contains("gitpod.io") {
            return PageType::DevTools;
        }

        // News/Articles
        if title.contains("news") || title.contains("article") || dom.contains("medium.com")
            || dom.contains("dev.to") || dom.contains("news.ycombinator.com") {
            return PageType::NewsArticle;
        }

        PageType::General
    }

    /// Get suggested actions based on page type
    pub fn get_suggested_actions(&self) -> Vec<String> {
        match self.page_type {
            PageType::SearchResults => vec![
                "Summarize results".to_string(),
                "Find specific info".to_string(),
                "Compare options".to_string(),
            ],
            PageType::Documentation => vec![
                "Explain concept".to_string(),
                "Show example".to_string(),
                "Summarize".to_string(),
            ],
            PageType::CodeRepository => vec![
                "Explain code".to_string(),
                "Review changes".to_string(),
                "Summarize README".to_string(),
            ],
            PageType::SocialMedia => vec![
                "Summarize thread".to_string(),
                "Draft response".to_string(),
                "Translate".to_string(),
            ],
            PageType::VideoStreaming => vec![
                "Summarize video".to_string(),
                "Get transcript".to_string(),
            ],
            PageType::NewsArticle => vec![
                "Summarize article".to_string(),
                "Key points".to_string(),
                "Fact check".to_string(),
            ],
            PageType::WebEmail => vec![
                "Draft reply".to_string(),
                "Summarize thread".to_string(),
                "Improve tone".to_string(),
            ],
            PageType::AiInterface => vec![
                "Continue conversation".to_string(),
                "Improve prompt".to_string(),
            ],
            _ => vec![
                "Summarize page".to_string(),
                "Extract info".to_string(),
                "Translate".to_string(),
            ],
        }
    }
}
