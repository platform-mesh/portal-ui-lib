import { FieldDefinition } from '@platform-mesh/portal-ui-lib/models';

type GroupBase = NonNullable<FieldDefinition['group']>;
type ProcessedValue = { property: string | string[]; label: string };
type ProcessedGroup = GroupBase & {
  values?: ProcessedValue[];
};

export type ProcessedFieldDefinition = Omit<FieldDefinition, 'group'> & {
  group?: ProcessedGroup;
};

export const processFields = (
  fields: FieldDefinition[],
): ProcessedFieldDefinition[] => {
  return combineGroupFields(fields);
};

const collectGroupProperties = (
  fields: FieldDefinition[],
): Record<string, ProcessedValue[]> => {
  return fields.reduce((acc, f): Record<string, ProcessedValue[]> => {
    if (!f.group?.name) {
      return acc;
    }

    const key = f.group.name;
    if (!acc[key]) {
      acc[key] = [];
    }

    acc[key].push({
      property: f.jsonPathExpression ?? f.property,
      label: f.label,
    });
    return acc;
  }, {});
};

const combineGroupFields = (
  fields: FieldDefinition[],
): ProcessedFieldDefinition[] => {
  const seenGroup = new Set<string>();
  const groupProps = collectGroupProperties(fields);
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
        values: groupProps[key],
      },
    };

    result.push(grouped);
  });

  return result;
};
