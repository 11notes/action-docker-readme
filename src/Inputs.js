const Eleven = require('./Eleven.js');
const { resolve } = require('node:path');
const { existsSync, readFileSync } = require('node:fs');
const run = require('./run.js');

module.exports = class Inputs{
  static async sarif_file(file){
    // will return all valid CVE IDs if any are present
    Eleven.debug(`sarif_file(${file})`);

    const CVEs = [];

    if(existsSync(resolve(file))){
      try{
        const sarif = JSON.parse(readFileSync(resolve(file), 'utf-8'));
        Eleven.debug('contents of sarif report:', sarif);
        try{
          if(/grype/i.test(sarif.runs[0]?.tool?.driver?.name)){
            if(sarif.runs[0]?.tool?.driver?.rules && Array.isArray(sarif.runs[0].tool.driver.rules) && sarif.runs[0].tool.driver.rules.length > 0){
              for(const rules of sarif.runs[0].tool.driver.rules){
                const match = rules.id.match(/(CVE-\d+-\d+)/i);
                if(match && Array.isArray(match) && match.length > 0){
                  if(!CVEs.includes(match[1])){
                    CVEs.push(match[1]);
                  }
                }else{
                  Eleven.info(`sarif_file rule ${rules.id} is not a valid CVE ID!`, e);
                }
              }
            }else{
              Eleven.info(`sarif_file ${file} has no rules, can't process!`);
            }
          }else{
            Eleven.warning(`sarif_file ${file} is not a grype report!`);
          }
        }catch(e){
          Eleven.warning(`sarif_file ${file} is not a grype report!`, e);
        }
      }catch(e){
        Eleven.warning(`sarif_file ${file} not a valid JSON file!`, e);
      }
    }else{
      Eleven.warning(`sarif_file ${file} not found!`);
    }
    return(CVEs);
  }

  static async build_output_metadata(metadata){
    // will return the buildx log if present
    Eleven.debug(`build_output_metadata(${metadata})`);

    let log = '';
    if(null === metadata){
      log = readFileSync('./buildx.log').toString();
    }else{
      try{
        const json = JSON.parse(metadata);
        try{
          const id = json?.["buildx.build.ref"].split('/').pop();
          try{
            log = await run('docker', ['buildx', 'history', 'logs', id]);
          }catch(e){
            Eleven.warning(`build_output_metadata could not call buildx history logs.`, e);
          }
        }catch(e){
          Eleven.warning(`build_output_metadata buildx.build.ref is not set!`, e);
        }
      }catch(e){
        Eleven.warning(`build_output_metadata is not a valid JSON object!`, e);
      }
    }

    if(log.length > 0){
      Eleven.debug(`buildx log has ${[...log].reduce((a, c) => a + (c === '\n' ? 1 : 0), 0)} lines`);
    }
    return(log);
  }
}