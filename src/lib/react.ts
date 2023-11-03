import ReactNamespace from 'react/index';
import ReactDomNamespace from 'react-dom';

const React = globalThis['window'].React as typeof ReactNamespace;
const ReactDOM = globalThis['window'].ReactDOM as typeof ReactDomNamespace;

export default React;
export { ReactDOM };
