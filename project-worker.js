import { runVirtual, testVirtual } from './virtual-project';
self.onmessage = ({ data }) => {
  try {
    const result = data.action === 'test' ? testVirtual(data.files) : { output: runVirtual(data.files, data.entry, data.action === 'check') };
    self.postMessage({ result });
  } catch (error) { self.postMessage({ error: error.message }); }
};
