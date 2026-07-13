describe('request tests', async () =>
{
  const
  expect  = require('chai').expect,
  context = require('mochawesome/addContext'),
  http    = require('http'),
  Request = require('.')

  let baseUrl, delayResponseCount = 0, incompleteResponseCount = 0, request, server

  before((done) =>
  {
    server = http.createServer((incoming, outgoing) =>
    {
      const chunks = []

      incoming.on('data', (chunk) => chunks.push(chunk))
      incoming.on('end', () =>
      {
        const
        parsed      = new URL(incoming.url, `http://${incoming.headers.host}`),
        data        = Buffer.concat(chunks).toString(),
        statusMatch = parsed.pathname.match(/^\/status\/(\d+)$/),
        delayMatch  = parsed.pathname.match(/^\/delay\/(\d+)$/),
        respond     = (status, body) =>
        {
          outgoing.statusCode = status

          if(body === undefined)
          {
            outgoing.end()
          }
          else
          {
            outgoing.setHeader('content-type', 'application/json')
            outgoing.end(JSON.stringify(body))
          }
        }

        if(parsed.pathname === '/get')
        {
          respond(200,
          {
            args    : Object.fromEntries(parsed.searchParams),
            headers :
            {
              authorization : incoming.headers.authorization
            }
          })
        }
        else if(['/post', '/put', '/delete'].includes(parsed.pathname))
        {
          respond(200, { data })
        }
        else if(statusMatch)
        {
          respond(Number(statusMatch[1]))
        }
        else if(delayMatch)
        {
          const timeout = setTimeout(() => respond(200, {}), Number(delayMatch[1]) * 1e3)
          outgoing.on('close', () => clearTimeout(timeout))
        }
        else if(parsed.pathname === '/delay-once' && delayResponseCount++ === 0)
        {
          const timeout = setTimeout(() => respond(200, {}), 100)
          outgoing.on('close', () => clearTimeout(timeout))
        }
        else if(parsed.pathname === '/delay-once')
        {
          respond(200, { retried:true })
        }
        else if(parsed.pathname === '/incomplete')
        {
          outgoing.writeHead(200,
          {
            'content-length' : 100,
            'content-type'   : 'text/plain'
          })
          outgoing.write('partial')
          setTimeout(() => outgoing.destroy(), 10)
        }
        else if(parsed.pathname === '/incomplete-once' && incompleteResponseCount++ === 0)
        {
          outgoing.writeHead(200,
          {
            'content-length' : 100,
            'content-type'   : 'text/plain'
          })
          outgoing.write('partial')
          setTimeout(() => outgoing.destroy(), 10)
        }
        else if(parsed.pathname === '/incomplete-once')
        {
          respond(200, { retried:true })
        }
        else
        {
          respond(404)
        }
      })
    })

    server.listen(0, '127.0.0.1', () =>
    {
      baseUrl = `http://127.0.0.1:${server.address().port}`
      request = new Request({ debug:false, proxy:'' })
      done()
    })
  })

  after((done) =>
  {
    console.log('\n')
    process.env.HTTP_PROXY
    ? console.log(`HTTP_PROXY env variable is set to: ${process.env.HTTP_PROXY}`)
    : console.log('HTTP_PROXY env variable is not set')

    server.close(done)
  })

  it('simple GET request', async () =>
  {
    const response = await request.get(`${baseUrl}/get?foo=bar`)
    expect(response.status).to.be.equal(200)
    expect(response.data.args.foo).to.be.equal('bar')
  })

  it('repeated simple GET request', async () =>
  {
    const response = await request.get(`${baseUrl}/get?foo=bar`)
    expect(response.status).to.be.equal(200)
    expect(response.data.args.foo).to.be.equal('bar')
  })

  it('simple POST request', async () =>
  {
    const
    url       = `${baseUrl}/post`,
    data      = { foo:'bar' },
    response  = await request.post({ url, data })
    expect(response.status).to.be.equal(200)
    expect(response.data.data).to.be.equal('foo=bar')
  })

  it('repeated simple POST request', async () =>
  {
    const
    url       = `${baseUrl}/post`,
    data      = { foo:'bar' },
    response  = await request.post({ url, data })
    expect(response.status).to.be.equal(200)
    expect(response.data.data).to.be.equal('foo=bar')
  })

  it('simple PUT request', async () =>
  {
    const
    url       = `${baseUrl}/put`,
    data      = { foo:'bar' },
    response  = await request.put({ url, data })
    expect(response.status).to.be.equal(200)
    expect(response.data.data).to.be.equal('foo=bar')
  })

  it('repeated simple PUT request', async () =>
  {
    const
    url       = `${baseUrl}/put`,
    data      = { foo:'bar' },
    response  = await request.put({ url, data })
    expect(response.status).to.be.equal(200)
    expect(response.data.data).to.be.equal('foo=bar')
  })

  it('simple DELETE request', async () =>
  {
    const
    url       = `${baseUrl}/delete`,
    data      = { foo:'bar' },
    response  = await request.delete({ url, data })
    expect(response.status).to.be.equal(200)
    expect(response.data.data).to.be.equal('foo=bar')
  })

  it('repeated simple DELETE request', async () =>
  {
    const
    url       = `${baseUrl}/delete`,
    data      = { foo:'bar' },
    response  = await request.delete({ url, data })
    expect(response.status).to.be.equal(200)
    expect(response.data.data).to.be.equal('foo=bar')
  })

  it('simple GET request with headers', async () =>
  {
    const
    url       = `${baseUrl}/get?foo=bar`,
    headers   = { 'content-type':'json/application' },
    response  = await request.get({ url, headers })

    expect(response.status).to.be.equal(200)
    expect(response.data.args.foo).to.be.equal('bar')
  })

  it('base URL request', async () =>
  {
    const
    baseRequest = new Request({ debug:false, proxy:'', url:baseUrl }),
    response    = await baseRequest.get('/get?foo=bar')

    expect(response.status).to.be.equal(200)
    expect(response.data.args.foo).to.be.equal('bar')
  })

  it('basic authentication request', async () =>
  {
    const
    url      = baseUrl.replace('http://', 'http://user:@'),
    response = await request.get(`${url}/get`)

    expect(response.status).to.be.equal(200)
    expect(response.data.headers.authorization).to.be.equal(`Basic ${Buffer.from('user:').toString('base64')}`)
  })

  it('proxy request', async () =>
  {
    const
    proxyRequest = new Request({ debug:false, proxy:baseUrl }),
    response     = await proxyRequest.get(`${baseUrl}/get?foo=bar`)

    expect(response.status).to.be.equal(200)
    expect(response.data.args.foo).to.be.equal('bar')
  })

  it('204 status test', async () =>
  {
    const
    url       = `${baseUrl}/status/204`,
    headers   = { 'content-type':'json/application', accept:'json/application' },
    response  = await request.put({ url, headers, retry:3 })

    expect(response.status).to.be.equal(204)
  })

  it('500 error test', async () =>
  {
    const
    url       = `${baseUrl}/status/500`,
    headers   = { 'content-type':'json/application' },
    response  = await request.get({ url, headers, retry:3 })

    expect(response.status).to.be.equal(500)
  })

  it('408 error test', async () =>
  {
    const
    url     = `${baseUrl}/delay/2`,
    headers = { 'content-type':'json/application' }

    try
    {
      const response = await request.get({ url, headers, timeout:10 })
      expect(response).to.be.equal('should never happen')
    }
    catch(error)
    {
      expect(error.code).to.be.equal('E_REQUEST_CLIENT_TIMEOUT')
    }
  })

  it('incomplete response test', async () =>
  {
    try
    {
      const response = await request.get(`${baseUrl}/incomplete`)
      expect(response).to.be.equal('should never happen')
    }
    catch(error)
    {
      expect(
      [
        'E_REQUEST_RESPONSE_ERROR',
        'E_REQUEST_RESPONSE_ABORTED',
        'E_REQUEST_RESPONSE_INCOMPLETE'
      ]).to.include(error.code)
    }
  })

  it('retries a GET response error by default', async () =>
  {
    const response = await request.get(
    {
      url   : `${baseUrl}/incomplete-once`,
      retry : 2
    })

    expect(response.status).to.be.equal(200)
    expect(response.data.retried).to.be.equal(true)
    expect(incompleteResponseCount).to.be.equal(2)
  })

  it('does not retry a POST response error by default', async () =>
  {
    incompleteResponseCount = 0

    try
    {
      const response = await request.post(
      {
        url   : `${baseUrl}/incomplete-once`,
        retry : 2
      })
      expect(response).to.be.equal('should never happen')
    }
    catch(error)
    {
      expect(incompleteResponseCount).to.be.equal(1)
    }
  })

  it('supports explicit response retry overrides', async () =>
  {
    incompleteResponseCount = 0

    const response = await request.post(
    {
      url                  : `${baseUrl}/incomplete-once`,
      retry                : 2,
      retryOnResponseError : true
    })

    expect(response.status).to.be.equal(200)
    expect(incompleteResponseCount).to.be.equal(2)

    incompleteResponseCount = 0

    const noRetryRequest = new Request(
    {
      debug                : false,
      proxy                : '',
      retry                : 2,
      retryOnResponseError : false
    })

    try
    {
      const noRetryResponse = await noRetryRequest.get(`${baseUrl}/incomplete-once`)
      expect(noRetryResponse).to.be.equal('should never happen')
    }
    catch(error)
    {
      expect(incompleteResponseCount).to.be.equal(1)
    }
  })

  it('retries a GET timeout by default', async () =>
  {
    const response = await request.get(
    {
      url     : `${baseUrl}/delay-once`,
      retry   : 2,
      timeout : 10
    })

    expect(response.status).to.be.equal(200)
    expect(response.data.retried).to.be.equal(true)
    expect(delayResponseCount).to.be.equal(2)
  })

  it('does not retry a POST timeout by default', async () =>
  {
    delayResponseCount = 0

    try
    {
      const response = await request.post(
      {
        url     : `${baseUrl}/delay-once`,
        retry   : 2,
        timeout : 10
      })
      expect(response).to.be.equal('should never happen')
    }
    catch(error)
    {
      expect(error.code).to.be.equal('E_REQUEST_CLIENT_TIMEOUT')
      expect(delayResponseCount).to.be.equal(1)
    }
  })
})
