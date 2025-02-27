const Database = require('better-sqlite3');
const { inspect } = require('node:util');
const os = require('node:os');

try{
  /*
  const README = require('./src/README.js');
  const readme = new README();
  Eleven.info('starting action-docker-readme');
  readme.init();
  */
  const db = new Database('/home/runner/.cache/grype/db/5/vulnerability.db', {
    fileMustExist:true,
    readonly:true,
  });
  const query = db.prepare('SELECT * FROM id WHERE schema_version = 5').all();
  process.stdout.write(inspect(query, {showHidden:false, depth:null, colors:true}) + os.EOL);
}catch(e){
  process.stderr.write(inspect(e, {showHidden:false, depth:null}) + os.EOL);
}