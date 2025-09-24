import { FieldDefinition } from '@platform-mesh/portal-ui-lib/models';


type GroupBase = NonNullable<FieldDefinition['group']>;
type ProcessedGroup = GroupBase & {
  fields?: FieldDefinition[];
};

export type ProcessedFieldDefinition = Omit<FieldDefinition, 'group'> & {
  group?: ProcessedGroup;
};

export const processFields = (
  fields: FieldDefinition[],
): ProcessedFieldDefinition[] => {
  return combineGroupFields(fields);
};

const collectGroupFields = (
  fields: FieldDefinition[],
): Record<string, FieldDefinition[]> => {
  return fields.reduce((acc, f): Record<string, FieldDefinition[]> => {
    if (!f.group?.name) {
      return acc;
    }

    const key = f.group.name;
    if (!acc[key]) {
      acc[key] = [];
    }

    acc[key].push(f);
    return acc;
  }, {});
};

const combineGroupFields = (
  fields: FieldDefinition[],
): ProcessedFieldDefinition[] => {
  const seenGroup = new Set<string>();
  const groupFields = collectGroupFields(fields);
  const result: ProcessedFieldDefinition[] = [];

  fields.forEach((f) => {
    if (!f.group?.name) {
      result.push(f);
      return;
    }

    const key = f.group.name;
    if (seenGroup.has(key)) {
      return;
    }

    seenGroup.add(key);

    const grouped: ProcessedFieldDefinition = {
      ...f,
      group: {
        ...f.group,
        fields: groupFields[key],
      },
    };

    result.push(grouped);
  });

  return result;
};