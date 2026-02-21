const processStub = {
  env: {} as Record<string, string | undefined>,
  browser: true,
  versions: {},
};

export const env = processStub.env;
export default processStub;
