const ouika = require('../index.js');
const dbhandle = new ouika('test', 'test');

const zip = dbhandle.toZip();
ouika.fromZip('test', 'test2', zip);

let goober = dbhandle.db.add('goober');

while (goober.children.length > 0) goober.children[0].remove();

goober.add(Math.random().toString(), 'egg');
dbhandle.close();