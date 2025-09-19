// server/patch-outgoing.js
// Usage: node --require ./server/patch-outgoing.js ...
// Or: NODE_OPTIONS="--require ./server/patch-outgoing.js" pnpm dev

(function () {
    const http = require('http');
    const https = require('https');
    const { URL } = require('url');
  
    // Optional filter: only log requests whose hostname contains this string.
    // Example: OUTGOING_LOG_FILTER=aimable.systems
    const FILTER = process.env.OUTGOING_LOG_FILTER || ''; // substring match
    const ENABLE = process.env.OUTGOING_LOG !== 'false'; // default enabled; set OUTGOING_LOG=false to disable
  
    function shouldLog(hostname) {
      if (!ENABLE) return false;
      if (!FILTER) return true;
      return hostname && hostname.includes(FILTER);
    }
  
    function makeWrap(lib, name) {
      const origRequest = lib.request;
      const _origGet = lib.get;
  
      function buildUrlString(options) {
        try {
          if (typeof options === 'string' || options instanceof URL) {
            return new URL(options).toString();
          }
          // options can be an object
          const protocol = options.protocol || (name === 'https' ? 'https:' : 'http:');
          const hostname = options.hostname || options.host || options.host || 'localhost';
          const port = options.port ? `:${options.port}` : '';
          const path = options.path || '/';
          return `${protocol}//${hostname}${port}${path}`;
        } catch (_err) {
          return String(options);
        }
      }
  
      function wrappedRequest(...args) {
        // args can be: (options[, callback]) OR (url[, options][, callback])
        const maybeOptions = args[0];
        let urlString;
        let opts;
        if (typeof maybeOptions === 'string' || maybeOptions instanceof URL) {
          urlString = buildUrlString(maybeOptions);
          opts = typeof args[1] === 'object' ? args[1] : {};
        } else {
          opts = Object.assign({}, maybeOptions);
          urlString = buildUrlString(opts);
        }
  
        // extract hostname for filter check
        let hostname = opts.hostname || opts.host;
        try {
          const u = new URL(urlString);
          hostname = hostname || u.hostname;
        } catch (_e) {}
  
        if (!shouldLog(hostname)) {
          return origRequest.apply(lib, args);
        }
  
        // create the real request
        const req = origRequest.apply(lib, args);
  
        try {
          const chunks = [];
          const startTs = Date.now();
  
          // capture writes
          const origWrite = req.write;
          const origEnd = req.end;
  
          req.write = function (chunk, enc, cb) {
            try {
              if (typeof chunk === 'string') {
                chunks.push(Buffer.from(chunk, enc));
              } else if (Buffer.isBuffer(chunk)) {
                chunks.push(chunk);
              }
            } catch (_e) {
              // ignore capture errors
            }
            return origWrite.call(req, chunk, enc, cb);
          };
  
          req.end = function (chunk, enc, cb) {
            try {
              if (chunk) {
                if (typeof chunk === 'string') chunks.push(Buffer.from(chunk, enc));
                else if (Buffer.isBuffer(chunk)) chunks.push(chunk);
              }
            } catch (_e) {}
            const bodyBuffer = Buffer.concat(chunks);
            const bodyForLog = bodyBuffer.length > 0 ? bodyBuffer.toString('utf8') : undefined;
  
            // Log the outbound request (headers + body)
            try {
              const safeHeaders = Object.assign({}, req.getHeaders ? req.getHeaders() : (opts.headers || {}));
              // DON'T print header values that look like secrets in production, but for debugging it's included
              console.log('[OUTGOING][%s] %s', name.toUpperCase(), urlString);
              console.log('  method:', (opts.method || 'GET'));
              console.log('  headers:', safeHeaders);
              if (bodyForLog !== undefined) {
                console.log('  body (utf8, truncated 2000 chars):', bodyForLog.length > 2000 ? bodyForLog.slice(0, 2000) + '…<truncated>' : bodyForLog);
              } else {
                console.log('  body: <none>');
              }
              console.log('  timestamp:', new Date(startTs).toISOString());
            } catch (_e) {
              // swallow log errors
            }
  
            return origEnd.call(req, chunk, enc, cb);
          };
          
          // capture response
          req.on('response', (res) => {
            const resChunks = [];
            res.on('data', (d) => {
              if (Buffer.isBuffer(d)) resChunks.push(d);
            });
            res.on('end', () => {
              const resBody = Buffer.concat(resChunks).toString('utf8');
              console.log('[INCOMING RESPONSE][%s] %s', name.toUpperCase(), urlString);
              console.log('  status:', res.statusCode);
              console.log('  headers:', res.headers);
              console.log('  body:', resBody || '<none>');
            });
          });

          // also listen for 'error' (do not log response)
          req.on('error', () => {});
        } catch (_e) {
          // ignore wrapper errors
        }
  
        return req;
      }
  
      // wrap get to use wrappedRequest and call .end() automatically like original get
      function wrappedGet(...args) {
        const req = wrappedRequest.apply(null, args);
        req.end();
        return req;
      }
  
      lib.request = wrappedRequest;
      lib.get = wrappedGet;
    }
  
    try {
      makeWrap(http, 'http');
      makeWrap(https, 'https');
      // If globalThis.fetch exists and is implemented by node, we can optionally wrap it as well,
      // but per your request we focus on http/https core.
    } catch (err) {
      console.error('Failed to patch http/https for outgoing logging:', err);
    }
  
    // Expose a small helper to toggle logging at runtime if desired
      global.__OUTGOING_LOG = {
      enabled: ENABLE,
      filter: FILTER,
    };

    // Patch global.fetch
    if (typeof global.fetch === 'function') {
      const origFetch = global.fetch;
      global.fetch = async (url, options = {}) => {
        console.log('[OUTGOING FETCH]', url, {
          method: options?.method || 'GET',
          headers: options?.headers,
          body: options?.body,
        });
    
        const res = await origFetch(url, options);
    
        console.log('[INCOMING FETCH RESPONSE]', url, {
          status: res.status,
          headers: Object.fromEntries(res.headers.entries()),
        });
    
        try {
          // If streaming, tee() the body so we don't lock it
          if (res.body && res.body.tee) {
            const [logStream, appStream] = res.body.tee();
            const reader = logStream.getReader();
            const decoder = new TextDecoder();
    
            (async () => {
              try {
                let done = false;
                while (!done) {
                  const { value, done: streamDone } = await reader.read();
                  if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    console.log('[INCOMING FETCH CHUNK]', chunk);
                  }
                  done = streamDone;
                }
              } catch (err) {
                console.error('[FETCH LOG STREAM ERROR]', err);
              }
            })();
    
            // return response with unclobbered body
            return new Response(appStream, {
              headers: res.headers,
              status: res.status,
              statusText: res.statusText,
            });
          } else {
            // Non-streaming
            const bodyText = await res.text();
            console.log('[INCOMING FETCH BODY]', bodyText);
            return new Response(bodyText, {
              headers: res.headers,
              status: res.status,
              statusText: res.statusText,
            });
          }
        } catch (e) {
          console.error('[FETCH LOG ERROR]', e);
          return res;
        }
      };
    }

  })();
