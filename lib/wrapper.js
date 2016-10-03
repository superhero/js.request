const
urlParser   = require('url').parse,
querystring = require('querystring'),
wrapper     = (method, config, callback) =>
{
  const
  debug     = (...args) => config.debug && console.log('debug:', ...args),
  parsedUrl = urlParser(config.url || '', false, true),
  protocol  = parsedUrl.protocol == 'https:'
            ? require('https')
            : require('http'),
  options   =
  {
    host    : parsedUrl.hostname,
    path    : parsedUrl.path,
    port    : parsedUrl.port || 80,
    method  : method,
    headers : config.headers
  },
  request   = protocol.request(options, (result) =>
  {
    let data = '';

    result.on('data', (chunk) => data += chunk);
    result.on('end',  ()      =>
    {
      try
      {
        data = JSON.parse(data);
      }
      catch (e) {/*tried and failed to parse content as json*/}

      debug('status:', result.statusCode);
      debug('data:', data);

      callback(null,
      {
        status : result.statusCode,
        data   : data
      })
    });
  });

  debug('config:' , config );
  debug('options:', options);

  request.on('error', callback);
  config.data && request.write(querystring.stringify(config.data));
  request.end();
};

module.exports =
{
  get   : (...args) => wrapper('GET',     ...args),
  put   : (...args) => wrapper('PUT',     ...args),
  post  : (...args) => wrapper('POST',    ...args),
  delete: (...args) => wrapper('DELETE',  ...args)
};
