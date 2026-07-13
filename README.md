# Request

Licence: [MIT](https://opensource.org/licenses/MIT)

---

[![npm version](https://badge.fury.io/js/%40superhero%2Frequest.svg)](https://badge.fury.io/js/%40superhero%2Frequest)

A wrapper for the http and https modules request function. I put this together to be able to simplify my api requests..

## Install

`npm install @superhero/request`

...or just set the dependency in your `package.json` file:

```json
{
  "dependencies":
  {
    "@superhero/request": "*"
  }
}
```

## Example

```javascript
const
Request = require('@superhero/request'),
request = new Request();

request.post('example.com/foobar').then((result) => console.log(result.status, result.headers, result.data));
request.post({url:'https://example.com/foobar', data: {foo:'bar',baz:'qux'}}).then(console.log);
```

## Options

Options for the constructor.

```javascript
{
  // if true, some output for debugging is logged to the console
  debug: false,

  // debug console color
  debug_color: 'cyan',

  // if the debug console should be prefixed with the date time
  debug_date: true',

  // the debug prefix message
  debug_prefix: 'debug request:',

  // a seperator between debug message
  debug_separator: ' ',

  // this url will be used to resolve any provided url in the fetch call
  url: '',

  // optional proxy url (example: http://user:password@www.example.com:666)
  proxy: '',

  // headers that will be used in every request
  headers: {},

  // maximum attempts for retryable transport failures; values below 2 disable retries
  retry: 0,

  // delay in milliseconds before each retry
  retryDelay: 200,

  // retry client timeouts; defaults to true for GET, otherwise false
  retryOnClientTimeout: undefined,

  // retry interrupted or incomplete responses; defaults to true for GET
  retryOnResponseError: undefined,

  // timeout
  timeout: 30e3,

  // specifies if you want the ssl unauthorization to be rejected or not
  rejectUnauthorized: true
}
```

Options for each request

```javascript
{
  // the url to make the request to, relative paths will be resolved against
  // the provided url in the constructor
  url: '',

  // an object map of the data to send with the request
  data: undefined,

  // an object map of headers to send with the request
  headers: {},

  // maximum attempts for retryable transport failures; values below 2 disable retries
  retry: 0,

  // delay in milliseconds before each retry; inherits the constructor setting
  retryDelay: 200,

  // retry client timeouts; defaults to true for GET, otherwise false
  retryOnClientTimeout: undefined,

  // retry interrupted or incomplete responses; defaults to true for GET
  retryOnResponseError: undefined,

  // timeout, inherit from setting in the constructor
  timeout: ?,

  // https://nodejs.org/api/stream.html#stream_writable_streams
  pipe: Writable,

  // alias for pipe
  stream: Writable
}
```

Response retries apply to buffered responses. Piped or streamed responses are
fulfilled when the response stream is returned, so later stream failures cannot
restart the request. Enabling retries for POST, PUT, or DELETE can repeat a
request the server has already processed.

## Errors

Rejected requests return an `Error` with one of the following `code` values:

| Code                            | When it occurs                                                                 |
|---------------------------------|--------------------------------------------------------------------------------|
| `E_REQUEST_CLIENT_ERROR`        | The request emits an error, such as a DNS, connection, TLS, or socket failure. |
| `E_REQUEST_CLIENT_TIMEOUT`      | The request socket remains inactive for the configured `timeout`.              |
| `E_REQUEST_RESPONSE_ERROR`      | The response stream emits an error after response headers have arrived.        |
| `E_REQUEST_RESPONSE_ABORTED`    | The remote side aborts the response before it finishes.                        |
| `E_REQUEST_RESPONSE_INCOMPLETE` | The response closes before the complete HTTP message is received.              |

`E_REQUEST_CLIENT_ERROR` and `E_REQUEST_RESPONSE_ERROR` include the original
Node.js error as `error.previous`. A timeout destroys the request after rejecting
it.

An interrupted response can emit `aborted`, `error`, and an incomplete `close`
for the same underlying failure. The request Promise keeps the first rejection,
so the exact response error code can depend on which event Node.js emits first.

When retry attempts remain, `E_REQUEST_CLIENT_ERROR` is retryable.
`E_REQUEST_CLIENT_TIMEOUT` requires `retryOnClientTimeout`, and all response
error codes require `retryOnResponseError`. Both retry options default to `true`
for GET and `false` for other methods.
