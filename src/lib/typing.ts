type TypeName<T> = T extends string
  ? 'string'
  : T extends number
  ? 'number'
  : T extends boolean
  ? 'boolean'
  : 'object';

function ensure<T>(
  desiredType: TypeName<T>,
  value: unknown,
  defaultValue?: T,
): T {
  if (typeof value !== desiredType) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    throw new Error(`value ${value} was not a ${desiredType}`);
  }

  return value as T;
}

export const ensureString = (value: unknown, defaultValue?: string) => {
  return ensure<string>('string', value, defaultValue);
};

export const ensureBoolean = (value: unknown, defaultValue?: boolean) => {
  return ensure<boolean>('boolean', value, defaultValue);
};

export const ensureNumber = (value: unknown, defaultValue?: number) => {
  return ensure<number>('number', value, defaultValue);
};
