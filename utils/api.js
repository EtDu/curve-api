import memoize from 'memoizee';
import { IS_DEV } from 'constants/AppConstants';

const getNowMs = () => Number(Date.now());

const formatJsonSuccess = ({ generatedTimeMs, ...data }) => ({
  success: true,
  data,
  generatedTimeMs,
});

const formatJsonError = (err) => ({
  success: false,
  err: err.toString ? err.toString() : err,
});

const addGeneratedTime = async (res) => ({
  ...await res,
  generatedTimeMs: getNowMs(),
});

const logRuntime = async (fn, name, query) => {
  const startMs = getNowMs();

  const res = await fn();

  const endMs = getNowMs();
  if (IS_DEV) console.log('Run time (ms):', endMs - startMs, name, query);

  return res;
};

const fn = (cb, options = {}) => {
  const {
    maxAge: maxAgeSec = null, // Caching duration, in seconds
    name = null, // Name, used for logging purposes
  } = options;

  // In prod, each endpoint is a lambda, hence no shared memory, hence no point in memoizing
  const callback = (IS_DEV && maxAgeSec !== null) ?
    memoize(async (query) => logRuntime(() => addGeneratedTime(cb(query)), name, query), {
      promise: true,
      maxAge: maxAgeSec * 1000,
      normalizer: ([query]) => JSON.stringify(query), // Separate cache entries for each route & query params,
    }) :
    async (query) => logRuntime(() => addGeneratedTime(cb(query)), name, query);

  const apiCall = async (req, res) => (
    Promise.resolve(callback(req.query))
      .then((data) => {
        if (maxAgeSec !== null) res.setHeader('Cache-Control', `s-maxage=${maxAgeSec}, stale-while-revalidate=${maxAgeSec}`);
        res.status(200).json(formatJsonSuccess(data));
      })
      .catch((err) => {
        if (IS_DEV) {
          console.log(err);
          throw err;
        } else {
          res.status(500).json(formatJsonError(err));
        }
      })
  );

  apiCall.straightCall = callback;

  return apiCall;
};

export {
  fn,
  formatJsonError,
};
