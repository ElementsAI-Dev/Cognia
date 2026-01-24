/**
 * Feature Routes Configuration
 * 
 * Defines all feature routes with their intent detection patterns.
 * Each feature has Chinese and English patterns for matching user intent.
 */

import type { FeatureRoute, FeatureId } from '@/types/routing/feature-router';

/**
 * Complete feature routes configuration
 */
export const FEATURE_ROUTES: FeatureRoute[] = [
  // ============================================
  // Creation Features
  // ============================================
  {
    id: 'video-studio',
    name: 'Video Studio',
    nameZh: '视频工作室',
    path: '/video-studio',
    icon: 'Video',
    category: 'creation',
    description: 'Create, edit, and generate videos with AI',
    descriptionZh: 'AI视频创作、编辑和生成',
    patterns: {
      chinese: [
        /(?:帮我|请|我想|我要|我需要)?(?:创作|制作|生成|做|录制|剪辑|编辑).*?(?:视频|短视频|vlog|影片)/i,
        /(?:视频|短视频|vlog|影片).*?(?:创作|制作|生成|编辑|剪辑)/i,
        /(?:录屏|屏幕录制|录制屏幕)/i,
        /(?:文字|文本|图片).*?(?:转|生成|变成).*?视频/i,
        /(?:AI|人工智能).*?(?:视频|影片)/i,
      ],
      english: [
        /(?:help me |please |i want to |i need to )?(?:create|make|generate|produce|record|edit).*?(?:video|clip|vlog|film)/i,
        /(?:video|clip|vlog|film).*?(?:creation|making|generation|editing)/i,
        /(?:screen record|record screen|screencast)/i,
        /(?:text|image).*?to.*?video/i,
        /(?:ai|artificial intelligence).*?video/i,
      ],
    },
    keywords: {
      chinese: ['视频', '短视频', '录屏', 'vlog', '影片', '剪辑', '视频创作', '视频生成', '视频编辑'],
      english: ['video', 'clip', 'vlog', 'film', 'screencast', 'video creation', 'video generation'],
    },
    priority: 90,
    enabled: true,
    carryContext: true,
  },

  {
    id: 'image-studio',
    name: 'Image Studio',
    nameZh: '图片工作室',
    path: '/image-studio',
    icon: 'Image',
    category: 'creation',
    description: 'Generate and edit images with AI',
    descriptionZh: 'AI图片生成和编辑',
    patterns: {
      chinese: [
        /(?:帮我|请|我想|我要|我需要)?(?:画|绘制|生成|创作|制作|做).*?(?:图|图片|图像|画|插画|照片|海报|壁纸)/i,
        /(?:图|图片|图像|画|插画|照片).*?(?:生成|创作|绘制|编辑)/i,
        /(?:AI|人工智能).*?(?:绘画|画图|作画|绘图)/i,
        /(?:文字|文本|描述).*?(?:转|生成|变成).*?(?:图|画)/i,
        /(?:修图|P图|图片编辑|图像编辑)/i,
        /(?:去背景|抠图|换背景)/i,
      ],
      english: [
        /(?:help me |please |i want to |i need to )?(?:draw|paint|generate|create|make).*?(?:image|picture|photo|illustration|poster|artwork)/i,
        /(?:image|picture|photo|illustration).*?(?:generation|creation|editing)/i,
        /(?:ai|artificial intelligence).*?(?:art|drawing|painting|image)/i,
        /(?:text|description).*?to.*?(?:image|picture)/i,
        /(?:edit|modify|retouch).*?(?:image|picture|photo)/i,
        /(?:remove background|background removal)/i,
      ],
    },
    keywords: {
      chinese: ['图片', '图像', '绘画', '插画', 'AI绘图', '画图', '生图', '海报', '壁纸', '修图'],
      english: ['image', 'picture', 'photo', 'illustration', 'artwork', 'drawing', 'ai art', 'dall-e'],
    },
    priority: 90,
    enabled: true,
    carryContext: true,
  },

  {
    id: 'designer',
    name: 'Designer',
    nameZh: '设计器',
    path: '/designer',
    icon: 'Wand2',
    category: 'creation',
    description: 'Design web pages and UI components',
    descriptionZh: '网页和UI组件设计',
    patterns: {
      chinese: [
        /(?:帮我|请|我想|我要|我需要)?(?:设计|创建|制作|生成|做).*?(?:网页|页面|网站|UI|界面|组件|前端)/i,
        /(?:网页|页面|网站|UI|界面|组件).*?(?:设计|创建|制作|生成)/i,
        /(?:V0|v0).*?(?:风格|样式|设计)/i,
        /(?:React|Vue|HTML).*?(?:组件|页面|设计)/i,
        /(?:前端|UI\/UX|用户界面).*?(?:设计|开发)/i,
      ],
      english: [
        /(?:help me |please |i want to |i need to )?(?:design|create|make|build).*?(?:webpage|page|website|ui|interface|component|frontend)/i,
        /(?:webpage|page|website|ui|interface|component).*?(?:design|creation|building)/i,
        /(?:v0|vercel).*?(?:style|design)/i,
        /(?:react|vue|html).*?(?:component|page|design)/i,
        /(?:frontend|ui\/ux|user interface).*?(?:design|development)/i,
      ],
    },
    keywords: {
      chinese: ['网页设计', 'UI设计', '界面设计', '组件', '前端', '页面设计', 'V0', '网站'],
      english: ['web design', 'ui design', 'interface', 'component', 'frontend', 'page design', 'v0', 'website'],
    },
    priority: 85,
    enabled: true,
    carryContext: true,
  },

  {
    id: 'ppt',
    name: 'Presentations',
    nameZh: 'PPT演示',
    path: '/ppt',
    icon: 'Presentation',
    category: 'creation',
    description: 'Create AI-powered presentations and slides',
    descriptionZh: 'AI驱动的演示文稿创作',
    patterns: {
      chinese: [
        /(?:帮我|请|我想|我要|我需要)?(?:做|制作|创建|生成|写).*?(?:PPT|ppt|演示文稿|幻灯片|slides)/i,
        /(?:PPT|ppt|演示文稿|幻灯片).*?(?:制作|创建|生成|设计)/i,
        /(?:汇报|报告|presentation).*?(?:制作|PPT|幻灯片)/i,
        /(?:AI|人工智能).*?(?:PPT|演示|幻灯片)/i,
      ],
      english: [
        /(?:help me |please |i want to |i need to )?(?:make|create|generate|build).*?(?:ppt|presentation|slides|slideshow)/i,
        /(?:ppt|presentation|slides|slideshow).*?(?:making|creation|generation|design)/i,
        /(?:report|pitch).*?(?:presentation|slides)/i,
        /(?:ai|artificial intelligence).*?(?:ppt|presentation|slides)/i,
      ],
    },
    keywords: {
      chinese: ['PPT', '演示文稿', '幻灯片', 'slides', '汇报', '演示', '报告'],
      english: ['ppt', 'presentation', 'slides', 'slideshow', 'pitch deck', 'report'],
    },
    priority: 88,
    enabled: true,
    carryContext: true,
  },

  // ============================================
  // Research Features
  // ============================================
  {
    id: 'academic',
    name: 'Academic Research',
    nameZh: '学术研究',
    path: '/academic',
    icon: 'GraduationCap',
    category: 'research',
    description: 'Search, manage, and analyze academic papers',
    descriptionZh: '论文搜索、管理和分析',
    patterns: {
      chinese: [
        /(?:帮我|请|我想|我要|我需要)?(?:搜索|查找|找|检索|看看).*?(?:论文|文献|研究|学术|期刊|paper)/i,
        /(?:论文|文献|研究|学术).*?(?:搜索|查找|检索|分析|管理)/i,
        /(?:arXiv|arxiv|Arxiv|知网|CNKI|谷歌学术|Google Scholar)/i,
        /(?:引用|参考文献|文献综述|citation)/i,
        /(?:学术|科研|研究).*?(?:分析|写作|助手)/i,
      ],
      english: [
        /(?:help me |please |i want to |i need to )?(?:search|find|look for|retrieve).*?(?:paper|papers|research|academic|journal|publication)/i,
        /(?:paper|papers|research|academic|publication).*?(?:search|finding|retrieval|analysis|management)/i,
        /(?:arxiv|google scholar|semantic scholar|pubmed)/i,
        /(?:citation|reference|literature review)/i,
        /(?:academic|scientific|research).*?(?:analysis|writing|assistant)/i,
      ],
    },
    keywords: {
      chinese: ['论文', '文献', '学术', '研究', '期刊', '引用', '文献综述', 'arXiv', '知网'],
      english: ['paper', 'papers', 'academic', 'research', 'journal', 'citation', 'arxiv', 'scholar'],
    },
    priority: 85,
    enabled: true,
    carryContext: true,
  },

  {
    id: 'speedpass',
    name: 'SpeedPass Learning',
    nameZh: '速过学习',
    path: '/speedpass',
    icon: 'GraduationCap',
    category: 'research',
    description: 'Fast-track exam preparation with textbook-based learning',
    descriptionZh: '基于教材的快速备考学习平台',
    patterns: {
      chinese: [
        /(?:帮我|请|我想|我要|我需要)?(?:复习|学习|备考|准备).*?(?:考试|期末|期中|测验)/i,
        /(?:速过|速学|快速学习|极速学习|速成)/i,
        /(?:教材|课本|教科书).*?(?:学习|复习|备考)/i,
        /(?:考前|临时|突击).*?(?:复习|准备|学习)/i,
        /(?:重点|知识点|考点).*?(?:整理|提取|学习)/i,
        /(?:刷题|练习|做题|测验)/i,
        /(?:错题|错题本|易错题)/i,
      ],
      english: [
        /(?:help me |please |i want to |i need to )?(?:review|study|prepare for).*?(?:exam|test|midterm|final)/i,
        /(?:speed learning|fast learning|quick study|cramming)/i,
        /(?:textbook|coursebook).*?(?:learning|studying|review)/i,
        /(?:last minute|quick|crash course).*?(?:review|preparation|study)/i,
        /(?:key points|knowledge points|important concepts).*?(?:extract|learn|review)/i,
        /(?:practice|quiz|exercise|test yourself)/i,
        /(?:wrong answers|mistake book|error log)/i,
      ],
    },
    keywords: {
      chinese: ['速过', '速学', '备考', '复习', '考试', '教材', '知识点', '刷题', '错题本', '考点'],
      english: ['speed learning', 'exam prep', 'review', 'study', 'textbook', 'knowledge points', 'quiz', 'practice'],
    },
    priority: 85,
    enabled: true,
    carryContext: true,
  },

  // ============================================
  // Automation Features
  // ============================================
  {
    id: 'workflows',
    name: 'Workflows',
    nameZh: '工作流',
    path: '/workflows',
    icon: 'Workflow',
    category: 'automation',
    description: 'Create and manage automated workflows',
    descriptionZh: '创建和管理自动化工作流',
    patterns: {
      chinese: [
        /(?:帮我|请|我想|我要|我需要)?(?:创建|制作|设计|编辑|管理).*?(?:工作流|流程|自动化)/i,
        /(?:工作流|流程|自动化).*?(?:创建|制作|设计|编辑|管理)/i,
        /(?:自动化|批量|定时).*?(?:任务|操作|流程)/i,
        /(?:节点|连接|触发器).*?(?:工作流|流程)/i,
      ],
      english: [
        /(?:help me |please |i want to |i need to )?(?:create|make|design|edit|manage).*?(?:workflow|flow|automation)/i,
        /(?:workflow|flow|automation).*?(?:creation|making|design|editing|management)/i,
        /(?:automate|batch|schedule).*?(?:task|operation|process)/i,
        /(?:node|connection|trigger).*?(?:workflow|flow)/i,
      ],
    },
    keywords: {
      chinese: ['工作流', '自动化', '流程', '节点', '触发器', '自动任务'],
      english: ['workflow', 'automation', 'flow', 'node', 'trigger', 'automated task'],
    },
    priority: 80,
    enabled: true,
    carryContext: true,
  },

  // ============================================
  // Management Features
  // ============================================
  {
    id: 'skills',
    name: 'Skills',
    nameZh: '技能管理',
    path: '/skills',
    icon: 'Sparkles',
    category: 'management',
    description: 'Manage AI skills and capabilities',
    descriptionZh: '管理AI技能和能力',
    patterns: {
      chinese: [
        /(?:帮我|请|我想|我要|我需要)?(?:管理|查看|创建|编辑).*?(?:技能|skill|能力)/i,
        /(?:技能|skill|能力).*?(?:管理|查看|创建|编辑|列表)/i,
        /(?:AI|人工智能).*?(?:技能|能力).*?(?:管理|配置)/i,
      ],
      english: [
        /(?:help me |please |i want to |i need to )?(?:manage|view|create|edit).*?(?:skill|skills|capability)/i,
        /(?:skill|skills|capability).*?(?:management|viewing|creation|editing|list)/i,
        /(?:ai|artificial intelligence).*?(?:skill|capability).*?(?:management|configuration)/i,
      ],
    },
    keywords: {
      chinese: ['技能', '能力', '技能管理', 'AI技能'],
      english: ['skill', 'skills', 'capability', 'skill management', 'ai skills'],
    },
    priority: 70,
    enabled: true,
    carryContext: false,
  },

  {
    id: 'projects',
    name: 'Projects',
    nameZh: '项目管理',
    path: '/projects',
    icon: 'FolderKanban',
    category: 'management',
    description: 'Manage projects and workspaces',
    descriptionZh: '管理项目和工作区',
    patterns: {
      chinese: [
        /(?:帮我|请|我想|我要|我需要)?(?:管理|查看|创建|打开).*?(?:项目|工程|workspace)/i,
        /(?:项目|工程|workspace).*?(?:管理|查看|创建|列表)/i,
        /(?:打开|切换).*?(?:项目|工程)/i,
      ],
      english: [
        /(?:help me |please |i want to |i need to )?(?:manage|view|create|open).*?(?:project|projects|workspace)/i,
        /(?:project|projects|workspace).*?(?:management|viewing|creation|list)/i,
        /(?:open|switch).*?(?:project|workspace)/i,
      ],
    },
    keywords: {
      chinese: ['项目', '工程', '项目管理', '工作区'],
      english: ['project', 'projects', 'workspace', 'project management'],
    },
    priority: 70,
    enabled: true,
    carryContext: false,
  },

  // ============================================
  // System Features
  // ============================================
  {
    id: 'settings',
    name: 'Settings',
    nameZh: '设置',
    path: '/settings',
    icon: 'Settings',
    category: 'system',
    description: 'Application settings and preferences',
    descriptionZh: '应用设置和偏好',
    patterns: {
      chinese: [
        /(?:打开|进入|去|查看).*?(?:设置|配置|偏好)/i,
        /(?:设置|配置|偏好).*?(?:页面|界面)/i,
        /(?:修改|更改|调整).*?(?:设置|配置)/i,
        /(?:API|密钥|key).*?(?:设置|配置)/i,
      ],
      english: [
        /(?:open|go to|view).*?(?:settings|preferences|configuration)/i,
        /(?:settings|preferences|configuration).*?(?:page|panel)/i,
        /(?:modify|change|adjust).*?(?:settings|preferences)/i,
        /(?:api|key).*?(?:settings|configuration)/i,
      ],
    },
    keywords: {
      chinese: ['设置', '配置', '偏好', '选项'],
      english: ['settings', 'preferences', 'configuration', 'options'],
    },
    priority: 60,
    enabled: true,
    carryContext: false,
  },

  {
    id: 'native-tools',
    name: 'Native Tools',
    nameZh: '原生工具',
    path: '/native-tools',
    icon: 'Wrench',
    category: 'system',
    description: 'Native system tools and utilities',
    descriptionZh: '原生系统工具和实用程序',
    patterns: {
      chinese: [
        /(?:打开|使用|查看).*?(?:原生工具|系统工具|本地工具)/i,
        /(?:截图|剪贴板|屏幕).*?(?:工具|功能)/i,
      ],
      english: [
        /(?:open|use|view).*?(?:native tools|system tools|local tools)/i,
        /(?:screenshot|clipboard|screen).*?(?:tool|feature)/i,
      ],
    },
    keywords: {
      chinese: ['原生工具', '系统工具', '截图', '剪贴板'],
      english: ['native tools', 'system tools', 'screenshot', 'clipboard'],
    },
    priority: 50,
    enabled: true,
    carryContext: false,
  },

  // ============================================
  // Development Features
  // ============================================
  {
    id: 'git',
    name: 'Git',
    nameZh: 'Git管理',
    path: '/git',
    icon: 'GitBranch',
    category: 'development',
    description: 'Git repository management',
    descriptionZh: 'Git仓库管理',
    patterns: {
      chinese: [
        /(?:打开|查看|管理).*?(?:Git|git|仓库|代码库)/i,
        /(?:Git|git).*?(?:管理|操作|提交|推送)/i,
        /(?:版本|分支|提交).*?(?:管理|控制)/i,
      ],
      english: [
        /(?:open|view|manage).*?(?:git|repository|repo)/i,
        /(?:git).*?(?:management|operation|commit|push)/i,
        /(?:version|branch|commit).*?(?:management|control)/i,
      ],
    },
    keywords: {
      chinese: ['Git', 'git', '仓库', '版本控制', '分支', '提交'],
      english: ['git', 'repository', 'repo', 'version control', 'branch', 'commit'],
    },
    priority: 65,
    enabled: true,
    carryContext: false,
  },

  {
    id: 'observability',
    name: 'Observability',
    nameZh: '可观测性',
    path: '/observability',
    icon: 'Activity',
    category: 'development',
    description: 'Agent execution monitoring and debugging',
    descriptionZh: 'Agent执行监控和调试',
    patterns: {
      chinese: [
        /(?:打开|查看).*?(?:可观测性|监控|调试|日志)/i,
        /(?:Agent|代理).*?(?:执行|监控|调试|日志)/i,
        /(?:执行|运行).*?(?:历史|记录|日志)/i,
      ],
      english: [
        /(?:open|view).*?(?:observability|monitoring|debugging|logs)/i,
        /(?:agent).*?(?:execution|monitoring|debugging|logs)/i,
        /(?:execution|run).*?(?:history|record|logs)/i,
      ],
    },
    keywords: {
      chinese: ['可观测性', '监控', '调试', '日志', 'Agent执行'],
      english: ['observability', 'monitoring', 'debugging', 'logs', 'agent execution'],
    },
    priority: 55,
    enabled: true,
    carryContext: false,
  },

  // ============================================
  // Chat (Default/Fallback)
  // ============================================
  {
    id: 'chat',
    name: 'Chat',
    nameZh: '对话',
    path: '/',
    icon: 'MessageSquare',
    category: 'chat',
    description: 'Continue conversation in chat',
    descriptionZh: '在聊天中继续对话',
    patterns: {
      chinese: [],
      english: [],
    },
    keywords: {
      chinese: [],
      english: [],
    },
    priority: 0,
    enabled: true,
    carryContext: false,
  },
];

/**
 * Get feature route by ID
 */
export function getFeatureRouteById(id: FeatureId): FeatureRoute | undefined {
  return FEATURE_ROUTES.find(route => route.id === id);
}

/**
 * Get all enabled feature routes
 */
export function getEnabledFeatureRoutes(disabledRoutes: FeatureId[] = []): FeatureRoute[] {
  return FEATURE_ROUTES.filter(
    route => route.enabled && !disabledRoutes.includes(route.id) && route.id !== 'chat'
  );
}

/**
 * Get feature routes by category
 */
export function getFeatureRoutesByCategory(category: FeatureRoute['category']): FeatureRoute[] {
  return FEATURE_ROUTES.filter(route => route.category === category && route.enabled);
}

/**
 * Get all creation features (most commonly used for routing)
 */
export function getCreationFeatures(): FeatureRoute[] {
  return getFeatureRoutesByCategory('creation');
}
