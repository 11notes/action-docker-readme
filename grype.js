const { existsSync, createWriteStream, readFileSync, createReadStream, symlinkSync } = require('node:fs');
const { Readable } = require('node:stream');
const tar = require('tar');
const core = require('@actions/core');

class Grype{
  static getCVE(db, ID){
    const query = {
      result:[],
    };
    
    const qDefault = db.prepare(`SELECT DISTINCT cvss FROM vulnerability_metadata WHERE data_source = 'https://nvd.nist.gov/vuln/detail/${ID}' AND json_extract(cvss, '$[0]') NOT NULL`).all();
    if(qDefault && Array.isArray(qDefault) && qDefault.length > 0){
      query.result = qDefault;
    }else{
      const qNotNull = db.prepare(`SELECT DISTINCT cvss FROM vulnerability_metadata WHERE id = '${ID}' AND json_extract(cvss, '$[0]') NOT NULL`).all();
      if(qNotNull && Array.isArray(qNotNull) && qNotNull.length > 0){
        query.result = qNotNull;
      }
    }

    if(query.result.length > 0){
      const metadata = JSON.parse(query.result[0].cvss);
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
            });
          }
        }
      }
    }

    return({
      id:ID,
      severity:0,
      risk:0,
      vector:''
    });
  }

  static async download(){
    const files = {
      db:'vulnerability.db',
      listing:'grype.listing.json',
      targz:'grype.db.tar.gz',
      cache:{
        src:'/home/runner/.cache/grype/db/5/vulnerability.db'
      }
    };

    if(existsSync(files.cache.src)){
      symlinkSync(files.cache.src, files.db);
      core.info(`found existing grype database at ${files.cache.src}`);
    }

    if(!existsSync(files.db)){
      core.warning(`could not find any grype database, downloading ...`)
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
            core.info(`successfully downloaded ${files.db}`);
          }
        }
      }catch(e){
        core.warning(e);
      }
    }
  }
}

module.exports = Grype;