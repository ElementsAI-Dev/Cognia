/* eslint-disable @typescript-eslint/no-require-imports, react/display-name */
const React = require('react');

const motion = {
  div: React.forwardRef(({ children, ...props }, ref) => 
    React.createElement('div', { ...props, ref }, children)
  ),
  span: React.forwardRef(({ children, ...props }, ref) => 
    React.createElement('span', { ...props, ref }, children)
  ),
  button: React.forwardRef(({ children, ...props }, ref) => 
    React.createElement('button', { ...props, ref }, children)
  ),
  ul: React.forwardRef(({ children, ...props }, ref) => 
    React.createElement('ul', { ...props, ref }, children)
  ),
  li: React.forwardRef(({ children, ...props }, ref) => 
    React.createElement('li', { ...props, ref }, children)
  ),
  p: React.forwardRef(({ children, ...props }, ref) => 
    React.createElement('p', { ...props, ref }, children)
  ),
  h1: React.forwardRef(({ children, ...props }, ref) => 
    React.createElement('h1', { ...props, ref }, children)
  ),
  h2: React.forwardRef(({ children, ...props }, ref) => 
    React.createElement('h2', { ...props, ref }, children)
  ),
  h3: React.forwardRef(({ children, ...props }, ref) => 
    React.createElement('h3', { ...props, ref }, children)
  ),
  section: React.forwardRef(({ children, ...props }, ref) => 
    React.createElement('section', { ...props, ref }, children)
  ),
  article: React.forwardRef(({ children, ...props }, ref) => 
    React.createElement('article', { ...props, ref }, children)
  ),
  nav: React.forwardRef(({ children, ...props }, ref) => 
    React.createElement('nav', { ...props, ref }, children)
  ),
  aside: React.forwardRef(({ children, ...props }, ref) => 
    React.createElement('aside', { ...props, ref }, children)
  ),
  main: React.forwardRef(({ children, ...props }, ref) => 
    React.createElement('main', { ...props, ref }, children)
  ),
  form: React.forwardRef(({ children, ...props }, ref) => 
    React.createElement('form', { ...props, ref }, children)
  ),
  input: React.forwardRef((props, ref) => 
    React.createElement('input', { ...props, ref })
  ),
  textarea: React.forwardRef((props, ref) => 
    React.createElement('textarea', { ...props, ref })
  ),
  img: React.forwardRef((props, ref) => 
    React.createElement('img', { ...props, ref })
  ),
  svg: React.forwardRef(({ children, ...props }, ref) => 
    React.createElement('svg', { ...props, ref }, children)
  ),
  path: React.forwardRef((props, ref) => 
    React.createElement('path', { ...props, ref })
  ),
  a: React.forwardRef(({ children, ...props }, ref) => 
    React.createElement('a', { ...props, ref }, children)
  ),
};

const AnimatePresence = ({ children }) => React.createElement(React.Fragment, null, children);

const useAnimation = () => ({
  start: jest.fn(),
  stop: jest.fn(),
  set: jest.fn(),
});

const useMotionValue = (initial) => ({
  get: () => initial,
  set: jest.fn(),
  onChange: jest.fn(),
});

const useTransform = () => ({
  get: () => 0,
  set: jest.fn(),
});

const useSpring = () => ({
  get: () => 0,
  set: jest.fn(),
});

const useInView = () => true;

const useScroll = () => ({
  scrollX: { get: () => 0 },
  scrollY: { get: () => 0 },
  scrollXProgress: { get: () => 0 },
  scrollYProgress: { get: () => 0 },
});

const useDragControls = () => ({
  start: jest.fn(),
});

const useReducedMotion = () => false;

const MotionConfig = ({ children }) => children;
const LazyMotion = ({ children }) => children;
const domAnimation = {};
const domMax = {};
const m = motion;

module.exports = {
  motion,
  m,
  AnimatePresence,
  useAnimation,
  useMotionValue,
  useTransform,
  useSpring,
  useInView,
  useScroll,
  useDragControls,
  useReducedMotion,
  MotionConfig,
  LazyMotion,
  domAnimation,
  domMax,
};