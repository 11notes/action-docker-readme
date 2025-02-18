const fs = require('fs');
const path = require('path');
const core = require('@actions/core');

class README{
  sarif = []; // sorted sarif results by severity descending
  env = {}; // all enviornment variables present

  #default = {
    title:{
      synopsis:'# SYNOPSIS',
      volumes:'# VOLUMES 📁',
      built:'# BUILT WITH 🧰',
      build:'# BUILD 🚧',
      unraid:'# UNRAID VERSION 🟠',
      compose:'# COMPOSE ✂️',
      tips:'# GENERAL TIPS 📌',
      environment:'# ENVIRONMENT 📝',
      source:'# SOURCE 💾',
      parent:'# PARENT IMAGE 🏛️',
      config:'# DEFAULT CONFIG 📑',
      patches:'# PATCHED CVE 🦟',
    },
    content:{
      shields:`${[
        '[<img src="https://img.shields.io/badge/github-source-blue?logo=github&color=040308">](https://github.com/11notes/docker-${{ json_name }})',
        '![size](https://img.shields.io/docker/image-size/${{ json_image }}/${{ json_semver_version }}?color=0eb305)',
        '![version](https://img.shields.io/docker/v/${{ json_image }}/${{ json_semver_version }}?color=eb7a09)',
        '![pulls](https://img.shields.io/docker/pulls/${{ json_image }}?color=2b75d6)',
        '[<img src="https://img.shields.io/github/issues/11notes/docker-${{ json_name }}?color=7842f5">](https://github.com/11notes/docker-${{ json_name }}/issues)',
      ].join("")}`,
      tips:`\${{ title_tips }}\r\n${[
        '* Use a reverse proxy like Traefik, Nginx, HAproxy to terminate TLS and to protect your endpoints',
        '* Use Let’s Encrypt DNS-01 challenge to obtain valid SSL certificates for your services'
      ].join("\r\n")}`,
      unraid:"${{ title_unraid }}\r\nThis image supports unraid by default. Simply add **-unraid** to any tag and the image will run as 99:100 instead of 1000:1000 causing no issues on unraid. Enjoy.",
      build:"${{ title_build }}\r\n```dockerfile\r\n${{ @include:./build.dockerfile }}\r\n```",
    },
  };

  constructor(opt = {}){
    this.#parseInputs(opt); // parse all possible inputs
    this.#createVariables(); // create all dynamic and static variables
  }

  #parseInputs(opt){
    if(opt?.sarif_file){
      // check and parse for sarif_file
      const sarifPath = path.resolve(opt.sarif_file);
      if(fs.existsSync(sarifPath)){
        const bytes = fs.readFileSync(sarifPath, 'utf-8');
        try{
          const sarif = JSON.parse(bytes);
          if(Array.isArray(sarif?.runs) && /grype/i.test(sarif?.runs[0]?.tool?.driver?.name)){
            for(const rules of sarif.runs[0].tool.driver?.rules){
              const severity = parseFloat(rules?.properties?.['security-severity']);
              const a = rules?.help?.markdown.split('| --- |\n');
              if(Array.isArray(a) && a.length >= 1){
                const markdown = a[1];
                this.sarif.push({
                  id:rules.id,
                  severity:severity,
                  markdown:markdown.replace(/^\|\s+(\S+)\s+\|/i, `| ${severity} |`),
                });
              }else{
                core.warning(`could not parse sarif rule ${rules.id}`);
              }
            }
            if(this.sarif.length > 0){
              this.sarif.sort((a, b) => {return(b.severity - a.severity)});
            }
          }else{
            core.warning(`could not parse sarif file (not a grype report)`);
          }
        }catch(e){
          core.warning(`could not parse sarif file`);
        }
      }else{
        core.warning(`could not open sarif file at ${sarifPath}`);
      }
    }
  }

  #createVariables(){
    this.#jsonToTemplateVariable(this.#default);
  }

  #jsonToTemplateVariable(json, prefix = ''){
    for(const k in json){
      if(typeof(json[k]) === 'object'){
        this.#jsonToTemplateVariable(json[k], `${prefix}${k}_`);
      }else{
        this.env[`${prefix}${k.toLowerCase()}`] = json[k];
      }
    }
  }
}

try{

  fs.readdirSync('./').forEach(file => {
    core.info(`[DEBUG] file: ${file}`);
  });

  const readme = new README({
    sarif_file:core.getInput('sarif_file') || null,
  });

}catch(e){
  core.setFailed(`action failed with error ${e}`);
}