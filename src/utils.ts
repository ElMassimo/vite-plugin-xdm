export function compact<T> (val: (false | undefined | null | T)[]): T[] {
  return val.filter(x => x) as T[]
}
