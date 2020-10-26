const
  Debug       = require('@superhero/debug'),
  url         = require('url'),
  querystring = require('querystring'),
  sleep       = (delay) => new Promise((accept) => setTimeout(accept, delay))

module.exports = class
{
  constructor(config)
  {
    this.config = Object.assign(
    {
      rejectUnauthorized: true,
      debug             : false,
      debug_color       : 'cyan',
      debug_date        : true,
      debug_prefix      : 'debug request:',
      debug_separator   : ' ',
      headers           : {},
      retry             : 0,
      timeout           : 30e3,
      url               : ''
    }, config)

    this.debug = new Debug(
    {
      color     : this.config.debug_color,
      date      : this.config.debug_date,
      prefix    : this.config.debug_prefix,
      separator : this.config.debug_separator,
      debug     : this.config.debug
    })
  }

  get(...args)
  {
    return this.fetch('GET', ...args)
  }

  put(...args)
  {
    return this.fetch('PUT', ...args)
  }

  post(...args)
  {
    return this.fetch('POST', ...args)
  }

  delete(...args)
  {
    return this.fetch('DELETE', ...args)
  }

  async fetch(method, options)
  {
    if(typeof options == 'string')
    {
      options = { url:options }
    }

    options = Object.assign(
    {
      headers : {},
      timeout : this.config.timeout,
      url     : '',
      port    : this.config.port,
      retry   : this.config.retry
    }, options)

    let result, retry, i = 0

    do
    {
      try
      {
        result = await this.resolve(method, options)
      }
      catch(error)
      {
        retry = ++i < options.retry
      }
      if(retry)
      {
        await sleep(200)
      }
    }
    while(retry)

    return result
  }

  resolve(method, options)
  {
    return new Promise((fulfill, reject) =>
    {
      this.debug.log('incoming options:', options)

      const
        assigned    = Object.assign({}, this.config.headers, options.headers),
        objectKeys  = Object.keys(assigned),
        headers     = objectKeys.reduce((c, k) => (c[k.toLowerCase()] = assigned[k], c), {}),
        body        = typeof (options.data || '') == 'string'
                      ? options.data
                      : ( headers['content-type'] || '' ).startsWith('application/json')
                        ? JSON.stringify(options.data)
                        : querystring.stringify(options.data),
        composedUrl = this.config.url + options.url,
        parsed      = url.parse(composedUrl, false, true),
        config      =
        {
          rejectUnauthorized: options.rejectUnauthorized,
          auth              : parsed.auth,
          host              : parsed.hostname,
          path              : parsed.path,
          port              : parsed.port || options.port || (parsed.protocol == 'https:' ? 443 : 80),
          timeout           : options.timeout,
          method            : method,
          headers           : (() =>
                              {
                                headers['Content-Length'] = Buffer.byteLength(body || '', 'utf8');
                                return headers
                              })()
        },
        path    = `${config.method} ${parsed.protocol}://${config.host}:${config.port}${config.path}`,
        request = ( parsed.protocol == 'https:'
                  ? require('https')
                  : require('http')).request(config, this.onResult.bind(this, fulfill, options, composedUrl))

      this.debug.log('parsed config:', config)

      // writing body, if one is declared
      if(body)
      {
        this.debug.log('writing request body:', body)
        request.write(body)
      }

      request.on('error', (clientError) =>
      {
        const
          msg   = `client error -> ${path}`,
          error = new Error(msg)

        this.debug.error(msg, options)

        error.code      = 'E_REQUEST_CLIENT_ERROR'
        error.previous  = clientError

        reject(error)
      })

      request.on('timeout', () =>
      {
        request.destroy()

        const
          msg   = `client timeout (${config.timeout / 1000}s) -> ${path}`,
          error = new Error(msg)

        this.debug.error(msg, options)

        error.code = 'E_REQUEST_CLIENT_TIMEOUT'
        reject(error)
      })

      request.end()
    })
  }

  onResult(fulfill, options, url, result)
  {
    this.debug.log('response recieved')

    let data = ''

    if(options.pipe)
    {
      this.debug.log('piping the result')
      result.pipe(options.pipe)
    }

    result.on('data', (chunk) => data += chunk)
    result.on('end', () =>
    {
      try
      {
        data = JSON.parse(data)
      }
      catch (e) { /* tried and failed to parse content as json */ }

      this.debug.log('options:', options)
      this.debug.log('status:',  result.statusCode)
      this.debug.log('headers:', result.headers)
      this.debug.log('data:',    data)

      fulfill(
      {
        url     : url,
        status  : result.statusCode,
        headers : result.headers,
        data    : data
      })
    })
  }
}
