export default function Persist<T extends Object, U extends T>(
  name: string,
  obj: T,
): U {
  // Restore save
  for (const [k, v] of Object.entries(
    JSON.parse(sessionStorage.getItem(name) ?? "{}"),
  )) {
    (obj as any)[k] = v;
  }
  const wrapper = {};

  for (const key in obj) {
    Object.defineProperty(wrapper, key, {
      get() {
        return obj[key];
      },
      set(value) {
        obj[key] = value;
        sessionStorage.setItem(name, JSON.stringify(obj));
      },
    });
  }

  return wrapper as any as U;
}
