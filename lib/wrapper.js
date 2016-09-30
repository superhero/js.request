const
urlParser   = require('url').parse,
querystring = require('querystring'),
wrapper     = (method, config, callback) =>
{
  const
  parsedUrl = urlParser(config.url || '', false, true),
  protocol  = parsedUrl.protocol == 'https:'
            ? require('https')
            : require('http'),
  options   =
  {
    host    : parsedUrl.host,
    path    : parsedUrl.path,
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

      callback(null,
      {
        status : result.statusCode,
        data   : data
      })
    });
  });

  request.on('error', callback);
  config.data && request.write(querystring.stringify(config.data));
  request.end();
};

module.exports =
{
  get   : (...args) => wrapper('get',     ...args),
  put   : (...args) => wrapper('put',     ...args),
  post  : (...args) => wrapper('post',    ...args),
  delete: (...args) => wrapper('delete',  ...args)
};
