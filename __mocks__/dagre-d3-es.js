// Mock for dagre-d3-es ESM module
class Graph {
  constructor(opts) {
    this._opts = opts || {};
    this._nodes = {};
    this._edges = {};
  }
  setGraph(label) { this._label = label; return this; }
  graph() { return this._label || {}; }
  setNode(v, label) { this._nodes[v] = label; return this; }
  node(v) { return this._nodes[v]; }
  nodes() { return Object.keys(this._nodes); }
  setEdge(v, w, label) { this._edges[`${v}->${w}`] = label; return this; }
  edge(v, w) { return this._edges[`${v}->${w}`]; }
  edges() { return []; }
  hasNode(v) { return v in this._nodes; }
  removeNode(v) { delete this._nodes[v]; return this; }
  nodeCount() { return Object.keys(this._nodes).length; }
  edgeCount() { return Object.keys(this._edges).length; }
  setDefaultEdgeLabel(fn) { this._defaultEdgeLabel = fn; return this; }
  isDirected() { return true; }
  children() { return []; }
}

const layout = jest.fn();

module.exports = {
  graphlib: { Graph },
  layout,
  Graph,
};
