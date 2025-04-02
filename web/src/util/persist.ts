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
  const wrapper = new Proxy(obj, {
    get(target, prop) {
      return (target as any)[prop];
    },
    set(obj, prop, value) {
      (obj as any)[prop] = value;
      sessionStorage.setItem(name, JSON.stringify(obj));
      return value;
    }
  });

  return wrapper as U;
}
