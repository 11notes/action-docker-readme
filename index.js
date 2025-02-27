const Database = require('better-sqlite3');
const { inspect } = require('node:util');
const os = require('node:os');
const { existsSync, exists } = require('node:fs');
const { resolve } = require('node:path');

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
  const addon = resolve(`${__dirname}/build/Release/better_sqlite3.node`);
  const databasePath = '/home/runner/.cache/grype/db/5/vulnerability.db';
  process.stdout.write(inspect({addon:addon, databasePath:databasePath}, {showHidden:false, depth:null, colors:true}) + os.EOL);
  if(existsSync(addon)){
    process.stdout.write(inspect(`addon ${addon} exists`, {showHidden:false, depth:null, colors:true}) + os.EOL);
    const sqlite3 = require(addon);
    process.stdout.write(inspect({sqlite3:sqlite3}, {showHidden:false, depth:null, colors:true}) + os.EOL);
    const opt = {verbose:process.stderr.write, fileMustExist:true, readonly:true, timeout:120*1000, nativeBinding:sqlite3};
    process.stdout.write(inspect({opt:opt}, {showHidden:false, depth:null, colors:true}) + os.EOL);
    if(existsSync(databasePath)){
      const db = new Database(databasePath, opt);
      process.stdout.write(inspect({db:db}, {showHidden:false, depth:null, colors:true}) + os.EOL);
    }else{
      throw new Error(`could not find database ${databasePath}`);
    }
  }else{
    throw new Error(`could not find addon ${addon}`);
  }  
}catch(e){
  process.stderr.write(inspect({exception:e}, {showHidden:false, depth:null}) + os.EOL);
}