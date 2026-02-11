/* eslint-disable @typescript-eslint/no-require-imports */
const React = require('react');

const MapContainer = ({ children, center, zoom, minZoom, maxZoom, zoomControl, attributionControl, className }) =>
  React.createElement('div', {
    'data-testid': 'leaflet-map-container',
    'data-center': JSON.stringify(center),
    'data-zoom': zoom,
    'data-min-zoom': minZoom,
    'data-max-zoom': maxZoom,
    'data-zoom-control': zoomControl,
    'data-attribution-control': attributionControl,
    className,
  }, children);

const TileLayer = ({ url, attribution }) =>
  React.createElement('div', {
    'data-testid': 'tile-layer',
    'data-url': url,
    'data-attribution': attribution,
  });

const Marker = ({ children, position, draggable, eventHandlers, icon }) =>
  React.createElement('div', {
    'data-testid': 'marker',
    'data-position': JSON.stringify(position),
    'data-draggable': draggable,
    'data-has-icon': !!icon,
    onClick: () => eventHandlers?.click?.(),
  }, children);

const Popup = ({ children }) =>
  React.createElement('div', { 'data-testid': 'popup' }, children);

const Circle = ({ center, radius, pathOptions }) =>
  React.createElement('div', {
    'data-testid': 'circle',
    'data-center': JSON.stringify(center),
    'data-radius': radius,
    'data-path-options': JSON.stringify(pathOptions),
  });

const useMapEvents = jest.fn((handlers) => {
  const mockMap = {
    getBounds: () => ({
      getNorth: () => 40,
      getSouth: () => 39,
      getEast: () => 117,
      getWest: () => 116,
    }),
  };
  // Store handlers for testing
  useMapEvents._handlers = handlers;
  useMapEvents._map = mockMap;
  return mockMap;
});

const useMap = jest.fn(() => ({
  flyTo: jest.fn(),
  getZoom: jest.fn(() => 13),
  getBounds: () => ({
    getNorth: () => 40,
    getSouth: () => 39,
    getEast: () => 117,
    getWest: () => 116,
  }),
}));

module.exports = {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMapEvents,
  useMap,
};
