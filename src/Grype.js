const Eleven = require('./Eleven.js');
const { existsSync, createWriteStream, readFileSync, createReadStream, closeSync, openSync } = require('node:fs');
const { Readable } = require('node:stream');
const tar = require('tar');
const Database = require('better-sqlite3');

class Grype{
  static database = false;
  static cutoff = 7;

  static getCVE(ID){
    if(!Grype.database){
      return(false);
    }
    const query = {
      rows:[],
    };
    
    try{
      const qDefault = Grype.database.prepare(`SELECT DISTINCT cvss FROM vulnerability_metadata WHERE data_source = 'https://nvd.nist.gov/vuln/detail/${ID}' AND json_extract(cvss, '$[0]') NOT NULL`).all();
      if(qDefault && Array.isArray(qDefault) && qDefault.length > 0){
        query.rows = qDefault;
      }else{
        try{
          const qNotNull = Grype.database.prepare(`SELECT DISTINCT cvss FROM vulnerability_metadata WHERE id = '${ID}' AND json_extract(cvss, '$[0]') NOT NULL`).all();
          if(qNotNull && Array.isArray(qNotNull) && qNotNull.length > 0){
            query.rows = qNotNull;
          }
        }catch(e){
          Eleven.warning('SQLite error occured', e);
        }
      }
    }catch(e){
      Eleven.warning('SQLite error occured', e);
    }

    const invalidResults = [];

    if(query.rows.length > 0){
      for(const row of query.rows){
        const metadata = JSON.parse(row.cvss);
        const tries = [
          {source:'nist', type:'Primary'},
          {source:'.+', type:'Secondary'},
          {source:'.*', type:'.*'},
        ];
        for(let i=0; i<tries.length; i++){
          for(const cvss of metadata){
            if(/3\.\d+/ig.test(cvss.version) && new RegExp(tries[i].source, 'ig').test(cvss.source) && new RegExp(tries[i].type, 'ig').test(cvss.type)){
              return({
                id:ID,
                severity:cvss.metrics.base_score,
                risk:cvss.metrics.exploitability_score,
                vector:cvss.vector,
                valid:true,
              });
            }else{
              invalidResults.push({
                id:ID,
                severity:cvss?.metrics?.base_score,
                risk:cvss?.metrics?.exploitability_score,
                vector:cvss?.vector,
                source:cvss?.source,
                type:cvss?.type,
              });
            }
          }
        }
      }
    }else{
      Eleven.debug(`did not find anything in database about ${ID}`);
    }

    if(invalidResults.length > 0){
      Eleven.debug(`${ID} had not a single valid result in grype database but invalid ones`, invalidResults)
    }

    return({
      id:ID,
      severity:0,
      risk:0,
      vector:'',
      valid:false,
    });
  }

  static async init(){
    const files = {
      db:'vulnerability.db',
      listing:'grype.listing.json',
      targz:'grype.db.tar.gz',
      cache:{
        src:'/home/runner/.cache/grype/db/5/vulnerability.db'
      }
    };

    const sqliteOptions = {
      fileMustExist:true,
      readonly:true,
    };

    if(existsSync(files.cache.src)){
      Eleven.info(`found previous grype database at ${files.cache.src}`);
      try{
        Eleven.debug(`open sqlite database ${files.cache.src} with options`, sqliteOptions);
        Grype.database = new Database(files.cache.src, sqliteOptions);
      }catch(e){
        Eleven.warning('exception while opending database', e);
      }      
    }else if(existsSync(files.db)){
      Eleven.info(`found existing grype database at ${files.db}`);
      try{
        Eleven.debug(`open sqlite database ${files.db} with options`, sqliteOptions);
        Grype.database = new Database(files.db, sqliteOptions);
      }catch(e){
        Eleven.warning('exception while opending database', e);
      } 
    }else{
      Eleven.info(`could not find any grype database, downloading ...`)
      try{
        const response = await fetch('https://toolbox-data.anchore.io/grype/databases/listing.json');
        if(response.ok && response.body){
          Readable.fromWeb(response.body).pipe(createWriteStream(files.listing));
          const listing = JSON.parse(readFileSync(files.listing));          
          const targz = await fetch(listing.available[5].shift().url);
          if(targz.ok && targz.body){
            Readable.fromWeb(targz.body).pipe(createWriteStream(files.targz));
            tar.extract({
              file:createReadStream(files.targz).path,
              sync:true
            });
            Eleven.info(`successfully downloaded ${files.db}`);
            try{
              Eleven.debug(`open sqlite database ${files.db} with options`, sqliteOptions);
              Grype.database = new Database(files.db, sqliteOptions);
            }catch(e){
              Eleven.warning('exception while opending database', e);
            }
          }
        }
      }catch(e){
        Eleven.warning('exception while downloading database', e);
      }
    }

    if(Grype.database){
      try{
        const qVersion = Grype.database.prepare('SELECT * FROM id WHERE schema_version = 5').all();
        if(qVersion){
          Eleven.info(`using grype database from ${qVersion[0].build_timestamp}`);
        }
      }catch(e){
        Eleven.warning('exception while accessing database', e);
      }
    }else{
      Eleven.warning('grype database not a valid object');
    }
  }

  static ref(){
    if(!global.Grype){
      global.Grype = Grype;
    }
    return(global.Grype);
  }
}

module.exports = Grype.ref();