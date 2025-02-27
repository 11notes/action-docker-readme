const Eleven = require('./src/Eleven.js');
const Database = require('better-sqlite3');

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
  Eleven.info(db.prepare('SELECT * FROM id WHERE schema_version = 5').all());
}catch(e){
  Eleven.info(e);
}