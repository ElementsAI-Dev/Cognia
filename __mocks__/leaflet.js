const icon = jest.fn(() => ({
  options: {},
}));

const divIcon = jest.fn(() => ({
  options: {},
}));

const Marker = {
  prototype: {
    options: {
      icon: null,
    },
  },
};

module.exports = {
  icon,
  divIcon,
  Marker,
};
