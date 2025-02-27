const Database = require('better-sqlite3');
const { inspect } = require('node:util');
const os = require('node:os');

process
  .on('unhandledRejection', (reason, p) => {
    process.stderr.write(inspect({reason:reason, promise:p}, {showHidden:false, depth:null}) + os.EOL);
  })
  .on('uncaughtException', e => {
    process.stderr.write(inspect({exception:e}, {showHidden:false, depth:null}) + os.EOL);
    process.exit(1);
  });

try{
  /*
  const README = require('./src/README.js');
  const readme = new README();
  Eleven.info('starting action-docker-readme');
  readme.init();
  */
  process.stdout.write(inspect(__dirname, {showHidden:false, depth:null, colors:true}) + os.EOL);
  const opt = {verbose:process.stderr.write, readonly:true, timeout:120*1000, nativeBinding:'./build/Release/better_sqlite3.node'};
  process.stdout.write(inspect('starting test', {showHidden:false, depth:null, colors:true}) + os.EOL);
  process.stdout.write(inspect(opt, {showHidden:false, depth:null, colors:true}) + os.EOL);
  const db = new Database('/home/runner/.cache/grype/db/5/vulnerability.db', opt);
  process.stdout.write(inspect('db connected', {showHidden:false, depth:null, colors:true}) + os.EOL);
  const stmt = db.prepare('SELECT * FROM id WHERE schema_version = 5');
  process.stdout.write(inspect('statement prepared', {showHidden:false, depth:null, colors:true}) + os.EOL);
  const query = stmt.all();
  process.stdout.write(inspect(query, {showHidden:false, depth:null, colors:true}) + os.EOL);
}catch(e){
  process.stderr.write(inspect(e, {showHidden:false, depth:null}) + os.EOL);
}