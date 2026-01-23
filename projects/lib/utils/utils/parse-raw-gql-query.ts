export const parseRawGqlQueryToFields = (s: string): any[] => {
  const tokens = s.replace(/[{}]/g, ' $& ').trim().split(/\s+/);
  const root: any[] = [];
  const stack: any[][] = [root];

  for (let i = 0; i < tokens.length; i++) {
    const v = tokens[i];

    if (v === '{') continue;
    if (v === '}') {
      stack.pop();
      continue;
    }

    if (tokens[i + 1] === '{') {
      const node = { [v]: [] };
      stack.at(-1)?.push(node);
      stack.push(node[v]);
    } else {
      stack.at(-1)?.push(v);
    }
  }

  return root;
};
