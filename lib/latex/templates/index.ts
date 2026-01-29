/**
 * LaTeX Templates Library
 * Provides pre-built templates for various academic document types
 */

import type { LaTeXTemplate, LaTeXTemplateCategory } from '@/types/latex';

// ============================================================================
// Article Templates
// ============================================================================

export const ARTICLE_TEMPLATES: LaTeXTemplate[] = [
  {
    id: 'article-basic',
    name: 'Basic Article',
    description: 'A simple article template with standard sections',
    category: 'article',
    packages: ['amsmath', 'graphicx', 'hyperref'],
    content: `\\documentclass[12pt]{article}

\\usepackage{amsmath}
\\usepackage{graphicx}
\\usepackage{hyperref}

\\title{Your Title Here}
\\author{Your Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\begin{abstract}
Your abstract goes here. This should be a brief summary of your paper.
\\end{abstract}

\\section{Introduction}
Your introduction goes here.

\\section{Methods}
Describe your methods here.

\\section{Results}
Present your results here.

\\section{Discussion}
Discuss your findings here.

\\section{Conclusion}
Your conclusions go here.

\\bibliographystyle{plain}
\\bibliography{references}

\\end{document}`,
    tags: ['basic', 'simple', 'starter'],
  },
  {
    id: 'article-ieee',
    name: 'IEEE Conference Paper',
    description: 'Template following IEEE conference paper format',
    category: 'article',
    packages: ['IEEEtran', 'amsmath', 'graphicx', 'cite'],
    content: `\\documentclass[conference]{IEEEtran}

\\usepackage{amsmath}
\\usepackage{graphicx}
\\usepackage{cite}

\\begin{document}

\\title{Your Paper Title}

\\author{
\\IEEEauthorblockN{First Author}
\\IEEEauthorblockA{Department Name\\\\
University Name\\\\
City, Country\\\\
email@example.com}
\\and
\\IEEEauthorblockN{Second Author}
\\IEEEauthorblockA{Department Name\\\\
University Name\\\\
City, Country\\\\
email@example.com}
}

\\maketitle

\\begin{abstract}
This is the abstract of your paper. Keep it concise and informative.
\\end{abstract}

\\begin{IEEEkeywords}
keyword1, keyword2, keyword3
\\end{IEEEkeywords}

\\section{Introduction}
Your introduction goes here.

\\section{Related Work}
Discuss related work here.

\\section{Methodology}
Describe your methodology here.

\\section{Experiments}
Present your experimental setup and results.

\\section{Conclusion}
Your conclusions go here.

\\bibliographystyle{IEEEtran}
\\bibliography{references}

\\end{document}`,
    tags: ['ieee', 'conference', 'formal'],
  },
  {
    id: 'article-acm',
    name: 'ACM Conference Paper',
    description: 'Template following ACM conference paper format',
    category: 'article',
    packages: ['acmart', 'graphicx', 'booktabs'],
    content: `\\documentclass[sigconf]{acmart}

\\begin{document}

\\title{Your Paper Title}

\\author{First Author}
\\email{first@example.com}
\\affiliation{
\\institution{University Name}
\\city{City}
\\country{Country}
}

\\author{Second Author}
\\email{second@example.com}
\\affiliation{
\\institution{University Name}
\\city{City}
\\country{Country}
}

\\begin{abstract}
Your abstract goes here.
\\end{abstract}

\\begin{CCSXML}
<ccs2012>
<concept>
<concept_id>10010147.10010178</concept_id>
<concept_desc>Computing methodologies~Machine learning</concept_desc>
<concept_significance>500</concept_significance>
</concept>
</ccs2012>
\\end{CCSXML}

\\ccsdesc[500]{Computing methodologies~Machine learning}

\\keywords{keyword1, keyword2, keyword3}

\\maketitle

\\section{Introduction}
Your introduction goes here.

\\section{Background}
Background information goes here.

\\section{Approach}
Describe your approach here.

\\section{Evaluation}
Present your evaluation here.

\\section{Conclusion}
Your conclusions go here.

\\bibliographystyle{ACM-Reference-Format}
\\bibliography{references}

\\end{document}`,
    tags: ['acm', 'conference', 'computing'],
  },
];

// ============================================================================
// Report Templates
// ============================================================================

export const REPORT_TEMPLATES: LaTeXTemplate[] = [
  {
    id: 'report-basic',
    name: 'Basic Report',
    description: 'A simple report template with chapters',
    category: 'report',
    packages: ['amsmath', 'graphicx', 'hyperref'],
    content: `\\documentclass[12pt]{report}

\\usepackage{amsmath}
\\usepackage{graphicx}
\\usepackage{hyperref}

\\title{Report Title}
\\author{Your Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\tableofcontents

\\chapter{Introduction}
Your introduction goes here.

\\chapter{Literature Review}
Your literature review goes here.

\\chapter{Methodology}
Describe your methodology here.

\\chapter{Results}
Present your results here.

\\chapter{Discussion}
Discuss your findings here.

\\chapter{Conclusion}
Your conclusions go here.

\\appendix
\\chapter{Additional Materials}
Any appendices go here.

\\bibliographystyle{plain}
\\bibliography{references}

\\end{document}`,
    tags: ['report', 'chapters', 'formal'],
  },
  {
    id: 'report-technical',
    name: 'Technical Report',
    description: 'Technical report with code listings and figures',
    category: 'report',
    packages: ['amsmath', 'graphicx', 'listings', 'xcolor', 'hyperref'],
    content: `\\documentclass[11pt]{report}

\\usepackage{amsmath}
\\usepackage{graphicx}
\\usepackage{listings}
\\usepackage{xcolor}
\\usepackage{hyperref}

\\lstset{
  basicstyle=\\ttfamily\\small,
  keywordstyle=\\color{blue},
  commentstyle=\\color{green!50!black},
  stringstyle=\\color{red},
  numbers=left,
  numberstyle=\\tiny,
  frame=single,
  breaklines=true
}

\\title{Technical Report Title}
\\author{Your Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\begin{abstract}
Executive summary of the technical report.
\\end{abstract}

\\tableofcontents
\\listoffigures
\\listoftables

\\chapter{Introduction}
\\section{Background}
Background information.

\\section{Objectives}
Project objectives.

\\chapter{Technical Approach}
\\section{Architecture}
System architecture description.

\\section{Implementation}
Implementation details.

\\begin{lstlisting}[language=Python, caption=Example Code]
def example_function():
    pass
\\end{lstlisting}

\\chapter{Results}
\\section{Performance Analysis}
Performance metrics and analysis.

\\chapter{Conclusion}
Summary and future work.

\\bibliographystyle{plain}
\\bibliography{references}

\\end{document}`,
    tags: ['technical', 'code', 'engineering'],
  },
];

// ============================================================================
// Thesis Templates
// ============================================================================

export const THESIS_TEMPLATES: LaTeXTemplate[] = [
  {
    id: 'thesis-basic',
    name: 'Basic Thesis',
    description: 'A comprehensive thesis template',
    category: 'thesis',
    packages: ['amsmath', 'amssymb', 'graphicx', 'hyperref', 'setspace', 'geometry'],
    content: `\\documentclass[12pt,oneside]{book}

\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{setspace}
\\usepackage[margin=1in]{geometry}

\\doublespacing

\\begin{document}

\\frontmatter

% Title Page
\\begin{titlepage}
\\centering
\\vspace*{2cm}
{\\LARGE\\bfseries Thesis Title\\par}
\\vspace{2cm}
{\\Large Your Name\\par}
\\vspace{1cm}
{\\large A thesis submitted in partial fulfillment\\\\
of the requirements for the degree of\\\\
Doctor of Philosophy\\par}
\\vspace{2cm}
{\\large Department of Your Department\\\\
University Name\\par}
\\vspace{1cm}
{\\large \\today\\par}
\\end{titlepage}

% Abstract
\\chapter*{Abstract}
\\addcontentsline{toc}{chapter}{Abstract}
Your abstract goes here.

% Acknowledgments
\\chapter*{Acknowledgments}
\\addcontentsline{toc}{chapter}{Acknowledgments}
Your acknowledgments go here.

\\tableofcontents
\\listoffigures
\\listoftables

\\mainmatter

\\chapter{Introduction}
\\section{Motivation}
\\section{Problem Statement}
\\section{Contributions}
\\section{Thesis Organization}

\\chapter{Literature Review}
\\section{Background}
\\section{Related Work}

\\chapter{Methodology}
\\section{Approach}
\\section{Implementation}

\\chapter{Experiments and Results}
\\section{Experimental Setup}
\\section{Results}
\\section{Analysis}

\\chapter{Discussion}
\\section{Implications}
\\section{Limitations}

\\chapter{Conclusion}
\\section{Summary}
\\section{Future Work}

\\backmatter

\\bibliographystyle{plain}
\\bibliography{references}

\\appendix
\\chapter{Supplementary Materials}

\\end{document}`,
    tags: ['thesis', 'phd', 'dissertation', 'academic'],
  },
];

// ============================================================================
// Presentation Templates
// ============================================================================

export const PRESENTATION_TEMPLATES: LaTeXTemplate[] = [
  {
    id: 'beamer-basic',
    name: 'Basic Beamer Presentation',
    description: 'Simple presentation using Beamer',
    category: 'presentation',
    packages: ['beamer', 'graphicx', 'amsmath'],
    content: `\\documentclass{beamer}

\\usetheme{Madrid}
\\usecolortheme{default}

\\title{Presentation Title}
\\author{Your Name}
\\institute{Your Institution}
\\date{\\today}

\\begin{document}

\\begin{frame}
\\titlepage
\\end{frame}

\\begin{frame}{Outline}
\\tableofcontents
\\end{frame}

\\section{Introduction}

\\begin{frame}{Introduction}
\\begin{itemize}
  \\item First point
  \\item Second point
  \\item Third point
\\end{itemize}
\\end{frame}

\\section{Main Content}

\\begin{frame}{Main Content}
\\begin{block}{Important Concept}
Explanation of the concept.
\\end{block}

\\begin{alertblock}{Warning}
Something to be careful about.
\\end{alertblock}

\\begin{exampleblock}{Example}
An example of the concept.
\\end{exampleblock}
\\end{frame}

\\begin{frame}{Equations}
The famous equation:
\\begin{equation}
E = mc^2
\\end{equation}
\\end{frame}

\\section{Conclusion}

\\begin{frame}{Conclusion}
\\begin{itemize}
  \\item Summary point 1
  \\item Summary point 2
  \\item Future work
\\end{itemize}
\\end{frame}

\\begin{frame}{Questions?}
\\centering
\\Large Thank you for your attention!

\\vspace{1cm}
Contact: email@example.com
\\end{frame}

\\end{document}`,
    tags: ['beamer', 'slides', 'presentation'],
  },
];

// ============================================================================
// Math Templates
// ============================================================================

export const MATH_TEMPLATES: LaTeXTemplate[] = [
  {
    id: 'homework',
    name: 'Homework Assignment',
    description: 'Template for math homework with problem/solution format',
    category: 'homework',
    packages: ['amsmath', 'amssymb', 'amsthm', 'enumitem'],
    content: `\\documentclass[11pt]{article}

\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{amsthm}
\\usepackage{enumitem}
\\usepackage[margin=1in]{geometry}

\\newtheorem{problem}{Problem}
\\newenvironment{solution}{\\begin{proof}[Solution]}{\\end{proof}}

\\title{Homework Assignment \\#1}
\\author{Your Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\begin{problem}
Prove that $\\sqrt{2}$ is irrational.
\\end{problem}

\\begin{solution}
Assume for contradiction that $\\sqrt{2}$ is rational. Then there exist integers $p$ and $q$ with $q \\neq 0$ such that $\\sqrt{2} = \\frac{p}{q}$, where $\\gcd(p, q) = 1$.

Squaring both sides: $2 = \\frac{p^2}{q^2}$, so $p^2 = 2q^2$.

This means $p^2$ is even, so $p$ must be even. Let $p = 2k$ for some integer $k$.

Then $(2k)^2 = 2q^2$, which gives $4k^2 = 2q^2$, so $q^2 = 2k^2$.

This means $q^2$ is even, so $q$ must be even.

But if both $p$ and $q$ are even, then $\\gcd(p, q) \\geq 2$, contradicting our assumption.

Therefore, $\\sqrt{2}$ is irrational.
\\end{solution}

\\begin{problem}
Calculate $\\int_0^1 x^2 \\, dx$.
\\end{problem}

\\begin{solution}
\\begin{align*}
\\int_0^1 x^2 \\, dx &= \\left[ \\frac{x^3}{3} \\right]_0^1 \\\\
&= \\frac{1^3}{3} - \\frac{0^3}{3} \\\\
&= \\frac{1}{3}
\\end{align*}
\\end{solution}

\\end{document}`,
    tags: ['homework', 'math', 'problems', 'solutions'],
  },
  {
    id: 'exam',
    name: 'Exam Template',
    description: 'Template for creating exams',
    category: 'exam',
    packages: ['amsmath', 'amssymb', 'enumitem'],
    content: `\\documentclass[11pt]{exam}

\\usepackage{amsmath}
\\usepackage{amssymb}

\\pagestyle{headandfoot}
\\firstpageheader{Course Name}{Exam 1}{\\today}
\\runningheader{Course Name}{Exam 1}{Page \\thepage}
\\firstpagefooter{}{}{}
\\runningfooter{}{}{}

\\begin{document}

\\begin{center}
\\fbox{\\fbox{\\parbox{5.5in}{\\centering
Answer the questions in the spaces provided. If you need more space, use the back of the page.}}}
\\end{center}

\\vspace{0.1in}

\\makebox[\\textwidth]{Name:\\enspace\\hrulefill}

\\vspace{0.2in}

\\begin{questions}

\\question[10] Solve for $x$: $2x + 5 = 17$
\\vspace{2in}

\\question[15] Find the derivative of $f(x) = x^3 + 2x^2 - x + 1$.
\\vspace{2in}

\\question[20] Prove that the sum of the first $n$ positive integers is $\\frac{n(n+1)}{2}$.
\\vspace{3in}

\\question[25] Evaluate the integral $\\int_0^{\\pi} \\sin(x) \\, dx$.
\\vspace{2in}

\\end{questions}

\\end{document}`,
    tags: ['exam', 'test', 'assessment'],
  },
];

// ============================================================================
// Letter Templates
// ============================================================================

export const LETTER_TEMPLATES: LaTeXTemplate[] = [
  {
    id: 'letter-formal',
    name: 'Formal Letter',
    description: 'Professional formal letter template',
    category: 'letter',
    packages: [],
    content: `\\documentclass[12pt]{letter}

\\usepackage[margin=1in]{geometry}

\\signature{Your Name}
\\address{Your Address\\\\City, State ZIP}

\\begin{document}

\\begin{letter}{Recipient Name\\\\Recipient Address\\\\City, State ZIP}

\\opening{Dear Sir or Madam,}

I am writing to express my interest in...

[Body of the letter goes here. You can add multiple paragraphs.]

Thank you for your consideration.

\\closing{Sincerely,}

\\end{letter}

\\end{document}`,
    tags: ['letter', 'formal', 'business'],
  },
];

// ============================================================================
// CV Templates
// ============================================================================

export const CV_TEMPLATES: LaTeXTemplate[] = [
  {
    id: 'cv-academic',
    name: 'Academic CV',
    description: 'Curriculum Vitae for academic positions',
    category: 'cv',
    packages: ['geometry', 'enumitem', 'hyperref'],
    content: `\\documentclass[11pt]{article}

\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{hyperref}

\\setlist[itemize]{nosep, leftmargin=*}

\\begin{document}

\\begin{center}
{\\LARGE\\bfseries Your Name}

\\vspace{0.2cm}
Address Line 1 $\\bullet$ City, State ZIP \\\\
Phone: (123) 456-7890 $\\bullet$ Email: email@example.com \\\\
Website: \\url{https://yourwebsite.com}
\\end{center}

\\section*{Education}
\\textbf{Ph.D. in Your Field} \\hfill Expected May 2025 \\\\
University Name, City, State \\\\
Dissertation: \`\`Your Dissertation Title'' \\\\
Advisor: Prof. Advisor Name

\\textbf{M.S. in Your Field} \\hfill May 2021 \\\\
University Name, City, State

\\textbf{B.S. in Your Field} \\hfill May 2019 \\\\
University Name, City, State

\\section*{Research Interests}
Area 1, Area 2, Area 3

\\section*{Publications}
\\begin{enumerate}
\\item \\textbf{Your Name}, Co-Author. \`\`Paper Title.'' \\textit{Journal Name}, Vol. X, No. Y, Year.
\\item Co-Author, \\textbf{Your Name}. \`\`Another Paper Title.'' In \\textit{Conference Proceedings}, Year.
\\end{enumerate}

\\section*{Teaching Experience}
\\textbf{Teaching Assistant} \\hfill Fall 2022 -- Present \\\\
Course Name, University Name

\\section*{Awards and Honors}
\\begin{itemize}
\\item Award Name, Organization, Year
\\item Fellowship Name, Organization, Year
\\end{itemize}

\\section*{Skills}
\\textbf{Programming:} Python, R, MATLAB \\\\
\\textbf{Tools:} LaTeX, Git, Linux

\\end{document}`,
    tags: ['cv', 'resume', 'academic', 'career'],
  },
];

// ============================================================================
// All Templates Combined
// ============================================================================

export const ALL_TEMPLATES: LaTeXTemplate[] = [
  ...ARTICLE_TEMPLATES,
  ...REPORT_TEMPLATES,
  ...THESIS_TEMPLATES,
  ...PRESENTATION_TEMPLATES,
  ...MATH_TEMPLATES,
  ...LETTER_TEMPLATES,
  ...CV_TEMPLATES,
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: LaTeXTemplateCategory): LaTeXTemplate[] {
  return ALL_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Search templates by name, description, or tags
 */
export function searchTemplates(query: string): LaTeXTemplate[] {
  const lowerQuery = query.toLowerCase();
  return ALL_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): LaTeXTemplate | undefined {
  return ALL_TEMPLATES.find((t) => t.id === id);
}

/**
 * Get all template categories with counts
 */
export function getTemplateCategories(): { category: LaTeXTemplateCategory; count: number }[] {
  const categories = new Map<LaTeXTemplateCategory, number>();

  for (const template of ALL_TEMPLATES) {
    const count = categories.get(template.category) || 0;
    categories.set(template.category, count + 1);
  }

  return Array.from(categories.entries()).map(([category, count]) => ({
    category,
    count,
  }));
}

/**
 * Create a document from a template with custom values
 */
export function createDocumentFromTemplate(
  template: LaTeXTemplate,
  replacements: Record<string, string>
): string {
  let content = template.content;

  for (const [key, value] of Object.entries(replacements)) {
    content = content.replace(new RegExp(key, 'g'), value);
  }

  return content;
}

const templatesApi = {
  ALL_TEMPLATES,
  ARTICLE_TEMPLATES,
  REPORT_TEMPLATES,
  THESIS_TEMPLATES,
  PRESENTATION_TEMPLATES,
  MATH_TEMPLATES,
  LETTER_TEMPLATES,
  CV_TEMPLATES,
  getTemplatesByCategory,
  searchTemplates,
  getTemplateById,
  getTemplateCategories,
  createDocumentFromTemplate,
};

export default templatesApi;
