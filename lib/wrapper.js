const
Debug       = require('@superhero/debug'),
urlParser   = require('url').parse,
querystring = require('querystring'),
wrapper     = (method, config, callback) =>
{
  if(typeof config == 'string')
    config = {url:config};

  let
  body = config.data || '';
  body = typeof config.data == 'string'
       ? config.data
       : querystring.stringify(config.data);

  let
  headers = config.headers || {};
  headers['Content-Length'] = Buffer.byteLength(body, 'utf8');

  const
  debug     = new Debug({debug:!!config.debug}),
  parsedUrl = urlParser(config.url || '', false, true),
  protocol  = parsedUrl.protocol == 'https:'
            ? require('https')
            : require('http'),
  options   =
  {
    auth    : parsedUrl.auth,
    host    : parsedUrl.hostname,
    path    : parsedUrl.path,
    port    : parsedUrl.port || (parsedUrl.protocol == 'https:' ? 443 : 80),
    timeout : config.timeout || 30e3,
    method  : method,
    headers : headers
  },
  request   = protocol.request(options, (result) =>
  {
    let data = '';

    result.on('data', chunk => data += chunk);
    result.on('end',  ()    =>
    {
      try
      {
        data = JSON.parse(data);
      }
      catch (e) {/*tried and failed to parse content as json*/}

      debug.log('status:', result.statusCode);
      debug.log('headers:', result.headers);
      debug.log('data:', data);

      callback && callback(null,
      {
        status  : result.statusCode,
        headers : result.headers,
        data    : data
      });
    });
  });

  debug.log('options:', options);

  // writing body, if one is declared
  body && request.write(body);

  callback && request.on('error', callback);
  request.end();
};

module.exports =
{
  get   : (...args) => wrapper('GET',     ...args),
  put   : (...args) => wrapper('PUT',     ...args),
  post  : (...args) => wrapper('POST',    ...args),
  delete: (...args) => wrapper('DELETE',  ...args)
};
