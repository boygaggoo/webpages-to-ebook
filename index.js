var fs = require('fs');
var yaml = require('js-yaml');
var md5 = require('md5');
var Twig = require('twig');

const child_process = require( 'child_process' );

if (process.argv.length < 3) {
  console.log('Usage:');
  console.log(process.argv[1] + ' settings.yml');
  process.exit();
}
var ymlPath = process.argv[2];

var yml = fs.readFileSync(ymlPath, 'utf-8');
var book = yaml.load(yml)
console.log('Downloading HTML.');
child_process.spawnSync( 'mkdir', [ '-p', './output/html/' ] ); 
for (url of book.content) {
  console.log("\t" + url);
  var url_md5 = md5(url);
  if (!fs.existsSync('./output/html/' + url_md5 + '.html')) {
    child_process.spawnSync( 'wget', [ '-O', './output/html/' + url_md5 + '.html', '--convert-links', url ] ); 
  }
}

console.log('Extracting content.');
child_process.spawnSync( 'mkdir', [ '-p', './output/html.processed/' ] ); 
for (url of book.content) {
  var url_md5 = md5(url);
  console.log("\t" + url_md5);
  if (!fs.existsSync('./output/html.processed/' + url_md5 + '.html')) {
    child_process.spawnSync( 'sh', [ '-c', 'cat ./output/html/' + url_md5 + '.html | node htmltidy.js | node readability.js >  ./output/html.processed/' + url_md5 + '.html' ] ); 
  }
}

// Set metadata.
var twig = fs.readFileSync('./templates/epub-metadata.xml.twig').toString();
var template = Twig.twig({ data: twig });
var xml = template.render(book);
fs.writeFileSync('./output/meta/' + book.shortname + '.xml', xml)

var filepaths = [];
for (url of book.content) {
  var url_md5 = md5(url);
  filepaths.push('./output/html.processed/' + url_md5 + '.html');
}

console.log('Creating EPUB.')
child_process.spawnSync( 'pandoc', [ '--from', 'html', '-o', './output/epub/' + book.shortname + '.epub', '--epub-metadata', './output/meta/' + book.shortname + '.xml' ].concat(filepaths) );
