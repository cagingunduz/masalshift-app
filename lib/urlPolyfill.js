// Hermes URL Polyfill
// Hermes'te URL property'leri read-only getter — Supabase bunlara set etmeye çalışınca crash oluyor.
// Bu dosya hiçbir native module kullanmaz, tamamen pure JS.

if (typeof global.URL !== 'undefined') {
  const _URL = global.URL;
  const props = ['protocol','host','hostname','port','pathname','search','hash','username','password'];
  props.forEach(prop => {
    const d = Object.getOwnPropertyDescriptor(_URL.prototype, prop);
    if (d && d.get && !d.set) {
      Object.defineProperty(_URL.prototype, prop, {
        get: d.get,
        set(_v) {},
        configurable: true,
        enumerable: true,
      });
    }
  });
}
