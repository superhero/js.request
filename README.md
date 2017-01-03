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
const api = require('@superhero/request');

api.get({url:'example.com/foobar'}, (error, dto) => console.log(dto.status, dto.data));

api.post({url:'https://example.com/foobar', data: {foo:'bar',baz:'qux'}}, console.log);
```

## Options

All options are optional.

```javascript
{
  // if true, some output for debugging is logged to the console
  debug: false,

  // the actual url, if no protocol is specified in the url, http is assumed
  url: '',

  // an object map of the data to send with the request
  data: undefined,

  // an object map of headers to send with the request
  headers: {}
}
```
