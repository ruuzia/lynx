export default function Persist<T extends Object>(name: string, obj: T): T {
  // Restore save
  for (const [k, v] of Object.entries(JSON.parse(sessionStorage.getItem(name) ?? "{}"))) {
    (obj as any)[k] = v;
  }
  const wrapper = { _raw: obj };

  for (const [key, value] of Object.entries(wrapper._raw)) {
    Object.defineProperty(wrapper, key, {
      get() {
        return this._raw[key];
      },
      set(value) {
        this._raw[key] = value;
        sessionStorage.setItem(name, JSON.stringify(this._raw));
      }
    });
  }

  return wrapper as any as T;
}


