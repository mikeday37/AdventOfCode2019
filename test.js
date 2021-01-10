const tesseract = require('tesseract.js')
var filename = 'c:/temp/test2.png';

console.log('1');

let ocrResult;
let gotit = false;

(async() => {
	await (async () => {
		const worker = tesseract.createWorker({logger: x => console.log(x)});
		const language = 'eng';
		await worker.load();
		await worker.loadLanguage(language);
		await worker.initialize(language);
		const {data: {text}} = await worker.recognize(filename) ;
		console.log('in async: ' + (text ?? '(n/a)'))
		ocrResult = text;
		gotit = true;
		await worker.terminate();
	})();

	console.log('2');
	console.log('ocrResult: ' + (ocrResult ?? '(n/a)'));
	
})();


