import { default as lodashDeepclone } from "lodash.clonedeep";
import { v4 as uuidv4 } from "uuid";

export const deepclone = lodashDeepclone;
export const uuid = uuidv4;

export const exists = (e: unknown): boolean =>
  e !== null && e !== undefined && e !== "";
export const gcn = (...classNames: (string | undefined | null | false)[]) =>
  classNames.filter((cn) => !!cn).join(" ");

export const range = (start: number, end?: number) =>
  end === undefined
    ? Array.from({ length: start }, (v, k) => k)
    : Array.from({ length: end - start }, (v, k) => k + start);

export function objectMap<TSource, TResult>(
  obj: { [key: string]: TSource },
  mapFn: (v: TSource, k: string) => TResult
): { [key: string]: TResult } {
  return Object.keys(obj).reduce<{ [key: string]: TResult }>(function (prev, key) {
    prev[key] = mapFn(obj[key], key);
    return prev;
  }, {});
}

export function objectFilter<TSource>(
  obj: { [key: string]: TSource },
  filterFn: (v: TSource, k: string) => boolean
): { [key: string]: TSource } {
  return Object.keys(obj).reduce<{ [key: string]: TSource }>(function (prev, key) {
    if (filterFn(obj[key], key)) prev[key] = obj[key];
    return prev;
  }, {});
}

export const arraysOverlap = (a: unknown[], b: unknown[]) =>
  a.filter((e) => b.includes(e)).length > 0;

export const arraysLooslyEqual = <T>(a: T[], b: T[]) =>
  a.length === b.length && a.every((e) => b.includes(e));

export const arraysExactlyEqual = <T>(a: T[], b: T[]) =>
  a.length === b.length && a.every((e, i) => b[i] === e);

export const flattenArray = (args: any[]): any[] =>
  args.reduce(
    (prev, curr) => [...prev, ...(Array.isArray(curr) ? curr : [curr])],
    []
  );

export function slugify(string: string | number) {
  const a =
    "àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;";
  const b =
    "aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------";
  const p = new RegExp(a.split("").join("|"), "g");

  return string
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(p, (c) => b.charAt(a.indexOf(c))) // Replace special characters
    .replace(/&/g, "-and-") // Replace & with 'and'
    .replace(/[^\w-]+/g, "") // Remove all non-word characters
    .replace(/--+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
}

export function findLastIndex<T>(
  array: Array<T>,
  predicate: (value: T, index: number, obj: T[]) => boolean
): number {
  let l = array.length;
  while (l--) {
    if (predicate(array[l], l, array)) return l;
  }
  return -1;
}
