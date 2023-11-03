import React from './react';

// wrapper around th because I don't want to deal with top-level CSS
export const TableHeader = ({ children }: { children: React.ReactNode }) => {
  return (
    <th
      style={{
        paddingTop: '0.5em',
        paddingBottom: '0.5em',
        paddingLeft: '0.5em',
        paddingRight: '0.5em',
        textAlign: 'center',
      }}
    >
      {children}
    </th>
  );
};

// wrapper around td because I don't want to deal with top-level CSS
export const TableCell = ({ children }: { children: React.ReactNode }) => {
  return (
    <td
      style={{
        paddingTop: '0.5em',
        paddingBottom: '0.5em',
        paddingLeft: '0.5em',
        paddingRight: '0.5em',
      }}
    >
      {children}
    </td>
  );
};
