const Eleven = require('./src/Eleven.js');
const sqlite3 = require('sqlite3')
const { open } = require('sqlite');

(async()=>{
  try{
    const sqlitedb = await open({
      filename:'/home/runner/.cache/grype/db/5/vulnerability.db',
      driver:sqlite3.Database,
      mode:sqlite3.OPEN_READONLY,
    })
    const result = await sqlitedb.get('SELECT * FROM id WHERE schema_version = 5');
    Eleven.debug(result);
  }catch(e){
    Eleven.debug(e);
  }


  try{
    const README = require('./src/README.js');
    const readme = new README();
    await readme.init();
  }catch(e){
    Eleven.warning(e.toString());
    Eleven.debug(e);
  }
})();