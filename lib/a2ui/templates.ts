/**
 * A2UI App Templates
 * Predefined templates for quickly creating small applications
 */

import type { A2UIComponent, A2UIServerMessage } from '@/types/artifact/a2ui';

/**
 * App template definition
 */
export interface A2UIAppTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'productivity' | 'data' | 'form' | 'utility' | 'social';
  components: A2UIComponent[];
  dataModel: Record<string, unknown>;
  tags: string[];
}

/**
 * Generate unique IDs for template instances
 */
let templateInstanceCounter = 0;
export function generateTemplateId(prefix: string = 'app'): string {
  return `${prefix}-${Date.now()}-${++templateInstanceCounter}`;
}

/**
 * Todo List App Template
 */
export const todoListTemplate: A2UIAppTemplate = {
  id: 'todo-list',
  name: 'Todo List',
  description: 'A simple task management app with add, complete, and delete functionality',
  icon: 'CheckSquare',
  category: 'productivity',
  tags: ['tasks', 'productivity', 'list'],
  components: [
    {
      id: 'root',
      component: 'Column',
      children: ['header', 'input-row', 'task-list', 'stats'],
      className: 'gap-4 p-4',
    },
    {
      id: 'header',
      component: 'Text',
      text: '📝 My Tasks',
      variant: 'heading2',
    },
    {
      id: 'input-row',
      component: 'Row',
      children: ['task-input', 'add-btn'],
      className: 'gap-2',
    },
    {
      id: 'task-input',
      component: 'TextField',
      value: { path: '/newTask' },
      placeholder: 'Enter a new task...',
      className: 'flex-1',
    },
    {
      id: 'add-btn',
      component: 'Button',
      text: 'Add',
      action: 'add_task',
      variant: 'primary',
      icon: 'Plus',
    },
    {
      id: 'task-list',
      component: 'List',
      items: { path: '/tasks' },
      emptyText: 'No tasks yet. Add one above!',
      itemClickAction: 'toggle_task',
      dividers: true,
    },
    {
      id: 'stats',
      component: 'Row',
      children: ['completed-badge', 'pending-badge'],
      className: 'gap-2 justify-center',
    },
    {
      id: 'completed-badge',
      component: 'Badge',
      text: { path: '/stats/completedText' },
      variant: 'secondary',
    },
    {
      id: 'pending-badge',
      component: 'Badge',
      text: { path: '/stats/pendingText' },
      variant: 'outline',
    },
  ] as A2UIComponent[],
  dataModel: {
    newTask: '',
    tasks: [],
    stats: {
      completed: 0,
      pending: 0,
      completedText: '0 completed',
      pendingText: '0 pending',
    },
  },
};

/**
 * Calculator App Template
 */
export const calculatorTemplate: A2UIAppTemplate = {
  id: 'calculator',
  name: 'Calculator',
  description: 'A basic calculator for arithmetic operations',
  icon: 'Calculator',
  category: 'utility',
  tags: ['math', 'calculator', 'utility'],
  components: [
    {
      id: 'root',
      component: 'Column',
      children: ['display', 'buttons'],
      className: 'gap-2 p-4 max-w-xs',
    },
    {
      id: 'display',
      component: 'Card',
      children: ['display-text'],
      className: 'bg-muted',
    },
    {
      id: 'display-text',
      component: 'Text',
      text: { path: '/display' },
      variant: 'heading2',
      align: 'right',
      className: 'font-mono p-2',
    },
    {
      id: 'buttons',
      component: 'Column',
      children: ['row1', 'row2', 'row3', 'row4', 'row5'],
      className: 'gap-1',
    },
    {
      id: 'row1',
      component: 'Row',
      children: ['btn-clear', 'btn-backspace', 'btn-percent', 'btn-divide'],
      className: 'gap-1',
    },
    {
      id: 'row2',
      component: 'Row',
      children: ['btn-7', 'btn-8', 'btn-9', 'btn-multiply'],
      className: 'gap-1',
    },
    {
      id: 'row3',
      component: 'Row',
      children: ['btn-4', 'btn-5', 'btn-6', 'btn-subtract'],
      className: 'gap-1',
    },
    {
      id: 'row4',
      component: 'Row',
      children: ['btn-1', 'btn-2', 'btn-3', 'btn-add'],
      className: 'gap-1',
    },
    {
      id: 'row5',
      component: 'Row',
      children: ['btn-0', 'btn-decimal', 'btn-equals'],
      className: 'gap-1',
    },
    // Number buttons
    { id: 'btn-0', component: 'Button', text: '0', action: 'input_0', variant: 'outline', className: 'flex-[2]' },
    { id: 'btn-1', component: 'Button', text: '1', action: 'input_1', variant: 'outline' },
    { id: 'btn-2', component: 'Button', text: '2', action: 'input_2', variant: 'outline' },
    { id: 'btn-3', component: 'Button', text: '3', action: 'input_3', variant: 'outline' },
    { id: 'btn-4', component: 'Button', text: '4', action: 'input_4', variant: 'outline' },
    { id: 'btn-5', component: 'Button', text: '5', action: 'input_5', variant: 'outline' },
    { id: 'btn-6', component: 'Button', text: '6', action: 'input_6', variant: 'outline' },
    { id: 'btn-7', component: 'Button', text: '7', action: 'input_7', variant: 'outline' },
    { id: 'btn-8', component: 'Button', text: '8', action: 'input_8', variant: 'outline' },
    { id: 'btn-9', component: 'Button', text: '9', action: 'input_9', variant: 'outline' },
    { id: 'btn-decimal', component: 'Button', text: '.', action: 'input_decimal', variant: 'outline' },
    // Operator buttons
    { id: 'btn-add', component: 'Button', text: '+', action: 'op_add', variant: 'secondary' },
    { id: 'btn-subtract', component: 'Button', text: '-', action: 'op_subtract', variant: 'secondary' },
    { id: 'btn-multiply', component: 'Button', text: '×', action: 'op_multiply', variant: 'secondary' },
    { id: 'btn-divide', component: 'Button', text: '÷', action: 'op_divide', variant: 'secondary' },
    { id: 'btn-percent', component: 'Button', text: '%', action: 'op_percent', variant: 'secondary' },
    { id: 'btn-equals', component: 'Button', text: '=', action: 'calculate', variant: 'primary' },
    { id: 'btn-clear', component: 'Button', text: 'C', action: 'clear', variant: 'destructive' },
    { id: 'btn-backspace', component: 'Button', text: '⌫', action: 'backspace', variant: 'outline' },
  ] as A2UIComponent[],
  dataModel: {
    display: '0',
    currentValue: 0,
    previousValue: null,
    operator: null,
    waitingForOperand: false,
  },
};

/**
 * Survey/Feedback Form Template
 */
export const surveyFormTemplate: A2UIAppTemplate = {
  id: 'survey-form',
  name: 'Survey Form',
  description: 'A customizable survey or feedback collection form',
  icon: 'ClipboardList',
  category: 'form',
  tags: ['survey', 'feedback', 'form', 'questionnaire'],
  components: [
    {
      id: 'root',
      component: 'Column',
      children: ['header', 'form-card', 'submit-row'],
      className: 'gap-4 p-4 max-w-md',
    },
    {
      id: 'header',
      component: 'Column',
      children: ['title', 'description'],
      className: 'gap-1',
    },
    {
      id: 'title',
      component: 'Text',
      text: '📋 Quick Survey',
      variant: 'heading2',
    },
    {
      id: 'description',
      component: 'Text',
      text: 'Help us improve by answering a few questions',
      variant: 'caption',
      color: 'muted',
    },
    {
      id: 'form-card',
      component: 'Card',
      children: ['name-field', 'email-field', 'rating-section', 'feedback-field'],
      className: 'p-4',
    },
    {
      id: 'name-field',
      component: 'TextField',
      value: { path: '/form/name' },
      label: 'Your Name',
      placeholder: 'Enter your name',
      required: true,
    },
    {
      id: 'email-field',
      component: 'TextField',
      value: { path: '/form/email' },
      label: 'Email Address',
      placeholder: 'your@email.com',
      type: 'email',
    },
    {
      id: 'rating-section',
      component: 'Column',
      children: ['rating-label', 'rating-slider', 'rating-value'],
      className: 'gap-2 my-4',
    },
    {
      id: 'rating-label',
      component: 'Text',
      text: 'How would you rate your experience?',
      variant: 'label',
    },
    {
      id: 'rating-slider',
      component: 'Slider',
      value: { path: '/form/rating' },
      min: 1,
      max: 10,
      step: 1,
      showValue: true,
    },
    {
      id: 'rating-value',
      component: 'Text',
      text: { path: '/form/ratingText' },
      variant: 'caption',
      align: 'center',
    },
    {
      id: 'feedback-field',
      component: 'TextArea',
      value: { path: '/form/feedback' },
      label: 'Additional Feedback',
      placeholder: 'Tell us more about your experience...',
      rows: 4,
    },
    {
      id: 'submit-row',
      component: 'Row',
      children: ['clear-btn', 'submit-btn'],
      className: 'gap-2 justify-end',
    },
    {
      id: 'clear-btn',
      component: 'Button',
      text: 'Clear',
      action: 'clear_form',
      variant: 'outline',
    },
    {
      id: 'submit-btn',
      component: 'Button',
      text: 'Submit',
      action: 'submit_form',
      variant: 'primary',
      icon: 'Send',
    },
  ] as A2UIComponent[],
  dataModel: {
    form: {
      name: '',
      email: '',
      rating: 5,
      ratingText: '5/10 - Average',
      feedback: '',
    },
    submitted: false,
  },
};

/**
 * Data Dashboard Template
 */
export const dataDashboardTemplate: A2UIAppTemplate = {
  id: 'data-dashboard',
  name: 'Data Dashboard',
  description: 'A dashboard displaying charts and statistics',
  icon: 'BarChart3',
  category: 'data',
  tags: ['dashboard', 'analytics', 'charts', 'data'],
  components: [
    {
      id: 'root',
      component: 'Column',
      children: ['header', 'stats-row', 'chart-section', 'table-section'],
      className: 'gap-4 p-4',
    },
    {
      id: 'header',
      component: 'Row',
      children: ['title', 'refresh-btn'],
      className: 'justify-between items-center',
    },
    {
      id: 'title',
      component: 'Text',
      text: '📊 Analytics Dashboard',
      variant: 'heading2',
    },
    {
      id: 'refresh-btn',
      component: 'Button',
      text: 'Refresh',
      action: 'refresh_data',
      variant: 'outline',
      icon: 'RefreshCw',
    },
    {
      id: 'stats-row',
      component: 'Row',
      children: ['stat-users', 'stat-revenue', 'stat-growth'],
      className: 'gap-4',
    },
    {
      id: 'stat-users',
      component: 'Card',
      title: 'Total Users',
      children: ['users-value'],
      className: 'flex-1',
    },
    {
      id: 'users-value',
      component: 'Text',
      text: { path: '/stats/users' },
      variant: 'heading1',
      color: 'primary',
    },
    {
      id: 'stat-revenue',
      component: 'Card',
      title: 'Revenue',
      children: ['revenue-value'],
      className: 'flex-1',
    },
    {
      id: 'revenue-value',
      component: 'Text',
      text: { path: '/stats/revenue' },
      variant: 'heading1',
      color: 'primary',
    },
    {
      id: 'stat-growth',
      component: 'Card',
      title: 'Growth',
      children: ['growth-value'],
      className: 'flex-1',
    },
    {
      id: 'growth-value',
      component: 'Text',
      text: { path: '/stats/growth' },
      variant: 'heading1',
      color: 'primary',
    },
    {
      id: 'chart-section',
      component: 'Card',
      title: 'Monthly Trends',
      children: ['main-chart'],
    },
    {
      id: 'main-chart',
      component: 'Chart',
      chartType: 'area',
      data: { path: '/chartData' },
      xKey: 'month',
      yKeys: ['users', 'revenue'],
      height: 250,
      showLegend: true,
      showGrid: true,
    },
    {
      id: 'table-section',
      component: 'Card',
      title: 'Recent Activity',
      children: ['activity-table'],
    },
    {
      id: 'activity-table',
      component: 'Table',
      columns: [
        { key: 'date', header: 'Date', type: 'date' },
        { key: 'event', header: 'Event' },
        { key: 'user', header: 'User' },
        { key: 'value', header: 'Value', type: 'number', align: 'right' },
      ],
      data: { path: '/activityData' },
      pagination: true,
      pageSize: 5,
      rowClickAction: 'view_activity',
    },
  ] as A2UIComponent[],
  dataModel: {
    stats: {
      users: '12,450',
      revenue: '$45,230',
      growth: '+23%',
    },
    chartData: [
      { month: 'Jan', users: 1200, revenue: 5000 },
      { month: 'Feb', users: 1400, revenue: 6200 },
      { month: 'Mar', users: 1800, revenue: 7800 },
      { month: 'Apr', users: 2100, revenue: 8500 },
      { month: 'May', users: 2500, revenue: 9200 },
      { month: 'Jun', users: 2800, revenue: 10500 },
    ],
    activityData: [
      { id: 1, date: '2024-01-15', event: 'New signup', user: 'John Doe', value: 1 },
      { id: 2, date: '2024-01-15', event: 'Purchase', user: 'Jane Smith', value: 99 },
      { id: 3, date: '2024-01-14', event: 'Upgrade', user: 'Bob Wilson', value: 49 },
    ],
  },
};

/**
 * Timer/Stopwatch Template
 */
export const timerTemplate: A2UIAppTemplate = {
  id: 'timer',
  name: 'Timer',
  description: 'A countdown timer and stopwatch app',
  icon: 'Timer',
  category: 'utility',
  tags: ['timer', 'stopwatch', 'countdown', 'time'],
  components: [
    {
      id: 'root',
      component: 'Column',
      children: ['header', 'display-card', 'controls', 'presets'],
      className: 'gap-4 p-4 max-w-sm items-center',
    },
    {
      id: 'header',
      component: 'Text',
      text: '⏱️ Timer',
      variant: 'heading2',
    },
    {
      id: 'display-card',
      component: 'Card',
      children: ['time-display', 'progress-bar'],
      className: 'w-full text-center p-6',
    },
    {
      id: 'time-display',
      component: 'Text',
      text: { path: '/display' },
      variant: 'heading1',
      className: 'font-mono text-4xl',
    },
    {
      id: 'progress-bar',
      component: 'Progress',
      value: { path: '/progress' },
      max: 100,
      className: 'mt-4',
    },
    {
      id: 'controls',
      component: 'Row',
      children: ['start-btn', 'pause-btn', 'reset-btn'],
      className: 'gap-2',
    },
    {
      id: 'start-btn',
      component: 'Button',
      text: 'Start',
      action: 'start_timer',
      variant: 'primary',
      icon: 'Play',
    },
    {
      id: 'pause-btn',
      component: 'Button',
      text: 'Pause',
      action: 'pause_timer',
      variant: 'secondary',
      icon: 'Pause',
    },
    {
      id: 'reset-btn',
      component: 'Button',
      text: 'Reset',
      action: 'reset_timer',
      variant: 'outline',
      icon: 'RotateCcw',
    },
    {
      id: 'presets',
      component: 'Row',
      children: ['preset-1', 'preset-5', 'preset-10', 'preset-25'],
      className: 'gap-2 flex-wrap justify-center',
    },
    {
      id: 'preset-1',
      component: 'Button',
      text: '1 min',
      action: 'set_1min',
      variant: 'ghost',
    },
    {
      id: 'preset-5',
      component: 'Button',
      text: '5 min',
      action: 'set_5min',
      variant: 'ghost',
    },
    {
      id: 'preset-10',
      component: 'Button',
      text: '10 min',
      action: 'set_10min',
      variant: 'ghost',
    },
    {
      id: 'preset-25',
      component: 'Button',
      text: '25 min',
      action: 'set_25min',
      variant: 'ghost',
    },
  ] as A2UIComponent[],
  dataModel: {
    display: '00:00',
    seconds: 0,
    totalSeconds: 0,
    progress: 0,
    isRunning: false,
  },
};

/**
 * Notes App Template
 */
export const notesTemplate: A2UIAppTemplate = {
  id: 'notes',
  name: 'Quick Notes',
  description: 'A simple note-taking app with search',
  icon: 'StickyNote',
  category: 'productivity',
  tags: ['notes', 'writing', 'productivity'],
  components: [
    {
      id: 'root',
      component: 'Column',
      children: ['header', 'search-row', 'new-note-card', 'notes-list'],
      className: 'gap-4 p-4',
    },
    {
      id: 'header',
      component: 'Text',
      text: '📝 Quick Notes',
      variant: 'heading2',
    },
    {
      id: 'search-row',
      component: 'TextField',
      value: { path: '/searchQuery' },
      placeholder: '🔍 Search notes...',
      className: 'w-full',
    },
    {
      id: 'new-note-card',
      component: 'Card',
      children: ['note-title-input', 'note-content-input', 'save-btn'],
      className: 'p-4',
    },
    {
      id: 'note-title-input',
      component: 'TextField',
      value: { path: '/newNote/title' },
      placeholder: 'Note title',
      label: 'Title',
    },
    {
      id: 'note-content-input',
      component: 'TextArea',
      value: { path: '/newNote/content' },
      placeholder: 'Write your note here...',
      rows: 3,
    },
    {
      id: 'save-btn',
      component: 'Button',
      text: 'Save Note',
      action: 'save_note',
      variant: 'primary',
      icon: 'Save',
      className: 'mt-2',
    },
    {
      id: 'notes-list',
      component: 'Column',
      children: ['notes-label'],
      className: 'gap-2',
    },
    {
      id: 'notes-label',
      component: 'Text',
      text: { path: '/notesCountText' },
      variant: 'caption',
    },
  ] as A2UIComponent[],
  dataModel: {
    searchQuery: '',
    newNote: {
      title: '',
      content: '',
    },
    notes: [],
    notesCountText: '0 notes',
  },
};

/**
 * Weather Widget Template
 */
export const weatherTemplate: A2UIAppTemplate = {
  id: 'weather',
  name: 'Weather Widget',
  description: 'Display current weather information',
  icon: 'Cloud',
  category: 'utility',
  tags: ['weather', 'widget', 'utility'],
  components: [
    {
      id: 'root',
      component: 'Column',
      children: ['main-card', 'details-row'],
      className: 'gap-4 p-4 max-w-sm',
    },
    {
      id: 'main-card',
      component: 'Card',
      children: ['location-row', 'temp-row', 'condition'],
      className: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6',
    },
    {
      id: 'location-row',
      component: 'Row',
      children: ['location-icon', 'location-text'],
      className: 'gap-2 items-center',
    },
    {
      id: 'location-icon',
      component: 'Icon',
      name: 'MapPin',
      size: 16,
    },
    {
      id: 'location-text',
      component: 'Text',
      text: { path: '/weather/location' },
      variant: 'body',
    },
    {
      id: 'temp-row',
      component: 'Row',
      children: ['weather-icon', 'temperature'],
      className: 'gap-4 items-center my-4',
    },
    {
      id: 'weather-icon',
      component: 'Icon',
      name: { path: '/weather/icon' },
      size: 64,
    },
    {
      id: 'temperature',
      component: 'Text',
      text: { path: '/weather/temperature' },
      variant: 'heading1',
      className: 'text-5xl',
    },
    {
      id: 'condition',
      component: 'Text',
      text: { path: '/weather/condition' },
      variant: 'body',
    },
    {
      id: 'details-row',
      component: 'Row',
      children: ['humidity-card', 'wind-card', 'uv-card'],
      className: 'gap-2',
    },
    {
      id: 'humidity-card',
      component: 'Card',
      children: ['humidity-label', 'humidity-value'],
      className: 'flex-1 p-3 text-center',
    },
    {
      id: 'humidity-label',
      component: 'Text',
      text: '💧 Humidity',
      variant: 'caption',
    },
    {
      id: 'humidity-value',
      component: 'Text',
      text: { path: '/weather/humidity' },
      variant: 'heading4',
    },
    {
      id: 'wind-card',
      component: 'Card',
      children: ['wind-label', 'wind-value'],
      className: 'flex-1 p-3 text-center',
    },
    {
      id: 'wind-label',
      component: 'Text',
      text: '💨 Wind',
      variant: 'caption',
    },
    {
      id: 'wind-value',
      component: 'Text',
      text: { path: '/weather/wind' },
      variant: 'heading4',
    },
    {
      id: 'uv-card',
      component: 'Card',
      children: ['uv-label', 'uv-value'],
      className: 'flex-1 p-3 text-center',
    },
    {
      id: 'uv-label',
      component: 'Text',
      text: '☀️ UV',
      variant: 'caption',
    },
    {
      id: 'uv-value',
      component: 'Text',
      text: { path: '/weather/uv' },
      variant: 'heading4',
    },
  ] as A2UIComponent[],
  dataModel: {
    weather: {
      location: 'San Francisco, CA',
      temperature: '72°F',
      condition: 'Partly Cloudy',
      icon: 'CloudSun',
      humidity: '65%',
      wind: '12 mph',
      uv: 'Moderate',
    },
  },
};

/**
 * Contact Form Template
 */
export const contactFormTemplate: A2UIAppTemplate = {
  id: 'contact-form',
  name: 'Contact Form',
  description: 'A professional contact form with validation',
  icon: 'Mail',
  category: 'form',
  tags: ['contact', 'form', 'email', 'support'],
  components: [
    {
      id: 'root',
      component: 'Column',
      children: ['header', 'form-content', 'submit-section'],
      className: 'gap-4 p-4 max-w-md',
    },
    {
      id: 'header',
      component: 'Column',
      children: ['title', 'subtitle'],
      className: 'text-center gap-1',
    },
    {
      id: 'title',
      component: 'Text',
      text: '✉️ Contact Us',
      variant: 'heading2',
    },
    {
      id: 'subtitle',
      component: 'Text',
      text: "We'd love to hear from you!",
      variant: 'caption',
      color: 'muted',
    },
    {
      id: 'form-content',
      component: 'Card',
      children: ['name-row', 'email-input', 'subject-select', 'message-input'],
      className: 'p-4',
    },
    {
      id: 'name-row',
      component: 'Row',
      children: ['first-name', 'last-name'],
      className: 'gap-2',
    },
    {
      id: 'first-name',
      component: 'TextField',
      value: { path: '/form/firstName' },
      label: 'First Name',
      placeholder: 'John',
      required: true,
      className: 'flex-1',
    },
    {
      id: 'last-name',
      component: 'TextField',
      value: { path: '/form/lastName' },
      label: 'Last Name',
      placeholder: 'Doe',
      required: true,
      className: 'flex-1',
    },
    {
      id: 'email-input',
      component: 'TextField',
      value: { path: '/form/email' },
      label: 'Email Address',
      placeholder: 'john@example.com',
      type: 'email',
      required: true,
    },
    {
      id: 'subject-select',
      component: 'Select',
      value: { path: '/form/subject' },
      label: 'Subject',
      placeholder: 'Select a topic...',
      options: [
        { value: 'general', label: 'General Inquiry' },
        { value: 'support', label: 'Technical Support' },
        { value: 'sales', label: 'Sales Question' },
        { value: 'feedback', label: 'Feedback' },
        { value: 'other', label: 'Other' },
      ],
      required: true,
    },
    {
      id: 'message-input',
      component: 'TextArea',
      value: { path: '/form/message' },
      label: 'Message',
      placeholder: 'Tell us how we can help...',
      rows: 5,
      required: true,
    },
    {
      id: 'submit-section',
      component: 'Row',
      children: ['privacy-notice', 'spacer', 'submit-btn'],
      className: 'items-center',
    },
    {
      id: 'privacy-notice',
      component: 'Text',
      text: 'We respect your privacy.',
      variant: 'caption',
      color: 'muted',
    },
    {
      id: 'spacer',
      component: 'Spacer',
      size: 16,
      className: 'flex-1',
    },
    {
      id: 'submit-btn',
      component: 'Button',
      text: 'Send Message',
      action: 'submit_contact',
      variant: 'primary',
      icon: 'Send',
    },
  ] as A2UIComponent[],
  dataModel: {
    form: {
      firstName: '',
      lastName: '',
      email: '',
      subject: '',
      message: '',
    },
    submitted: false,
  },
};

/**
 * All available templates
 */
export const appTemplates: A2UIAppTemplate[] = [
  todoListTemplate,
  calculatorTemplate,
  surveyFormTemplate,
  dataDashboardTemplate,
  timerTemplate,
  notesTemplate,
  weatherTemplate,
  contactFormTemplate,
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): A2UIAppTemplate | undefined {
  return appTemplates.find((t) => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: A2UIAppTemplate['category']): A2UIAppTemplate[] {
  return appTemplates.filter((t) => t.category === category);
}

/**
 * Search templates by name or tags
 */
export function searchTemplates(query: string): A2UIAppTemplate[] {
  const lowerQuery = query.toLowerCase();
  return appTemplates.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Create A2UI messages from a template
 */
export function createAppFromTemplate(
  template: A2UIAppTemplate,
  surfaceId?: string
): { surfaceId: string; messages: A2UIServerMessage[] } {
  const id = surfaceId || generateTemplateId(template.id);

  const messages: A2UIServerMessage[] = [
    {
      type: 'createSurface',
      surfaceId: id,
      surfaceType: 'inline',
      title: template.name,
    },
    {
      type: 'updateComponents',
      surfaceId: id,
      components: template.components,
    },
    {
      type: 'dataModelUpdate',
      surfaceId: id,
      data: template.dataModel,
    },
    {
      type: 'surfaceReady',
      surfaceId: id,
    },
  ];

  return { surfaceId: id, messages };
}

/**
 * Template categories with metadata
 */
export const templateCategories = [
  { id: 'productivity', name: 'Productivity', icon: 'Briefcase', description: 'Task management and organization' },
  { id: 'data', name: 'Data & Analytics', icon: 'BarChart3', description: 'Charts, dashboards, and visualization' },
  { id: 'form', name: 'Forms', icon: 'ClipboardList', description: 'Input forms and surveys' },
  { id: 'utility', name: 'Utilities', icon: 'Wrench', description: 'Handy tools and widgets' },
  { id: 'social', name: 'Social', icon: 'Users', description: 'Social and communication features' },
] as const;
