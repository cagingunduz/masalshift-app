// Hermes URL Polyfill — Supabase URL property'lere set etmeye çalışır,
// Hermes'in built-in URL'i bunları read-only yapıyor. Bu dosya tam bir
// URL wrapper sağlar ve hiçbir native module kullanmaz.

const NativeURL = global.URL;

function needsPolyfill() {
  try {
    const u = new NativeURL('https://example.com/a');
    u.pathname = '/b';
    return u.pathname !== '/b';
  } catch (_) {
    return true;
  }
}

if (NativeURL && needsPolyfill()) {
  class PolyfillURL {
    constructor(input, base) {
      let href = typeof input === 'string' ? input : String(input);
      const native = new NativeURL(href, base);
      this._protocol = native.protocol;
      this._username = native.username || '';
      this._password = native.password || '';
      this._hostname = native.hostname;
      this._port     = native.port;
      this._pathname = native.pathname;
      this._search   = native.search;
      this._hash     = native.hash;
      this._origin   = native.origin;
    }

    get protocol() { return this._protocol; }
    set protocol(v) { this._protocol = v.endsWith(':') ? v : `${v}:`; }

    get username() { return this._username; }
    set username(v) { this._username = v; }

    get password() { return this._password; }
    set password(v) { this._password = v; }

    get hostname() { return this._hostname; }
    set hostname(v) { this._hostname = v; }

    get port() { return this._port; }
    set port(v) { this._port = String(v); }

    get host() { return this._hostname + (this._port ? `:${this._port}` : ''); }
    set host(v) {
      const [h, p] = v.split(':');
      this._hostname = h;
      this._port = p || '';
    }

    get pathname() { return this._pathname; }
    set pathname(v) { this._pathname = v.startsWith('/') ? v : `/${v}`; }

    get search() { return this._search; }
    set search(v) { this._search = v ? (v.startsWith('?') ? v : `?${v}`) : ''; }

    get hash() { return this._hash; }
    set hash(v) { this._hash = v ? (v.startsWith('#') ? v : `#${v}`) : ''; }

    get origin() { return `${this._protocol}//${this.host}`; }

    get href() {
      const auth = this._username
        ? `${this._username}${this._password ? `:${this._password}` : ''}@`
        : '';
      return `${this._protocol}//${auth}${this.host}${this._pathname}${this._search}${this._hash}`;
    }
    set href(v) {
      const u = new NativeURL(v);
      this._protocol = u.protocol;
      this._username = u.username;
      this._password = u.password;
      this._hostname = u.hostname;
      this._port     = u.port;
      this._pathname = u.pathname;
      this._search   = u.search;
      this._hash     = u.hash;
      this._origin   = u.origin;
    }

    toString() { return this.href; }
    toJSON()   { return this.href; }
  }

  global.URL = PolyfillURL;
}
