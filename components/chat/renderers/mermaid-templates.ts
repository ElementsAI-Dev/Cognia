/**
 * Mermaid Diagram Templates
 * Pre-built templates for common diagram types
 */

export interface MermaidTemplate {
  id: string;
  name: string;
  description: string;
  category: 'flowchart' | 'sequence' | 'class' | 'state' | 'er' | 'gantt' | 'pie' | 'mindmap' | 'timeline' | 'git';
  code: string;
}

export const MERMAID_TEMPLATES: MermaidTemplate[] = [
  // Flowcharts
  {
    id: 'flowchart-basic',
    name: 'Basic Flowchart',
    description: 'Simple top-to-bottom flowchart',
    category: 'flowchart',
    code: `flowchart TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
    C --> E[End]`,
  },
  {
    id: 'flowchart-lr',
    name: 'Left-to-Right Flowchart',
    description: 'Horizontal flowchart layout',
    category: 'flowchart',
    code: `flowchart LR
    A[Input] --> B[Process]
    B --> C[Output]
    B --> D[Log]
    C --> E{Valid?}
    E -->|Yes| F[Success]
    E -->|No| G[Error]`,
  },
  {
    id: 'flowchart-subgraphs',
    name: 'Flowchart with Subgraphs',
    description: 'Grouped sections in flowchart',
    category: 'flowchart',
    code: `flowchart TB
    subgraph Frontend
        A[React App] --> B[Components]
        B --> C[State Management]
    end
    subgraph Backend
        D[API Server] --> E[Database]
        D --> F[Cache]
    end
    C --> D`,
  },

  // Sequence Diagrams
  {
    id: 'sequence-basic',
    name: 'Basic Sequence',
    description: 'Simple sequence diagram',
    category: 'sequence',
    code: `sequenceDiagram
    participant User
    participant App
    participant Server
    
    User->>App: Click button
    App->>Server: API request
    Server-->>App: Response
    App-->>User: Update UI`,
  },
  {
    id: 'sequence-auth',
    name: 'Authentication Flow',
    description: 'OAuth-style authentication',
    category: 'sequence',
    code: `sequenceDiagram
    participant U as User
    participant C as Client
    participant A as Auth Server
    participant R as Resource Server
    
    U->>C: Login request
    C->>A: Authorization request
    A-->>U: Login page
    U->>A: Credentials
    A-->>C: Authorization code
    C->>A: Exchange code for token
    A-->>C: Access token
    C->>R: API request + token
    R-->>C: Protected resource`,
  },

  // Class Diagrams
  {
    id: 'class-basic',
    name: 'Basic Class Diagram',
    description: 'Simple class relationships',
    category: 'class',
    code: `classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }
    class Dog {
        +String breed
        +bark()
    }
    class Cat {
        +String color
        +meow()
    }
    Animal <|-- Dog
    Animal <|-- Cat`,
  },
  {
    id: 'class-relationships',
    name: 'Class Relationships',
    description: 'Various UML relationships',
    category: 'class',
    code: `classDiagram
    class Order {
        +int orderId
        +Date orderDate
        +calculateTotal()
    }
    class Customer {
        +String name
        +String email
        +placeOrder()
    }
    class Product {
        +String name
        +float price
    }
    class OrderItem {
        +int quantity
    }
    
    Customer "1" --> "*" Order : places
    Order "1" *-- "*" OrderItem : contains
    OrderItem "*" --> "1" Product : references`,
  },

  // State Diagrams
  {
    id: 'state-basic',
    name: 'Basic State Machine',
    description: 'Simple state transitions',
    category: 'state',
    code: `stateDiagram-v2
    [*] --> Idle
    Idle --> Loading : fetch
    Loading --> Success : resolve
    Loading --> Error : reject
    Success --> Idle : reset
    Error --> Loading : retry
    Error --> Idle : dismiss`,
  },
  {
    id: 'state-nested',
    name: 'Nested States',
    description: 'State machine with substates',
    category: 'state',
    code: `stateDiagram-v2
    [*] --> Active
    
    state Active {
        [*] --> Running
        Running --> Paused : pause
        Paused --> Running : resume
    }
    
    Active --> Stopped : stop
    Stopped --> Active : start
    Stopped --> [*]`,
  },

  // ER Diagrams
  {
    id: 'er-basic',
    name: 'Basic ER Diagram',
    description: 'Entity relationship diagram',
    category: 'er',
    code: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    PRODUCT ||--o{ LINE-ITEM : "ordered in"
    
    CUSTOMER {
        int id PK
        string name
        string email
    }
    ORDER {
        int id PK
        date created
        string status
    }
    PRODUCT {
        int id PK
        string name
        float price
    }`,
  },

  // Gantt Charts
  {
    id: 'gantt-basic',
    name: 'Project Timeline',
    description: 'Basic Gantt chart',
    category: 'gantt',
    code: `gantt
    title Project Schedule
    dateFormat YYYY-MM-DD
    
    section Planning
    Requirements     :a1, 2024-01-01, 7d
    Design           :a2, after a1, 5d
    
    section Development
    Frontend         :b1, after a2, 14d
    Backend          :b2, after a2, 14d
    Integration      :b3, after b1, 7d
    
    section Testing
    QA Testing       :c1, after b3, 7d
    Bug Fixes        :c2, after c1, 5d`,
  },

  // Pie Charts
  {
    id: 'pie-basic',
    name: 'Pie Chart',
    description: 'Simple pie chart',
    category: 'pie',
    code: `pie showData
    title Browser Market Share
    "Chrome" : 65
    "Safari" : 19
    "Firefox" : 8
    "Edge" : 5
    "Other" : 3`,
  },

  // Mind Maps
  {
    id: 'mindmap-basic',
    name: 'Mind Map',
    description: 'Hierarchical mind map',
    category: 'mindmap',
    code: `mindmap
  root((Project))
    Planning
      Goals
      Timeline
      Resources
    Development
      Frontend
        React
        TypeScript
      Backend
        Node.js
        Database
    Testing
      Unit Tests
      Integration
      E2E`,
  },

  // Timeline
  {
    id: 'timeline-basic',
    name: 'Timeline',
    description: 'Event timeline',
    category: 'timeline',
    code: `timeline
    title Project Milestones
    2024-Q1 : Planning Phase
            : Requirements gathered
            : Design approved
    2024-Q2 : Development Phase
            : Core features built
            : API completed
    2024-Q3 : Testing Phase
            : QA testing
            : Bug fixes
    2024-Q4 : Launch
            : Production release
            : Marketing campaign`,
  },

  // Git Graph
  {
    id: 'git-basic',
    name: 'Git Branching',
    description: 'Git branch visualization',
    category: 'git',
    code: `gitGraph
    commit id: "Initial"
    branch develop
    checkout develop
    commit id: "Feature A"
    commit id: "Feature B"
    checkout main
    merge develop id: "v1.0"
    branch hotfix
    checkout hotfix
    commit id: "Fix bug"
    checkout main
    merge hotfix id: "v1.0.1"`,
  },
];

export const TEMPLATE_CATEGORIES = [
  { id: 'flowchart', name: 'Flowcharts' },
  { id: 'sequence', name: 'Sequence Diagrams' },
  { id: 'class', name: 'Class Diagrams' },
  { id: 'state', name: 'State Diagrams' },
  { id: 'er', name: 'ER Diagrams' },
  { id: 'gantt', name: 'Gantt Charts' },
  { id: 'pie', name: 'Pie Charts' },
  { id: 'mindmap', name: 'Mind Maps' },
  { id: 'timeline', name: 'Timelines' },
  { id: 'git', name: 'Git Graphs' },
] as const;

export function getTemplatesByCategory(category: MermaidTemplate['category']): MermaidTemplate[] {
  return MERMAID_TEMPLATES.filter((t) => t.category === category);
}
