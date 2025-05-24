const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
if (isMainThread) {
  console.log('Main thread, spawning worker...');
  const w = new Worker(__filename, { workerData: 'hello' });
  w.on('message', msg => console.log('Message from worker:', msg));
  w.postMessage('ping');
} else {
  console.log('Worker started with data:', workerData);
  parentPort.on('message', msg => parentPort.postMessage('pong-'+msg));
}
