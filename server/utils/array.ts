export const zip = <T, P>(a: T[], b: P[]): [T, P][] =>
  a.map((e, i) => {
    return [e, b[i]];
  });
